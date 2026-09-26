import { dbPool, checkDatabaseHealth } from '../config/database';
import { SubmissionStatus, GalleryQuery } from '@dogfood/shared';
import crypto from 'crypto';

export interface SubmissionEntity {
  id: string;
  hackathon_id: string;
  team_id: string;
  title: string;
  tagline: string | null;
  description: string;
  problem_statement: string | null;
  solution: string | null;
  technology_stack: string[];
  repo_url: string | null;
  demo_url: string | null;
  demo_video_url: string | null;
  presentation_url: string | null;
  cover_image_path: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionWithDetails extends SubmissionEntity {
  team_name: string;
  hackathon_name: string;
  hackathon_slug: string;
}

export interface SubmissionVersionEntity {
  id: string;
  submission_id: string;
  version_number: number;
  snapshot_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export class SubmissionRepository {
  private inMemorySubmissions: Map<string, SubmissionEntity> = new Map();
  private inMemoryVersions: Map<string, SubmissionVersionEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    const demoSubmissions: SubmissionEntity[] = [
      {
        id: '50000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000003', // cloud-systems-2026 (RUNNING)
        team_id: '30000000-0000-0000-0000-000000000003', // Cloud Runners
        title: 'NebulaStream: Edge Telemetry Pipeline',
        tagline: 'Real-time edge event aggregation and telemetry ingestion engine',
        description: 'NebulaStream processes high-frequency IoT telemetry at edge clusters with minimal CPU overhead and zero internet dependency.',
        problem_statement: 'Edge microcontrollers frequently lose cellular connectivity, leading to dropped sensor readings in industrial environments.',
        solution: 'A local ring-buffer store with gossip-protocol batch synchronization when gateway connectivity is restored.',
        technology_stack: ['Rust', 'WebAssembly', 'PostgreSQL', 'Docker'],
        repo_url: 'https://github.com/dogfood/nebulastream',
        demo_url: 'https://nebulastream.local:8080',
        demo_video_url: 'https://youtu.be/dummy-nebulastream',
        presentation_url: 'https://slides.local/nebulastream',
        cover_image_path: null,
        status: SubmissionStatus.DRAFT,
        submitted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        hackathon_id: '10000000-0000-0000-0000-000000000003', // cloud-systems-2026 (RUNNING)
        team_id: '30000000-0000-0000-0000-000000000006', // Serverless Stars
        title: 'SkyScale: Distributed Micro-VM Orchestrator',
        tagline: 'Self-healing micro-VM scheduler with zero-downtime reconfiguration',
        description: 'SkyScale delivers sub-second cold starts for multi-tenant microVM execution using lightweight Linux KVM virtualization.',
        problem_statement: 'Traditional container schedulers add unacceptable latency and memory footprint on resource-constrained server nodes.',
        solution: 'A lightweight Raft-consensus supervisor managing Firecracker microVMs over local unix sockets.',
        technology_stack: ['Go', 'Linux KVM', 'Firecracker', 'gRPC'],
        repo_url: 'https://github.com/dogfood/skyscale',
        demo_url: 'https://skyscale.local',
        demo_video_url: 'https://vimeo.com/dummy-skyscale',
        presentation_url: 'https://slides.local/skyscale',
        cover_image_path: null,
        status: SubmissionStatus.SUBMITTED,
        submitted_at: '2026-03-15T14:30:00.000Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        hackathon_id: '10000000-0000-0000-0000-000000000004', // ai-agents-blitz-2026 (JUDGING)
        team_id: '30000000-0000-0000-0000-000000000004', // Agentic Explorers
        title: 'CognitiveFlow: Self-Reflecting Coding Subagents',
        tagline: 'Autonomous multi-agent consensus for complex codebase refactoring',
        description: 'CognitiveFlow orchestrates specialized local LLM agents cooperating over an AST graph to eliminate software bugs autonomously.',
        problem_statement: 'Single-agent code generation frequently hallucinates API contracts and introduces regression bugs.',
        solution: 'A triple-agent consensus cycle: Planner proposes, Coder writes AST transformations, Verifier compiles and tests locally.',
        technology_stack: ['Python', 'TypeScript', 'Tree-sitter', 'Ollama'],
        repo_url: 'https://github.com/dogfood/cognitiveflow',
        demo_url: 'https://cognitiveflow.local',
        demo_video_url: 'https://youtube.com/watch?v=dummy-cognitiveflow',
        presentation_url: 'https://slides.local/cognitiveflow',
        cover_image_path: null,
        status: SubmissionStatus.LOCKED,
        submitted_at: '2026-02-28T23:55:00.000Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '50000000-0000-0000-0000-000000000004',
        hackathon_id: '10000000-0000-0000-0000-000000000005', // winter-sprint-2025 (COMPLETED)
        team_id: '30000000-0000-0000-0000-000000000005', // Winter Legends
        title: 'FrostByte: Zero-Knowledge Decentralized Vault',
        tagline: 'Offline-first sovereign identity proofs using succinct cryptographic arguments',
        description: 'FrostByte enables credential verification without disclosing sensitive participant metadata using client-generated zk-SNARKs.',
        problem_statement: 'Centralized credential registries suffer data breaches and violate user privacy.',
        solution: 'Cryptographic identity credentials verified via offline Groth16 zk-SNARK circuit evaluators.',
        technology_stack: ['Circom', 'TypeScript', 'IndexedDB', 'WebAssembly'],
        repo_url: 'https://github.com/dogfood/frostbyte',
        demo_url: 'https://frostbyte.local',
        demo_video_url: 'https://youtu.be/dummy-frostbyte',
        presentation_url: 'https://slides.local/frostbyte',
        cover_image_path: null,
        status: SubmissionStatus.FINALIZED,
        submitted_at: '2025-12-19T18:00:00.000Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '50000000-0000-0000-0000-000000000005',
        hackathon_id: '10000000-0000-0000-0000-000000000005', // winter-sprint-2025 (COMPLETED)
        team_id: '30000000-0000-0000-0000-000000000007', // Rogue Operators
        title: 'SpamBot: Automated Web Scraping Cluster',
        tagline: 'High throughput web scraper bypassing anti-bot defenses',
        description: 'Automated cluster attempting to evade platform rate limits.',
        problem_statement: 'Data scraping without permission.',
        solution: 'Violated hackathon terms of service.',
        technology_stack: ['Node.js', 'Puppeteer'],
        repo_url: 'https://github.com/dogfood/spambot',
        demo_url: null,
        demo_video_url: null,
        presentation_url: null,
        cover_image_path: null,
        status: SubmissionStatus.DISQUALIFIED,
        submitted_at: '2025-12-18T10:00:00.000Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const sub of demoSubmissions) {
      this.inMemorySubmissions.set(sub.id, sub);
    }
  }

  async create(data: {
    hackathonId: string;
    teamId: string;
    title: string;
    tagline?: string;
    description: string;
    problemStatement?: string;
    solution?: string;
    technologyStack?: string[];
    repoUrl?: string;
    demoUrl?: string;
    demoVideoUrl?: string;
    presentationUrl?: string;
    coverImagePath?: string;
  }): Promise<SubmissionEntity> {
    const isDbConnected = await checkDatabaseHealth();
    const id = crypto.randomUUID();
    const techStack = data.technologyStack || [];

    if (isDbConnected) {
      const res = await dbPool.query<SubmissionEntity>(
        `INSERT INTO submissions (
          id, hackathon_id, team_id, title, tagline, description,
          problem_statement, solution, technology_stack, repo_url,
          demo_url, demo_video_url, presentation_url, cover_image_path,
          status, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT', NULL)
        RETURNING *`,
        [
          id,
          data.hackathonId,
          data.teamId,
          data.title,
          data.tagline || null,
          data.description,
          data.problemStatement || null,
          data.solution || null,
          techStack,
          data.repoUrl || null,
          data.demoUrl || null,
          data.demoVideoUrl || null,
          data.presentationUrl || null,
          data.coverImagePath || null
        ]
      );
      return res.rows[0];
    }

    const sub: SubmissionEntity = {
      id,
      hackathon_id: data.hackathonId,
      team_id: data.teamId,
      title: data.title,
      tagline: data.tagline || null,
      description: data.description,
      problem_statement: data.problemStatement || null,
      solution: data.solution || null,
      technology_stack: techStack,
      repo_url: data.repoUrl || null,
      demo_url: data.demoUrl || null,
      demo_video_url: data.demoVideoUrl || null,
      presentation_url: data.presentationUrl || null,
      cover_image_path: data.coverImagePath || null,
      status: SubmissionStatus.DRAFT,
      submitted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemorySubmissions.set(id, sub);
    return sub;
  }

  async findById(id: string): Promise<SubmissionWithDetails | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<SubmissionWithDetails>(
        `SELECT
          s.*,
          t.name AS team_name,
          h.name AS hackathon_name,
          h.slug AS hackathon_slug
        FROM submissions s
        JOIN teams t ON s.team_id = t.id
        JOIN hackathons h ON s.hackathon_id = h.id
        WHERE s.id = $1`,
        [id]
      );
      return res.rows[0] || null;
    }

    const sub = this.inMemorySubmissions.get(id);
    if (!sub) return null;
    return {
      ...sub,
      team_name: 'Team ' + sub.team_id.substring(0, 8),
      hackathon_name: 'Hackathon Event',
      hackathon_slug: 'event-slug'
    };
  }

  async findByTeamId(teamId: string): Promise<SubmissionEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<SubmissionEntity>(
        `SELECT * FROM submissions WHERE team_id = $1`,
        [teamId]
      );
      return res.rows[0] || null;
    }

    for (const sub of this.inMemorySubmissions.values()) {
      if (sub.team_id === teamId) return sub;
    }
    return null;
  }

  async findByHackathonId(hackathonId: string): Promise<SubmissionWithDetails[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<SubmissionWithDetails>(
        `SELECT
          s.*,
          t.name AS team_name,
          h.name AS hackathon_name,
          h.slug AS hackathon_slug
        FROM submissions s
        JOIN teams t ON s.team_id = t.id
        JOIN hackathons h ON s.hackathon_id = h.id
        WHERE s.hackathon_id = $1
        ORDER BY s.created_at DESC`,
        [hackathonId]
      );
      return res.rows;
    }

    const results: SubmissionWithDetails[] = [];
    for (const sub of this.inMemorySubmissions.values()) {
      if (sub.hackathon_id === hackathonId) {
        results.push({
          ...sub,
          team_name: 'Team ' + sub.team_id.substring(0, 8),
          hackathon_name: 'Hackathon Event',
          hackathon_slug: 'event-slug'
        });
      }
    }
    return results;
  }

  async update(id: string, updates: Partial<SubmissionEntity>): Promise<SubmissionEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const current = await this.findById(id);
      if (!current) return null;

      const merged = { ...current, ...updates };
      const res = await dbPool.query<SubmissionEntity>(
        `UPDATE submissions SET
          title = $1, tagline = $2, description = $3,
          problem_statement = $4, solution = $5, technology_stack = $6,
          repo_url = $7, demo_url = $8, demo_video_url = $9,
          presentation_url = $10, cover_image_path = $11, status = $12,
          submitted_at = $13, updated_at = CURRENT_TIMESTAMP
         WHERE id = $14 RETURNING *`,
        [
          merged.title,
          merged.tagline,
          merged.description,
          merged.problem_statement,
          merged.solution,
          merged.technology_stack,
          merged.repo_url,
          merged.demo_url,
          merged.demo_video_url,
          merged.presentation_url,
          merged.cover_image_path,
          merged.status,
          merged.submitted_at,
          id
        ]
      );
      return res.rows[0] || null;
    }

    const current = this.inMemorySubmissions.get(id);
    if (!current) return null;

    const updated = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.inMemorySubmissions.set(id, updated);
    return updated;
  }

  async createVersion(submissionId: string, snapshotData: Record<string, unknown>, createdBy?: string): Promise<SubmissionVersionEntity> {
    const isDbConnected = await checkDatabaseHealth();
    const id = crypto.randomUUID();

    if (isDbConnected) {
      // Determine version number
      const verRes = await dbPool.query<{ next_version: number }>(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM submission_versions WHERE submission_id = $1`,
        [submissionId]
      );
      const nextVersion = verRes.rows[0]?.next_version || 1;

      const res = await dbPool.query<SubmissionVersionEntity>(
        `INSERT INTO submission_versions (id, submission_id, version_number, snapshot_data, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, submissionId, nextVersion, JSON.stringify(snapshotData), createdBy || null]
      );
      return res.rows[0];
    }

    let maxVer = 0;
    for (const v of this.inMemoryVersions.values()) {
      if (v.submission_id === submissionId && v.version_number > maxVer) {
        maxVer = v.version_number;
      }
    }
    const version: SubmissionVersionEntity = {
      id,
      submission_id: submissionId,
      version_number: maxVer + 1,
      snapshot_data: snapshotData,
      created_by: createdBy || null,
      created_at: new Date().toISOString()
    };
    this.inMemoryVersions.set(id, version);
    return version;
  }

  async getVersions(submissionId: string): Promise<SubmissionVersionEntity[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<SubmissionVersionEntity>(
        `SELECT * FROM submission_versions WHERE submission_id = $1 ORDER BY version_number ASC`,
        [submissionId]
      );
      return res.rows;
    }

    const versions: SubmissionVersionEntity[] = [];
    for (const v of this.inMemoryVersions.values()) {
      if (v.submission_id === submissionId) {
        versions.push(v);
      }
    }
    return versions.sort((a, b) => a.version_number - b.version_number);
  }

  async findGallerySubmissions(query: GalleryQuery): Promise<{ items: SubmissionWithDetails[]; total: number }> {
    const isDbConnected = await checkDatabaseHealth();
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 12));
    const offset = (page - 1) * limit;

    const publicStatuses = [
      SubmissionStatus.SUBMITTED,
      SubmissionStatus.LOCKED,
      SubmissionStatus.UNDER_REVIEW,
      SubmissionStatus.FINALIZED
    ];

    if (isDbConnected) {
      const conditions: string[] = [`s.status = ANY($1)`];
      const params: (string | string[] | number)[] = [publicStatuses];
      let paramIdx = 2;

      if (query.hackathonId) {
        conditions.push(`s.hackathon_id = $${paramIdx}`);
        params.push(query.hackathonId);
        paramIdx++;
      }

      if (query.search) {
        conditions.push(`(s.title ILIKE $${paramIdx} OR s.tagline ILIKE $${paramIdx} OR s.description ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      if (query.technology) {
        conditions.push(`$${paramIdx} = ANY(s.technology_stack)`);
        params.push(query.technology);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      const countRes = await dbPool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM submissions s WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const itemsRes = await dbPool.query<SubmissionWithDetails>(
        `SELECT
          s.*,
          t.name AS team_name,
          h.name AS hackathon_name,
          h.slug AS hackathon_slug
        FROM submissions s
        JOIN teams t ON s.team_id = t.id
        JOIN hackathons h ON s.hackathon_id = h.id
        WHERE ${whereClause}
        ORDER BY s.submitted_at DESC NULLS LAST, s.created_at DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      );

      return { items: itemsRes.rows, total };
    }

    // In-memory fallback
    let filtered = Array.from(this.inMemorySubmissions.values()).filter(s =>
      publicStatuses.includes(s.status)
    );

    if (query.hackathonId) {
      filtered = filtered.filter(s => s.hackathon_id === query.hackathonId);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchLower) ||
        (s.tagline && s.tagline.toLowerCase().includes(searchLower)) ||
        s.description.toLowerCase().includes(searchLower)
      );
    }

    if (query.technology) {
      const techLower = query.technology.toLowerCase();
      filtered = filtered.filter(s =>
        s.technology_stack.some(t => t.toLowerCase() === techLower)
      );
    }

    const total = filtered.length;
    const pageItems = filtered.slice(offset, offset + limit).map(sub => ({
      ...sub,
      team_name: 'Team ' + sub.team_id.substring(0, 8),
      hackathon_name: 'Hackathon Event',
      hackathon_slug: 'event-slug'
    }));

    return { items: pageItems, total };
  }
}

export const submissionRepository = new SubmissionRepository();
