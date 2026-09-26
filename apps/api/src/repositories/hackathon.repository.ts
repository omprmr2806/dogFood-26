import { dbPool, checkDatabaseHealth } from '../config/database';
import { HackathonStatus } from '@dogfood/shared';
import crypto from 'crypto';

export interface HackathonEntity {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  description: string;
  rules?: string | null;
  status: HackathonStatus;
  registration_start?: string | null;
  registration_end?: string | null;
  event_start?: string | null;
  event_end?: string | null;
  min_team_size: number;
  max_team_size: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export class HackathonRepository {
  private inMemoryHackathons: Map<string, HackathonEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    const demos: HackathonEntity[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        slug: 'robotics-sprint-2026',
        name: 'Autonomous Robotics Sprint',
        short_description: 'Early-stage draft hackathon focusing on physical computing and microcontrollers.',
        description: 'Build next-generation robotics applications using local simulation and edge hardware.',
        rules: 'Standard hardware safety guidelines apply. Teams of 2 to 4 members.',
        status: HackathonStatus.DRAFT,
        min_team_size: 2,
        max_team_size: 4,
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        slug: 'dogfood-alpha-2026',
        name: 'Dogfood Alpha Hackathon',
        short_description: 'Open for registration! Build self-hosted, resilient developer tooling.',
        description: 'Welcome to the premier DOGFOOD hackathon. Challenge yourself to build modular platforms.',
        rules: 'All submissions must run via Docker Compose locally. Teams of 1 to 4 members.',
        status: HackathonStatus.OPEN,
        min_team_size: 1,
        max_team_size: 4,
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        slug: 'cloud-systems-2026',
        name: 'Cloud Systems Challenge',
        short_description: 'Currently running! Teams are building distributed monoliths and high-throughput systems.',
        description: 'Engineering competition testing system stability, database normalization, and secure RBAC.',
        rules: 'Code freeze at deadline. Teams of 1 to 5 members.',
        status: HackathonStatus.RUNNING,
        min_team_size: 1,
        max_team_size: 5,
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        slug: 'ai-agents-blitz-2026',
        name: 'AI Agents Blitz',
        short_description: 'Submissions closed; judging evaluation phase is currently active.',
        description: 'Evaluating agentic workflows, autonomous tool calling, and deterministic evaluation engines.',
        rules: 'Judges evaluate submissions against multi-criteria weighted rubrics.',
        status: HackathonStatus.JUDGING,
        min_team_size: 1,
        max_team_size: 4,
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        slug: 'winter-sprint-2025',
        name: 'Winter Code Sprint',
        short_description: 'Completed hackathon archive with finalized normalized leaderboard results.',
        description: 'The 2025 annual winter sprint concluded with over 50 projects evaluated and certified.',
        rules: 'Historical event archive. Read-only.',
        status: HackathonStatus.COMPLETED,
        min_team_size: 1,
        max_team_size: 4,
        created_by: '00000000-0000-0000-0000-000000000002',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const d of demos) {
      this.inMemoryHackathons.set(d.id, d);
    }
  }

  async create(data: {
    slug: string;
    name: string;
    shortDescription?: string;
    description: string;
    rules?: string;
    registrationStart?: string | null;
    registrationEnd?: string | null;
    eventStart?: string | null;
    eventEnd?: string | null;
    minTeamSize?: number;
    maxTeamSize?: number;
    createdBy?: string;
  }): Promise<HackathonEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonEntity>(
        `INSERT INTO hackathons (
          slug, name, short_description, description, rules, status,
          registration_start, registration_end, event_start, event_end,
          min_team_size, max_team_size, created_by
        ) VALUES (
          LOWER($1), $2, $3, $4, $5, 'DRAFT',
          $6, $7, $8, $9,
          $10, $11, $12
        ) RETURNING *`,
        [
          data.slug,
          data.name,
          data.shortDescription || null,
          data.description,
          data.rules || null,
          data.registrationStart || null,
          data.registrationEnd || null,
          data.eventStart || null,
          data.eventEnd || null,
          data.minTeamSize || 1,
          data.maxTeamSize || 4,
          data.createdBy || null
        ]
      );
      return res.rows[0];
    }

    const newHackathon: HackathonEntity = {
      id: crypto.randomUUID(),
      slug: data.slug.toLowerCase(),
      name: data.name,
      short_description: data.shortDescription || null,
      description: data.description,
      rules: data.rules || null,
      status: HackathonStatus.DRAFT,
      registration_start: data.registrationStart || null,
      registration_end: data.registrationEnd || null,
      event_start: data.eventStart || null,
      event_end: data.eventEnd || null,
      min_team_size: data.minTeamSize || 1,
      max_team_size: data.maxTeamSize || 4,
      created_by: data.createdBy || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryHackathons.set(newHackathon.id, newHackathon);
    return newHackathon;
  }

  async findById(id: string): Promise<HackathonEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonEntity>('SELECT * FROM hackathons WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return this.inMemoryHackathons.get(id) || null;
  }

  async findBySlug(slug: string): Promise<HackathonEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonEntity>('SELECT * FROM hackathons WHERE LOWER(slug) = LOWER($1)', [slug]);
      return res.rows[0] || null;
    }
    for (const h of this.inMemoryHackathons.values()) {
      if (h.slug.toLowerCase() === slug.toLowerCase()) return h;
    }
    return null;
  }

  async findByIdOrSlug(identifier: string): Promise<HackathonEntity | null> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (isUUID) {
      const byId = await this.findById(identifier);
      if (byId) return byId;
    }
    return this.findBySlug(identifier);
  }

  async findAll(includeDrafts = false): Promise<HackathonEntity[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const query = includeDrafts
        ? 'SELECT * FROM hackathons ORDER BY created_at DESC'
        : "SELECT * FROM hackathons WHERE status != 'DRAFT' ORDER BY created_at DESC";
      const res = await dbPool.query<HackathonEntity>(query);
      return res.rows;
    }

    const list = Array.from(this.inMemoryHackathons.values());
    if (includeDrafts) {
      return list;
    }
    return list.filter(h => h.status !== HackathonStatus.DRAFT);
  }

  async update(id: string, updates: Partial<HackathonEntity>): Promise<HackathonEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const current = await this.findById(id);
      if (!current) return null;

      const merged = { ...current, ...updates, updated_at: new Date().toISOString() };
      const res = await dbPool.query<HackathonEntity>(
        `UPDATE hackathons SET
          name = $1, short_description = $2, description = $3, rules = $4,
          registration_start = $5, registration_end = $6, event_start = $7, event_end = $8,
          min_team_size = $9, max_team_size = $10, updated_at = CURRENT_TIMESTAMP
        WHERE id = $11 RETURNING *`,
        [
          merged.name,
          merged.short_description || null,
          merged.description,
          merged.rules || null,
          merged.registration_start || null,
          merged.registration_end || null,
          merged.event_start || null,
          merged.event_end || null,
          merged.min_team_size,
          merged.max_team_size,
          id
        ]
      );
      return res.rows[0] || null;
    }

    const existing = this.inMemoryHackathons.get(id);
    if (!existing) return null;

    const updated: HackathonEntity = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.inMemoryHackathons.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: HackathonStatus): Promise<HackathonEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<HackathonEntity>(
        'UPDATE hackathons SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      return res.rows[0] || null;
    }

    const existing = this.inMemoryHackathons.get(id);
    if (!existing) return null;

    existing.status = status;
    existing.updated_at = new Date().toISOString();
    return existing;
  }
}

export const hackathonRepository = new HackathonRepository();
