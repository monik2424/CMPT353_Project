'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [info, setInfo]               = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (searchParams.get('registered')) {
      setInfo('Account created! Sign in to continue.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ display_name: displayName, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      // Redirect admin to /admin, everyone else to /channels
      window.location.href = data.role === 'admin' ? '/admin' : '/channels';
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-gray-500 mt-1">
          No account yet?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">Sign up</Link>
        </p>
      </div>

      {info  && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{info}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            placeholder="Your display name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Your password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
