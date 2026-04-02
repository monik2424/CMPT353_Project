'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Channel {
  id: number;
  name: string;
  description: string | null;
  creator_name: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
}

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();

  const [channel, setChannel]     = useState<Channel | null>(null);
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [chRes, postsRes] = await Promise.all([
        fetch('/api/channels'),
        fetch(`/api/channels/${id}/posts`),
      ]);
      if (!postsRes.ok) throw new Error('Channel not found');

      const allChannels: Channel[] = await chRes.json();
      const found = allChannels.find(c => c.id === Number(id)) ?? null;
      setChannel(found);
      setPosts(await postsRes.json());
    } catch {
      setError('Could not load channel.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) fetchData(); }, [id]);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-10"><p className="text-gray-500">Loading…</p></main>;
  if (error)   return <main className="max-w-2xl mx-auto px-4 py-10"><p className="text-red-600">{error}</p></main>;
  if (!channel) return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-3">
      <p className="text-red-600">Channel not found.</p>
      <Link href="/channels" className="text-sm text-blue-600 hover:underline">← Back to Channels</Link>
    </main>
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <Link href="/channels" className="text-sm text-gray-500 hover:underline">← All Channels</Link>
        <h1 className="text-3xl font-bold text-blue-700 mt-2">
          #{channel?.name ?? id}
        </h1>
        {channel?.description && (
          <p className="text-gray-500 mt-1">{channel.description}</p>
        )}
      </div>

      {/* Posts list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Posts</h2>
          <Link
            href={`/channels/${id}/new-post`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + New Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-400 italic">No posts in this channel yet. Be the first!</p>
        ) : (
          <ul className="space-y-3">
            {posts.map(post => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="block border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div className="font-semibold text-gray-800">{post.title}</div>
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">{post.body}</div>
                  <div className="text-xs text-gray-400 mt-2">
                    {post.author_name} · {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

    </main>
  );
}
