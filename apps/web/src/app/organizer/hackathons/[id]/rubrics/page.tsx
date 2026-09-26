'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  apiGetHackathonRubric,
  apiCreateHackathonRubric,
  apiGetOrganizerJudgingMonitor
} from '@/lib/apiClient';
import { Rubric, OrganizerJudgingMonitor } from '@dogfood/shared';

interface CriterionRow {
  name: string;
  description: string;
  weightPercentage: number;
  maxPoints: number;
}

export default function OrganizerRubricsPage() {
  const params = useParams();
  const hackathonId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [monitor, setMonitor] = useState<OrganizerJudgingMonitor | null>(null);

  // Rubric editor state
  const [rubricName, setRubricName] = useState('');
  const [rubricDesc, setRubricDesc] = useState('');
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);

  useEffect(() => {
    loadData();
  }, [hackathonId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load rubric & monitor in parallel
      const [rubricRes, monitorRes] = await Promise.allSettled([
        apiGetHackathonRubric(hackathonId),
        apiGetOrganizerJudgingMonitor(hackathonId)
      ]);

      if (rubricRes.status === 'fulfilled') {
        const r = rubricRes.value;
        setRubric(r);
        setRubricName(r.name);
        setRubricDesc(r.description || '');
        setCriteria(
          r.criteria.map((c) => ({
            name: c.name,
            description: c.description,
            weightPercentage: c.weightPercentage,
            maxPoints: c.maxPoints
          }))
        );
      } else {
        // Defaults if none created yet
        setRubricName('Standard Evaluation Rubric');
        setCriteria([
          { name: 'Technical Execution', description: 'Code quality and system design', weightPercentage: 35, maxPoints: 10 },
          { name: 'Innovation & Novelty', description: 'Originality of solution', weightPercentage: 25, maxPoints: 10 },
          { name: 'Impact & Practicality', description: 'Value delivered to end users', weightPercentage: 25, maxPoints: 10 },
          { name: 'Demo & Presentation', description: 'Clarity of documentation and demo', weightPercentage: 15, maxPoints: 10 }
        ]);
      }

      if (monitorRes.status === 'fulfilled') {
        setMonitor(monitorRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load judging data');
    } finally {
      setLoading(false);
    }
  }

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weightPercentage) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) <= 0.05;

  function addCriterion() {
    setCriteria((prev) => [
      ...prev,
      { name: '', description: '', weightPercentage: 10, maxPoints: 10 }
    ]);
  }

  function removeCriterion(idx: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCriterion(idx: number, field: keyof CriterionRow, val: any) {
    setCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );
  }

  async function handleSaveRubric(e: React.FormEvent) {
    e.preventDefault();
    if (!isWeightValid) {
      setError(`Criteria weights must total exactly 100%. Currently: ${totalWeight.toFixed(2)}%`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const created = await apiCreateHackathonRubric(hackathonId, {
        name: rubricName,
        description: rubricDesc || undefined,
        isActive: true,
        criteria
      });

      setRubric(created);
      setSuccessMsg('Rubric successfully saved and activated for judging!');
    } catch (err: any) {
      setError(err.message || 'Failed to save rubric');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
          <p className="text-slate-400">Loading judging console & rubrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Breadcrumb Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/organizer" className="hover:text-slate-200 transition">
              Organizer
            </Link>
            <span>/</span>
            <Link
              href={`/organizer/hackathons/${hackathonId}`}
              className="hover:text-slate-200 transition"
            >
              Event
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-200">Rubric & Judging Monitor</span>
          </div>
          <Link
            href={`/organizer/hackathons/${hackathonId}/judges`}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            &larr; Judge Pool & Assignments
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">
            Judging Rubric & Progress Monitor
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure weighted evaluation criteria and track judge scoring progress in real-time.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-sm">
            {successMsg}
          </div>
        )}

        {/* 1. MONITOR KPI SECTION */}
        {monitor && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-200">Judging Completion Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Total Assignments
                </span>
                <p className="text-3xl font-extrabold text-slate-100 mt-1 font-mono">
                  {monitor.totalAssignments}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Completed Evaluations
                </span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
                  {monitor.completedEvaluations}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Drafts In Progress
                </span>
                <p className="text-3xl font-extrabold text-amber-400 mt-1 font-mono">
                  {monitor.draftEvaluations}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Overall Completion
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-extrabold text-indigo-400 font-mono">
                    {monitor.completionPercentage}%
                  </p>
                  <span className="text-xs text-slate-500">
                    ({monitor.pendingEvaluations} pending)
                  </span>
                </div>
              </div>
            </div>

            {/* Per Judge & Per Submission Progress Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Judge Progress */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-200 mb-3">Judge Progress</h3>
                {monitor.judgeProgress.length === 0 ? (
                  <p className="text-xs text-slate-500">No judges assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {monitor.judgeProgress.map((jp) => (
                      <div key={jp.judgeId} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300">{jp.judgeName}</span>
                          <span className="text-slate-400 font-mono">
                            {jp.completedCount} / {jp.assignedCount} ({jp.completionPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${jp.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submission Progress */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-200 mb-3">Project Evaluations</h3>
                {monitor.submissionProgress.length === 0 ? (
                  <p className="text-xs text-slate-500">No project assignments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {monitor.submissionProgress.map((sp) => (
                      <div key={sp.submissionId} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300 truncate max-w-[220px]">
                            {sp.submissionTitle}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {sp.completedCount} / {sp.assignedCount} evaluations
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${sp.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 2. RUBRIC CONFIGURATION FORM */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Evaluation Rubric Configuration</h2>
              <p className="text-slate-400 text-xs mt-1">
                Weights must total exactly 100%. Scores are strictly weighted and derived server-side.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border ${
                  isWeightValid
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    : 'bg-red-950/80 text-red-400 border-red-800'
                }`}
              >
                Weight Sum: {totalWeight.toFixed(2)}% {isWeightValid ? '✓' : '(Must be 100%)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveRubric} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Rubric Title
                </label>
                <input
                  type="text"
                  required
                  value={rubricName}
                  onChange={(e) => setRubricName(e.target.value)}
                  placeholder="e.g. Multi-Agent Systems Scoring Rubric"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={rubricDesc}
                  onChange={(e) => setRubricDesc(e.target.value)}
                  placeholder="Brief guidance for judges on expectations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Criteria Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Rubric Criteria
                </h3>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                >
                  + Add Criterion
                </button>
              </div>

              <div className="space-y-3">
                {criteria.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-slate-500 uppercase font-semibold mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={c.name}
                        onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                        placeholder="Criterion name"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-slate-500 uppercase font-semibold mb-1">
                        Guideline Description
                      </label>
                      <input
                        type="text"
                        required
                        value={c.description}
                        onChange={(e) => updateCriterion(idx, 'description', e.target.value)}
                        placeholder="Evaluation instructions..."
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 uppercase font-semibold mb-1">
                        Weight %
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        required
                        value={c.weightPercentage}
                        onChange={(e) =>
                          updateCriterion(idx, 'weightPercentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-center text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[11px] text-slate-500 uppercase font-semibold mb-1">
                        Max
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={c.maxPoints}
                        onChange={(e) =>
                          updateCriterion(idx, 'maxPoints', parseFloat(e.target.value) || 10)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeCriterion(idx)}
                        disabled={criteria.length <= 1}
                        className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                        title="Delete criterion"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving || !isWeightValid}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-sm transition shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Activate Rubric'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
