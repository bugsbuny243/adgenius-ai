import { requirePlatformOwner } from '@/lib/owner-auth';

export default async function OwnerSettingsPage() {
  await requirePlatformOwner();
  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Ayarlar</h2>
      <p className="mt-2 text-sm text-white/70">Platform-level ayarlar owner yönetimindedir. Kullanıcılar sistem entegrasyon gizli bilgilerini göremez.</p>
    </section>
  );
}
