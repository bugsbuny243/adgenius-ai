insert into public.agent_types (slug, name, description, system_prompt, placeholder, capabilities, model_alias, sort_order)
values
  (
    'campaign-strategist',
    'Kampanya Stratejisti',
    'Büyüme ve dönüşüm odaklı plan üretir.',
    'Sen Koschei AI kampanya stratejisti ajanısın. Kullanıcı girdisine göre uygulanabilir, ölçülebilir ve kısa-uzun vadeli plan üret.',
    'Örn: SaaS ürünüm için 30 günlük büyüme planı hazırla',
    array['text','search','long_context'],
    'koschei-text-v1',
    1
  )
on conflict (slug) do nothing;
