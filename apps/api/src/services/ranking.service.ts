import { ProjectJudgingResult, SubmissionStatus } from '@dogfood/shared';

export interface SubmissionData {
  id: string;
  hackathonId: string;
  title: string;
  tagline?: string | null;
  teamId: string;
  teamName: string;
  status: SubmissionStatus;
  createdAt: string;
}

export interface ScoredEvaluationItem {
  id: string;
  submissionId: string;
  judgeId: string;
  rawScore: number;
  normalizedScore: number;
}

export class RankingService {
  /**
   * Deterministically aggregates scores and produces sorted rankings
   */
  rankSubmissions(
    hackathonId: string,
    submissions: SubmissionData[],
    evaluations: ScoredEvaluationItem[]
  ): ProjectJudgingResult[] {
    // 1. Group evaluations by submission
    const subEvalsMap = new Map<string, ScoredEvaluationItem[]>();
    for (const ev of evaluations) {
      if (!subEvalsMap.has(ev.submissionId)) {
        subEvalsMap.set(ev.submissionId, []);
      }
      subEvalsMap.get(ev.submissionId)!.push(ev);
    }

    // 2. Compute aggregate scores for each submission
    const unrankedResults: (ProjectJudgingResult & { createdAtDate: string })[] = [];

    for (const sub of submissions) {
      const evals = subEvalsMap.get(sub.id) || [];
      const evaluationsCompleted = evals.length;

      let rawScoreAvg = 0;
      let normalizedScore = 0;

      if (evaluationsCompleted > 0) {
        const rawSum = evals.reduce((acc, e) => acc + e.rawScore, 0);
        rawScoreAvg = Math.round((rawSum / evaluationsCompleted) * 100) / 100;

        const normSum = evals.reduce((acc, e) => acc + e.normalizedScore, 0);
        normalizedScore = Math.round((normSum / evaluationsCompleted) * 100) / 100;
      }

      const isDisqualified = sub.status === SubmissionStatus.DISQUALIFIED;

      unrankedResults.push({
        id: `result-${sub.id}`,
        hackathonId,
        submissionId: sub.id,
        submissionTitle: sub.title,
        submissionTagline: sub.tagline || undefined,
        teamId: sub.teamId,
        teamName: sub.teamName,
        rawScoreAvg,
        normalizedScore,
        evaluationsCount: evaluationsCompleted,
        evaluationsCompleted,
        rank: null,
        isTied: false,
        isDisqualified,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAtDate: sub.createdAt
      });
    }

    // 3. Separate qualified vs disqualified
    const qualified = unrankedResults.filter((r) => !r.isDisqualified);
    const disqualified = unrankedResults.filter((r) => r.isDisqualified);

    // 4. Deterministic sort for qualified submissions
    qualified.sort((a, b) => {
      // 1. Normalized Score Descending
      if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      // 2. Raw Score Average Descending
      if (b.rawScoreAvg !== a.rawScoreAvg) {
        return b.rawScoreAvg - a.rawScoreAvg;
      }
      // 3. Earliest Submission Timestamp Ascending
      const dateCmp = a.createdAtDate.localeCompare(b.createdAtDate);
      if (dateCmp !== 0) {
        return dateCmp;
      }
      // 4. Submission ID Ascending (guarantees 100% determinism)
      return a.submissionId.localeCompare(b.submissionId);
    });

    // 5. Assign ranks and tie flags
    let currentRank = 1;
    for (let i = 0; i < qualified.length; i++) {
      const current = qualified[i];

      // Check if tied with previous or next
      const isTiedWithPrev = i > 0 && qualified[i - 1].normalizedScore === current.normalizedScore;
      const isTiedWithNext = i < qualified.length - 1 && qualified[i + 1].normalizedScore === current.normalizedScore;

      current.isTied = isTiedWithPrev || isTiedWithNext;

      if (isTiedWithPrev) {
        current.rank = qualified[i - 1].rank;
      } else {
        current.rank = currentRank;
      }
      currentRank++;
    }

    // Combine qualified (ranked) + disqualified (rank: null)
    return [...qualified, ...disqualified].map(({ createdAtDate, ...res }) => res);
  }
}

export const rankingService = new RankingService();
