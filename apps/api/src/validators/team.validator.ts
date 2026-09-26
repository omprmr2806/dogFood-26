import { z } from 'zod';
import { TeamMemberRole } from '@dogfood/shared';

export const createTeamSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Team name must be at least 2 characters')
      .max(100, 'Team name cannot exceed 100 characters')
  })
});

export const updateTeamSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Team name must be at least 2 characters')
      .max(100, 'Team name cannot exceed 100 characters')
  })
});

export const joinTeamSchema = z.object({
  body: z.object({
    inviteCode: z
      .string()
      .trim()
      .min(4, 'Invite code must be at least 4 characters')
      .max(32, 'Invite code cannot exceed 32 characters')
  })
});

export const addTeamMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    role: z.nativeEnum(TeamMemberRole).optional()
  })
});
