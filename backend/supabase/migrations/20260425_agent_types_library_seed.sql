insert into public.agent_types (slug, name, description, is_active, system_prompt)
values
  (
    'business_general',
    'Koschei İşletme Genel Agent',
    'İşletme operasyonları, süreç iyileştirme ve günlük karar akışları için genel destek üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'blogger',
    'Koschei Blogger Agent',
    'Blog yazısı planı, SEO başlıkları ve yayın öncesi içerik hazırlığı üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'youtube_agent',
    'Koschei YouTube Agent',
    'YouTube video fikri, başlık, açıklama ve yayın planı üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'game_factory',
    'Koschei Game Factory',
    'Oyun fikrini görev planına çevirir, build hattı için üretim adımlarını yönetir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  system_prompt = coalesce(public.agent_types.system_prompt, excluded.system_prompt);

delete from public.agent_types
where slug not in ('business_general', 'blogger', 'youtube_agent', 'game_factory');
