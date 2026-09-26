import { ApiStatusBadge } from '../../components/ApiStatusBadge';

export default function DashboardPage() {
  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Phase 1 Foundation Placeholder &bull; Role-based dashboards will activate in Phase 2 &amp; 3
          </p>
        </div>
        <ApiStatusBadge />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Participants</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Create teams, submit project repositories, and interact with the live project gallery.
          </p>
          <span className="badge">Status: Pending Phase 4</span>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Judges</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Workload-balanced evaluation queue, criteria scoring rubric, and private feedback.
          </p>
          <span className="badge">Status: Pending Phase 6</span>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Organizers &amp; Admins</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Configure hackathons, rubrics, judge assignment runs, score normalization, and exports.
          </p>
          <span className="badge">Status: Pending Phase 3</span>
        </div>
      </div>
    </div>
  );
}
