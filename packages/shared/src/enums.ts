export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  JUDGE = 'JUDGE',
  PARTICIPANT = 'PARTICIPANT'
}

export enum HackathonStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  RUNNING = 'RUNNING',
  JUDGING = 'JUDGING',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CHECKED_IN = 'CHECKED_IN'
}

export enum TeamMemberRole {
  LEADER = 'LEADER',
  MEMBER = 'MEMBER'
}

export enum TeamStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  DISBANDED = 'DISBANDED'
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  DISQUALIFIED = 'DISQUALIFIED'
}

export enum JudgeAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}
