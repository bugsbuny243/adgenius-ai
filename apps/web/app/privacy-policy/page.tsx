import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Koschei AI',
  description: 'Read the Privacy Policy for Koschei AI.'
};

export default function PrivacyPolicyPage() {
  return (
    <main className="panel space-y-4">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-white/75">Koschei AI values your privacy and handles personal data with care.</p>
      <p className="text-white/75">
        We may collect basic usage and account information needed to operate the service, provide support, and improve
        product performance.
      </p>
      <p className="text-white/75">
        This site may use third-party advertising and partner services, which can use cookies or similar technologies
        to deliver and measure relevant ads.
      </p>
      <p className="text-white/75">
        If you have privacy questions, contact us at{' '}
        <a className="text-neon hover:underline" href="mailto:hello@tradepigloball.co">
          hello@tradepigloball.co
        </a>
        .
      </p>
    </main>
  );
}
