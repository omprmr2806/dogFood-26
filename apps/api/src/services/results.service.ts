/**
 * DOGFOOD Phase 10: Results Service
 *
 * Composes final leaderboard from:
 * - project_judging_results (normalized/ranked scores from Phase 8)
 * - submission_votes (community votes from Phase 9)
 *
 * Provides publish/unpublish lifecycle with immutable snapshot.
 */

import { Pool } from 'pg';
import { dbPool } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { LeaderboardEntry, PublishedResults } from '@dogfood/shared';

export class ResultsService {
  private pool: Pool;

  constructor() {
    this.pool = dbPool;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async getHackathon(hackathonId: string) {
    const result = await this.pool.query(
      `SELECT id, name, slug, status FROM hackathons WHERE id = $1`,
      [hackathonId],
    );
    if (result.rows.length === 0) throw new AppError('Hackathon not found', 404);
    return result.rows[0];
  }

  // ── compute live leaderboard ───────────────────────────────────────────────

  async computeLeaderboard(hackathonId: string): Promise<LeaderboardEntry[]> {
    // Join ranking results with vote counts
    const result = await this.pool.query(
      `SELECT
           pjr.submission_id,
           s.title AS submission_title,
           s.tagline AS submission_tagline,
           s.team_id,
           t.name AS team_name,
           pjr.normalized_score,
           pjr.raw_score_avg,
           pjr.evaluations_completed,
           pjr.rank,
           pjr.is_tied,
           (s.status = 'DISQUALIFIED') AS is_disqualified,
           COALESCE(vc.vote_count, 0)::int AS vote_count
         FROM project_judging_results pjr
         JOIN submissions s ON s.id = pjr.submission_id
         JOIN teams t ON t.id = s.team_id
         LEFT JOIN submission_vote_counts vc ON vc.submission_id = pjr.submission_id
        WHERE pjr.hackathon_id = $1
        ORDER BY
          (s.status = 'DISQUALIFIED') ASC,
          pjr.rank ASC NULLS LAST,
          vc.vote_count DESC NULLS LAST,
          pjr.submission_id ASC`,
      [hackathonId],
    );

    return result.rows.map((row: {
      submission_id: string;
      submission_title: string;
      submission_tagline?: string;
      team_id: string;
      team_name: string;
      normalized_score: number;
      raw_score_avg: number;
      evaluations_completed: number;
      rank: number | null;
      is_tied: boolean;
      is_disqualified: boolean;
      vote_count: number;
    }) => ({
      rank: row.rank,
      submissionId: row.submission_id,
      submissionTitle: row.submission_title,
      submissionTagline: row.submission_tagline,
      teamId: row.team_id,
      teamName: row.team_name,
      normalizedScore: row.normalized_score,
      rawScoreAvg: row.raw_score_avg,
      voteCount: row.vote_count,
      isTied: row.is_tied,
      isDisqualified: row.is_disqualified,
      evaluationsCount: row.evaluations_completed,
    }));
  }

  // ── get results (live preview for organizer, or published) ─────────────────

  async getResults(hackathonId: string, isOrganizer: boolean): Promise<PublishedResults> {
    const hackathon = await this.getHackathon(hackathonId);

    // Check if published
    const pubResult = await this.pool.query(
      `SELECT * FROM hackathon_results_publications
        WHERE hackathon_id = $1 AND is_active = TRUE
        ORDER BY published_at DESC LIMIT 1`,
      [hackathonId],
    );
    const publication = pubResult.rows[0];

    if (!isOrganizer && !publication) {
      throw new AppError('Results have not been published yet', 403);
    }

    let leaderboard: LeaderboardEntry[];
    let publishedAt = '';
    let isPublished = false;

    if (publication) {
      // Use snapshot for public view
      leaderboard = publication.snapshot.leaderboard || [];
      publishedAt = publication.published_at;
      isPublished = true;
    } else {
      // Organizer gets live preview
      leaderboard = await this.computeLeaderboard(hackathonId);
    }

    // Total votes
    const voteCountResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM submission_votes WHERE hackathon_id = $1`,
      [hackathonId],
    );
    const totalVotes = voteCountResult.rows[0].total;

    // Submission counts
    const subCountResult = await this.pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(CASE WHEN status NOT IN ('DRAFT', 'DISQUALIFIED') THEN 1 END)::int AS judged
         FROM submissions WHERE hackathon_id = $1`,
      [hackathonId],
    );

    return {
      hackathonId,
      hackathonName: hackathon.name,
      hackathonSlug: hackathon.slug,
      publishedAt,
      isPublished,
      leaderboard,
      totalVotes,
      totalSubmissions: subCountResult.rows[0].total,
      totalJudgedSubmissions: subCountResult.rows[0].judged,
    };
  }

  // ── publish results ────────────────────────────────────────────────────────

  async publishResults(hackathonId: string, publishedBy: string): Promise<PublishedResults> {
    const hackathon = await this.getHackathon(hackathonId);

    if (!['JUDGING', 'COMPLETED'].includes(hackathon.status)) {
      throw new AppError(
        'Results can only be published when the hackathon is in JUDGING or COMPLETED status',
        400,
      );
    }

    // Compute snapshot
    const leaderboard = await this.computeLeaderboard(hackathonId);
    const snapshot = { leaderboard, computedAt: new Date().toISOString() };

    // Deactivate previous publication
    await this.pool.query(
      `UPDATE hackathon_results_publications SET is_active = FALSE WHERE hackathon_id = $1`,
      [hackathonId],
    );

    // Insert new publication
    await this.pool.query(
      `INSERT INTO hackathon_results_publications (hackathon_id, published_by, snapshot)
            VALUES ($1, $2, $3)`,
      [hackathonId, publishedBy, JSON.stringify(snapshot)],
    );

    // Write audit entry
    await this.writeAuditLog({
      hackathonId,
      userId: publishedBy,
      action: 'RESULTS_PUBLISHED',
      entityType: 'hackathon',
      entityId: hackathonId,
      details: { submissionCount: leaderboard.length },
    });

    return this.getResults(hackathonId, true);
  }

  // ── unpublish results ──────────────────────────────────────────────────────

  async unpublishResults(hackathonId: string, unpublishedBy: string) {
    await this.pool.query(
      `UPDATE hackathon_results_publications SET is_active = FALSE WHERE hackathon_id = $1`,
      [hackathonId],
    );
    await this.writeAuditLog({
      hackathonId,
      userId: unpublishedBy,
      action: 'RESULTS_UNPUBLISHED',
      entityType: 'hackathon',
      entityId: hackathonId,
      details: {},
    });
    return { unpublished: true };
  }

  // ── export results ─────────────────────────────────────────────────────────

  async exportResults(hackathonId: string, format: 'csv' | 'json') {
    const results = await this.getResults(hackathonId, true);

    if (format === 'json') {
      return { contentType: 'application/json', data: JSON.stringify(results, null, 2) };
    }

    // CSV export
    const headers = [
      'Rank', 'Team', 'Project Title', 'Tagline', 'Normalized Score',
      'Raw Score Avg', 'Community Votes', 'Evaluations', 'Tied', 'Disqualified',
    ];
    const rows = results.leaderboard.map((e) => [
      e.rank ?? 'N/A',
      `"${e.teamName.replace(/"/g, '""')}"`,
      `"${e.submissionTitle.replace(/"/g, '""')}"`,
      `"${(e.submissionTagline || '').replace(/"/g, '""')}"`,
      e.normalizedScore.toFixed(4),
      e.rawScoreAvg.toFixed(4),
      e.voteCount,
      e.evaluationsCount,
      e.isTied ? 'YES' : 'NO',
      e.isDisqualified ? 'YES' : 'NO',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return { contentType: 'text/csv', data: csv };
  }

  // ── audit log ─────────────────────────────────────────────────────────────

  async writeAuditLog(entry: {
    hackathonId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  }) {
    try {
      let userEmail = '';
      if (entry.userId) {
        const uResult = await this.pool.query(
          `SELECT email FROM users WHERE id = $1`,
          [entry.userId],
        );
        userEmail = uResult.rows[0]?.email || '';
      }

      await this.pool.query(
        `INSERT INTO audit_log (hackathon_id, user_id, user_email, action, entity_type, entity_id, details)
              VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.hackathonId || null,
          entry.userId || null,
          userEmail,
          entry.action,
          entry.entityType || null,
          entry.entityId || null,
          JSON.stringify(entry.details || {}),
        ],
      );
    } catch {
      // Audit log failures must not break primary operations
    }
  }

  async getAuditLog(
    hackathonId: string,
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const result = await this.pool.query(
      `SELECT * FROM audit_log
        WHERE hackathon_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [hackathonId, limit, offset],
    );
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_log WHERE hackathon_id = $1`,
      [hackathonId],
    );
    return {
      entries: result.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    };
  }
}

export const resultsService = new ResultsService();
