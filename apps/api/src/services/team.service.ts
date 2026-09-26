import {
  teamRepository,
  TeamRepository,
  TeamEntity,
  TeamMemberWithUser
} from '../repositories/team.repository';
import { hackathonRepository, HackathonRepository } from '../repositories/hackathon.repository';
import { registrationRepository, RegistrationRepository } from '../repositories/registration.repository';
import { auditRepository, AuditRepository } from '../repositories/audit.repository';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';
import {
  HackathonStatus,
  RegistrationStatus,
  TeamMemberRole,
  TeamStatus,
  UserRole,
  TeamSummary,
  TeamDetail,
  TeamMember
} from '@dogfood/shared';

export interface CallingUser {
  id: string;
  email: string;
  role: UserRole;
}

export class TeamService {
  constructor(
    private readonly teamRepo: TeamRepository = teamRepository,
    private readonly hackathonRepo: HackathonRepository = hackathonRepository,
    private readonly regRepo: RegistrationRepository = registrationRepository,
    private readonly userRepo: UserRepository = userRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  private async mapToSummary(team: TeamEntity): Promise<TeamSummary> {
    const memberCount = await this.teamRepo.countTeamMembers(team.id);
    const leader = await this.userRepo.findById(team.leader_id);
    return {
      id: team.id,
      hackathonId: team.hackathon_id,
      name: team.name,
      status: team.status,
      leaderId: team.leader_id,
      leaderName: leader ? leader.full_name : undefined,
      memberCount,
      createdAt: team.created_at
    };
  }

  private async mapToDetail(
    team: TeamEntity,
    members: TeamMemberWithUser[],
    minTeamSize: number,
    maxTeamSize: number,
    isAuthorizedMemberOrOrganizer: boolean
  ): Promise<TeamDetail> {
    const leader = await this.userRepo.findById(team.leader_id);
    const safeMembers: TeamMember[] = members.map((m) => ({
      id: m.id,
      teamId: m.team_id,
      userId: m.user_id,
      role: m.role,
      fullName: m.user_full_name,
      email: isAuthorizedMemberOrOrganizer ? m.user_email : undefined,
      joinedAt: m.joined_at
    }));

    return {
      id: team.id,
      hackathonId: team.hackathon_id,
      name: team.name,
      status: team.status,
      inviteCode: isAuthorizedMemberOrOrganizer ? team.invite_code : undefined,
      leaderId: team.leader_id,
      leaderName: leader ? leader.full_name : undefined,
      members: safeMembers,
      memberCount: members.length,
      minTeamSize,
      maxTeamSize,
      createdAt: team.created_at,
      updatedAt: team.updated_at
    };
  }

  async createTeam(
    hackathonIdentifier: string,
    name: string,
    userId: string
  ): Promise<TeamDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    // 1. Event State Guard: Formation allowed only in OPEN or RUNNING
    if (
      hackathon.status !== HackathonStatus.OPEN &&
      hackathon.status !== HackathonStatus.RUNNING
    ) {
      throw new AppError(
        `Team formation is not permitted. Event "${hackathon.name}" is currently in state [${hackathon.status}].`,
        400,
        'INVALID_EVENT_STATE',
        { status: hackathon.status }
      );
    }

    // 2. Registration Guard: User must be registered and ACCEPTED
    const reg = await this.regRepo.findByUserAndHackathon(userId, hackathon.id);
    if (!reg || reg.status !== RegistrationStatus.ACCEPTED) {
      throw new AppError(
        'You must have an accepted registration for this hackathon before creating a team.',
        403,
        'REGISTRATION_REQUIRED'
      );
    }

    // 3. Single-Team-Per-Hackathon Guard
    const existingMembership = await this.teamRepo.findUserTeamInHackathon(hackathon.id, userId);
    if (existingMembership) {
      throw new AppError(
        `You already belong to team "${existingMembership.team.name}" in this hackathon.`,
        409,
        'ALREADY_IN_TEAM',
        { teamId: existingMembership.team.id, teamName: existingMembership.team.name }
      );
    }

    // 4. Generate unique invite code
    let inviteCode = TeamRepository.generateInviteCode();
    let collisionCheck = await this.teamRepo.findTeamByInviteCode(hackathon.id, inviteCode);
    while (collisionCheck) {
      inviteCode = TeamRepository.generateInviteCode();
      collisionCheck = await this.teamRepo.findTeamByInviteCode(hackathon.id, inviteCode);
    }

    // 5. Create team and add creator as LEADER
    const createdTeam = await this.teamRepo.createTeam({
      hackathonId: hackathon.id,
      name,
      inviteCode,
      leaderId: userId
    });

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'TEAM_CREATED',
      entityType: 'TEAM',
      entityId: createdTeam.id,
      metadata: { hackathonId: hackathon.id, teamName: createdTeam.name }
    });

    const members = await this.teamRepo.getTeamMembers(createdTeam.id);
    return this.mapToDetail(
      createdTeam,
      members,
      hackathon.min_team_size,
      hackathon.max_team_size,
      true // Caller is creator/leader
    );
  }

  async getTeamsByHackathon(hackathonIdentifier: string): Promise<TeamSummary[]> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const teams = await this.teamRepo.findTeamsByHackathon(hackathon.id);
    return Promise.all(teams.map((t) => this.mapToSummary(t)));
  }

  async getTeamById(
    hackathonIdentifier: string,
    teamId: string,
    caller?: CallingUser
  ): Promise<TeamDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const team = await this.teamRepo.findTeamById(teamId);
    if (!team || team.hackathon_id !== hackathon.id || team.status === TeamStatus.DISBANDED) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    const members = await this.teamRepo.getTeamMembers(team.id);
    const isMember = caller ? members.some((m) => m.user_id === caller.id) : false;
    const isPrivileged = caller ? caller.role === UserRole.ADMIN || caller.role === UserRole.ORGANIZER : false;
    const isAuthorized = isMember || isPrivileged;

    return this.mapToDetail(
      team,
      members,
      hackathon.min_team_size,
      hackathon.max_team_size,
      isAuthorized
    );
  }

  async getMyTeam(
    hackathonIdentifier: string,
    userId: string
  ): Promise<TeamDetail | null> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const userTeam = await this.teamRepo.findUserTeamInHackathon(hackathon.id, userId);
    if (!userTeam) {
      return null;
    }

    const members = await this.teamRepo.getTeamMembers(userTeam.team.id);
    return this.mapToDetail(
      userTeam.team,
      members,
      hackathon.min_team_size,
      hackathon.max_team_size,
      true // caller is member of their own team
    );
  }

  async joinTeam(
    hackathonIdentifier: string,
    teamId: string,
    inviteCode: string,
    userId: string
  ): Promise<TeamDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    // 1. Event State Guard
    if (
      hackathon.status !== HackathonStatus.OPEN &&
      hackathon.status !== HackathonStatus.RUNNING
    ) {
      throw new AppError(
        `Team membership cannot be modified. Event "${hackathon.name}" is in state [${hackathon.status}].`,
        400,
        'INVALID_EVENT_STATE',
        { status: hackathon.status }
      );
    }

    // 2. Registration Guard
    const reg = await this.regRepo.findByUserAndHackathon(userId, hackathon.id);
    if (!reg || reg.status !== RegistrationStatus.ACCEPTED) {
      throw new AppError(
        'You must have an accepted registration for this hackathon before joining a team.',
        403,
        'REGISTRATION_REQUIRED'
      );
    }

    // 3. Single Team Guard
    const existingMembership = await this.teamRepo.findUserTeamInHackathon(hackathon.id, userId);
    if (existingMembership) {
      throw new AppError(
        `You already belong to team "${existingMembership.team.name}" in this hackathon.`,
        409,
        'ALREADY_IN_TEAM'
      );
    }

    // 4. Resolve team by ID or by invite code directly
    let team = await this.teamRepo.findTeamById(teamId);
    if (!team) {
      // If teamId was passed as inviteCode directly or fallback
      team = await this.teamRepo.findTeamByInviteCode(hackathon.id, inviteCode || teamId);
    }

    if (!team || team.hackathon_id !== hackathon.id || team.status !== TeamStatus.ACTIVE) {
      throw new AppError('Team not found or is no longer accepting new members.', 404, 'TEAM_NOT_FOUND');
    }

    // 5. Validate invite code
    if (team.invite_code.toLowerCase() !== inviteCode.trim().toLowerCase()) {
      throw new AppError('Invalid team invite code.', 400, 'INVALID_INVITE_CODE');
    }

    // 6. Capacity check & atomic addition
    try {
      await this.teamRepo.addTeamMember({
        teamId: team.id,
        hackathonId: hackathon.id,
        userId,
        role: TeamMemberRole.MEMBER,
        maxTeamSize: hackathon.max_team_size
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'TEAM_FULL') {
        throw new AppError(
          `Team "${team.name}" has reached the maximum capacity of ${hackathon.max_team_size} members.`,
          400,
          'TEAM_CAPACITY_EXCEEDED'
        );
      }
      throw err;
    }

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'TEAM_MEMBER_ADDED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: { hackathonId: hackathon.id, joinedVia: 'INVITE_CODE' }
    });

    const members = await this.teamRepo.getTeamMembers(team.id);
    return this.mapToDetail(
      team,
      members,
      hackathon.min_team_size,
      hackathon.max_team_size,
      true
    );
  }

  async leaveTeam(
    hackathonIdentifier: string,
    teamId: string,
    userId: string
  ): Promise<{ message: string }> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    // Event state guard
    if (
      hackathon.status !== HackathonStatus.OPEN &&
      hackathon.status !== HackathonStatus.RUNNING
    ) {
      throw new AppError(
        `Team membership cannot be modified. Event "${hackathon.name}" is in state [${hackathon.status}].`,
        400,
        'INVALID_EVENT_STATE'
      );
    }

    const team = await this.teamRepo.findTeamById(teamId);
    if (!team || team.hackathon_id !== hackathon.id) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    const member = await this.teamRepo.findTeamMember(team.id, userId);
    if (!member) {
      throw new AppError('You are not a member of this team.', 403, 'NOT_TEAM_MEMBER');
    }

    const allMembers = await this.teamRepo.getTeamMembers(team.id);

    // If leader is leaving:
    if (team.leader_id === userId) {
      if (allMembers.length <= 1) {
        // Disband the empty team
        await this.teamRepo.disbandTeam(team.id);
        await this.teamRepo.removeTeamMember(team.id, userId);

        await this.auditRepo.logAuditEvent({
          userId,
          action: 'TEAM_DISBANDED',
          entityType: 'TEAM',
          entityId: team.id,
          metadata: { reason: 'LEADER_LEFT_LAST_MEMBER' }
        });

        return { message: 'You have left the team. The team was disbanded as no members remain.' };
      }

      // Promote the next senior member to leader
      const nextLeader = allMembers.find((m) => m.user_id !== userId);
      if (nextLeader) {
        await this.teamRepo.updateTeam(team.id, { leader_id: nextLeader.user_id });
        // Update nextLeader role to LEADER in DB
        // For Postgres/in-memory update:
        const currentNextMember = await this.teamRepo.findTeamMember(team.id, nextLeader.user_id);
        if (currentNextMember) {
          currentNextMember.role = TeamMemberRole.LEADER;
        }
      }
    }

    await this.teamRepo.removeTeamMember(team.id, userId);

    await this.auditRepo.logAuditEvent({
      userId,
      action: 'TEAM_LEFT',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: { hackathonId: hackathon.id }
    });

    return { message: 'Successfully left the team.' };
  }

  async removeMember(
    hackathonIdentifier: string,
    teamId: string,
    targetUserId: string,
    caller: CallingUser
  ): Promise<{ message: string }> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const team = await this.teamRepo.findTeamById(teamId);
    if (!team || team.hackathon_id !== hackathon.id) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    // Check if target is a member
    const targetMember = await this.teamRepo.findTeamMember(team.id, targetUserId);
    if (!targetMember) {
      throw new AppError('Target user is not a member of this team.', 404, 'MEMBER_NOT_FOUND');
    }

    // Authorization: Must be LEADER or ORGANIZER or ADMIN
    const isLeader = team.leader_id === caller.id;
    const isPrivileged = caller.role === UserRole.ADMIN || caller.role === UserRole.ORGANIZER;
    const isSelf = caller.id === targetUserId;

    if (!isLeader && !isPrivileged && !isSelf) {
      throw new AppError(
        'Access denied: Only team leaders and organizers can remove other members.',
        403,
        'FORBIDDEN'
      );
    }

    if (isSelf) {
      return this.leaveTeam(hackathonIdentifier, teamId, caller.id);
    }

    // Cannot remove team leader unless privileged organizer/admin
    if (targetMember.role === TeamMemberRole.LEADER && !isPrivileged) {
      throw new AppError('Cannot remove the team leader.', 400, 'CANNOT_REMOVE_LEADER');
    }

    await this.teamRepo.removeTeamMember(team.id, targetUserId);

    await this.auditRepo.logAuditEvent({
      userId: caller.id,
      action: 'TEAM_MEMBER_REMOVED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: { removedUserId: targetUserId }
    });

    return { message: 'Member removed from team.' };
  }

  async updateTeamName(
    hackathonIdentifier: string,
    teamId: string,
    newName: string,
    caller: CallingUser
  ): Promise<TeamDetail> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const team = await this.teamRepo.findTeamById(teamId);
    if (!team || team.hackathon_id !== hackathon.id || team.status === TeamStatus.DISBANDED) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    // Authorization: Only LEADER or ORGANIZER/ADMIN can change name
    const isLeader = team.leader_id === caller.id;
    const isPrivileged = caller.role === UserRole.ADMIN || caller.role === UserRole.ORGANIZER;
    if (!isLeader && !isPrivileged) {
      throw new AppError('Only the team leader or an organizer can update team details.', 403, 'FORBIDDEN');
    }

    const updated = await this.teamRepo.updateTeam(team.id, { name: newName });
    if (!updated) {
      throw new AppError('Failed to update team.', 500, 'UPDATE_FAILED');
    }

    await this.auditRepo.logAuditEvent({
      userId: caller.id,
      action: 'TEAM_UPDATED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: { previousName: team.name, newName }
    });

    const members = await this.teamRepo.getTeamMembers(updated.id);
    return this.mapToDetail(
      updated,
      members,
      hackathon.min_team_size,
      hackathon.max_team_size,
      true
    );
  }

  async disbandTeam(
    hackathonIdentifier: string,
    teamId: string,
    caller: CallingUser
  ): Promise<{ message: string }> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const team = await this.teamRepo.findTeamById(teamId);
    if (!team || team.hackathon_id !== hackathon.id || team.status === TeamStatus.DISBANDED) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    const isLeader = team.leader_id === caller.id;
    const isPrivileged = caller.role === UserRole.ADMIN || caller.role === UserRole.ORGANIZER;
    if (!isLeader && !isPrivileged) {
      throw new AppError('Only the team leader or an organizer can disband a team.', 403, 'FORBIDDEN');
    }

    await this.teamRepo.disbandTeam(team.id);

    await this.auditRepo.logAuditEvent({
      userId: caller.id,
      action: 'TEAM_DISBANDED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: { teamName: team.name }
    });

    return { message: 'Team successfully disbanded.' };
  }

  async regenerateInviteCode(
    hackathonIdentifier: string,
    teamId: string,
    caller: CallingUser
  ): Promise<{ inviteCode: string }> {
    const hackathon = await this.hackathonRepo.findByIdOrSlug(hackathonIdentifier);
    if (!hackathon) {
      throw new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND');
    }

    const team = await this.teamRepo.findTeamById(teamId);
    if (!team || team.hackathon_id !== hackathon.id || team.status !== TeamStatus.ACTIVE) {
      throw new AppError('Team not found or not active.', 404, 'TEAM_NOT_FOUND');
    }

    const isLeader = team.leader_id === caller.id;
    const isPrivileged = caller.role === UserRole.ADMIN || caller.role === UserRole.ORGANIZER;
    if (!isLeader && !isPrivileged) {
      throw new AppError('Only the team leader or an organizer can regenerate invite codes.', 403, 'FORBIDDEN');
    }

    let newCode = TeamRepository.generateInviteCode();
    let collision = await this.teamRepo.findTeamByInviteCode(hackathon.id, newCode);
    while (collision) {
      newCode = TeamRepository.generateInviteCode();
      collision = await this.teamRepo.findTeamByInviteCode(hackathon.id, newCode);
    }

    await this.teamRepo.updateTeam(team.id, { invite_code: newCode });

    await this.auditRepo.logAuditEvent({
      userId: caller.id,
      action: 'TEAM_INVITE_REGENERATED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: { hackathonId: hackathon.id } // Notice: invite code NOT logged in plaintext
    });

    return { inviteCode: newCode };
  }
}

export const teamService = new TeamService();
