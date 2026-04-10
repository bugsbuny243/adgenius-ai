import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Koschei AI',
  description: 'Contact the Koschei AI team for support, business inquiries, or product questions.'
};

export default function ContactPage() {
  return (
    <main className="panel space-y-4">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="text-white/75">If you have a support request or business inquiry, please reach us by email:</p>
      <p className="font-medium">
        <a className="text-neon hover:underline" href="mailto:contact@yourdomain.com">
          contact@yourdomain.com
        </a>
      </p>
      <p className="text-sm text-white/60">Replace this placeholder with your real support email before launch.</p>
    </main>
  );
}
