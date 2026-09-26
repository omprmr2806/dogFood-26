import { JudgeScoreDistribution } from '@dogfood/shared';

export interface EvaluationInput {
  id: string;
  judgeId: string;
  judgeName?: string;
  submissionId: string;
  rawScore: number;
}

export interface NormalizationOutput {
  /** Map of evaluationId -> normalized score (0-100) */
  normalizedScores: Map<string, number>;
  /** Map of judgeId -> statistical distribution info */
  judgeDistributions: Map<string, JudgeScoreDistribution>;
}

export class NormalizationService {
  public static readonly MIN_EVALUATIONS_FOR_Z_SCORE = 3;
  public static readonly TARGET_MEAN = 75.0;
  public static readonly TARGET_STD_DEV = 12.0;
  public static readonly EPSILON = 0.001;

  /**
   * Pure function: calculates arithmetic mean of numeric array
   */
  calculateMean(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / numbers.length) * 100) / 100;
  }

  /**
   * Pure function: calculates population standard deviation
   */
  calculateStdDev(numbers: number[], mean: number): number {
    if (numbers.length <= 1) return 0;
    const varianceSum = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = varianceSum / numbers.length;
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  /**
   * Normalizes judge scores using Z-Score Standardization with robust fallback:
   * 1. If judge evaluated < 3 submissions -> Fallback to Raw Score
   * 2. If judge std dev < 0.001 (zero variance) -> Fallback to Raw Score
   * 3. Otherwise -> Standardize Z = (X - mean) / stdDev, rescale to (75 + Z * 12), clamp to [0, 100]
   */
  normalizeEvaluations(evaluations: EvaluationInput[]): NormalizationOutput {
    const normalizedScores = new Map<string, number>();
    const judgeDistributions = new Map<string, JudgeScoreDistribution>();

    // 1. Group evaluations by judge
    const judgeEvalsMap = new Map<string, EvaluationInput[]>();
    for (const ev of evaluations) {
      if (!judgeEvalsMap.has(ev.judgeId)) {
        judgeEvalsMap.set(ev.judgeId, []);
      }
      judgeEvalsMap.get(ev.judgeId)!.push(ev);
    }

    // 2. Process each judge's distribution
    for (const [judgeId, evals] of judgeEvalsMap.entries()) {
      const rawScores = evals.map((e) => e.rawScore);
      const mean = this.calculateMean(rawScores);
      const stdDev = this.calculateStdDev(rawScores, mean);
      const judgeName = evals[0].judgeName;

      const isSampleSufficient = rawScores.length >= NormalizationService.MIN_EVALUATIONS_FOR_Z_SCORE;
      const isVarianceNonZero = stdDev >= NormalizationService.EPSILON;

      if (isSampleSufficient && isVarianceNonZero) {
        // Z-Score Standardization
        judgeDistributions.set(judgeId, {
          judgeId,
          judgeName,
          evaluationsCount: rawScores.length,
          mean,
          stdDev,
          method: 'Z_SCORE'
        });

        for (const ev of evals) {
          const zScore = (ev.rawScore - mean) / stdDev;
          const rescaled = NormalizationService.TARGET_MEAN + zScore * NormalizationService.TARGET_STD_DEV;
          const clamped = Math.min(Math.max(rescaled, 0), 100);
          normalizedScores.set(ev.id, Math.round(clamped * 100) / 100);
        }
      } else {
        // Deterministic Fallback: preserve raw weighted score directly
        judgeDistributions.set(judgeId, {
          judgeId,
          judgeName,
          evaluationsCount: rawScores.length,
          mean,
          stdDev,
          method: 'FALLBACK_RAW'
        });

        for (const ev of evals) {
          normalizedScores.set(ev.id, Math.round(ev.rawScore * 100) / 100);
        }
      }
    }

    return {
      normalizedScores,
      judgeDistributions
    };
  }
}

export const normalizationService = new NormalizationService();
