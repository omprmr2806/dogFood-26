import { UserRole, HackathonStatus, RegistrationStatus, SubmissionStatus, TeamMemberRole, TeamStatus } from './enums';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface HackathonSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  status: HackathonStatus;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  registrationCount?: number;
  createdAt: string;
}

export interface HackathonDetail extends HackathonSummary {
  description: string;
  rules?: string | null;
  createdBy?: string | null;
  updatedAt: string;
}

export interface Registration {
  id: string;
  hackathonId: string;
  userId: string;
  status: RegistrationStatus;
  registeredAt: string;
  updatedAt: string;
}

export interface RegistrationDetail extends Registration {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  fullName?: string;
  email?: string;
  joinedAt: string;
}

export interface TeamSummary {
  id: string;
  hackathonId: string;
  name: string;
  status: TeamStatus;
  leaderId: string;
  leaderName?: string;
  memberCount: number;
  createdAt: string;
}

export interface TeamDetail {
  id: string;
  hackathonId: string;
  name: string;
  status: TeamStatus;
  inviteCode?: string;
  leaderId: string;
  leaderName?: string;
  members: TeamMember[];
  memberCount: number;
  minTeamSize: number;
  maxTeamSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionSummary {
  id: string;
  hackathonId: string;
  teamId: string;
  teamName: string;
  title: string;
  tagline?: string;
  status: SubmissionStatus;
  createdAt: string;
}
