'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User    { id: number; display_name: string; role: string; created_at: string; }
interface Channel { id: number; name: string; description: string | null; creator_name: string; }
interface Post    { id: number; title: string; author_name: string; channel_name: string; created_at: string; }
interface Reply   { id: number; body: string; author_name: string; post_title: string; post_id: number; created_at: string; }

type Tab = 'users' | 'channels' | 'posts' | 'replies';

export default function AdminPage() {
  const router = useRouter();

  const [tab, setTab]           = useState<Tab>('users');
  const [users, setUsers]       = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [replies, setReplies]   = useState<Reply[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    // Verify admin role, redirect if not
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (!user || user.role !== 'admin') {
          router.replace('/login');
          return;
        }
        loadAll();
      })
      .catch(() => router.replace('/login'));
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [uRes, chRes, pRes, rRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/channels'),
        fetch('/api/admin/posts'),
        fetch('/api/admin/replies'),
      ]);
      setUsers(uRes.ok     ? await uRes.json()  : []);
      setChannels(chRes.ok ? await chRes.json() : []);
      setPosts(pRes.ok     ? await pRes.json()  : []);
      setReplies(rRes.ok   ? await rRes.json()  : []);
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(url: string, confirm_msg: string, refresh: () => void) {
    if (!window.confirm(confirm_msg)) return;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? 'Delete failed');
    }
  }

  const btnClass = 'text-xs text-red-600 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50 transition';
  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
      tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  if (loading) return <main className="max-w-3xl mx-auto px-4 py-10"><p className="text-gray-500">Loading…</p></main>;
  if (error)   return <main className="max-w-3xl mx-auto px-4 py-10"><p className="text-red-600">{error}</p></main>;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

      <h1 className="text-2xl font-bold text-blue-700">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['users', 'channels', 'posts', 'replies'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={tabClass(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-1 text-gray-400 font-normal">
              ({t === 'users' ? users.length : t === 'channels' ? channels.length : t === 'posts' ? posts.length : replies.length})
            </span>
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === 'users' && (
        <section className="space-y-2">
          {users.length === 0 && <p className="text-gray-400 italic">No users.</p>}
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <span className="font-medium">{u.display_name}</span>
                {u.role === 'admin' && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">admin</span>
                )}
                <span className="text-xs text-gray-400 ml-2">{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
              {u.role !== 'admin' && (
                <button
                  onClick={() => deleteItem(`/api/users/${u.id}`, `Delete user "${u.display_name}"?`, loadAll)}
                  className={btnClass}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Channels */}
      {tab === 'channels' && (
        <section className="space-y-2">
          {channels.length === 0 && <p className="text-gray-400 italic">No channels.</p>}
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <span className="font-medium">#{ch.name}</span>
                {ch.description && <span className="text-sm text-gray-500 ml-2">{ch.description}</span>}
                <span className="text-xs text-gray-400 ml-2">by {ch.creator_name}</span>
              </div>
              <button
                onClick={() => deleteItem(`/api/channels/${ch.id}`, `Delete channel "#${ch.name}" and all its posts?`, loadAll)}
                className={btnClass}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Posts */}
      {tab === 'posts' && (
        <section className="space-y-2">
          {posts.length === 0 && <p className="text-gray-400 italic">No posts.</p>}
          {posts.map(p => (
            <div key={p.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-gray-400">
                  #{p.channel_name} · {p.author_name} · {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteItem(`/api/posts/${p.id}`, `Delete post "${p.title}"?`, loadAll)}
                className={btnClass}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Replies */}
      {tab === 'replies' && (
        <section className="space-y-2">
          {replies.length === 0 && <p className="text-gray-400 italic">No replies.</p>}
          {replies.map(r => (
            <div key={r.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm truncate text-gray-700">{r.body}</p>
                <p className="text-xs text-gray-400">
                  on "{r.post_title}" · {r.author_name} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteItem(`/api/replies/${r.id}`, `Delete this reply by "${r.author_name}"?`, loadAll)}
                className={btnClass}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      )}

    </main>
  );
}
