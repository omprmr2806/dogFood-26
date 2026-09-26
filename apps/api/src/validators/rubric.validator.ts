import { z } from 'zod';

export const rubricCriterionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Criterion name must be at least 2 characters').max(100),
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(1000),
  weightPercentage: z.number().min(0.01, 'Weight must be greater than 0').max(100, 'Weight cannot exceed 100'),
  maxPoints: z.number().min(0.01, 'Max points must be greater than 0').max(1000, 'Max points cannot exceed 1000'),
  displayOrder: z.number().int().optional()
});

export const createRubricSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3, 'Rubric name must be at least 3 characters').max(100),
    description: z.string().trim().max(2000).optional(),
    isActive: z.boolean().optional().default(true),
    criteria: z.array(rubricCriterionSchema).min(1, 'Rubric must contain at least 1 criterion')
  })
});

export const updateRubricSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3, 'Rubric name must be at least 3 characters').max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    isActive: z.boolean().optional(),
    criteria: z.array(rubricCriterionSchema).min(1, 'Rubric must contain at least 1 criterion').optional()
  })
});

export const criterionScoreInputSchema = z.object({
  criterionId: z.string().uuid('Invalid criterion ID format'),
  score: z.number().min(0, 'Score cannot be negative'),
  feedback: z.string().trim().max(2000).optional()
});

export const saveEvaluationDraftSchema = z.object({
  body: z.object({
    scores: z.array(criterionScoreInputSchema),
    feedback: z.string().trim().max(5000).optional()
  })
});

export const submitEvaluationSchema = z.object({
  body: z.object({
    scores: z.array(criterionScoreInputSchema).min(1, 'Must provide scores for all criteria to submit'),
    feedback: z.string().trim().max(5000).optional()
  })
});
