import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold text-blue-700">CMPT 353 Q&amp;A Tool</h1>
        <p className="text-lg text-gray-600">
          A channel-based platform for asking and answering programming questions.
          Browse channels, post questions, reply in threads, and vote on answers.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/channels"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Browse Channels
          </Link>
          <Link
            href="/register"
            className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
