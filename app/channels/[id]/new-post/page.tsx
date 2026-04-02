'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function NewPostPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) router.replace(`/login`);
    });
  }, []);

  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_BYTES     = 5 * 1024 * 1024;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFileError('');
    if (picked) {
      if (!ALLOWED_TYPES.includes(picked.type)) {
        setFileError('Only PNG, JPEG, and WebP images are allowed');
        e.target.value = '';
        return;
      }
      if (picked.size > MAX_BYTES) {
        setFileError('File exceeds the 5 MB limit');
        e.target.value = '';
        return;
      }
    }
    setFile(picked);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // 1. Create the post
      const res = await fetch(`/api/channels/${id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create post');
        return;
      }

      const postId = data.id;

      // 2. Upload image if one was selected
      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('target_type', 'post');
        form.append('target_id', String(postId));
        const upRes = await fetch('/api/upload', { method: 'POST', body: form });
        if (!upRes.ok) {
          const upData = await upRes.json();
          setError(upData.error ?? 'Post created but image upload failed');
          router.push(`/posts/${postId}`);
          return;
        }
      }

      router.push(`/posts/${postId}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      <div>
        <Link href={`/channels/${id}`} className="text-sm text-gray-500 hover:underline">
          ← Back to Channel
        </Link>
        <h1 className="text-2xl font-bold mt-2">New Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="post-title" className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
            required
            placeholder="Short, descriptive title"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label htmlFor="post-body" className="block text-sm font-medium mb-1">
            Body <span className="text-red-500">*</span>
          </label>
          <textarea
            id="post-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={6}
            placeholder="Describe your question or topic in detail"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          />
        </div>

        <div>
          <label htmlFor="post-image" className="block text-sm font-medium mb-1">
            Attach Screenshot <span className="text-gray-400 font-normal">(PNG, JPEG, WebP — max 5 MB)</span>
          </label>
          <input
            id="post-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {fileError && <p className="text-red-600 text-sm mt-1">{fileError}</p>}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !!fileError}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </form>

    </main>
  );
}
