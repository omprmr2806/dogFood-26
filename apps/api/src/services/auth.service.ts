import crypto from 'crypto';
import { userRepository, UserRepository, UserEntity } from '../repositories/user.repository';
import { sessionRepository, SessionRepository } from '../repositories/session.repository';
import { auditRepository, AuditRepository } from '../repositories/audit.repository';
import { hashPassword, verifyPassword } from '../auth/password';
import { generateSessionToken, hashToken, SessionPayload } from '../auth/session';
import { AppError } from '../middleware/errorHandler';
import { RegisterRequest, LoginRequest, UserProfile, UserRole } from '@dogfood/shared';

// Dummy hash for constant-time comparison when user is not found to prevent timing-based user enumeration
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$dGVzdGhhc2g';

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository = userRepository,
    private readonly sessionRepo: SessionRepository = sessionRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  private mapToProfile(user: UserEntity): UserProfile {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    };
  }

  async register(
    data: RegisterRequest,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserProfile; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check existing
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(data.password);

    // Create user (strictly PARTICIPANT for self-registration to prevent privilege escalation)
    const user = await this.userRepo.createUser({
      email: normalizedEmail,
      passwordHash,
      fullName: data.fullName.trim(),
      role: UserRole.PARTICIPANT
    });

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    };

    const token = generateSessionToken(sessionPayload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.sessionRepo.createSession({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: context?.ip,
      userAgent: context?.userAgent
    });

    await this.auditRepo.logAuditEvent({
      userId: user.id,
      action: 'AUTH_REGISTER',
      entityType: 'USER',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: context?.ip
    });

    return {
      user: this.mapToProfile(user),
      token
    };
  }

  async login(
    data: LoginRequest,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserProfile; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user || user.status !== 'ACTIVE') {
      // Fake verify to thwart timing attacks
      await verifyPassword(DUMMY_HASH, data.password);
      await this.auditRepo.logAuditEvent({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        metadata: { attemptedEmail: normalizedEmail, reason: 'NOT_FOUND_OR_INACTIVE' },
        ipAddress: context?.ip
      });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(user.password_hash, data.password);
    if (!isValidPassword) {
      await this.auditRepo.logAuditEvent({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { attemptedEmail: normalizedEmail, reason: 'BAD_PASSWORD' },
        ipAddress: context?.ip
      });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Rotate session identifiers upon login (Session Fixation protection)
    const sessionId = crypto.randomUUID();
    const sessionPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    };

    const token = generateSessionToken(sessionPayload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepo.createSession({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: context?.ip,
      userAgent: context?.userAgent
    });

    await this.auditRepo.logAuditEvent({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: context?.ip
    });

    return {
      user: this.mapToProfile(user),
      token
    };
  }

  async logout(sessionId: string, userId?: string, ip?: string): Promise<void> {
    await this.sessionRepo.revokeSession(sessionId);

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'AUTH_LOGOUT',
      entityType: 'SESSION',
      entityId: sessionId,
      ipAddress: ip
    });
  }

  async getMe(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
    }
    return this.mapToProfile(user);
  }
}

export const authService = new AuthService();
