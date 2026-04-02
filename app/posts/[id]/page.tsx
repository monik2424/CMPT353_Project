'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Post {
  id: number;
  channel_id: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
}

interface Reply {
  id: number;
  parent_reply_id: number | null;
  body: string;
  author_name: string;
  created_at: string;
}

interface Attachment {
  id: number;
  target_type: string;
  target_id: number;
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();

  const [post, setPost]               = useState<Post | null>(null);
  const [replies, setReplies]         = useState<Reply[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: number; display_name: string } | null>(null);

  // Reply form
  const [replyBody, setReplyBody]     = useState('');
  const [replyFile, setReplyFile]     = useState<File | null>(null);
  const [replyFileError, setReplyFileError] = useState('');
  const [replyMsg, setReplyMsg]       = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_BYTES     = 5 * 1024 * 1024;

  function handleReplyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setReplyFileError('');
    if (picked) {
      if (!ALLOWED_TYPES.includes(picked.type)) {
        setReplyFileError('Only PNG, JPEG, and WebP images are allowed');
        e.target.value = '';
        return;
      }
      if (picked.size > MAX_BYTES) {
        setReplyFileError('File exceeds the 5 MB limit');
        e.target.value = '';
        return;
      }
    }
    setReplyFile(picked);
  }

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [postRes, repliesRes, attRes] = await Promise.all([
        fetch(`/api/posts/${id}`),
        fetch(`/api/posts/${id}/replies`),
        fetch(`/api/attachments?target_type=post&target_id=${id}`),
      ]);

      if (!postRes.ok) throw new Error('Post not found');
      setPost(await postRes.json());

      if (repliesRes.ok) setReplies(await repliesRes.json());
      if (attRes.ok)     setAttachments(await attRes.json());
    } catch {
      setError('Could not load post.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchAll();
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(setCurrentUser)
      .catch(() => {});
  }, [id]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyMsg(data.error ?? 'Failed to post reply');
        return;
      }

      if (replyFile) {
        const form = new FormData();
        form.append('file', replyFile);
        form.append('target_type', 'reply');
        form.append('target_id', String(data.id));
        await fetch('/api/upload', { method: 'POST', body: form });
      }

      setReplyBody('');
      setReplyFile(null);
      setReplyMsg('Reply posted!');
      fetchAll();
    } catch {
      setReplyMsg('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const postAttachments = attachments.filter(
    a => a.target_type === 'post' && a.target_id === Number(id)
  );

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-10"><p className="text-gray-500">Loading…</p></main>;
  if (error)   return <main className="max-w-2xl mx-auto px-4 py-10"><p className="text-red-600">{error}</p></main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

      {post && (
        <Link href={`/channels/${post.channel_id}`} className="text-sm text-gray-500 hover:underline">
          ← Back to Channel
        </Link>
      )}

      {/* Post */}
      {post ? (
        <section className="border border-gray-200 rounded-xl p-6 space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
          <p className="text-xs text-gray-400">
            {post.author_name} · {new Date(post.created_at).toLocaleString()}
          </p>
          <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
          {postAttachments.map(a => (
            <img
              key={a.id}
              src={`/api/files/${a.id}`}
              alt="Post attachment"
              className="mt-2 max-w-full rounded-lg border border-gray-200"
            />
          ))}
        </section>
      ) : (
        <p className="text-gray-400 italic">Post not found.</p>
      )}

      {/* Replies */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Replies <span className="text-gray-400 font-normal text-base">({replies.length})</span>
        </h2>

        {replies.length === 0 ? (
          <p className="text-gray-400 italic">No replies yet — be the first!</p>
        ) : (
          <ul className="space-y-3">
            {replies.map(reply => (
              <li
                key={reply.id}
                className={`border border-gray-200 rounded-lg px-5 py-4 space-y-2 ${
                  reply.parent_reply_id ? 'ml-8 border-l-4 border-l-blue-200' : ''
                }`}
              >
                <p className="text-gray-700 whitespace-pre-wrap">{reply.body}</p>
                <p className="text-xs text-gray-400">
                  {reply.author_name} · {new Date(reply.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add reply form */}
      <section className="border-t pt-6 space-y-4">
        <h2 className="text-lg font-semibold">Add a Reply</h2>
        {!currentUser ? (
          <p className="text-gray-500 italic">
            <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link> to post a reply.
          </p>
        ) : (
        <form onSubmit={handleReply} className="space-y-3">
          <div>
            <label htmlFor="reply-body" className="block text-sm font-medium mb-1">
              Reply <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reply-body"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              required
              rows={4}
              placeholder="Write your reply…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
            />
          </div>

          <div>
            <label htmlFor="reply-image" className="block text-sm font-medium mb-1">
              Attach Screenshot <span className="text-gray-400 font-normal">(PNG, JPEG, WebP — max 5 MB)</span>
            </label>
            <input
              id="reply-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleReplyFileChange}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {replyFileError && <p className="text-red-600 text-sm mt-1">{replyFileError}</p>}
          </div>

          {replyMsg && (
            <p className={replyMsg === 'Reply posted!' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
              {replyMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !!replyFileError}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Posting…' : 'Post Reply'}
          </button>
        </form>
        )}
      </section>

    </main>
  );
}
