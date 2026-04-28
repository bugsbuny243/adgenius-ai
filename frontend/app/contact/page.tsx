import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'İletişim | Koschei AI',
  description: 'Koschei iş, Game Factory, ajan otomasyonu ve destek talepleri için iletişim sayfası.'
};

const topics = [
  'Koschei business inquiries',
  'Game Factory inquiries',
  'Agent automation inquiries',
  'Support requests'
] as const;

export default function ContactPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">İletişim</h1>
      <p className="text-white/75">Aşağıdaki başlıklarda ekibimize doğrudan ulaşabilirsiniz:</p>
      <ul className="list-disc space-y-1 pl-5 text-white/75">
        {topics.map((topic) => (
          <li key={topic}>{topic}</li>
        ))}
      </ul>
      <p className="font-medium">
        <a className="text-neon hover:underline" href="mailto:hello@tradepigloball.co">
          hello@tradepigloball.co
        </a>
      </p>
    </main>
  );
}
