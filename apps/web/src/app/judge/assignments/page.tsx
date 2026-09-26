'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import {
  apiGetHackathons,
  apiGetMyJudgeAssignments,
  ApiClientError
} from '../../../lib/apiClient';
import { HackathonSummary, JudgeAssignmentItem, HackathonStatus } from '@dogfood/shared';

export default function JudgeAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();

  const [hackathons, setHackathons] = useState<HackathonSummary[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');
  const [assignments, setAssignments] = useState<JudgeAssignmentItem[]>([]);
  const [stats, setStats] = useState<{ total: number; completed: number; pending: number }>({
    total: 0,
    completed: 0,
    pending: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: fetch hackathons
  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      setError(null);
      try {
        const events = await apiGetHackathons();
        // Prioritize JUDGING and RUNNING hackathons
        const activeEvents = events.filter(
          (h) => h.status === HackathonStatus.JUDGING || h.status === HackathonStatus.RUNNING || h.status === HackathonStatus.COMPLETED
        );
        setHackathons(activeEvents);

        // Auto-select first JUDGING hackathon or first available
        const defaultEvent = activeEvents.find((h) => h.status === HackathonStatus.JUDGING) || activeEvents[0];
        if (defaultEvent) {
          setSelectedHackathonId(defaultEvent.id);
        }
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load judging events.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      loadEvents();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user]);

  // Load assignments when selected event changes
  useEffect(() => {
    async function loadQueue() {
      if (!selectedHackathonId) return;
      setIsQueueLoading(true);
      setError(null);
      try {
        const res = await apiGetMyJudgeAssignments(selectedHackathonId);
        setAssignments(res.assignments);
        setStats(res.stats);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load assigned projects queue.');
        }
        setAssignments([]);
        setStats({ total: 0, completed: 0, pending: 0 });
      } finally {
        setIsQueueLoading(false);
      }
    }

    if (selectedHackathonId && user) {
      loadQueue();
    }
  }, [selectedHackathonId, user]);

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'JUDGE' && user.role !== 'ADMIN')) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Judge Access Required</h2>
          <p className="text-red-600 dark:text-red-300">
            Only designated judges and platform administrators have access to the judging queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Judge Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Assigned Projects Queue
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review assigned hackathon submissions. All assignments are event-specific and conflict-filtered.
          </p>
        </div>

        {/* Event Selector */}
        {hackathons.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Event:</label>
            <select
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-medium"
            >
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
            Total Assigned
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">
            {stats.total}
          </div>
          <div className="text-xs text-gray-500 mt-1">Official finalized assignments</div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
            Completed
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.completed}
          </div>
          <div className="text-xs text-gray-500 mt-1">Evaluated projects</div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
            Pending Evaluation
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.pending}
          </div>
          <div className="text-xs text-gray-500 mt-1">Awaiting scoring</div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Assigned Projects</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Click on any project to view submission details and authorized links.
          </p>
        </div>

        {isQueueLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            Loading assigned queue...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold text-gray-900 dark:text-white">No Assigned Projects Found</div>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Either the event organizer has not finalized judge assignments yet, or you are not currently enrolled as an active judge for this event.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {assignments.map((a, idx) => (
              <div
                key={a.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      {a.submissionTitle}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        a.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  {a.submissionTagline && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {a.submissionTagline}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <span>Team: <strong className="text-gray-700 dark:text-gray-300">{a.teamName}</strong></span>
                    {a.repoUrl && (
                      <a
                        href={a.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Code Repo ↗
                      </a>
                    )}
                    {a.demoUrl && (
                      <a
                        href={a.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Live Demo ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/gallery/${a.submissionId}`}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    View Project Detail ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
