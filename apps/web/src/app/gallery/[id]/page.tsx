'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiGetGalleryProject, ApiClientError } from '../../../lib/apiClient';
import { SubmissionDetail, SubmissionStatus } from '@dogfood/shared';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [project, setProject] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiGetGalleryProject(id);
        setProject(data);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load project details.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', color: '#586069' }}>
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
        <Link href="/gallery" style={{ color: '#0366d6', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
          &larr; Back to Project Gallery
        </Link>
        <div style={{ padding: '24px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>
          <h3>Project Not Available</h3>
          <p>{error || 'This project submission does not exist or is not publicly viewable.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      {/* Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/gallery"
          style={{ color: '#0366d6', textDecoration: 'none', fontWeight: 500 }}
        >
          &larr; Back to Project Gallery
        </Link>
      </div>

      {/* Main Card */}
      <div
        style={{
          border: '1px solid #e1e4e8',
          borderRadius: '8px',
          padding: '36px',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            {project.hackathonSlug ? (
              <Link
                href={`/hackathons/${project.hackathonSlug}`}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0366d6',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {project.hackathonName || 'Hackathon Event'} &rarr;
              </Link>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#586069' }}>
                {project.hackathonName || 'Hackathon Event'}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '16px',
              backgroundColor:
                project.status === SubmissionStatus.FINALIZED || project.status === SubmissionStatus.LOCKED
                  ? '#d1ecf1'
                  : '#d4edda',
              color:
                project.status === SubmissionStatus.FINALIZED || project.status === SubmissionStatus.LOCKED
                  ? '#0c5460'
                  : '#155724'
            }}
          >
            {project.status}
          </span>
        </div>

        {/* Title & Tagline */}
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
          {project.title}
        </h1>
        {project.tagline && (
          <p style={{ color: '#586069', fontSize: '16px', fontStyle: 'italic', marginBottom: '24px' }}>
            {project.tagline}
          </p>
        )}

        {/* Meta Bar */}
        <div
          style={{
            borderTop: '1px solid #eaecef',
            borderBottom: '1px solid #eaecef',
            padding: '12px 0',
            marginBottom: '28px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            fontSize: '14px',
            color: '#586069'
          }}
        >
          <div>
            Team: <strong style={{ color: '#24292e' }}>{project.teamName}</strong>
          </div>
          {project.submittedAt && (
            <div>
              Submitted: <strong style={{ color: '#24292e' }}>{new Date(project.submittedAt).toLocaleDateString()}</strong>
            </div>
          )}
        </div>

        {/* External Links */}
        {(project.repoUrl || project.demoUrl || project.demoVideoUrl || project.presentationUrl) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#24292e',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <span>Code Repository &rarr;</span>
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#0366d6',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <span>Live Demo &rarr;</span>
              </a>
            )}
            {project.demoVideoUrl && (
              <a
                href={project.demoVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#f6f8fa',
                  color: '#24292e',
                  border: '1px solid #d1d5da',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <span>Video Demo &rarr;</span>
              </a>
            )}
            {project.presentationUrl && (
              <a
                href={project.presentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  backgroundColor: '#f6f8fa',
                  color: '#24292e',
                  border: '1px solid #d1d5da',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <span>Presentation Slides &rarr;</span>
              </a>
            )}
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Project Overview</h2>
          <p style={{ color: '#24292e', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
            {project.description}
          </p>
        </div>

        {/* Problem Statement & Solution */}
        {(project.problemStatement || project.solution) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
            {project.problemStatement && (
              <div style={{ backgroundColor: '#fafbfc', border: '1px solid #e1e4e8', borderRadius: '6px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#cb2431' }}>
                  The Problem
                </h3>
                <p style={{ color: '#444d56', lineHeight: '1.6', fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {project.problemStatement}
                </p>
              </div>
            )}
            {project.solution && (
              <div style={{ backgroundColor: '#fafbfc', border: '1px solid #e1e4e8', borderRadius: '6px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#28a745' }}>
                  The Solution
                </h3>
                <p style={{ color: '#444d56', lineHeight: '1.6', fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {project.solution}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Technologies */}
        {project.technologyStack && project.technologyStack.length > 0 && (
          <div style={{ borderTop: '1px solid #eaecef', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Technologies Used</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {project.technologyStack.map((tech) => (
                <span
                  key={tech}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#f1f8ff',
                    color: '#0366d6',
                    border: '1px solid #c8e1ff',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
