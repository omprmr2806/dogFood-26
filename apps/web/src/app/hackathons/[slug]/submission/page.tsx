'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import {
  apiGetHackathon,
  apiGetMyTeam,
  apiGetMySubmission,
  apiCreateSubmission,
  apiUpdateSubmission,
  apiSubmitProject,
  ApiClientError
} from '../../../../lib/apiClient';
import {
  HackathonDetail,
  TeamDetail,
  SubmissionDetail,
  SubmissionStatus,
  HackathonStatus
} from '@dogfood/shared';

export default function SubmissionPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [solution, setSolution] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [h, t, s] = await Promise.all([
          apiGetHackathon(slug),
          apiGetMyTeam(slug),
          apiGetMySubmission(slug)
        ]);
        setHackathon(h);
        setTeam(t);
        setSubmission(s);

        if (s) {
          setTitle(s.title || '');
          setTagline(s.tagline || '');
          setDescription(s.description || '');
          setProblemStatement(s.problemStatement || '');
          setSolution(s.solution || '');
          setTechStackInput((s.technologyStack || []).join(', '));
          setRepoUrl(s.repoUrl || '');
          setDemoUrl(s.demoUrl || '');
          setDemoVideoUrl(s.demoVideoUrl || '');
          setPresentationUrl(s.presentationUrl || '');
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load submission data.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push(`/login?redirect=/hackathons/${slug}/submission`);
      } else {
        load();
      }
    }
  }, [slug, user, authLoading, router]);

  const isLockedForJudging =
    hackathon?.status === HackathonStatus.JUDGING ||
    hackathon?.status === HackathonStatus.COMPLETED ||
    hackathon?.status === HackathonStatus.ARCHIVED ||
    submission?.status === SubmissionStatus.LOCKED ||
    submission?.status === SubmissionStatus.FINALIZED ||
    submission?.status === SubmissionStatus.DISQUALIFIED;

  const parseTechStack = (input: string): string[] => {
    return input
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedForJudging) return;

    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const payload = {
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        problemStatement: problemStatement.trim() || undefined,
        solution: solution.trim() || undefined,
        technologyStack: parseTechStack(techStackInput),
        repoUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        demoVideoUrl: demoVideoUrl.trim() || undefined,
        presentationUrl: presentationUrl.trim() || undefined
      };

      let result: SubmissionDetail;
      if (submission) {
        result = await apiUpdateSubmission(submission.id, payload);
      } else {
        result = await apiCreateSubmission(slug, payload);
      }

      setSubmission(result);
      setSuccessMsg('Submission draft saved successfully!');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to save draft.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (isLockedForJudging) return;

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      // First save latest edits if draft exists
      const payload = {
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        problemStatement: problemStatement.trim() || undefined,
        solution: solution.trim() || undefined,
        technologyStack: parseTechStack(techStackInput),
        repoUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        demoVideoUrl: demoVideoUrl.trim() || undefined,
        presentationUrl: presentationUrl.trim() || undefined
      };

      let subId = submission?.id;
      if (submission) {
        await apiUpdateSubmission(submission.id, payload);
      } else {
        const created = await apiCreateSubmission(slug, payload);
        subId = created.id;
      }

      // Then trigger final submission
      const finalized = await apiSubmitProject(subId!);
      setSubmission(finalized);
      setSuccessMsg('Congratulations! Your project has been officially submitted and is ready for judging.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to submit project.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', color: '#888' }}>
        <p>Loading submission workspace...</p>
      </div>
    );
  }

  // No team condition
  if (!team) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <Link href={`/hackathons/${slug}`} style={{ color: '#0066cc', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
          &larr; Back to {hackathon?.name || 'Hackathon'}
        </Link>
        <div style={{ border: '1px solid #e1e4e8', borderRadius: '8px', padding: '32px', textAlign: 'center', backgroundColor: '#fff' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Team Required for Project Submission</h2>
          <p style={{ color: '#586069', marginBottom: '24px', lineHeight: '1.6' }}>
            To create and submit a project for <strong>{hackathon?.name}</strong>, you must first create or join a team.
          </p>
          <Link
            href={`/hackathons/${slug}/teams`}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0366d6',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            Form or Join a Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link href={`/hackathons/${slug}`} style={{ color: '#0066cc', textDecoration: 'none', marginRight: '16px' }}>
            &larr; {hackathon?.name}
          </Link>
          <Link href={`/hackathons/${slug}/my-team`} style={{ color: '#586069', textDecoration: 'none' }}>
            Team: {team.name}
          </Link>
        </div>
        <div>
          <Link
            href="/gallery"
            style={{
              fontSize: '13px',
              color: '#0366d6',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Browse Public Gallery &rarr;
          </Link>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Project Submission</h1>
          <p style={{ color: '#586069', margin: 0 }}>
            Team: <strong>{team.name}</strong> &bull; Hackathon: <strong>{hackathon?.name}</strong>
          </p>
        </div>
        {submission && (
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor:
                  submission.status === SubmissionStatus.SUBMITTED
                    ? '#d4edda'
                    : submission.status === SubmissionStatus.LOCKED || submission.status === SubmissionStatus.FINALIZED
                    ? '#d1ecf1'
                    : submission.status === SubmissionStatus.DISQUALIFIED
                    ? '#f8d7da'
                    : '#fff3cd',
                color:
                  submission.status === SubmissionStatus.SUBMITTED
                    ? '#155724'
                    : submission.status === SubmissionStatus.LOCKED || submission.status === SubmissionStatus.FINALIZED
                    ? '#0c5460'
                    : submission.status === SubmissionStatus.DISQUALIFIED
                    ? '#721c24'
                    : '#856404'
              }}
            >
              Status: {submission.status}
            </span>
          </div>
        )}
      </div>

      {/* Status Banners */}
      {isLockedForJudging && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba',
            borderRadius: '6px',
            marginBottom: '24px',
            fontWeight: 500
          }}
        >
          🔒 <strong>Submission locked for judging.</strong> Project details are now read-only.
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
        >
          {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSaveDraft} style={{ border: '1px solid #e1e4e8', borderRadius: '8px', padding: '28px', backgroundColor: '#fff' }}>
        {/* Project Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
            Project Title <span style={{ color: '#d73a49' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLockedForJudging}
            placeholder="e.g. NebulaStream: Edge Telemetry Pipeline"
            required
            minLength={3}
            maxLength={150}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '15px'
            }}
          />
        </div>

        {/* Tagline */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            disabled={isLockedForJudging}
            placeholder="A short punchy elevator pitch for your project (max 255 chars)"
            maxLength={255}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
            Detailed Description <span style={{ color: '#d73a49' }}>*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLockedForJudging}
            placeholder="What does your project do? Describe its features, architecture, and impact."
            rows={5}
            required
            minLength={10}
            maxLength={10000}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          />
        </div>

        {/* Problem Statement & Solution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Problem Statement
            </label>
            <textarea
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              disabled={isLockedForJudging}
              placeholder="What core challenge or inefficiency does your project address?"
              rows={4}
              maxLength={5000}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Solution Approach
            </label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              disabled={isLockedForJudging}
              placeholder="How does your technical implementation solve this problem?"
              rows={4}
              maxLength={5000}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            />
          </div>
        </div>

        {/* Technology Stack */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
            Technology Stack (comma-separated tags)
          </label>
          <input
            type="text"
            value={techStackInput}
            onChange={(e) => setTechStackInput(e.target.value)}
            disabled={isLockedForJudging}
            placeholder="e.g. TypeScript, React, PostgreSQL, Docker, Rust"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <small style={{ color: '#6a737d', display: 'block', marginTop: '4px' }}>
            Separated by commas. These will be filterable in the public gallery.
          </small>
        </div>

        {/* URLs (Links) */}
        <div style={{ borderTop: '1px solid #e1e4e8', paddingTop: '20px', marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Project Links</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, fontSize: '14px', marginBottom: '6px' }}>
                GitHub / Repository URL
              </label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isLockedForJudging}
                placeholder="https://github.com/org/repo"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, fontSize: '14px', marginBottom: '6px' }}>
                Live Demo URL
              </label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                disabled={isLockedForJudging}
                placeholder="https://myproject.local:3000"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, fontSize: '14px', marginBottom: '6px' }}>
                Demo Video URL (YouTube, Vimeo)
              </label>
              <input
                type="url"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                disabled={isLockedForJudging}
                placeholder="https://youtu.be/..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, fontSize: '14px', marginBottom: '6px' }}>
                Presentation / Slides URL
              </label>
              <input
                type="url"
                value={presentationUrl}
                onChange={(e) => setPresentationUrl(e.target.value)}
                disabled={isLockedForJudging}
                placeholder="https://slides.local/..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Buttons / Actions */}
        {!isLockedForJudging && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e1e4e8', paddingTop: '20px' }}>
            <button
              type="submit"
              disabled={isSaving || isSubmitting}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f6f8fa',
                color: '#24292e',
                border: '1px solid #d1d5da',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isSaving ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSaving || isSubmitting || (!repoUrl && !demoUrl)}
              style={{
                padding: '10px 24px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Project'}
            </button>
          </div>
        )}
      </form>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '28px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Confirm Project Submission</h3>
            <p style={{ color: '#586069', lineHeight: '1.6', marginBottom: '20px' }}>
              Are you sure you want to submit <strong>{title || 'your project'}</strong>?
              Submitting registers your project for evaluation and publishes it to the public gallery once allowed by the hackathon organizers.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d1d5da',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
