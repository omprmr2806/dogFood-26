'use client';

import { useState, useTransition } from 'react';

interface VoteButtonProps {
  hackathonId: string;
  submissionId: string;
  initialVoteCount: number;
  initialHasVoted: boolean;
  disabled?: boolean;
}

export function VoteButton({
  hackathonId,
  submissionId,
  initialVoteCount,
  initialHasVoted,
  disabled = false,
}: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isPending, startTransition] = useTransition();

  const handleVote = () => {
    if (disabled || isPending) return;

    startTransition(async () => {
      try {
        const method = hasVoted ? 'DELETE' : 'POST';
        const res = await fetch(
          `/api/v1/hackathons/${hackathonId}/votes/${submissionId}`,
          {
            method,
            credentials: 'include',
          }
        );

        if (res.ok || res.status === 409) {
          if (hasVoted) {
            setVoteCount((c) => Math.max(0, c - 1));
            setHasVoted(false);
          } else {
            setVoteCount((c) => c + 1);
            setHasVoted(true);
          }
        }
      } catch {
        // Silently fail — optimistic update already handled
      }
    });
  };

  return (
    <button
      className={`vote-btn${hasVoted ? ' voted' : ''}`}
      onClick={handleVote}
      disabled={disabled || isPending}
      aria-label={hasVoted ? `Remove vote (${voteCount} votes)` : `Cast vote (${voteCount} votes)`}
      aria-pressed={hasVoted}
    >
      <span aria-hidden="true">{hasVoted ? '❤️' : '🤍'}</span>
      <span>{isPending ? '...' : voteCount}</span>
    </button>
  );
}
