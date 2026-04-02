'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName]   = useState('');
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [error, setError]               = useState('');
  const [submitting, setSubmitting]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ display_name: displayName, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }
      router.push('/login?registered=1');
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-sm text-gray-500 mt-1">
          Already have one?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>

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
            minLength={2}
            maxLength={100}
            placeholder="How others will see you"
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
            minLength={6}
            placeholder="At least 6 characters"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="Repeat your password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {submitting ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
    </main>
  );
}
