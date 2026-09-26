'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizerIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/organizer/hackathons');
  }, [router]);

  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
      Redirecting to Organizer Dashboard...
    </div>
  );
}
