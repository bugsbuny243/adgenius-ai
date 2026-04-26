insert into public.agent_types (slug, name, description, is_active, system_prompt)
values
  (
    'game_agent',
    'Koschei Game Agent',
    'Oyun fikrini üretim planına dönüştürür, build hattı için üretim adımlarını yönetir.',
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
    'blogger_agent',
    'Koschei Blogger Agent',
    'Blog yazısı planı, SEO başlıkları ve yayın öncesi içerik hazırlığı üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'business_agent',
    'Koschei İşletme Agent',
    'İşletme operasyonları, süreç iyileştirme ve günlük karar akışları için genel destek üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  system_prompt = coalesce(public.agent_types.system_prompt, excluded.system_prompt);

update public.agent_types
set is_active = false
where slug not in ('game_agent', 'youtube_agent', 'blogger_agent', 'business_agent');
