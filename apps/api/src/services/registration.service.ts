import {
  registrationRepository,
  RegistrationRepository,
  RegistrationEntity
} from '../repositories/registration.repository';
import { hackathonRepository, HackathonRepository } from '../repositories/hackathon.repository';
import { auditRepository, AuditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';
import { HackathonStatus, RegistrationStatus, Registration, RegistrationDetail } from '@dogfood/shared';

export class RegistrationService {
  constructor(
    private readonly regRepo: RegistrationRepository = registrationRepository,
    private readonly hackathonRepo: HackathonRepository = hackathonRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  private mapToDto(entity: RegistrationEntity): Registration {
    return {
      id: entity.id,
      hackathonId: entity.hackathon_id,
      userId: entity.user_id,
      status: entity.status,
      registeredAt: entity.registered_at,
      updatedAt: entity.updated_at
    };
  }

  async registerParticipant(hackathonIdentifier: string, userId: string): Promise<Registration> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    // Backend-Enforced Event State Guard: Registration allowed only when OPEN
    if (hackathon.status !== HackathonStatus.OPEN) {
      throw new AppError(
        `Registration is closed. Hackathon "${hackathon.name}" is currently in state [${hackathon.status}].`,
        400,
        'REGISTRATION_CLOSED',
        { status: hackathon.status }
      );
    }

    // Time-window validation
    const now = new Date();
    if (hackathon.registration_start && now < new Date(hackathon.registration_start)) {
      throw new AppError('Registration has not yet opened for this hackathon.', 400, 'REGISTRATION_NOT_STARTED');
    }
    if (hackathon.registration_end && now > new Date(hackathon.registration_end)) {
      throw new AppError('Registration has closed for this hackathon.', 400, 'REGISTRATION_DEADLINE_PASSED');
    }

    // Uniqueness constraint check (UNIQUE(user_id, hackathon_id))
    const existing = await this.regRepo.findByUserAndHackathon(userId, hackathon.id);
    if (existing) {
      throw new AppError('You are already registered for this hackathon.', 409, 'ALREADY_REGISTERED');
    }

    const created = await this.regRepo.create({
      hackathonId: hackathon.id,
      userId,
      status: RegistrationStatus.ACCEPTED
    });

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'REGISTRATION_CREATED',
      entityType: 'REGISTRATION',
      entityId: created.id,
      metadata: { hackathonId: hackathon.id, status: created.status }
    });

    return this.mapToDto(created);
  }

  async getParticipantRegistration(hackathonIdentifier: string, userId: string): Promise<Registration | null> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const registration = await this.regRepo.findByUserAndHackathon(userId, hackathon.id);
    return registration ? this.mapToDto(registration) : null;
  }

  async getHackathonRegistrations(hackathonIdentifier: string): Promise<RegistrationDetail[]> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const list = await this.regRepo.findByHackathonId(hackathon.id);
    return list.map(item => ({
      id: item.id,
      hackathonId: item.hackathon_id,
      userId: item.user_id,
      status: item.status,
      registeredAt: item.registered_at,
      updatedAt: item.updated_at,
      user: {
        id: item.user_id,
        email: item.user_email,
        fullName: item.user_full_name
      }
    }));
  }

  async updateRegistrationStatus(
    hackathonIdentifier: string,
    registrationId: string,
    status: RegistrationStatus,
    organizerId: string
  ): Promise<Registration> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const registration = await this.regRepo.findById(registrationId);
    if (!registration) {
      throw new AppError('Registration record not found', 404, 'REGISTRATION_NOT_FOUND');
    }

    // Verify cross-hackathon boundary integrity
    if (registration.hackathon_id !== hackathon.id) {
      throw new AppError('Registration does not belong to the specified hackathon', 400, 'MISMATCHED_HACKATHON');
    }

    const updated = await this.regRepo.updateStatus(registration.id, status);
    if (!updated) {
      throw new AppError('Failed to update registration status', 500, 'UPDATE_FAILED');
    }

    await this.auditRepo.logAuditEvent({
      userId: organizerId,
      action: 'REGISTRATION_STATUS_UPDATED',
      entityType: 'REGISTRATION',
      entityId: updated.id,
      metadata: { fromStatus: registration.status, toStatus: status }
    });

    return this.mapToDto(updated);
  }
}

export const registrationService = new RegistrationService();
