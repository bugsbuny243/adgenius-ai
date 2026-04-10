import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Koschei AI',
  description: 'Learn what Koschei AI is and how it helps teams manage projects and AI agents.'
};

export default function AboutPage() {
  return (
    <main className="panel space-y-4">
      <h1 className="text-3xl font-bold">About Koschei AI</h1>
      <p className="text-white/75">
        Koschei AI is built to help teams run project operations with more clarity. It combines project tracking,
        agent coordination, and dashboard visibility in a single web application.
      </p>
      <p className="text-white/75">
        Our goal is to provide a practical command center that supports real workflows without unnecessary complexity.
      </p>
    </main>
  );
}
