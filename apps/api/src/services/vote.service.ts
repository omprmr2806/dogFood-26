/**
 * DOGFOOD Phase 9: Community Voting Service
 *
 * Rules:
 * - One vote per user per submission (enforced by DB UNIQUE constraint)
 * - Voting must be enabled on the hackathon (voting_enabled = true)
 * - Optional voting window (voting_start / voting_end)
 * - PARTICIPANT role required to cast / remove a vote
 * - Removed votes are hard-deleted (toggle UX)
 */

import { Pool } from 'pg';
import { dbPool } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@dogfood/shared';

export class VoteService {
  private pool: Pool;

  constructor() {
    this.pool = dbPool;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async getHackathon(hackathonId: string) {
    const result = await this.pool.query(
      `SELECT id, status, voting_enabled, voting_start, voting_end
         FROM hackathons
        WHERE id = $1`,
      [hackathonId],
    );
    if (result.rows.length === 0) throw new AppError('Hackathon not found', 404);
    return result.rows[0];
  }

  private async getSubmission(submissionId: string, hackathonId: string) {
    const result = await this.pool.query(
      `SELECT id, hackathon_id, status
         FROM submissions
        WHERE id = $1 AND hackathon_id = $2`,
      [submissionId, hackathonId],
    );
    if (result.rows.length === 0) throw new AppError('Submission not found in this hackathon', 404);
    return result.rows[0];
  }

  private assertVotingOpen(hackathon: {
    voting_enabled: boolean;
    voting_start: string | null;
    voting_end: string | null;
  }) {
    if (!hackathon.voting_enabled) {
      throw new AppError('Community voting is not enabled for this hackathon', 403);
    }
    const now = new Date();
    if (hackathon.voting_start && now < new Date(hackathon.voting_start)) {
      throw new AppError('Voting has not started yet', 403);
    }
    if (hackathon.voting_end && now > new Date(hackathon.voting_end)) {
      throw new AppError('Voting has closed', 403);
    }
  }

  // ── public methods ─────────────────────────────────────────────────────────

  /** Cast a vote. Idempotent if already voted (returns existing). */
  async castVote(hackathonId: string, submissionId: string, userId: string, userRole: UserRole) {
    // Only registered participants (or admins/organizers for testing) can vote
    if (userRole === UserRole.JUDGE) {
      throw new AppError('Judges cannot participate in community voting', 403);
    }

    const hackathon = await this.getHackathon(hackathonId);
    this.assertVotingOpen(hackathon);

    const submission = await this.getSubmission(submissionId, hackathonId);
    if (!['SUBMITTED', 'LOCKED', 'UNDER_REVIEW', 'FINALIZED'].includes(submission.status)) {
      throw new AppError('Cannot vote on a submission in this state', 400);
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO submission_votes (hackathon_id, submission_id, user_id)
              VALUES ($1, $2, $3)
         ON CONFLICT (user_id, submission_id) DO NOTHING
           RETURNING *`,
        [hackathonId, submissionId, userId],
      );

      const row = result.rows[0];
      if (!row) {
        // Already voted — return existing
        const existing = await this.pool.query(
          `SELECT * FROM submission_votes WHERE user_id = $1 AND submission_id = $2`,
          [userId, submissionId],
        );
        return { vote: existing.rows[0], alreadyVoted: true };
      }
      return { vote: row, alreadyVoted: false };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new AppError('You have already voted for this submission', 409);
      }
      throw err;
    }
  }

  /** Remove a vote (toggle off). */
  async removeVote(hackathonId: string, submissionId: string, userId: string) {
    const hackathon = await this.getHackathon(hackathonId);
    this.assertVotingOpen(hackathon);

    const result = await this.pool.query(
      `DELETE FROM submission_votes
        WHERE hackathon_id = $1 AND submission_id = $2 AND user_id = $3
       RETURNING id`,
      [hackathonId, submissionId, userId],
    );

    if (result.rows.length === 0) {
      throw new AppError('You have not voted for this submission', 404);
    }
    return { removed: true };
  }

  /** Get vote count for a submission + whether the requesting user has voted. */
  async getVoteCount(submissionId: string, userId?: string) {
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS vote_count FROM submission_votes WHERE submission_id = $1`,
      [submissionId],
    );

    let userHasVoted = false;
    if (userId) {
      const voteResult = await this.pool.query(
        `SELECT 1 FROM submission_votes WHERE submission_id = $1 AND user_id = $2`,
        [submissionId, userId],
      );
      userHasVoted = voteResult.rows.length > 0;
    }

    return {
      submissionId,
      voteCount: countResult.rows[0].vote_count,
      userHasVoted,
    };
  }

  /** Get vote counts for all submissions in a hackathon (bulk). */
  async getHackathonVoteCounts(hackathonId: string, userId?: string) {
    const countResult = await this.pool.query(
      `SELECT submission_id, COUNT(*)::int AS vote_count
         FROM submission_votes
        WHERE hackathon_id = $1
        GROUP BY submission_id`,
      [hackathonId],
    );

    let userVotes: Set<string> = new Set();
    if (userId) {
      const userVoteResult = await this.pool.query(
        `SELECT submission_id FROM submission_votes WHERE hackathon_id = $1 AND user_id = $2`,
        [hackathonId, userId],
      );
      userVotes = new Set(userVoteResult.rows.map((r: { submission_id: string }) => r.submission_id));
    }

    return countResult.rows.map((row: { submission_id: string; vote_count: number }) => ({
      submissionId: row.submission_id,
      voteCount: row.vote_count,
      userHasVoted: userVotes.has(row.submission_id),
    }));
  }

  /** Configure voting window (ORGANIZER / ADMIN only). */
  async configureVotingWindow(
    hackathonId: string,
    votingEnabled: boolean,
    votingStart?: string | null,
    votingEnd?: string | null,
  ) {
    await this.getHackathon(hackathonId);

    const result = await this.pool.query(
      `UPDATE hackathons
          SET voting_enabled = $2,
              voting_start   = $3,
              voting_end     = $4,
              updated_at     = CURRENT_TIMESTAMP
        WHERE id = $1
       RETURNING id, voting_enabled, voting_start, voting_end`,
      [hackathonId, votingEnabled, votingStart ?? null, votingEnd ?? null],
    );
    return result.rows[0];
  }

  /** Get voting config for a hackathon. */
  async getVotingConfig(hackathonId: string) {
    const result = await this.pool.query(
      `SELECT id, voting_enabled, voting_start, voting_end FROM hackathons WHERE id = $1`,
      [hackathonId],
    );
    if (result.rows.length === 0) throw new AppError('Hackathon not found', 404);
    return result.rows[0];
  }

  /** Total votes cast in a hackathon (for leaderboard). */
  async getTotalVotes(hackathonId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM submission_votes WHERE hackathon_id = $1`,
      [hackathonId],
    );
    return result.rows[0].total;
  }
}

export const voteService = new VoteService();
