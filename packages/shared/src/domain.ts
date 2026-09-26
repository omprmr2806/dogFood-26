import { UserRole, HackathonStatus, SubmissionStatus } from './enums';

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
  status: HackathonStatus;
  startTime: string;
  endTime: string;
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
