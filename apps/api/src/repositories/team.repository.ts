import { dbPool, checkDatabaseHealth } from '../config/database';
import { TeamStatus, TeamMemberRole } from '@dogfood/shared';
import { userRepository } from './user.repository';
import crypto from 'crypto';

export interface TeamEntity {
  id: string;
  hackathon_id: string;
  name: string;
  invite_code: string;
  leader_id: string;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberEntity {
  id: string;
  team_id: string;
  user_id: string;
  hackathon_id: string;
  role: TeamMemberRole;
  joined_at: string;
  created_at: string;
}

export interface TeamMemberWithUser extends TeamMemberEntity {
  user_email: string;
  user_full_name: string;
}

export class TeamRepository {
  private inMemoryTeams: Map<string, TeamEntity> = new Map();
  private inMemoryMembers: Map<string, TeamMemberEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    const demoTeams: TeamEntity[] = [
      {
        id: '30000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000002', // dogfood-alpha-2026 (OPEN)
        name: 'Alpha Innovators',
        invite_code: 'DOG-ALPHA1',
        leader_id: '00000000-0000-0000-0000-000000000004', // participant@dogfood.local
        status: TeamStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        hackathon_id: '10000000-0000-0000-0000-000000000002', // dogfood-alpha-2026 (OPEN)
        name: 'Byte Builders',
        invite_code: 'DOG-BYTE99',
        leader_id: '00000000-0000-0000-0000-000000000010', // Bob Builder
        status: TeamStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '30000000-0000-0000-0000-000000000003',
        hackathon_id: '10000000-0000-0000-0000-000000000003', // cloud-systems-2026 (RUNNING)
        name: 'Cloud Runners',
        invite_code: 'DOG-CLOUD3',
        leader_id: '00000000-0000-0000-0000-000000000004', // participant@dogfood.local
        status: TeamStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '30000000-0000-0000-0000-000000000004',
        hackathon_id: '10000000-0000-0000-0000-000000000004', // ai-agents-blitz-2026 (JUDGING)
        name: 'Agentic Explorers',
        invite_code: 'DOG-AGENT4',
        leader_id: '00000000-0000-0000-0000-000000000011',
        status: TeamStatus.LOCKED,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '30000000-0000-0000-0000-000000000005',
        hackathon_id: '10000000-0000-0000-0000-000000000005', // winter-sprint-2025 (COMPLETED)
        name: 'Winter Legends',
        invite_code: 'DOG-WINT55',
        leader_id: '00000000-0000-0000-0000-000000000012',
        status: TeamStatus.LOCKED,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const t of demoTeams) {
      this.inMemoryTeams.set(t.id, t);
    }

    const demoMembers: TeamMemberEntity[] = [
      {
        id: '40000000-0000-0000-0000-000000000001',
        team_id: '30000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000004', // participant (LEADER)
        role: TeamMemberRole.LEADER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        team_id: '30000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000012', // David Designer (MEMBER)
        role: TeamMemberRole.MEMBER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '40000000-0000-0000-0000-000000000003',
        team_id: '30000000-0000-0000-0000-000000000002',
        hackathon_id: '10000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000010', // Bob Builder (LEADER)
        role: TeamMemberRole.LEADER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '40000000-0000-0000-0000-000000000004',
        team_id: '30000000-0000-0000-0000-000000000003',
        hackathon_id: '10000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000004', // participant (LEADER)
        role: TeamMemberRole.LEADER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '40000000-0000-0000-0000-000000000005',
        team_id: '30000000-0000-0000-0000-000000000003',
        hackathon_id: '10000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000010', // Bob Builder (MEMBER)
        role: TeamMemberRole.MEMBER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '40000000-0000-0000-0000-000000000006',
        team_id: '30000000-0000-0000-0000-000000000004',
        hackathon_id: '10000000-0000-0000-0000-000000000004',
        user_id: '00000000-0000-0000-0000-000000000011', // Carol Coder (LEADER)
        role: TeamMemberRole.LEADER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '40000000-0000-0000-0000-000000000007',
        team_id: '30000000-0000-0000-0000-000000000005',
        hackathon_id: '10000000-0000-0000-0000-000000000005',
        user_id: '00000000-0000-0000-0000-000000000012', // David Designer (LEADER)
        role: TeamMemberRole.LEADER,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    ];

    for (const m of demoMembers) {
      this.inMemoryMembers.set(m.id, m);
    }
  }

  static generateInviteCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without easily confused 0, O, 1, I
    let code = 'DOG-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return code;
  }

  async createTeam(data: {
    hackathonId: string;
    name: string;
    inviteCode: string;
    leaderId: string;
  }): Promise<TeamEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        const teamRes = await client.query<TeamEntity>(
          `INSERT INTO teams (hackathon_id, name, invite_code, leader_id, status)
           VALUES ($1, $2, $3, $4, 'ACTIVE')
           RETURNING *`,
          [data.hackathonId, data.name, data.inviteCode, data.leaderId]
        );
        const createdTeam = teamRes.rows[0];

        await client.query(
          `INSERT INTO team_members (team_id, hackathon_id, user_id, role)
           VALUES ($1, $2, $3, 'LEADER')`,
          [createdTeam.id, data.hackathonId, data.leaderId]
        );

        await client.query('COMMIT');
        return createdTeam;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const newTeam: TeamEntity = {
      id: crypto.randomUUID(),
      hackathon_id: data.hackathonId,
      name: data.name,
      invite_code: data.inviteCode,
      leader_id: data.leaderId,
      status: TeamStatus.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryTeams.set(newTeam.id, newTeam);

    const leaderMember: TeamMemberEntity = {
      id: crypto.randomUUID(),
      team_id: newTeam.id,
      hackathon_id: data.hackathonId,
      user_id: data.leaderId,
      role: TeamMemberRole.LEADER,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    this.inMemoryMembers.set(leaderMember.id, leaderMember);

    return newTeam;
  }

  async findTeamById(id: string): Promise<TeamEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<TeamEntity>('SELECT * FROM teams WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return this.inMemoryTeams.get(id) || null;
  }

  async findTeamByInviteCode(hackathonId: string, inviteCode: string): Promise<TeamEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<TeamEntity>(
        'SELECT * FROM teams WHERE hackathon_id = $1 AND LOWER(invite_code) = LOWER($2)',
        [hackathonId, inviteCode]
      );
      return res.rows[0] || null;
    }

    for (const t of this.inMemoryTeams.values()) {
      if (t.hackathon_id === hackathonId && t.invite_code.toLowerCase() === inviteCode.toLowerCase()) {
        return t;
      }
    }
    return null;
  }

  async findTeamsByHackathon(hackathonId: string): Promise<TeamEntity[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<TeamEntity>(
        "SELECT * FROM teams WHERE hackathon_id = $1 AND status != 'DISBANDED' ORDER BY created_at ASC",
        [hackathonId]
      );
      return res.rows;
    }

    const list: TeamEntity[] = [];
    for (const t of this.inMemoryTeams.values()) {
      if (t.hackathon_id === hackathonId && t.status !== TeamStatus.DISBANDED) {
        list.push(t);
      }
    }
    return list;
  }

  async findTeamMember(teamId: string, userId: string): Promise<TeamMemberEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<TeamMemberEntity>(
        'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, userId]
      );
      return res.rows[0] || null;
    }

    for (const m of this.inMemoryMembers.values()) {
      if (m.team_id === teamId && m.user_id === userId) {
        return m;
      }
    }
    return null;
  }

  async findUserTeamInHackathon(hackathonId: string, userId: string): Promise<{ team: TeamEntity; member: TeamMemberEntity } | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<{
        team_id: string;
        team_name: string;
        invite_code: string;
        leader_id: string;
        team_status: TeamStatus;
        team_created_at: string;
        team_updated_at: string;
        member_id: string;
        role: TeamMemberRole;
        joined_at: string;
      }>(
        `SELECT
          t.id as team_id, t.name as team_name, t.invite_code, t.leader_id,
          t.status as team_status, t.created_at as team_created_at, t.updated_at as team_updated_at,
          tm.id as member_id, tm.role, tm.joined_at
         FROM team_members tm
         JOIN teams t ON tm.team_id = t.id
         WHERE tm.hackathon_id = $1 AND tm.user_id = $2 AND t.status != 'DISBANDED'`,
        [hackathonId, userId]
      );

      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        team: {
          id: r.team_id,
          hackathon_id: hackathonId,
          name: r.team_name,
          invite_code: r.invite_code,
          leader_id: r.leader_id,
          status: r.team_status,
          created_at: r.team_created_at,
          updated_at: r.team_updated_at
        },
        member: {
          id: r.member_id,
          team_id: r.team_id,
          user_id: userId,
          hackathon_id: hackathonId,
          role: r.role,
          joined_at: r.joined_at,
          created_at: r.joined_at
        }
      };
    }

    for (const m of this.inMemoryMembers.values()) {
      if (m.hackathon_id === hackathonId && m.user_id === userId) {
        const team = this.inMemoryTeams.get(m.team_id);
        if (team && team.status !== TeamStatus.DISBANDED) {
          return { team, member: m };
        }
      }
    }
    return null;
  }

  async getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<TeamMemberWithUser>(
        `SELECT tm.*, u.email as user_email, u.full_name as user_full_name
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         ORDER BY tm.joined_at ASC`,
        [teamId]
      );
      return res.rows;
    }

    const list: TeamMemberWithUser[] = [];
    for (const m of this.inMemoryMembers.values()) {
      if (m.team_id === teamId) {
        const u = await userRepository.findById(m.user_id);
        list.push({
          ...m,
          user_email: u ? u.email : 'member@dogfood.local',
          user_full_name: u ? u.full_name : 'Team Member'
        });
      }
    }
    return list;
  }

  async countTeamMembers(teamId: string): Promise<number> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
        [teamId]
      );
      return parseInt(res.rows[0]?.count || '0', 10);
    }

    let count = 0;
    for (const m of this.inMemoryMembers.values()) {
      if (m.team_id === teamId) count++;
    }
    return count;
  }

  async addTeamMember(data: {
    teamId: string;
    hackathonId: string;
    userId: string;
    role?: TeamMemberRole;
    maxTeamSize?: number;
  }): Promise<TeamMemberEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        // Lock team row for atomic capacity verification (prevent race conditions)
        const teamCheck = await client.query<TeamEntity>(
          'SELECT * FROM teams WHERE id = $1 FOR UPDATE',
          [data.teamId]
        );
        if (teamCheck.rows.length === 0) {
          throw new Error('TEAM_NOT_FOUND');
        }

        if (data.maxTeamSize) {
          const countRes = await client.query<{ count: string }>(
            'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
            [data.teamId]
          );
          const currentCount = parseInt(countRes.rows[0]?.count || '0', 10);
          if (currentCount >= data.maxTeamSize) {
            throw new Error('TEAM_FULL');
          }
        }

        const res = await client.query<TeamMemberEntity>(
          `INSERT INTO team_members (team_id, hackathon_id, user_id, role)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [data.teamId, data.hackathonId, data.userId, data.role || TeamMemberRole.MEMBER]
        );

        await client.query('COMMIT');
        return res.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // In-memory atomic check
    const currentCount = await this.countTeamMembers(data.teamId);
    if (data.maxTeamSize && currentCount >= data.maxTeamSize) {
      throw new Error('TEAM_FULL');
    }

    const member: TeamMemberEntity = {
      id: crypto.randomUUID(),
      team_id: data.teamId,
      hackathon_id: data.hackathonId,
      user_id: data.userId,
      role: data.role || TeamMemberRole.MEMBER,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    this.inMemoryMembers.set(member.id, member);
    return member;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query(
        'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, userId]
      );
      return (res.rowCount || 0) > 0;
    }

    for (const [id, m] of this.inMemoryMembers.entries()) {
      if (m.team_id === teamId && m.user_id === userId) {
        this.inMemoryMembers.delete(id);
        return true;
      }
    }
    return false;
  }

  async updateTeam(id: string, updates: Partial<TeamEntity>): Promise<TeamEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const current = await this.findTeamById(id);
      if (!current) return null;

      const merged = { ...current, ...updates };
      const res = await dbPool.query<TeamEntity>(
        `UPDATE teams SET
          name = $1, invite_code = $2, leader_id = $3, status = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [merged.name, merged.invite_code, merged.leader_id, merged.status, id]
      );
      return res.rows[0] || null;
    }

    const current = this.inMemoryTeams.get(id);
    if (!current) return null;

    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    this.inMemoryTeams.set(id, updated);
    return updated;
  }

  async disbandTeam(id: string): Promise<boolean> {
    const updated = await this.updateTeam(id, { status: TeamStatus.DISBANDED });
    return !!updated;
  }

  async getTeamMembersForHackathon(hackathonId: string): Promise<Array<{ team_id: string; user_id: string }>> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<{ team_id: string; user_id: string }>(
        'SELECT team_id, user_id FROM team_members WHERE hackathon_id = $1',
        [hackathonId]
      );
      return res.rows;
    }
    const list: Array<{ team_id: string; user_id: string }> = [];
    for (const m of this.inMemoryMembers.values()) {
      if (m.hackathon_id === hackathonId) {
        list.push({ team_id: m.team_id, user_id: m.user_id });
      }
    }
    return list;
  }
}

export const teamRepository = new TeamRepository();
