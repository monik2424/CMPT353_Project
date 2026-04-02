'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

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

interface ReplyNode extends Reply {
  children: ReplyNode[];
}

interface Attachment {
  id: number;
  target_type: string;
  target_id: number;
}

interface VoteData {
  up: number;
  down: number;
  net: number;
  user_vote: number; // 1 | -1 | 0
}

interface CurrentUser {
  id: number;
  display_name: string;
}

// ── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(flat: Reply[]): ReplyNode[] {
  const map = new Map<number, ReplyNode>();
  flat.forEach(r => map.set(r.id, { ...r, children: [] }));

  const roots: ReplyNode[] = [];
  flat.forEach(r => {
    const node = map.get(r.id)!;
    if (r.parent_reply_id !== null && map.has(r.parent_reply_id)) {
      map.get(r.parent_reply_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// ── VoteButtons ──────────────────────────────────────────────────────────────

function VoteButtons({
  targetType,
  targetId,
  voteData,
  loggedIn,
  onVote,
}: {
  targetType: 'post' | 'reply';
  targetId: number;
  voteData: VoteData | undefined;
  loggedIn: boolean;
  onVote: (targetType: 'post' | 'reply', targetId: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const v = voteData ?? { up: 0, down: 0, net: 0, user_vote: 0 };

  async function cast(value: 1 | -1) {
    if (!loggedIn || busy) return;
    setBusy(true);
    try {
      if (v.user_vote === value) {
        // clicking same button → remove vote
        await fetch('/api/votes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: targetType, target_id: targetId }),
        });
      } else {
        await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: targetType, target_id: targetId, value }),
        });
      }
      onVote(targetType, targetId);
    } finally {
      setBusy(false);
    }
  }

  const upClass   = `text-sm px-2 py-0.5 rounded transition ${v.user_vote ===  1 ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-400 hover:text-green-600'}`;
  const downClass = `text-sm px-2 py-0.5 rounded transition ${v.user_vote === -1 ? 'bg-red-100 text-red-600 font-semibold'   : 'text-gray-400 hover:text-red-500'}`;

  return (
    <span className="inline-flex items-center gap-1">
      <button onClick={() => cast(1)}  disabled={!loggedIn || busy} className={upClass}   title={loggedIn ? 'Upvote'   : 'Sign in to vote'}>▲</button>
      <span className={`text-sm font-medium w-6 text-center ${v.net > 0 ? 'text-green-700' : v.net < 0 ? 'text-red-600' : 'text-gray-500'}`}>
        {v.net > 0 ? `+${v.net}` : v.net}
      </span>
      <button onClick={() => cast(-1)} disabled={!loggedIn || busy} className={downClass} title={loggedIn ? 'Downvote' : 'Sign in to vote'}>▼</button>
    </span>
  );
}

// ── ReplyItem (recursive) ────────────────────────────────────────────────────

function ReplyItem({
  node,
  depth,
  votes,
  loggedIn,
  attachments,
  onVote,
  onReplyTo,
}: {
  node: ReplyNode;
  depth: number;
  votes: Record<string, VoteData>;
  loggedIn: boolean;
  attachments: Attachment[];
  onVote: (t: 'post' | 'reply', id: number) => void;
  onReplyTo: (replyId: number, authorName: string) => void;
}) {
  const replyAtts = attachments.filter(
    a => a.target_type === 'reply' && a.target_id === node.id
  );

  return (
    <li>
      <div
        className={`border border-gray-200 rounded-lg px-4 py-3 space-y-2 ${
          depth > 0 ? 'border-l-4 border-l-blue-200' : ''
        }`}
      >
        <p className="text-gray-700 whitespace-pre-wrap text-sm">{node.body}</p>
        {replyAtts.map(a => (
          <img key={a.id} src={`/api/files/${a.id}`} alt="attachment"
            className="max-w-xs rounded-lg border border-gray-200" />
        ))}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-400">
            {node.author_name} · {new Date(node.created_at).toLocaleString()}
          </span>
          <VoteButtons
            targetType="reply"
            targetId={node.id}
            voteData={votes[`reply:${node.id}`]}
            loggedIn={loggedIn}
            onVote={onVote}
          />
          {loggedIn && (
            <button
              onClick={() => onReplyTo(node.id, node.author_name)}
              className="text-xs text-blue-500 hover:underline"
            >
              Reply
            </button>
          )}
        </div>
      </div>

      {/* Recursive children */}
      {node.children.length > 0 && (
        <ul className="ml-6 mt-2 space-y-2">
          {node.children.map(child => (
            <ReplyItem
              key={child.id}
              node={child}
              depth={depth + 1}
              votes={votes}
              loggedIn={loggedIn}
              attachments={attachments}
              onVote={onVote}
              onReplyTo={onReplyTo}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PostPage() {
  const { id } = useParams<{ id: string }>();

  const [post, setPost]               = useState<Post | null>(null);
  const [replies, setReplies]         = useState<Reply[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [votes, setVotes]             = useState<Record<string, VoteData>>({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Reply form
  const [replyBody, setReplyBody]           = useState('');
  const [replyFile, setReplyFile]           = useState<File | null>(null);
  const [replyFileError, setReplyFileError] = useState('');
  const [replyMsg, setReplyMsg]             = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [replyingTo, setReplyingTo]         = useState<{ id: number; name: string } | null>(null);

  const formRef = useRef<HTMLTextAreaElement>(null);

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_BYTES     = 5 * 1024 * 1024;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setReplyFileError('');
    if (picked) {
      if (!ALLOWED_TYPES.includes(picked.type)) { setReplyFileError('Only PNG, JPEG, and WebP images are allowed'); e.target.value = ''; return; }
      if (picked.size > MAX_BYTES)              { setReplyFileError('File exceeds the 5 MB limit');                 e.target.value = ''; return; }
    }
    setReplyFile(picked);
  }

  async function fetchVotes(loadedReplies: Reply[], postId: string) {
    const keys: { type: 'post' | 'reply'; id: number }[] = [
      { type: 'post', id: Number(postId) },
      ...loadedReplies.map(r => ({ type: 'reply' as const, id: r.id })),
    ];
    const results = await Promise.all(
      keys.map(k =>
        fetch(`/api/votes?target_type=${k.type}&target_id=${k.id}`)
          .then(r => r.ok ? r.json() : { up: 0, down: 0, net: 0, user_vote: 0 })
      )
    );
    const map: Record<string, VoteData> = {};
    keys.forEach((k, i) => { map[`${k.type}:${k.id}`] = results[i]; });
    setVotes(map);
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

      const postData    = await postRes.json();
      const repliesData = repliesRes.ok ? await repliesRes.json() : [];
      setPost(postData);
      setReplies(repliesData);
      if (attRes.ok) setAttachments(await attRes.json());

      await fetchVotes(repliesData, id);
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

  async function refreshVote(targetType: 'post' | 'reply', targetId: number) {
    const res = await fetch(`/api/votes?target_type=${targetType}&target_id=${targetId}`);
    if (res.ok) {
      const data = await res.json();
      setVotes(prev => ({ ...prev, [`${targetType}:${targetId}`]: data }));
    }
  }

  function handleReplyTo(replyId: number, authorName: string) {
    setReplyingTo({ id: replyId, name: authorName });
    formRef.current?.focus();
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${id}/replies`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: replyBody, parent_reply_id: replyingTo?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setReplyMsg(data.error ?? 'Failed to post reply'); return; }

      if (replyFile) {
        const form = new FormData();
        form.append('file', replyFile);
        form.append('target_type', 'reply');
        form.append('target_id', String(data.id));
        await fetch('/api/upload', { method: 'POST', body: form });
      }

      setReplyBody('');
      setReplyFile(null);
      setReplyingTo(null);
      setReplyMsg('Reply posted!');
      fetchAll();
    } catch {
      setReplyMsg('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const postAttachments = attachments.filter(a => a.target_type === 'post' && a.target_id === Number(id));
  const tree            = buildTree(replies);

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
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400">
              {post.author_name} · {new Date(post.created_at).toLocaleString()}
            </span>
            <VoteButtons
              targetType="post"
              targetId={post.id}
              voteData={votes[`post:${post.id}`]}
              loggedIn={!!currentUser}
              onVote={refreshVote}
            />
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
          {postAttachments.map(a => (
            <img key={a.id} src={`/api/files/${a.id}`} alt="Post attachment"
              className="mt-2 max-w-full rounded-lg border border-gray-200" />
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

        {tree.length === 0 ? (
          <p className="text-gray-400 italic">No replies yet — be the first!</p>
        ) : (
          <ul className="space-y-3">
            {tree.map(node => (
              <ReplyItem
                key={node.id}
                node={node}
                depth={0}
                votes={votes}
                loggedIn={!!currentUser}
                attachments={attachments}
                onVote={refreshVote}
                onReplyTo={handleReplyTo}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Reply form */}
      <section className="border-t pt-6 space-y-4">
        <h2 className="text-lg font-semibold">Add a Reply</h2>
        {!currentUser ? (
          <p className="text-gray-500 italic">
            <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link> to post a reply.
          </p>
        ) : (
          <form onSubmit={handleReply} className="space-y-3">

            {replyingTo && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-blue-700">Replying to <strong>{replyingTo.name}</strong></span>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-blue-400 hover:text-blue-600 text-xs">✕ Cancel</button>
              </div>
            )}

            <div>
              <label htmlFor="reply-body" className="block text-sm font-medium mb-1">
                Reply <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reply-body"
                ref={formRef}
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                required
                rows={4}
                placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : 'Write your reply…'}
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
                onChange={handleFileChange}
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
