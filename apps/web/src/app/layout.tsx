import '../styles/globals.css';
import { Navbar } from '../components/Navbar';
import { AuthProvider } from '../context/AuthContext';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DOGFOOD - Hackathon Platform',
  description: 'Open-source, self-hosted hackathon submission and judging platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main id="main-content" role="main" style={{ minHeight: 'calc(100vh - 128px)', padding: '2rem 0' }}>
            {children}
          </main>
          <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem 0', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <div className="container">
              <p>DOGFOOD Hackathon Platform &bull; Phase 2 Local Authentication &amp; RBAC &bull; Offline Ready</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
