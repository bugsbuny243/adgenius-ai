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
  ),
  (
    'publisher',
    'Koschei Publisher Assistant',
    'Mağaza açıklamaları, sürüm notu taslakları ve yayın kontrol listesi oluşturur.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'sheets',
    'Koschei Sheets Agent',
    'Operasyon tablolarını düzenler, görevleri sınıflandırır ve iş listeleri üretir.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'mail',
    'Koschei Mail Assistant',
    'İş e-postaları için yanıt taslakları ve takip mesajları hazırlar.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'seo',
    'Koschei SEO Agent',
    'Sayfa başlığı, meta önerisi ve indeksleme hazırlık kontrolü yapar.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  (
    'research',
    'Koschei Research Agent',
    'Konu araştırması yapar, kaynak notlarını özetler ve karar taslağı çıkarır.',
    true,
    'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'
  ),
  ('yazilim', 'Yazılım Agent', 'Yazılım görevleri için teknik planlama ajanı.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('sosyal', 'Sosyal Medya Agent', 'Sosyal medya içerik planlama ajanı.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('eposta', 'E-Posta Agent', 'E-posta taslakları ve yanıt önerileri üretir.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('icerik', 'İçerik Agent', 'İçerik üretimi ve düzenleme destek ajanı.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('rapor', 'Rapor Agent', 'Raporlama ve özet çıkarımı için ajandır.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('arastirma', 'Araştırma Agent', 'Araştırma, kaynak tarama ve karşılaştırma ajanı.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('emlak', 'Emlak Agent', 'Emlak ilan ve analiz içerikleri üretir.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.'),
  ('eticaret', 'E-Ticaret Agent', 'E-ticaret ürün metni ve kampanya taslağı üretir.', true, 'Türkçe yaz. Kısa özet, uygulanabilir adımlar ve net çıktı üret.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  system_prompt = coalesce(public.agent_types.system_prompt, excluded.system_prompt);
