'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

type SearchType = 'content' | 'by-author' | 'top-authors' | 'bottom-authors' | 'top-voted';

interface SearchResult {
  result_type: 'post' | 'reply' | 'user';
  id: number;
  title?: string;
  post_title?: string;
  excerpt?: string;
  author_name?: string;
  channel_name?: string;
  post_id?: number;
  net_score?: number;
  post_count?: number;
}

const SEARCH_TYPES: { value: SearchType; label: string; needsQ: boolean; placeholder?: string }[] = [
  {
    value: 'content',
    label: '1. Keyword — search posts & replies',
    needsQ: true,
    placeholder: 'e.g. recursion, async/await…',
  },
  {
    value: 'by-author',
    label: '2. By author — all content from a user',
    needsQ: true,
    placeholder: 'Exact display name…',
  },
  { value: 'top-authors',    label: '3. Top authors — most posts',      needsQ: false },
  { value: 'bottom-authors', label: '4. Bottom authors — fewest posts', needsQ: false },
  { value: 'top-voted',      label: '5. Top-voted posts',               needsQ: false },
];

const LIMIT = 10;

export default function SearchPage() {
  const [searchType, setSearchType] = useState<SearchType>('content');
  const [q, setQ]                   = useState('');
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [hasMore, setHasMore]       = useState(false);
  const [searched, setSearched]     = useState(false);

  const offsetRef = useRef(0);
  const activeTypeRef = useRef<SearchType>('content');
  const activeQRef    = useRef('');

  const needsQ = SEARCH_TYPES.find(t => t.value === searchType)?.needsQ ?? false;

  async function runSearch(reset: boolean) {
    setError('');
    setLoading(true);

    const type   = reset ? searchType : activeTypeRef.current;
    const query  = reset ? q          : activeQRef.current;
    const offset = reset ? 0          : offsetRef.current;

    if (reset) {
      activeTypeRef.current = type;
      activeQRef.current    = query;
      offsetRef.current     = 0;
    }

    const params = new URLSearchParams({ type, limit: String(LIMIT), offset: String(offset) });
    if (query.trim()) params.set('q', query.trim());

    try {
      const res  = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Search failed'); setLoading(false); return; }

      if (reset) {
        setResults(data.results);
      } else {
        setResults(prev => [...prev, ...data.results]);
      }
      offsetRef.current += data.results.length;
      setHasMore(data.hasMore);
      setSearched(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(true);
  }

  function handleTypeChange(t: SearchType) {
    setSearchType(t);
    setResults([]);
    setSearched(false);
    setHasMore(false);
    setError('');
    setQ('');
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Search</h1>
      <p className="text-gray-500 mb-8 text-sm">
        5 query types · paginated results · indexed for performance
      </p>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl shadow-sm p-6 mb-8 space-y-5">
        {/* Query type selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Query type</label>
          <div className="space-y-2">
            {SEARCH_TYPES.map(t => (
              <label key={t.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={searchType === t.value}
                  onChange={() => handleTypeChange(t.value)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-800">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Keyword / author input */}
        {needsQ && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {searchType === 'by-author' ? 'Author name' : 'Keyword'}
            </label>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={SEARCH_TYPES.find(t => t.value === searchType)?.placeholder}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {searched && results.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">No results found.</p>
      )}

      {results.length > 0 && (
        <section>
          <p className="text-xs text-gray-400 mb-4 uppercase tracking-wide">
            {results.length} result{results.length !== 1 ? 's' : ''} shown
          </p>

          <ul className="space-y-4">
            {results.map((r, i) => (
              <ResultCard key={`${r.result_type}-${r.id}-${i}`} result={r} />
            ))}
          </ul>

          {hasMore && (
            <button
              onClick={() => runSearch(false)}
              disabled={loading}
              className="mt-6 w-full border border-blue-500 text-blue-600 hover:bg-blue-50 disabled:opacity-50 font-semibold py-2 rounded-lg text-sm transition"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </section>
      )}
    </main>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  // ── User ranking card ──
  if (result.result_type === 'user') {
    return (
      <li className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{result.author_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">User</p>
        </div>
        <span className="text-sm font-bold text-blue-600">
          {result.post_count} post{result.post_count !== 1 ? 's' : ''}
        </span>
      </li>
    );
  }

  // ── Post card ──
  if (result.result_type === 'post') {
    return (
      <li className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/posts/${result.post_id}`}
              className="font-semibold text-blue-700 hover:underline line-clamp-1"
            >
              {result.title}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">
              by <span className="font-medium text-gray-700">{result.author_name}</span>
              {result.channel_name && (
                <> in <span className="font-medium text-gray-700">{result.channel_name}</span></>
              )}
            </p>
            {result.excerpt && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{result.excerpt}</p>
            )}
          </div>
          {result.net_score !== undefined && (
            <span className={`text-sm font-bold shrink-0 ${result.net_score >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {result.net_score >= 0 ? '+' : ''}{result.net_score} pts
            </span>
          )}
        </div>
        <div className="mt-3">
          <Link
            href={`/posts/${result.post_id}`}
            className="text-xs text-blue-500 hover:underline"
          >
            View post →
          </Link>
        </div>
      </li>
    );
  }

  // ── Reply card ──
  return (
    <li className="bg-white border rounded-xl p-4 shadow-sm border-l-4 border-l-gray-300">
      <p className="text-xs text-gray-500 mb-1">
        Reply by <span className="font-medium text-gray-700">{result.author_name}</span>
        {result.channel_name && (
          <> in <span className="font-medium text-gray-700">{result.channel_name}</span></>
        )}
        {result.post_title && (
          <> · on post &ldquo;{result.post_title}&rdquo;</>
        )}
      </p>
      {result.excerpt && (
        <p className="text-sm text-gray-700 line-clamp-3">{result.excerpt}</p>
      )}
      {result.post_id && (
        <div className="mt-2">
          <Link
            href={`/posts/${result.post_id}`}
            className="text-xs text-blue-500 hover:underline"
          >
            View post →
          </Link>
        </div>
      )}
    </li>
  );
}
