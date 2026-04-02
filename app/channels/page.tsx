'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Channel {
  id: number;
  name: string;
  description: string | null;
  creator_name: string;
  created_at: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Create form state
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [formMsg, setFormMsg]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchChannels() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('Failed to load channels');
      setChannels(await res.json());
    } catch {
      setError('Could not load channels. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchChannels(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TODO (Part 2): replace created_by with logged-in user id from session
        body: JSON.stringify({ name, description, created_by: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormMsg(data.error ?? 'Something went wrong');
      } else {
        setName('');
        setDesc('');
        setFormMsg('Channel created!');
        fetchChannels();
      }
    } catch {
      setFormMsg('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-700">Channels</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">← Home</Link>
      </div>

      {/* Channel list */}
      <section>
        {loading && <p className="text-gray-500">Loading channels…</p>}
        {error   && <p className="text-red-600">{error}</p>}
        {!loading && !error && channels.length === 0 && (
          <p className="text-gray-400 italic">No channels yet — create the first one below.</p>
        )}
        <ul className="space-y-3">
          {channels.map(ch => (
            <li key={ch.id}>
              <Link
                href={`/channels/${ch.id}`}
                className="block border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-400 hover:bg-blue-50 transition"
              >
                <div className="font-semibold text-blue-700">#{ch.name}</div>
                {ch.description && (
                  <div className="text-sm text-gray-500 mt-1">{ch.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  Created by {ch.creator_name} · {new Date(ch.created_at).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Create channel form */}
      <section className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Create a Channel</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label htmlFor="ch-name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="ch-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
              placeholder="e.g. python"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label htmlFor="ch-desc" className="block text-sm font-medium mb-1">
              Description
            </label>
            <input
              id="ch-desc"
              type="text"
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional short description"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Creating…' : 'Create Channel'}
          </button>
          {formMsg && (
            <p className={formMsg === 'Channel created!' ? 'text-green-600' : 'text-red-600'}>
              {formMsg}
            </p>
          )}
        </form>
      </section>

    </main>
  );
}
