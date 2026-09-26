import { UserRole, HackathonStatus, RegistrationStatus, SubmissionStatus } from './enums';

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
