import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Team & Membership Management (/api/v1/hackathons/:id/teams)', () => {
  const app = createApp();

  let adminToken: string;
  let organizerToken: string;
  let participantToken: string;
  let userBobToken: string;
  let userCarolToken: string;
  let userUnregisteredToken: string;

  const openHackathonId = 'dogfood-alpha-2026';
  const judgingHackathonId = 'ai-agents-blitz-2026';

  let createdTeamId: string;
  let createdInviteCode: string;

  beforeAll(async () => {
    // 1. Authenticate standard seeded users
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@dogfood.local', password: 'AdminPass123!' });
    adminToken = adminRes.body.data.token;

    const organizerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'organizer@dogfood.local', password: 'OrganizerPass123!' });
    organizerToken = organizerRes.body.data.token;

    const participantRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'participant@dogfood.local', password: 'ParticipantPass123!' });
    participantToken = participantRes.body.data.token;

    // 2. Register fresh participants for tests
    const bobReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bob.test@dogfood.local', password: 'Password123!', fullName: 'Bob Tester' });
    userBobToken = bobReg.body.data.token;

    const carolReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'carol.test@dogfood.local', password: 'Password123!', fullName: 'Carol Tester' });
    userCarolToken = carolReg.body.data.token;

    const unregRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'unregistered@dogfood.local', password: 'Password123!', fullName: 'Unregistered User' });
    userUnregisteredToken = unregRes.body.data.token;

    // Register Bob and Carol for openHackathonId
    await request(app)
      .post(`/api/v1/hackathons/${openHackathonId}/registrations`)
      .set('Authorization', `Bearer ${userBobToken}`);

    await request(app)
      .post(`/api/v1/hackathons/${openHackathonId}/registrations`)
      .set('Authorization', `Bearer ${userCarolToken}`);
  });

  describe('Team Creation & Eligibility Guards', () => {
    it('should reject unauthenticated team creation with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams`)
        .send({ name: 'Unauth Team' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject team creation by unregistered participant with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams`)
        .set('Authorization', `Bearer ${userUnregisteredToken}`)
        .send({ name: 'Unregistered Team' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REGISTRATION_REQUIRED');
    });

    it('should reject team creation if hackathon is not in OPEN/RUNNING (e.g. JUDGING)', async () => {
      // First register Carol in JUDGING hackathon
      const res = await request(app)
        .post(`/api/v1/hackathons/${judgingHackathonId}/teams`)
        .set('Authorization', `Bearer ${userCarolToken}`)
        .send({ name: 'Judging Team' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_EVENT_STATE');
    });

    it('should reject invalid team name (too short)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams`)
        .set('Authorization', `Bearer ${userBobToken}`)
        .send({ name: 'X' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should allow registered participant (Bob) to create a team and become LEADER', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams`)
        .set('Authorization', `Bearer ${userBobToken}`)
        .send({ name: 'Cyber Titans' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team.name).toBe('Cyber Titans');
      expect(res.body.data.team.inviteCode).toBeDefined();
      expect(res.body.data.team.memberCount).toBe(1);
      expect(res.body.data.team.members[0].role).toBe('LEADER');

      createdTeamId = res.body.data.team.id;
      createdInviteCode = res.body.data.team.inviteCode;
    });

    it('should reject participant creating a second team in the same hackathon with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams`)
        .set('Authorization', `Bearer ${userBobToken}`)
        .send({ name: 'Bob Second Team' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_IN_TEAM');
    });
  });

  describe('Team Retrieval & Privacy Protection', () => {
    it('should list public teams WITHOUT exposing invite codes', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/teams`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.teams)).toBe(true);
      const team = res.body.data.teams.find((t: { id: string }) => t.id === createdTeamId);
      expect(team).toBeDefined();
      expect(team.name).toBe('Cyber Titans');
      expect(team.inviteCode).toBeUndefined();
    });

    it('should NOT leak invite code or member emails to a non-member viewing team details', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${userCarolToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.team.inviteCode).toBeUndefined();
      expect(res.body.data.team.members[0].email).toBeUndefined();
    });

    it('should return invite code and full member details to team member / leader', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${userBobToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.team.inviteCode).toBe(createdInviteCode);
      expect(res.body.data.team.members[0].email).toBeDefined();
    });

    it('should return user own team via /my-team', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/my-team`)
        .set('Authorization', `Bearer ${userBobToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.team).not.toBeNull();
      expect(res.body.data.team.id).toBe(createdTeamId);
    });

    it('should return null for user who does not belong to any team', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/my-team`)
        .set('Authorization', `Bearer ${userCarolToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.team).toBeNull();
    });
  });

  describe('Team Joining & Capacity Enforcement', () => {
    it('should reject joining with invalid invite code', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/join`)
        .set('Authorization', `Bearer ${userCarolToken}`)
        .send({ inviteCode: 'WRONG-CODE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INVITE_CODE');
    });

    it('should allow registered participant (Carol) to join with valid invite code', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/join`)
        .set('Authorization', `Bearer ${userCarolToken}`)
        .send({ inviteCode: createdInviteCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team.memberCount).toBe(2);
      expect(res.body.data.team.members.some((m: { userId: string }) => m.userId.includes(''))).toBe(true);
    });

    it('should reject participant attempting to join a second team in the same hackathon (409)', async () => {
      // Carol tries to join team 1 while already in team
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/30000000-0000-0000-0000-000000000001/join`)
        .set('Authorization', `Bearer ${userCarolToken}`)
        .send({ inviteCode: 'DOG-ALPHA1' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_IN_TEAM');
    });

    it('should enforce max_team_size constraint (capacity check)', async () => {
      // Register 3 extra users to fill up team to max (4)
      const u1 = await request(app).post('/api/v1/auth/register').send({ email: 'u1@dogfood.local', password: 'Password123!', fullName: 'User One' });
      const u2 = await request(app).post('/api/v1/auth/register').send({ email: 'u2@dogfood.local', password: 'Password123!', fullName: 'User Two' });
      const u3 = await request(app).post('/api/v1/auth/register').send({ email: 'u3@dogfood.local', password: 'Password123!', fullName: 'User Three' });

      await request(app).post(`/api/v1/hackathons/${openHackathonId}/registrations`).set('Authorization', `Bearer ${u1.body.data.token}`);
      await request(app).post(`/api/v1/hackathons/${openHackathonId}/registrations`).set('Authorization', `Bearer ${u2.body.data.token}`);
      await request(app).post(`/api/v1/hackathons/${openHackathonId}/registrations`).set('Authorization', `Bearer ${u3.body.data.token}`);

      // u1 joins (size = 3)
      await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/join`)
        .set('Authorization', `Bearer ${u1.body.data.token}`)
        .send({ inviteCode: createdInviteCode });

      // u2 joins (size = 4, max reached)
      await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/join`)
        .set('Authorization', `Bearer ${u2.body.data.token}`)
        .send({ inviteCode: createdInviteCode });

      // u3 attempts to join full team -> 400 TEAM_CAPACITY_EXCEEDED
      const fullRes = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/join`)
        .set('Authorization', `Bearer ${u3.body.data.token}`)
        .send({ inviteCode: createdInviteCode });

      expect(fullRes.status).toBe(400);
      expect(fullRes.body.error.code).toBe('TEAM_CAPACITY_EXCEEDED');
    });
  });

  describe('Leader Permissions, IDOR Protection & Management', () => {
    it('should forbid non-leader (Carol) from updating team name (403 IDOR guard)', async () => {
      const res = await request(app)
        .patch(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${userCarolToken}`)
        .send({ name: 'Hacked Team Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow team leader (Bob) to update team name', async () => {
      const res = await request(app)
        .patch(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${userBobToken}`)
        .send({ name: 'Cyber Titans Elite' });

      expect(res.status).toBe(200);
      expect(res.body.data.team.name).toBe('Cyber Titans Elite');
    });

    it('should allow team leader to regenerate invite code', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/invite-code/regenerate`)
        .set('Authorization', `Bearer ${userBobToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inviteCode).toBeDefined();
      expect(res.body.data.inviteCode).not.toBe(createdInviteCode);
    });

    it('should forbid non-leader from regenerating invite code (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/invite-code/regenerate`)
        .set('Authorization', `Bearer ${userCarolToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow member (Carol) to leave team', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}/leave`)
        .set('Authorization', `Bearer ${userCarolToken}`);

      expect(res.status).toBe(200);

      // Verify Carol no longer has a team
      const myTeam = await request(app)
        .get(`/api/v1/hackathons/${openHackathonId}/my-team`)
        .set('Authorization', `Bearer ${userCarolToken}`);

      expect(myTeam.body.data.team).toBeNull();
    });

    it('should allow organizer to disband or manage team', async () => {
      const res = await request(app)
        .delete(`/api/v1/hackathons/${openHackathonId}/teams/${createdTeamId}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
