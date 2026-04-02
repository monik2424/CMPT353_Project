'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CurrentUser {
  id: number;
  display_name: string;
  role: 'user' | 'admin';
}

export default function Navbar() {
  const [user, setUser]       = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { setUser(data); setChecked(true); })
      .catch(() => setChecked(true));
  }, []);

  async function handleSignOut() {
    await fetch('/api/auth/logout');
    setUser(null);
    router.push('/');
  }

  // Don't render until we know auth state (avoids flash)
  if (!checked) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">

        {/* Left — brand + main link */}
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-blue-700 hover:underline">
            Q&amp;A Tool
          </Link>
          <Link href="/channels" className="text-sm text-gray-600 hover:underline">
            Channels
          </Link>
          <Link href="/search" className="text-sm text-gray-600 hover:underline">
            Search
          </Link>
        </div>

        {/* Right — auth state */}
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-gray-600">
                {user.display_name}
                {user.role === 'admin' && (
                  <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded">
                    admin
                  </span>
                )}
              </span>
              {user.role === 'admin' && (
                <Link href="/admin" className="text-blue-600 hover:underline">
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-red-600 transition"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login"    className="text-gray-600 hover:underline">Sign In</Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
