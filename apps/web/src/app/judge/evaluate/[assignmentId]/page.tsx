'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  apiGetAssignmentEvaluation,
  apiSaveEvaluationDraft,
  apiSubmitEvaluation
} from '@/lib/apiClient';
import { Rubric, JudgeEvaluation, EvaluationStatus } from '@dogfood/shared';

export default function JudgeEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [assignment, setAssignment] = useState<any>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [evaluation, setEvaluation] = useState<JudgeEvaluation | null>(null);

  // Form state
  const [scores, setScores] = useState<Record<string, { score: number; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState('');

  useEffect(() => {
    loadConsoleData();
  }, [assignmentId]);

  async function loadConsoleData() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetAssignmentEvaluation(assignmentId);
      setAssignment(data.assignment);
      setRubric(data.rubric);
      setEvaluation(data.evaluation);

      // Pre-fill existing evaluation if present
      const initialScores: Record<string, { score: number; feedback: string }> = {};
      data.rubric.criteria.forEach((c) => {
        const existingScore = data.evaluation?.criterionScores.find((cs) => cs.criterionId === c.id);
        initialScores[c.id] = {
          score: existingScore ? existingScore.score : 0,
          feedback: existingScore?.feedback || ''
        };
      });
      setScores(initialScores);
      setOverallFeedback(data.evaluation?.feedback || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation console');
    } finally {
      setLoading(false);
    }
  }

  function handleScoreChange(criterionId: string, value: number, maxPoints: number) {
    const clamped = Math.min(Math.max(value, 0), maxPoints);
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: clamped
      }
    }));
  }

  function handleCriterionFeedbackChange(criterionId: string, feedback: string) {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        feedback
      }
    }));
  }

  // Live client-side weighted preview
  const liveWeightedScore = React.useMemo(() => {
    if (!rubric) return 0;
    let total = 0;
    for (const c of rubric.criteria) {
      const entry = scores[c.id];
      if (entry && c.maxPoints > 0) {
        const normalized = Math.min(Math.max(entry.score / c.maxPoints, 0), 1);
        total += normalized * c.weightPercentage;
      }
    }
    return Math.round(total * 100) / 100;
  }, [rubric, scores]);

  async function handleSaveDraft() {
    if (!rubric) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const scorePayload = Object.entries(scores).map(([criterionId, data]) => ({
        criterionId,
        score: data.score,
        feedback: data.feedback || undefined
      }));

      const updated = await apiSaveEvaluationDraft(assignmentId, {
        scores: scorePayload,
        feedback: overallFeedback || undefined
      });

      setEvaluation(updated);
      setSuccessMsg('Evaluation draft saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitFinal() {
    if (!rubric) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      // Validate all criteria scored
      for (const c of rubric.criteria) {
        const val = scores[c.id];
        if (!val || val.score === undefined || val.score < 0) {
          setError(`Please provide a valid score for criterion: "${c.name}"`);
          setSaving(false);
          return;
        }
      }

      const scorePayload = Object.entries(scores).map(([criterionId, data]) => ({
        criterionId,
        score: data.score,
        feedback: data.feedback || undefined
      }));

      const updated = await apiSubmitEvaluation(assignmentId, {
        scores: scorePayload,
        feedback: overallFeedback || undefined
      });

      setEvaluation(updated);
      setSuccessMsg('Evaluation submitted and finalized! Scores are locked.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
          <p className="text-slate-400">Loading evaluation console...</p>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Error</h2>
          <p className="text-slate-300 text-sm mb-6">{error}</p>
          <Link
            href="/judge/assignments"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
          >
            &larr; Back to Assigned Projects
          </Link>
        </div>
      </div>
    );
  }

  const isSubmitted = evaluation?.status === EvaluationStatus.SUBMITTED;
  const isLocked = evaluation?.status === EvaluationStatus.LOCKED;
  const isReadOnly = isSubmitted || isLocked;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/judge/assignments"
              className="text-slate-400 hover:text-slate-200 text-sm transition font-medium flex items-center gap-1"
            >
              &larr; All Assignments
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-semibold text-slate-200 truncate max-w-xs">
              {assignment?.submission_title || 'Project Evaluation'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                isSubmitted
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  : isLocked
                  ? 'bg-purple-950/80 text-purple-400 border border-purple-800'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800'
              }`}
            >
              {evaluation?.status || 'NOT STARTED'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Project Overview */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-400">
                {assignment?.hackathon_name}
              </span>
              <h1 className="text-2xl font-bold text-slate-100 mt-1">
                {assignment?.submission_title}
              </h1>
              {assignment?.submission_tagline && (
                <p className="text-slate-400 text-sm mt-1 italic">
                  &ldquo;{assignment.submission_tagline}&rdquo;
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">Team: {assignment?.team_name}</p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
              {assignment?.repo_url && (
                <a
                  href={assignment.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border border-slate-700"
                >
                  <span>Repository</span> &#8599;
                </a>
              )}
              {assignment?.demo_url && (
                <a
                  href={assignment.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border border-indigo-800"
                >
                  <span>Live Demo</span> &#8599;
                </a>
              )}
            </div>

            {/* Tech Stack */}
            {assignment?.submission_tech_stack && assignment.submission_tech_stack.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Technology Stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {assignment.submission_tech_stack.map((t: string) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-slate-800/80 text-slate-300 text-xs rounded border border-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Project Description
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {assignment?.submission_description}
              </p>
            </div>
          </div>

          {/* Real-time score indicator */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-900/50 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
              Evaluation Score Preview
            </h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-amber-300 font-mono">
                {isSubmitted ? evaluation?.rawWeightedScore : liveWeightedScore}
              </span>
              <span className="text-slate-400 text-sm font-medium">/ 100.00 Raw Weighted</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Calculated via server-side weighted sum formula. Each criterion contributes:
              <br />
              <code className="text-slate-300 font-mono text-[11px]">
                (criterion_score / max_points) &times; weight%
              </code>
            </p>
          </div>
        </section>

        {/* Right Column: Rubric Scoring Console */}
        <section className="lg:col-span-7 space-y-6">
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

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{rubric?.name}</h2>
                {rubric?.description && (
                  <p className="text-slate-400 text-xs mt-0.5">{rubric.description}</p>
                )}
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
                {rubric?.criteria.length} Criteria
              </span>
            </div>

            {/* Criteria Cards */}
            <div className="space-y-5">
              {rubric?.criteria.map((c, idx) => {
                const cur = scores[c.id] || { score: 0, feedback: '' };
                const normalizedContrib =
                  c.maxPoints > 0 ? (cur.score / c.maxPoints) * c.weightPercentage : 0;

                return (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-200">{c.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 text-xs font-semibold rounded border border-amber-800">
                          {c.weightPercentage}% weight
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded border border-slate-700">
                          Max: {c.maxPoints}
                        </span>
                      </div>
                    </div>

                    {/* Score Slider & Input */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max={c.maxPoints}
                          step="0.5"
                          disabled={isReadOnly}
                          value={cur.score}
                          onChange={(e) =>
                            handleScoreChange(c.id, parseFloat(e.target.value) || 0, c.maxPoints)
                          }
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max={c.maxPoints}
                          step="0.1"
                          disabled={isReadOnly}
                          value={cur.score}
                          onChange={(e) =>
                            handleScoreChange(c.id, parseFloat(e.target.value) || 0, c.maxPoints)
                          }
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-mono text-center font-bold text-amber-300 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        />
                        <span className="text-xs text-slate-500 font-mono">
                          (+{normalizedContrib.toFixed(2)} pts)
                        </span>
                      </div>
                    </div>

                    {/* Criterion Feedback */}
                    <input
                      type="text"
                      placeholder="Optional criterion-specific feedback notes..."
                      disabled={isReadOnly}
                      value={cur.feedback}
                      onChange={(e) => handleCriterionFeedbackChange(c.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                    />
                  </div>
                );
              })}
            </div>

            {/* Overall Feedback */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Overall Feedback & Deliberation Notes
              </label>
              <textarea
                rows={4}
                disabled={isReadOnly}
                placeholder="Provide constructive feedback for the team regarding technical execution, originality, and suggestions for improvement..."
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            {/* Action Bar */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                {isReadOnly ? (
                  <span className="text-xs text-slate-400 italic">
                    Evaluation is {evaluation?.status}. Contact organizer if an unlock is required.
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    Drafts can be revisited anytime before submitting.
                  </span>
                )}
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitFinal}
                    disabled={saving}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {saving ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
