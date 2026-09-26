'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  apiGetGallery,
  apiGetHackathons,
  ApiClientError
} from '../../lib/apiClient';
import {
  GalleryItem,
  HackathonSummary,
  SubmissionStatus
} from '@dogfood/shared';

const POPULAR_TECHS = ['All', 'TypeScript', 'Rust', 'Go', 'Python', 'WebAssembly', 'PostgreSQL', 'Docker', 'Linux KVM'];

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(12);

  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState('All');
  const [selectedHackathonId, setSelectedHackathonId] = useState('');

  const [hackathons, setHackathons] = useState<HackathonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load hackathons for dropdown
  useEffect(() => {
    async function loadHackathons() {
      try {
        const list = await apiGetHackathons();
        setHackathons(list);
      } catch (err) {
        console.error('Failed to load hackathon list', err);
      }
    }
    loadHackathons();
  }, []);

  // Load gallery items
  useEffect(() => {
    async function fetchGallery() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiGetGallery({
          hackathonId: selectedHackathonId || undefined,
          search: activeSearch || undefined,
          technology: selectedTech === 'All' ? undefined : selectedTech,
          page,
          limit
        });
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to load project gallery.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchGallery();
  }, [page, limit, activeSearch, selectedTech, selectedHackathonId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search.trim());
    setPage(1);
  };

  const handleTechSelect = (tech: string) => {
    setSelectedTech(tech);
    setPage(1);
  };

  const handleHackathonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedHackathonId(e.target.value);
    setPage(1);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Project Gallery</h1>
        <p style={{ color: '#586069', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
          Explore self-hosted, offline-built hackathon submissions, innovative open-source tools, and developer prototypes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          border: '1px solid #e1e4e8',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fff',
          marginBottom: '32px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 300px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project title, tagline, or keywords..."
              style={{
                flex: 1,
                padding: '9px 12px',
                border: '1px solid #d1d5da',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '9px 16px',
                backgroundColor: '#0366d6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Search
            </button>
            {activeSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveSearch('');
                  setPage(1);
                }}
                style={{
                  padding: '9px 12px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d1d5da',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </form>

          {/* Hackathon Selector */}
          <div style={{ flex: '0 0 240px' }}>
            <select
              value={selectedHackathonId}
              onChange={handleHackathonChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #d1d5da',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#fff'
              }}
            >
              <option value="">All Hackathons</option>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Technology Tags Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#586069', marginRight: '4px' }}>
            Tech Stack:
          </span>
          {POPULAR_TECHS.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => handleTechSelect(tech)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedTech === tech ? '#0366d6' : '#f1f8ff',
                color: selectedTech === tech ? '#fff' : '#0366d6'
              }}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            marginBottom: '24px'
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#586069' }}>
          <p>Loading projects...</p>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            border: '1px dashed #d1d5da',
            borderRadius: '8px',
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: '#fff'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Projects Found</h3>
          <p style={{ color: '#586069', maxWidth: '400px', margin: '0 auto' }}>
            {activeSearch || selectedTech !== 'All' || selectedHackathonId
              ? 'No public projects match the current search or filters. Try adjusting your query.'
              : 'There are currently no public submissions in the gallery.'}
          </p>
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e1e4e8',
                  borderRadius: '8px',
                  padding: '24px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div>
                  {/* Top Bar: Event Badge & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#586069',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {item.hackathonName}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor:
                          item.status === SubmissionStatus.FINALIZED || item.status === SubmissionStatus.LOCKED
                            ? '#d1ecf1'
                            : '#d4edda',
                        color:
                          item.status === SubmissionStatus.FINALIZED || item.status === SubmissionStatus.LOCKED
                            ? '#0c5460'
                            : '#155724'
                      }}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                    <Link
                      href={`/gallery/${item.id}`}
                      style={{ color: '#24292e', textDecoration: 'none' }}
                    >
                      {item.title}
                    </Link>
                  </h2>
                  {item.tagline && (
                    <p style={{ color: '#586069', fontSize: '13px', fontStyle: 'italic', marginBottom: '12px' }}>
                      {item.tagline}
                    </p>
                  )}

                  {/* Description snippet */}
                  <p
                    style={{
                      color: '#24292e',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      marginBottom: '16px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.description}
                  </p>

                  {/* Tech stack chips */}
                  {item.technologyStack && item.technologyStack.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {item.technologyStack.map((tech) => (
                        <span
                          key={tech}
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            backgroundColor: '#f6f8fa',
                            border: '1px solid #e1e4e8',
                            borderRadius: '4px',
                            color: '#444d56'
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    borderTop: '1px solid #eaecef',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#6a737d' }}>
                    Team: <strong>{item.teamName}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {item.repoUrl && (
                      <a
                        href={item.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#0366d6', textDecoration: 'none' }}
                        title="GitHub Repository"
                      >
                        Code
                      </a>
                    )}
                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#0366d6', textDecoration: 'none' }}
                        title="Live Demo"
                      >
                        Demo
                      </a>
                    )}
                    <Link
                      href={`/gallery/${item.id}`}
                      style={{ fontSize: '12px', color: '#0366d6', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '40px'
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: page <= 1 ? '#f6f8fa' : '#fff',
                  border: '1px solid #d1d5da',
                  borderRadius: '6px',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  color: page <= 1 ? '#959da5' : '#24292e'
                }}
              >
                &larr; Previous
              </button>
              <span style={{ fontSize: '14px', color: '#586069' }}>
                Page {page} of {totalPages} ({total} projects)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: page >= totalPages ? '#f6f8fa' : '#fff',
                  border: '1px solid #d1d5da',
                  borderRadius: '6px',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  color: page >= totalPages ? '#959da5' : '#24292e'
                }}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
