'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiListHackathonJudges,
  apiGetAvailableJudges,
  apiAddHackathonJudge,
  apiUpdateJudgeStatus,
  apiRemoveHackathonJudge,
  apiGetJudgingConfig,
  apiUpdateJudgingConfig,
  apiListJudgeConflicts,
  apiDeclareJudgeConflict,
  apiRemoveJudgeConflict,
  apiPreviewAssignments,
  apiFinalizeAssignments,
  apiListHackathonAssignments,
  ApiClientError
} from '../../../../../lib/apiClient';
import {
  HackathonDetail,
  HackathonJudge,
  JudgingConfig,
  JudgeConflict,
  JudgeAssignmentItem,
  AssignmentPreviewResult,
  JudgeStatus
} from '@dogfood/shared';

export default function OrganizerJudgesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hackathonId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [judges, setJudges] = useState<HackathonJudge[]>([]);
  const [availableJudges, setAvailableJudges] = useState<Array<{ id: string; email: string; fullName: string; isEnrolled: boolean }>>([]);
  const [config, setConfig] = useState<JudgingConfig | null>(null);
  const [conflicts, setConflicts] = useState<JudgeConflict[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignmentItem[]>([]);
  const [preview, setPreview] = useState<AssignmentPreviewResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [selectedJudgeToAdd, setSelectedJudgeToAdd] = useState<string>('');
  const [judgesPerSubInput, setJudgesPerSubInput] = useState<number>(2);
  const [conflictJudgeId, setConflictJudgeId] = useState<string>('');
  const [conflictReason, setConflictReason] = useState<string>('');
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [h, jList, avail, cfg, confs] = await Promise.all([
        apiGetHackathon(hackathonId),
        apiListHackathonJudges(hackathonId),
        apiGetAvailableJudges(hackathonId),
        apiGetJudgingConfig(hackathonId),
        apiListJudgeConflicts(hackathonId)
      ]);
      setHackathon(h);
      setJudges(jList);
      setAvailableJudges(avail.availableUsers);
      setConfig(cfg);
      setJudgesPerSubInput(cfg.judgesPerSubmission);
      setConflicts(confs);

      if (cfg.assignmentsFinalized) {
        const official = await apiListHackathonAssignments(hackathonId);
        setAssignments(official);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to load judge management data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user, hackathonId]);

  // Handlers
  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJudgeToAdd) return;
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiAddHackathonJudge(hackathonId, { judgeId: selectedJudgeToAdd, status: JudgeStatus.ACTIVE });
      setSuccessMsg('Judge added to hackathon pool.');
      setSelectedJudgeToAdd('');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add judge.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleStatus = async (judge: HackathonJudge) => {
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    const newStatus = judge.status === JudgeStatus.ACTIVE ? JudgeStatus.INACTIVE : JudgeStatus.ACTIVE;
    try {
      await apiUpdateJudgeStatus(hackathonId, judge.judgeId, newStatus);
      setSuccessMsg(`Judge status updated to ${newStatus}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update judge status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveJudge = async (judgeId: string) => {
    if (!confirm('Are you sure you want to remove this judge from the event pool?')) return;
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiRemoveHackathonJudge(hackathonId, judgeId);
      setSuccessMsg('Judge removed from event pool.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove judge.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await apiUpdateJudgingConfig(hackathonId, { judgesPerSubmission: Number(judgesPerSubInput) });
      setConfig(updated);
      setSuccessMsg('Judging configuration saved.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update judging config.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeclareConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictJudgeId || !conflictReason) return;
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiDeclareJudgeConflict(hackathonId, {
        judgeId: conflictJudgeId,
        reason: conflictReason
      });
      setSuccessMsg('Conflict of interest recorded.');
      setConflictJudgeId('');
      setConflictReason('');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to declare conflict.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveConflict = async (conflictId: string) => {
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiRemoveJudgeConflict(hackathonId, conflictId);
      setSuccessMsg('Conflict record removed.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove conflict.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiPreviewAssignments(hackathonId, { judgesPerSubmission: Number(judgesPerSubInput) });
      setPreview(res);
      setSuccessMsg('Deterministic assignment preview generated.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to generate preview.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFinalizeAssignments = async () => {
    if (config?.assignmentsFinalized && !forceRegenerate) {
      setError('Official assignments are already finalized. Check "Regenerate Official Assignments" to proceed.');
      return;
    }

    if (!confirm('Finalize judge assignments? Once finalized, assignments become official and accessible to judges.')) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiFinalizeAssignments(hackathonId, {
        judgesPerSubmission: Number(judgesPerSubInput),
        forceRegenerate
      });
      setSuccessMsg(res.message);
      setPreview(null);
      setForceRegenerate(false);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to finalize assignments.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-6 rounded-lg text-center">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Access Forbidden</h2>
          <p className="text-red-600 dark:text-red-300">
            Only organizers and administrators can manage judges and automated assignments.
          </p>
        </div>
      </div>
    );
  }

  const activeJudgesCount = judges.filter((j) => j.status === JudgeStatus.ACTIVE).length;
  const unenrolledJudges = availableJudges.filter((u) => !u.isEnrolled);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/organizer" className="hover:underline">Organizer</Link>
            <span>/</span>
            <Link href={`/organizer/hackathons/${hackathonId}`} className="hover:underline">
              {hackathon?.name || 'Hackathon'}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Judges & Assignments</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Judge Management & Assignment Engine
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure event judge pool, prevent conflicts of interest, and run deterministic workload-balanced assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/organizer/hackathons/${hackathonId}`}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            ← Back to Overview
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Active Judges</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeJudgesCount}</div>
          <div className="text-xs text-gray-500 mt-1">{judges.length - activeJudgesCount} inactive</div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Judges / Project</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            K = {config?.judgesPerSubmission || 2}
          </div>
          <div className="text-xs text-gray-500 mt-1">Configured target</div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Assignments</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{assignments.length}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {config?.assignmentsFinalized ? 'Official (Finalized)' : 'Pending finalization'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Declared COIs</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{conflicts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Exclusion rules</div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Event Status</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              {hackathon?.status || 'RUNNING'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Phase lifecycle</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Judge Pool & Assignments Engine */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Judge Roster */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Event Judge Pool</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Judges participating in evaluating projects for this event.</p>
              </div>

              {/* Add Judge Form */}
              <form onSubmit={handleAddJudge} className="flex items-center gap-2">
                <select
                  value={selectedJudgeToAdd}
                  onChange={(e) => setSelectedJudgeToAdd(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm"
                  disabled={isActionLoading || unenrolledJudges.length === 0}
                >
                  <option value="">
                    {unenrolledJudges.length > 0 ? '-- Select Judge to Enroll --' : 'No available judges'}
                  </option>
                  {unenrolledJudges.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedJudgeToAdd || isActionLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  Add Judge
                </button>
              </form>
            </div>

            {judges.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No judges enrolled yet. Select an available user above to add them to this hackathon.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-3">Judge</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-center">Workload</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {judges.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{j.judgeFullName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{j.judgeEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                              j.status === JudgeStatus.ACTIVE
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-gray-900 dark:text-white">{j.assignedCount}</span>
                          <span className="text-xs text-gray-400 ml-1">projects</span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleStatus(j)}
                            disabled={isActionLoading}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          >
                            {j.status === JudgeStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                          </button>
                          {!config?.assignmentsFinalized && (
                            <button
                              onClick={() => handleRemoveJudge(j.judgeId)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Automated Assignment Engine */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assignment Engine & Workload Balancer</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Deterministic algorithm: min workload variance, automatic COI exclusion, zero duplicates.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGeneratePreview}
                  disabled={isActionLoading || activeJudgesCount === 0}
                  className="px-4 py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  Generate Preview
                </button>
              </div>
            </div>

            {/* Preview Results Display */}
            {preview && (
              <div className="space-y-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-indigo-900 dark:text-indigo-300">Assignment Preview Summary</h3>
                      <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                        {preview.totalAssignments} total assignments planned across {preview.totalEligibleSubmissions} eligible submissions ({preview.judgesPerSubmission} judges/project).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-semibold">
                        {preview.conflictsAvoided} COIs Prevented
                      </span>
                    </div>
                  </div>

                  {/* Unassignable Submissions Warning */}
                  {preview.unassignableSubmissions.length > 0 && (
                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs">
                      <div className="font-bold mb-1">⚠️ Unassignable Projects Detected:</div>
                      <ul className="list-disc pl-4 space-y-1">
                        {preview.unassignableSubmissions.map((u) => (
                          <li key={u.submissionId}>
                            <span className="font-semibold">{u.title}:</span> {u.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Workload Distribution Table */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Projected Workload Distribution</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {preview.workloadDistribution.map((w) => (
                      <div key={w.judgeId} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{w.judgeName}</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {w.count} <span className="text-xs font-normal text-gray-400">projects</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Finalize Action Box */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">Ready to Finalize?</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Finalizing writes assignments atomically to the database and generates an audit log entry.
                    </p>
                    {config?.assignmentsFinalized && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forceRegenerate}
                          onChange={(e) => setForceRegenerate(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Confirm regeneration of official finalized assignments
                      </label>
                    )}
                  </div>

                  <button
                    onClick={handleFinalizeAssignments}
                    disabled={isActionLoading || preview.unassignableSubmissions.length > 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 shadow-sm"
                  >
                    Finalize Assignments
                  </button>
                </div>
              </div>
            )}

            {/* Official Finalized Assignments Table */}
            {config?.assignmentsFinalized && assignments.length > 0 && !preview && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Official Finalized Assignments</h3>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Active in Database ({assignments.length} assignments)
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-2.5">Project / Submission</th>
                        <th className="px-4 py-2.5">Team</th>
                        <th className="px-4 py-2.5">Assigned Judge</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {assignments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.submissionTitle}</td>
                          <td className="px-4 py-3 text-gray-500">{a.teamName}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{a.judgeName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Judging Config & Conflict of Interest Manager */}
        <div className="space-y-8">
          {/* Judging Settings Form */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Judging Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Event-specific judging configuration.</p>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Judges Per Submission (K)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={judgesPerSubInput}
                  onChange={(e) => setJudgesPerSubInput(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Each project will receive exactly this number of evaluations.
                </p>
              </div>

              <button
                type="submit"
                disabled={isActionLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                Save Settings
              </button>
            </form>
          </div>

          {/* Conflict of Interest (COI) Manager */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Conflict of Interest Rules</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Team membership conflicts are automatically prevented. Declare explicit advisor/mentor conflicts here.
            </p>

            {/* Declare COI Form */}
            <form onSubmit={handleDeclareConflict} className="space-y-3 mb-6 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Judge</label>
                <select
                  value={conflictJudgeId}
                  onChange={(e) => setConflictJudgeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded text-xs"
                  required
                >
                  <option value="">-- Select Judge --</option>
                  {judges.map((j) => (
                    <option key={j.id} value={j.judgeId}>
                      {j.judgeFullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <textarea
                  value={conflictReason}
                  onChange={(e) => setConflictReason(e.target.value)}
                  placeholder="e.g. Academic advisor, former co-founder"
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!conflictJudgeId || !conflictReason || isActionLoading}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
              >
                Record Conflict
              </button>
            </form>

            {/* Conflicts List */}
            {conflicts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center">No explicit conflicts recorded.</p>
            ) : (
              <div className="space-y-2">
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded border border-gray-200 dark:border-gray-800 flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{c.judgeName}</div>
                      <div className="text-gray-500 mt-0.5">{c.reason}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveConflict(c.id)}
                      disabled={isActionLoading}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
