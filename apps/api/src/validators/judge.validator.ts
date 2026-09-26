import { z } from 'zod';
import { JudgeStatus } from '@dogfood/shared';

export const addJudgeSchema = z.object({
  body: z.object({
    judgeId: z.string().uuid('Invalid judge user ID format'),
    status: z.nativeEnum(JudgeStatus).optional().default(JudgeStatus.ACTIVE)
  })
});

export const updateJudgeStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(JudgeStatus)
  })
});

export const updateJudgingConfigSchema = z.object({
  body: z.object({
    judgesPerSubmission: z
      .number()
      .int('Judges per submission must be an integer')
      .min(1, 'Judges per submission must be at least 1')
      .max(20, 'Judges per submission cannot exceed 20')
  })
});

export const declareConflictSchema = z.object({
  body: z.object({
    judgeId: z.string().uuid('Invalid judge ID format'),
    teamId: z.string().uuid('Invalid team ID format').optional().nullable(),
    submissionId: z.string().uuid('Invalid submission ID format').optional().nullable(),
    reason: z
      .string()
      .trim()
      .min(5, 'Reason must be at least 5 characters')
      .max(1000, 'Reason cannot exceed 1000 characters')
  })
});

export const generateAssignmentsSchema = z.object({
  body: z.object({
    judgesPerSubmission: z
      .number()
      .int('Judges per submission must be an integer')
      .min(1, 'Judges per submission must be at least 1')
      .max(20, 'Judges per submission cannot exceed 20')
      .optional()
  })
});

export const finalizeAssignmentsSchema = z.object({
  body: z.object({
    judgesPerSubmission: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional(),
    forceRegenerate: z.boolean().optional().default(false)
  })
});
