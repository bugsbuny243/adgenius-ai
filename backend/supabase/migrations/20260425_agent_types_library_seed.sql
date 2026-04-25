insert into public.agent_types (slug, name, description, is_active, system_prompt)
values
  (
    'blogger',
    'Koschei Blogger Agent',
    'Blog yazısı planı, SEO başlıkları ve yayın öncesi içerik hazırlığı üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'channel_planner',
    'Koschei Channel Planner',
    'Video serisi akışı, bölüm başlıkları ve yayın takvimi hazırlar.',
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
where slug not in ('blogger', 'channel_planner', 'game_factory');
