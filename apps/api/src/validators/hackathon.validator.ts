import { z } from 'zod';
import { HackathonStatus, RegistrationStatus } from '@dogfood/shared';

export const createHackathonSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Slug must be at least 3 characters long')
      .max(100, 'Slug exceeds maximum length')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (lowercase letters, numbers, and single hyphens)'),
    name: z
      .string()
      .trim()
      .min(3, 'Event name must be at least 3 characters long')
      .max(255, 'Event name exceeds maximum length'),
    shortDescription: z
      .string()
      .trim()
      .max(500, 'Short description cannot exceed 500 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Full description must be at least 10 characters long'),
    rules: z
      .string()
      .trim()
      .optional(),
    registrationStart: z.string().datetime({ offset: true }).nullable().optional(),
    registrationEnd: z.string().datetime({ offset: true }).nullable().optional(),
    eventStart: z.string().datetime({ offset: true }).nullable().optional(),
    eventEnd: z.string().datetime({ offset: true }).nullable().optional(),
    minTeamSize: z.coerce.number().int().min(1).max(20).default(1),
    maxTeamSize: z.coerce.number().int().min(1).max(20).default(4),
  }).refine((data) => data.minTeamSize <= data.maxTeamSize, {
    message: 'minTeamSize cannot be greater than maxTeamSize',
    path: ['minTeamSize']
  })
});

export const updateHackathonSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(255).optional(),
    shortDescription: z.string().trim().max(500).optional(),
    description: z.string().trim().min(10).optional(),
    rules: z.string().trim().optional(),
    registrationStart: z.string().datetime({ offset: true }).nullable().optional(),
    registrationEnd: z.string().datetime({ offset: true }).nullable().optional(),
    eventStart: z.string().datetime({ offset: true }).nullable().optional(),
    eventEnd: z.string().datetime({ offset: true }).nullable().optional(),
    minTeamSize: z.coerce.number().int().min(1).max(20).optional(),
    maxTeamSize: z.coerce.number().int().min(1).max(20).optional(),
  }).refine((data) => {
    if (data.minTeamSize !== undefined && data.maxTeamSize !== undefined) {
      return data.minTeamSize <= data.maxTeamSize;
    }
    return true;
  }, {
    message: 'minTeamSize cannot be greater than maxTeamSize',
    path: ['minTeamSize']
  })
});

export const transitionHackathonSchema = z.object({
  body: z.object({
    targetStatus: z.nativeEnum(HackathonStatus, {
      errorMap: () => ({ message: 'Invalid target status. Must be DRAFT, OPEN, RUNNING, JUDGING, COMPLETED, or ARCHIVED' })
    }),
    reason: z.string().trim().max(255).optional()
  })
});

export const updateRegistrationStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(RegistrationStatus, {
      errorMap: () => ({ message: 'Invalid registration status. Must be PENDING, ACCEPTED, REJECTED, or CHECKED_IN' })
    })
  })
});
