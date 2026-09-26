import {
  SubmissionStatus,
  HackathonStatus,
  RegistrationStatus,
  UserRole,
  SubmissionDetail,
  SubmissionSummary,
  GalleryItem,
  GalleryResponse,
  GalleryQuery,
  CreateSubmissionRequest,
  UpdateSubmissionRequest
} from '@dogfood/shared';
import {
  submissionRepository,
  SubmissionEntity,
  SubmissionWithDetails
} from '../repositories/submission.repository';
import { teamRepository } from '../repositories/team.repository';
import { hackathonService } from './hackathon.service';
import { registrationRepository } from '../repositories/registration.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';

export class SubmissionService {
  /**
   * Helper to determine if a submission is publicly viewable
   */
  isSubmissionPublic(status: SubmissionStatus): boolean {
    return (
      status === SubmissionStatus.SUBMITTED ||
      status === SubmissionStatus.LOCKED ||
      status === SubmissionStatus.UNDER_REVIEW ||
      status === SubmissionStatus.FINALIZED
    );
  }

  /**
   * Create a new draft submission for the participant's team
   */
  async createSubmission(
    userId: string,
    hackathonIdOrSlug: string,
    data: CreateSubmissionRequest,
    ipAddress?: string
  ): Promise<SubmissionDetail> {
    const hackathon = await hackathonService.getHackathonByIdOrSlug(hackathonIdOrSlug);

    // 1. Verify Event State: Submissions can only be created in OPEN or RUNNING states
    if (
      hackathon.status !== HackathonStatus.OPEN &&
      hackathon.status !== HackathonStatus.RUNNING
    ) {
      throw new AppError(
        `Submissions cannot be created while hackathon is in ${hackathon.status} status`,
        400,
        'INVALID_EVENT_STATE'
      );
    }

    // 2. Verify Registration: User must be an ACCEPTED participant
    const reg = await registrationRepository.findByUserAndHackathon(userId, hackathon.id);
    if (!reg || reg.status !== RegistrationStatus.ACCEPTED) {
      throw new AppError(
        'You must have an accepted registration for this hackathon to create a submission',
        403,
        'REGISTRATION_REQUIRED'
      );
    }

    // 3. Verify Team Membership: User must be in an active team for this hackathon
    const myTeam = await teamRepository.findUserTeamInHackathon(hackathon.id, userId);
    if (!myTeam) {
      throw new AppError(
        'You must belong to a team in this hackathon to create a submission',
        400,
        'TEAM_REQUIRED'
      );
    }

    // 4. Verify Single Submission Per Team rule
    const existing = await submissionRepository.findByTeamId(myTeam.team.id);
    if (existing) {
      throw new AppError(
        'Your team already has a project submission for this hackathon',
        409,
        'SUBMISSION_EXISTS'
      );
    }

    // 5. Create Submission
    const created = await submissionRepository.create({
      hackathonId: hackathon.id,
      teamId: myTeam.team.id,
      title: data.title,
      tagline: data.tagline,
      description: data.description,
      problemStatement: data.problemStatement,
      solution: data.solution,
      technologyStack: data.technologyStack || [],
      repoUrl: data.repoUrl,
      demoUrl: data.demoUrl,
      demoVideoUrl: data.demoVideoUrl,
      presentationUrl: data.presentationUrl,
      coverImagePath: data.coverImagePath
    });

    await auditRepository.logAuditEvent({
      userId,
      action: 'SUBMISSION_CREATED',
      entityType: 'SUBMISSION',
      entityId: created.id,
      metadata: {
        hackathonId: hackathon.id,
        teamId: myTeam.team.id,
        title: created.title
      },
      ipAddress
    });

    const full = await submissionRepository.findById(created.id);
    return this.mapToDetail(full || {
      ...created,
      team_name: myTeam.team.name,
      hackathon_name: hackathon.name,
      hackathon_slug: hackathon.slug
    });
  }

  /**
   * Get the current user's team submission for a hackathon
   */
  async getMySubmission(
    userId: string,
    hackathonIdOrSlug: string
  ): Promise<SubmissionDetail | null> {
    const hackathon = await hackathonService.getHackathonByIdOrSlug(hackathonIdOrSlug);
    const myTeam = await teamRepository.findUserTeamInHackathon(hackathon.id, userId);
    if (!myTeam) return null;

    const submission = await submissionRepository.findByTeamId(myTeam.team.id);
    if (!submission) return null;

    const full = await submissionRepository.findById(submission.id);
    return this.mapToDetail(full || {
      ...submission,
      team_name: myTeam.team.name,
      hackathon_name: hackathon.name,
      hackathon_slug: hackathon.slug
    });
  }

  /**
   * Get a submission by ID with strict privacy & IDOR protection
   */
  async getSubmissionById(
    submissionId: string,
    user?: { id: string; role: UserRole }
  ): Promise<SubmissionDetail> {
    const sub = await submissionRepository.findById(submissionId);
    if (!sub) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    // Check if public
    const isPublic = this.isSubmissionPublic(sub.status);

    if (isPublic) {
      return this.mapToDetail(sub);
    }

    // If DRAFT, only team members or organizers/admins can view it
    if (!user) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.ORGANIZER) {
      return this.mapToDetail(sub);
    }

    // Check if caller is member of owning team
    const teamMembers = await teamRepository.getTeamMembers(sub.team_id);
    const isMember = teamMembers.some((m) => m.user_id === user.id);

    if (!isMember) {
      throw new AppError('You do not have permission to view this draft submission', 403, 'FORBIDDEN');
    }

    return this.mapToDetail(sub);
  }

  /**
   * List all submissions for a hackathon (filtered based on caller permissions)
   */
  async getHackathonSubmissions(
    hackathonIdOrSlug: string,
    user?: { id: string; role: UserRole }
  ): Promise<SubmissionSummary[]> {
    const hackathon = await hackathonService.getHackathonByIdOrSlug(hackathonIdOrSlug);
    const list = await submissionRepository.findByHackathonId(hackathon.id);

    const isOrganizerOrAdmin = user && (user.role === UserRole.ADMIN || user.role === UserRole.ORGANIZER);

    // Filter: organizers see all; public/participants see only public submissions
    const filtered = list.filter((s) => {
      if (isOrganizerOrAdmin) return true;
      return this.isSubmissionPublic(s.status);
    });

    return filtered.map((s) => ({
      id: s.id,
      hackathonId: s.hackathon_id,
      teamId: s.team_id,
      teamName: s.team_name,
      title: s.title,
      tagline: s.tagline || undefined,
      technologyStack: s.technology_stack || [],
      status: s.status,
      submittedAt: s.submitted_at || undefined,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  }

  /**
   * Update submission draft content (Authorized team members only)
   */
  async updateSubmission(
    submissionId: string,
    userId: string,
    userRole: UserRole,
    data: UpdateSubmissionRequest,
    ipAddress?: string
  ): Promise<SubmissionDetail> {
    const sub = await submissionRepository.findById(submissionId);
    if (!sub) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    const hackathon = await hackathonService.getHackathonByIdOrSlug(sub.hackathon_id);

    // 1. Check Event State: Participant editing is strictly BLOCKED during JUDGING, COMPLETED, ARCHIVED
    if (
      hackathon.status === HackathonStatus.JUDGING ||
      hackathon.status === HackathonStatus.COMPLETED ||
      hackathon.status === HackathonStatus.ARCHIVED
    ) {
      throw new AppError(
        'Submission modifications are locked for judging',
        403,
        'SUBMISSIONS_LOCKED'
      );
    }

    // 2. Check Submission Status: Cannot edit if locked, finalized, or disqualified
    if (
      sub.status === SubmissionStatus.LOCKED ||
      sub.status === SubmissionStatus.FINALIZED ||
      sub.status === SubmissionStatus.DISQUALIFIED
    ) {
      throw new AppError(
        `Submission is in ${sub.status} state and cannot be modified`,
        400,
        'SUBMISSION_NOT_EDITABLE'
      );
    }

    // 3. Check Team Membership: User must belong to owning team (unless Admin/Organizer)
    const isElevated = userRole === UserRole.ADMIN || userRole === UserRole.ORGANIZER;
    if (!isElevated) {
      const teamMembers = await teamRepository.getTeamMembers(sub.team_id);
      const isMember = teamMembers.some((m) => m.user_id === userId);
      if (!isMember) {
        throw new AppError('You are not authorized to edit this team submission', 403, 'FORBIDDEN');
      }
    }

    // 4. Perform update (prevent client overriding status, team_id, hackathon_id)
    const updated = await submissionRepository.update(submissionId, {
      title: data.title ?? sub.title,
      tagline: data.tagline !== undefined ? (data.tagline || null) : sub.tagline,
      description: data.description ?? sub.description,
      problem_statement: data.problemStatement !== undefined ? (data.problemStatement || null) : sub.problem_statement,
      solution: data.solution !== undefined ? (data.solution || null) : sub.solution,
      technology_stack: data.technologyStack ?? sub.technology_stack,
      repo_url: data.repoUrl !== undefined ? (data.repoUrl || null) : sub.repo_url,
      demo_url: data.demoUrl !== undefined ? (data.demoUrl || null) : sub.demo_url,
      demo_video_url: data.demoVideoUrl !== undefined ? (data.demoVideoUrl || null) : sub.demo_video_url,
      presentation_url: data.presentationUrl !== undefined ? (data.presentationUrl || null) : sub.presentation_url,
      cover_image_path: data.coverImagePath !== undefined ? (data.coverImagePath || null) : sub.cover_image_path
    });

    if (!updated) {
      throw new AppError('Failed to update submission', 500, 'UPDATE_FAILED');
    }

    await auditRepository.logAuditEvent({
      userId,
      action: 'SUBMISSION_UPDATED',
      entityType: 'SUBMISSION',
      entityId: submissionId,
      metadata: {
        hackathonId: sub.hackathon_id,
        teamId: sub.team_id,
        title: updated.title
      },
      ipAddress
    });

    const full = await submissionRepository.findById(submissionId);
    return this.mapToDetail(full || { ...updated, team_name: sub.team_name, hackathon_name: sub.hackathon_name, hackathon_slug: sub.hackathon_slug });
  }

  /**
   * Finalize and submit project (Sets status to SUBMITTED, captures version snapshot)
   */
  async submitSubmission(
    submissionId: string,
    userId: string,
    userRole: UserRole,
    ipAddress?: string
  ): Promise<SubmissionDetail> {
    const sub = await submissionRepository.findById(submissionId);
    if (!sub) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    const hackathon = await hackathonService.getHackathonByIdOrSlug(sub.hackathon_id);

    // 1. Check Event State
    if (
      hackathon.status === HackathonStatus.JUDGING ||
      hackathon.status === HackathonStatus.COMPLETED ||
      hackathon.status === HackathonStatus.ARCHIVED
    ) {
      throw new AppError(
        'Submissions are closed for this hackathon',
        403,
        'SUBMISSIONS_LOCKED'
      );
    }

    // 2. Check Team Membership
    const isElevated = userRole === UserRole.ADMIN || userRole === UserRole.ORGANIZER;
    if (!isElevated) {
      const teamMembers = await teamRepository.getTeamMembers(sub.team_id);
      const isMember = teamMembers.some((m) => m.user_id === userId);
      if (!isMember) {
        throw new AppError('You are not authorized to submit this project', 403, 'FORBIDDEN');
      }
    }

    // 3. Validation for final submission: Title, Description, and at least one link
    if (!sub.title || sub.title.trim().length < 3) {
      throw new AppError('Project title must be at least 3 characters before submitting', 400, 'VALIDATION_FAILED');
    }
    if (!sub.description || sub.description.trim().length < 10) {
      throw new AppError('Project description must be at least 10 characters before submitting', 400, 'VALIDATION_FAILED');
    }
    if (!sub.repo_url && !sub.demo_url) {
      throw new AppError('At least one Repository URL or Demo URL is required to submit', 400, 'VALIDATION_FAILED');
    }

    // 4. Create version snapshot for auditing/history
    await submissionRepository.createVersion(
      submissionId,
      {
        title: sub.title,
        tagline: sub.tagline,
        description: sub.description,
        problemStatement: sub.problem_statement,
        solution: sub.solution,
        technologyStack: sub.technology_stack,
        repoUrl: sub.repo_url,
        demoUrl: sub.demo_url,
        demoVideoUrl: sub.demo_video_url,
        presentationUrl: sub.presentation_url,
        submittedAt: new Date().toISOString()
      },
      userId
    );

    // 5. Update status to SUBMITTED
    const updated = await submissionRepository.update(submissionId, {
      status: SubmissionStatus.SUBMITTED,
      submitted_at: new Date().toISOString()
    });

    if (!updated) {
      throw new AppError('Failed to finalize submission', 500, 'SUBMISSION_FAILED');
    }

    await auditRepository.logAuditEvent({
      userId,
      action: 'SUBMISSION_SUBMITTED',
      entityType: 'SUBMISSION',
      entityId: submissionId,
      metadata: {
        hackathonId: sub.hackathon_id,
        teamId: sub.team_id,
        title: updated.title
      },
      ipAddress
    });

    const full = await submissionRepository.findById(submissionId);
    return this.mapToDetail(full || { ...updated, team_name: sub.team_name, hackathon_name: sub.hackathon_name, hackathon_slug: sub.hackathon_slug });
  }

  /**
   * Administrative status change (Lock, Finalize, Disqualify) - ORGANIZER / ADMIN only
   */
  async updateSubmissionStatus(
    submissionId: string,
    newStatus: SubmissionStatus,
    adminUserId: string,
    ipAddress?: string
  ): Promise<SubmissionDetail> {
    const sub = await submissionRepository.findById(submissionId);
    if (!sub) {
      throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    }

    const updated = await submissionRepository.update(submissionId, {
      status: newStatus
    });

    if (!updated) {
      throw new AppError('Failed to update submission status', 500, 'UPDATE_FAILED');
    }

    const actionMap: Record<SubmissionStatus, string> = {
      [SubmissionStatus.DRAFT]: 'SUBMISSION_UPDATED',
      [SubmissionStatus.SUBMITTED]: 'SUBMISSION_SUBMITTED',
      [SubmissionStatus.LOCKED]: 'SUBMISSION_LOCKED',
      [SubmissionStatus.UNDER_REVIEW]: 'SUBMISSION_UPDATED',
      [SubmissionStatus.FINALIZED]: 'SUBMISSION_FINALIZED',
      [SubmissionStatus.DISQUALIFIED]: 'SUBMISSION_DISQUALIFIED'
    };

    await auditRepository.logAuditEvent({
      userId: adminUserId,
      action: actionMap[newStatus] || 'SUBMISSION_UPDATED',
      entityType: 'SUBMISSION',
      entityId: submissionId,
      metadata: {
        oldStatus: sub.status,
        newStatus
      },
      ipAddress
    });

    const full = await submissionRepository.findById(submissionId);
    return this.mapToDetail(full || { ...updated, team_name: sub.team_name, hackathon_name: sub.hackathon_name, hackathon_slug: sub.hackathon_slug });
  }

  /**
   * Public Gallery query with search, filter, and pagination
   */
  async getGallery(query: GalleryQuery): Promise<GalleryResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 12));

    const { items, total } = await submissionRepository.findGallerySubmissions(query);

    const mappedItems: GalleryItem[] = items.map((sub) => ({
      id: sub.id,
      hackathonId: sub.hackathon_id,
      hackathonName: sub.hackathon_name,
      hackathonSlug: sub.hackathon_slug,
      teamId: sub.team_id,
      teamName: sub.team_name,
      title: sub.title,
      tagline: sub.tagline || undefined,
      description: sub.description,
      technologyStack: sub.technology_stack || [],
      repoUrl: sub.repo_url || undefined,
      demoUrl: sub.demo_url || undefined,
      coverImagePath: sub.cover_image_path || undefined,
      status: sub.status,
      submittedAt: sub.submitted_at || undefined
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  private mapToDetail(sub: SubmissionWithDetails): SubmissionDetail {
    return {
      id: sub.id,
      hackathonId: sub.hackathon_id,
      hackathonName: sub.hackathon_name,
      hackathonSlug: sub.hackathon_slug,
      teamId: sub.team_id,
      teamName: sub.team_name,
      title: sub.title,
      tagline: sub.tagline || undefined,
      description: sub.description,
      problemStatement: sub.problem_statement || undefined,
      solution: sub.solution || undefined,
      technologyStack: sub.technology_stack || [],
      repoUrl: sub.repo_url || undefined,
      demoUrl: sub.demo_url || undefined,
      demoVideoUrl: sub.demo_video_url || undefined,
      presentationUrl: sub.presentation_url || undefined,
      coverImagePath: sub.cover_image_path || undefined,
      status: sub.status,
      submittedAt: sub.submitted_at || undefined,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at
    };
  }
}

export const submissionService = new SubmissionService();
