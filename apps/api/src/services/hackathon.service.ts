import {
  hackathonRepository,
  HackathonRepository,
  HackathonEntity
} from '../repositories/hackathon.repository';
import { registrationRepository, RegistrationRepository } from '../repositories/registration.repository';
import { auditRepository, AuditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';
import {
  HackathonStatus,
  UserRole,
  CreateHackathonRequest,
  UpdateHackathonRequest,
  HackathonSummary,
  HackathonDetail
} from '@dogfood/shared';

// Strict state transition machine definition
export const VALID_TRANSITIONS: Record<HackathonStatus, HackathonStatus[]> = {
  [HackathonStatus.DRAFT]: [HackathonStatus.OPEN, HackathonStatus.ARCHIVED],
  [HackathonStatus.OPEN]: [HackathonStatus.RUNNING, HackathonStatus.DRAFT, HackathonStatus.ARCHIVED],
  [HackathonStatus.RUNNING]: [HackathonStatus.JUDGING, HackathonStatus.ARCHIVED],
  [HackathonStatus.JUDGING]: [HackathonStatus.COMPLETED, HackathonStatus.ARCHIVED],
  [HackathonStatus.COMPLETED]: [HackathonStatus.ARCHIVED],
  [HackathonStatus.ARCHIVED]: []
};

export class HackathonService {
  constructor(
    private readonly hackathonRepo: HackathonRepository = hackathonRepository,
    private readonly regRepo: RegistrationRepository = registrationRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  private async mapToSummary(entity: HackathonEntity): Promise<HackathonSummary> {
    const registrationCount = await this.regRepo.countByHackathonId(entity.id);
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      shortDescription: entity.short_description || undefined,
      status: entity.status,
      registrationStart: entity.registration_start || null,
      registrationEnd: entity.registration_end || null,
      eventStart: entity.event_start || null,
      eventEnd: entity.event_end || null,
      minTeamSize: entity.min_team_size,
      maxTeamSize: entity.max_team_size,
      registrationCount,
      createdAt: entity.created_at
    };
  }

  private async mapToDetail(entity: HackathonEntity): Promise<HackathonDetail> {
    const summary = await this.mapToSummary(entity);
    return {
      ...summary,
      description: entity.description,
      rules: entity.rules || null,
      createdBy: entity.created_by || null,
      updatedAt: entity.updated_at
    };
  }

  async createHackathon(
    data: CreateHackathonRequest,
    userId: string
  ): Promise<HackathonDetail> {
    const existingSlug = await this.hackathonRepo.findBySlug(data.slug);
    if (existingSlug) {
      throw new AppError(`A hackathon with slug "${data.slug}" already exists.`, 409, 'SLUG_EXISTS');
    }

    // Validate date logic if provided
    if (data.registrationStart && data.registrationEnd) {
      if (new Date(data.registrationStart) >= new Date(data.registrationEnd)) {
        throw new AppError('registrationStart must be prior to registrationEnd', 400, 'INVALID_DATES');
      }
    }
    if (data.eventStart && data.eventEnd) {
      if (new Date(data.eventStart) >= new Date(data.eventEnd)) {
        throw new AppError('eventStart must be prior to eventEnd', 400, 'INVALID_DATES');
      }
    }

    const created = await this.hackathonRepo.create({
      ...data,
      createdBy: userId
    });

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'EVENT_CREATED',
      entityType: 'HACKATHON',
      entityId: created.id,
      metadata: { slug: created.slug, name: created.name }
    });

    return this.mapToDetail(created);
  }

  async getHackathons(userRole?: UserRole): Promise<HackathonSummary[]> {
    const isPrivileged = userRole === UserRole.ADMIN || userRole === UserRole.ORGANIZER;
    const hackathons = await this.hackathonRepo.findAll(isPrivileged);
    return Promise.all(hackathons.map(h => this.mapToSummary(h)));
  }

  async getHackathonByIdOrSlug(
    identifier: string,
    userRole?: UserRole
  ): Promise<HackathonDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(identifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    // Hide DRAFT hackathons from non-privileged users
    if (hackathon.status === HackathonStatus.DRAFT) {
      const isPrivileged = userRole === UserRole.ADMIN || userRole === UserRole.ORGANIZER;
      if (!isPrivileged) {
        throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
      }
    }

    return this.mapToDetail(hackathon);
  }

  async updateHackathon(
    id: string,
    updates: UpdateHackathonRequest,
    userId: string
  ): Promise<HackathonDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(id);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const updated = await this.hackathonRepo.update(hackathon.id, {
      name: updates.name,
      short_description: updates.shortDescription,
      description: updates.description,
      rules: updates.rules,
      registration_start: updates.registrationStart,
      registration_end: updates.registrationEnd,
      event_start: updates.eventStart,
      event_end: updates.eventEnd,
      min_team_size: updates.minTeamSize,
      max_team_size: updates.maxTeamSize
    });

    if (!updated) {
      throw new AppError('Failed to update hackathon', 500, 'UPDATE_FAILED');
    }

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'EVENT_UPDATED',
      entityType: 'HACKATHON',
      entityId: updated.id,
      metadata: updates as Record<string, unknown>
    });

    return this.mapToDetail(updated);
  }

  async transitionStatus(
    id: string,
    targetStatus: HackathonStatus,
    reason?: string,
    userId?: string
  ): Promise<HackathonDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(id);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const currentStatus = hackathon.status;
    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTargets.includes(targetStatus)) {
      throw new AppError(
        `Invalid state transition: Cannot transition hackathon from [${currentStatus}] to [${targetStatus}]. Valid targets: [${allowedTargets.join(', ')}].`,
        400,
        'INVALID_STATE_TRANSITION',
        { currentStatus, targetStatus, allowedTargets }
      );
    }

    const updated = await this.hackathonRepo.updateStatus(hackathon.id, targetStatus);
    if (!updated) {
      throw new AppError('Failed to transition hackathon status', 500, 'TRANSITION_FAILED');
    }

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'EVENT_TRANSITION',
      entityType: 'HACKATHON',
      entityId: updated.id,
      metadata: { fromStatus: currentStatus, toStatus: targetStatus, reason }
    });

    return this.mapToDetail(updated);
  }
}

export const hackathonService = new HackathonService();
