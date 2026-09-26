import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard | DOGFOOD',
  description: 'View the DOGFOOD hackathon leaderboard — final rankings, scores, and community vote counts.',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
