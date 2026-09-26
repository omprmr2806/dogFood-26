import { z } from 'zod';
import { SubmissionStatus } from '@dogfood/shared';

// Safe URL validator ensuring only http:// and https:// schemes are permitted
const safeUrlSchema = z
  .string()
  .trim()
  .max(500, 'URL cannot exceed 500 characters')
  .refine(
    (url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must use http:// or https:// protocol and be well-formed' }
  )
  .optional()
  .or(z.literal(''));

export const createSubmissionSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Project title must be at least 3 characters')
      .max(150, 'Project title cannot exceed 150 characters'),
    tagline: z
      .string()
      .trim()
      .max(255, 'Tagline cannot exceed 255 characters')
      .optional()
      .or(z.literal('')),
    description: z
      .string()
      .trim()
      .min(10, 'Project description must be at least 10 characters')
      .max(10000, 'Description cannot exceed 10000 characters'),
    problemStatement: z
      .string()
      .trim()
      .max(5000, 'Problem statement cannot exceed 5000 characters')
      .optional()
      .or(z.literal('')),
    solution: z
      .string()
      .trim()
      .max(5000, 'Solution cannot exceed 5000 characters')
      .optional()
      .or(z.literal('')),
    technologyStack: z
      .array(z.string().trim().min(1).max(50))
      .max(20, 'Maximum 20 technology tags allowed')
      .optional(),
    repoUrl: safeUrlSchema,
    demoUrl: safeUrlSchema,
    demoVideoUrl: safeUrlSchema,
    presentationUrl: safeUrlSchema,
    coverImagePath: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(''))
  })
});

export const updateSubmissionSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Project title must be at least 3 characters')
      .max(150, 'Project title cannot exceed 150 characters')
      .optional(),
    tagline: z
      .string()
      .trim()
      .max(255, 'Tagline cannot exceed 255 characters')
      .optional()
      .or(z.literal('')),
    description: z
      .string()
      .trim()
      .min(10, 'Project description must be at least 10 characters')
      .max(10000, 'Description cannot exceed 10000 characters')
      .optional(),
    problemStatement: z
      .string()
      .trim()
      .max(5000, 'Problem statement cannot exceed 5000 characters')
      .optional()
      .or(z.literal('')),
    solution: z
      .string()
      .trim()
      .max(5000, 'Solution cannot exceed 5000 characters')
      .optional()
      .or(z.literal('')),
    technologyStack: z
      .array(z.string().trim().min(1).max(50))
      .max(20, 'Maximum 20 technology tags allowed')
      .optional(),
    repoUrl: safeUrlSchema,
    demoUrl: safeUrlSchema,
    demoVideoUrl: safeUrlSchema,
    presentationUrl: safeUrlSchema,
    coverImagePath: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(''))
  })
});

export const updateSubmissionStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(SubmissionStatus, {
      errorMap: () => ({ message: 'Invalid submission status' })
    })
  })
});

export const galleryQuerySchema = z.object({
  query: z.object({
    hackathonId: z.string().uuid().optional(),
    search: z.string().trim().optional(),
    technology: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12)
  })
});
