export const GAME_FACTORY_STATUS_LABELS: Record<string, string> = {
  draft: 'Hazırlanıyor',
  brief_created: 'Hazırlanıyor',
  generating: 'Hazırlanıyor',
  generated: 'Oyun dosyaları oluşturuldu',
  committing: 'Build için hazırlanıyor',
  ready_for_build: 'Build için hazır',
  building: 'Build alınıyor',
  build_succeeded: 'AAB hazır',
  build_failed: 'Build başarısız',
  release_preparing: 'Yayına hazırlanıyor',
  release_ready: 'Yayına hazır',
  awaiting_user_approval: 'Yayın onayı bekliyor',
  publishing: 'Yayın gönderiliyor',
  published: 'Yayınlandı',
  publish_failed: 'Yayın başarısız',
  failed: 'Hata oluştu'
};

export function gameFactoryStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Hazırlanıyor';
  return GAME_FACTORY_STATUS_LABELS[status] ?? 'Hazırlanıyor';
}
