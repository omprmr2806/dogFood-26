import { dbPool, checkDatabaseHealth } from '../config/database';
import { UserRole } from '@dogfood/shared';
import crypto from 'crypto';

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  status: string;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  // In-memory fallback map for offline mock/unit-test execution when live PostgreSQL container is absent
  private inMemoryUsers: Map<string, UserEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    // Seed standard demo users in in-memory fallback
    const demoUsers: UserEntity[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$BSqafikFjBt+9U1ka9SxTA$Q1Sv0nxglgOx1rWkJ5Yrbg8PRJ781QEb6g2cs4TkcyM',
        full_name: 'Platform Administrator',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'organizer@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$H/TDsgtGR/7taBuLXz0PGQ$dlnlr0O17bolk1JW/3FKxRiWe7+D3PsDzH5Cnvf+5iU',
        full_name: 'Lead Organizer',
        role: UserRole.ORGANIZER,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'judge@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
        full_name: 'Panel Judge',
        role: UserRole.JUDGE,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'participant@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$1dvFHTsFVquJLb5WQe0dPQ$rvWUJHSIlB/24EFenHGhmEzRj2XBX12WaIUqDC4WkZ4',
        full_name: 'Hackathon Participant',
        role: UserRole.PARTICIPANT,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000021',
        email: 'judge.alice@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
        full_name: 'Dr. Alice Algorithm',
        role: UserRole.JUDGE,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000022',
        email: 'judge.bob@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
        full_name: 'Bob Benchmark',
        role: UserRole.JUDGE,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000023',
        email: 'judge.charlie@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
        full_name: 'Charlie Criterion',
        role: UserRole.JUDGE,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000024',
        email: 'judge.diana@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
        full_name: 'Diana Data',
        role: UserRole.JUDGE,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000025',
        email: 'judge.conflict@dogfood.local',
        password_hash: '$argon2id$v=19$m=19456,t=2,p=1$jxu2nKsm8Nm1HswoopD3xg$HaghDc0wS6rqJy0uevC7yxNvjld8Ym7o7DI7y6z+BIg',
        full_name: 'Judge TeamConflict',
        role: UserRole.JUDGE,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const u of demoUsers) {
      this.inMemoryUsers.set(u.email.toLowerCase(), u);
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<UserEntity>(
        'SELECT id, email, password_hash, full_name, role, status, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      return res.rows[0] || null;
    }
    return this.inMemoryUsers.get(email.toLowerCase()) || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<UserEntity>(
        'SELECT id, email, password_hash, full_name, role, status, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      return res.rows[0] || null;
    }
    for (const user of this.inMemoryUsers.values()) {
      if (user.id === id) return user;
    }
    return null;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
  }): Promise<UserEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<UserEntity>(
        `INSERT INTO users (email, password_hash, full_name, role, status)
         VALUES (LOWER($1), $2, $3, $4, 'ACTIVE')
         RETURNING id, email, password_hash, full_name, role, status, created_at, updated_at`,
        [data.email, data.passwordHash, data.fullName, data.role]
      );
      return res.rows[0];
    }

    const newUser: UserEntity = {
      id: crypto.randomUUID(),
      email: data.email.toLowerCase(),
      password_hash: data.passwordHash,
      full_name: data.fullName,
      role: data.role,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryUsers.set(newUser.email, newUser);
    return newUser;
  }

  async findByRole(role: UserRole): Promise<UserEntity[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<UserEntity>(
        'SELECT id, email, password_hash, full_name, role, status, created_at, updated_at FROM users WHERE role = $1 ORDER BY full_name ASC',
        [role]
      );
      return res.rows;
    }
    return Array.from(this.inMemoryUsers.values()).filter(u => u.role === role);
  }
}

export const userRepository = new UserRepository();
