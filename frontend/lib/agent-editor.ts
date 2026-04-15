export type AgentEditorSlug =
  | 'yazilim'
  | 'sosyal'
  | 'eposta'
  | 'icerik'
  | 'rapor'
  | 'arastirma'
  | 'emlak'
  | 'eticaret';

export type EditorFieldType = 'text' | 'textarea' | 'select';

export type EditorField = {
  key: string;
  label: string;
  type: EditorFieldType;
  placeholder?: string;
  options?: string[];
};

export type EditorSection = {
  title: string;
  fields: EditorField[];
};

export type EditorToggle = {
  key: string;
  label: string;
};

export type AgentEditorConfig = {
  slug: AgentEditorSlug;
  title: string;
  shortHelp: string;
  summaryDescription: string;
  placeholder: string;
  outputMode: string;
  sections: EditorSection[];
  toggles?: EditorToggle[];
};

export type EditorState = Record<string, string | boolean>;

const DEFAULT_AGENT_SLUG: AgentEditorSlug = 'icerik';

export const agentEditorConfigs: Record<AgentEditorSlug, AgentEditorConfig> = {
  yazilim: {
    slug: 'yazilim',
    title: 'Yazılım Görev Editörü',
    shortHelp: 'Kod üretimi, bug fix, refactor ve teknik açıklama görevlerini yapılandırır.',
    summaryDescription: 'Kod odaklı görevler için teknik ve net çıktı üretir.',
    placeholder: 'Örn: Login formunda submit sonrası hata alıyorum, root cause analizi istiyorum.',
    outputMode: 'Teknik çözüm planı + örnek kod + adım adım açıklama',
    sections: [
      {
        title: 'Görev Tanımı',
        fields: [
          { key: 'gorev_tipi', label: 'Görev tipi', type: 'select', options: ['bug fix', 'feature', 'refactor', 'explain'] },
          { key: 'teknoloji_yigini', label: 'Teknoloji yığını', type: 'text', placeholder: 'Örn: Next.js, TypeScript, Supabase' },
          { key: 'problem_aciklamasi', label: 'Problem açıklaması', type: 'textarea', placeholder: 'Hatanın ne zaman ve nasıl oluştuğunu yaz.' }
        ]
      },
      {
        title: 'Beklenti ve Kısıtlar',
        fields: [
          { key: 'beklenen_cikti', label: 'Beklenen çıktı', type: 'textarea', placeholder: 'Örn: Çalışan patch + kısa açıklama' },
          { key: 'kisitlar', label: 'Kısıtlar', type: 'textarea', placeholder: 'Örn: Auth akışına dokunma, mevcut API bozulmasın' },
          { key: 'kod_blogu', label: 'Kod bloğu / teknik not', type: 'textarea', placeholder: 'Mevcut kodu veya teknik notları buraya ekle.' }
        ]
      }
    ],
    toggles: [
      { key: 'test_oner', label: 'Test önerileri üret' },
      { key: 'performans_odakli', label: 'Performans odaklı çözüm iste' }
    ]
  },
  sosyal: {
    slug: 'sosyal',
    title: 'Sosyal Medya Editörü',
    shortHelp: 'Post, reel, story veya video thread planını hedefe uygun üretir.',
    summaryDescription: 'Platforma göre güçlü içerik akışı ve CTA taslağı çıkarır.',
    placeholder: 'Örn: Genç girişimcilere yönelik haftalık reels planı',
    outputMode: 'İçerik özeti + başlık + açıklama + hook + CTA',
    sections: [
      {
        title: 'İçerik Planı',
        fields: [
          { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X'] },
          { key: 'hedef_kitle', label: 'Hedef kitle', type: 'text', placeholder: 'Örn: 25-34 yaş dijital pazarlamacılar' },
          { key: 'icerik_amaci', label: 'İçerik amacı', type: 'text', placeholder: 'Örn: Etkileşim artırma / satışa yönlendirme' },
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Samimi, enerjik, öğretici' }
        ]
      },
      {
        title: 'Mesaj ve Aksiyon',
        fields: [
          { key: 'icerik_konusu', label: 'İçerik fikri / konu', type: 'textarea', placeholder: 'Ana fikri tek paragrafta anlat.' },
          { key: 'cta', label: 'CTA', type: 'text', placeholder: 'Örn: Kaydet, yorum yaz, DM at' },
          { key: 'format', label: 'Format', type: 'select', options: ['post', 'reel', 'story', 'short', 'video thread'] }
        ]
      }
    ]
  },
  eposta: {
    slug: 'eposta',
    title: 'E-posta Editörü',
    shortHelp: 'Satış, takip, teklif veya bilgilendirme e-postalarını yapılandırır.',
    summaryDescription: 'Hedef alıcıya uygun net konu ve CTA ile e-posta taslar.',
    placeholder: 'Örn: Demo sonrası B2B takip e-postası',
    outputMode: 'Konu satırı + giriş + gövde özeti + kapanış CTA',
    sections: [
      {
        title: 'E-posta Çerçevesi',
        fields: [
          { key: 'eposta_turu', label: 'E-posta türü', type: 'select', options: ['Satış', 'Takip', 'Teklif', 'Onboarding', 'Bilgilendirme'] },
          { key: 'alici_tipi', label: 'Alıcı tipi', type: 'text', placeholder: 'Örn: Karar verici, mevcut müşteri' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Toplantı almak, teklif dönüşü almak' },
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Profesyonel ve sıcak' }
        ]
      },
      {
        title: 'Mesaj',
        fields: [
          { key: 'ana_mesaj', label: 'Ana mesaj', type: 'textarea', placeholder: 'Vermek istediğin ana mesajı net yaz.' },
          { key: 'cta', label: 'CTA', type: 'text', placeholder: 'Örn: 15 dk görüşme planlayalım' }
        ]
      }
    ]
  },
  icerik: {
    slug: 'icerik',
    title: 'İçerik Üretim Editörü',
    shortHelp: 'Blog, landing, rehber veya makale için yapılandırılmış içerik üretir.',
    summaryDescription: 'SEO ve mesaj odaklı içerik iskeleti hazırlar.',
    placeholder: 'Örn: SaaS onboarding rehberi için blog içeriği',
    outputMode: 'Başlık önerisi + outline + ana mesaj blokları',
    sections: [
      {
        title: 'İçerik Bilgileri',
        fields: [
          { key: 'icerik_turu', label: 'İçerik türü', type: 'select', options: ['Blog', 'Landing', 'Rehber', 'Makale', 'Video metni'] },
          { key: 'ana_konu', label: 'Ana konu', type: 'text', placeholder: 'Örn: Ürün aktivasyon stratejileri' },
          { key: 'hedef_kelimeler', label: 'Hedef kelimeler', type: 'textarea', placeholder: 'Virgülle ayır: onboarding, churn, kullanıcı aktivasyonu' }
        ]
      },
      {
        title: 'Yazım Çerçevesi',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Uzman ama anlaşılır' },
          { key: 'uzunluk', label: 'Uzunluk', type: 'select', options: ['Kısa', 'Orta', 'Uzun'] },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Organik trafik ve lead toplama' }
        ]
      }
    ]
  },
  rapor: {
    slug: 'rapor',
    title: 'Rapor Editörü',
    shortHelp: 'Yönetici özeti ve bölüm planı olan rapor üretimi için kullanılır.',
    summaryDescription: 'Raporu hedef okuyucuya uygun yapı ve metriklerle kurgular.',
    placeholder: 'Örn: Q1 performans raporu - pazarlama odaklı',
    outputMode: 'Yönetici özeti + bölüm taslağı + metrik odakları',
    sections: [
      {
        title: 'Rapor Girdileri',
        fields: [
          { key: 'rapor_turu', label: 'Rapor türü', type: 'select', options: ['Haftalık', 'Aylık', 'Çeyreklik', 'Kampanya', 'Stratejik'] },
          { key: 'veri_ozeti', label: 'Veri özeti', type: 'textarea', placeholder: 'Önemli verileri kısa şekilde yaz.' },
          { key: 'hedef_okuyucu', label: 'Hedef okuyucu', type: 'text', placeholder: 'Örn: C-level, ekip lideri, müşteri' }
        ]
      },
      {
        title: 'Rapor Odağı',
        fields: [
          { key: 'odak_noktasi', label: 'Odak noktası', type: 'text', placeholder: 'Örn: Büyüme ve verimlilik' },
          { key: 'format', label: 'Format', type: 'select', options: ['Madde madde', 'Anlatımsal', 'Tablo + özet'] }
        ]
      }
    ]
  },
  arastirma: {
    slug: 'arastirma',
    title: 'Araştırma Editörü',
    shortHelp: 'Pazar, rakip ve konu araştırmasını kapsamlı şekilde çerçeveler.',
    summaryDescription: 'Araştırma kapsamı, alt başlıklar ve karşılaştırma eksenleri çıkarır.',
    placeholder: 'Örn: Türkiye fintech ödeme çözümleri rekabet analizi',
    outputMode: 'Araştırma kapsamı + alt başlıklar + karşılaştırma başlıkları',
    sections: [
      {
        title: 'Araştırma Kapsamı',
        fields: [
          { key: 'arastirma_konusu', label: 'Araştırma konusu', type: 'text', placeholder: 'Örn: AI destekli müşteri hizmetleri' },
          { key: 'rakipler', label: 'Rakipler / markalar', type: 'textarea', placeholder: 'Karşılaştırılacak markaları yaz.' },
          { key: 'pazar_bolge', label: 'Pazar / bölge', type: 'text', placeholder: 'Örn: Türkiye, EMEA, global' }
        ]
      },
      {
        title: 'Araştırma Hedefi',
        fields: [
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Konumlandırma stratejisi çıkarmak' },
          { key: 'derinlik', label: 'Derinlik', type: 'select', options: ['Yüzeysel', 'Orta', 'Derin'] }
        ]
      }
    ]
  },
  emlak: {
    slug: 'emlak',
    title: 'Emlak Editörü',
    shortHelp: 'İlan başlığı, açıklama ve satış noktalarını hızlıca üretir.',
    summaryDescription: 'Hedef müşteri segmentine göre ilan metnini optimize eder.',
    placeholder: 'Örn: Kadıköy merkezde 2+1 kiralık daire ilanı',
    outputMode: 'İlan başlığı + kısa açıklama + satış noktaları',
    sections: [
      {
        title: 'İlan Bilgileri',
        fields: [
          { key: 'ilan_tipi', label: 'İlan tipi', type: 'select', options: ['Satılık', 'Kiralık', 'Ticari', 'Arsa'] },
          { key: 'konum', label: 'Konum', type: 'text', placeholder: 'Örn: İstanbul / Kadıköy' },
          { key: 'hedef_musteri', label: 'Hedef müşteri', type: 'text', placeholder: 'Örn: Yeni evli çiftler' },
          { key: 'ozellikler', label: 'Öne çıkan özellikler', type: 'textarea', placeholder: 'Örn: Metroya 5 dk, geniş balkon, otopark' }
        ]
      },
      {
        title: 'Mesaj Stili',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Güven veren ve net' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Hızlı geri dönüş almak' }
        ]
      }
    ]
  },
  eticaret: {
    slug: 'eticaret',
    title: 'E-ticaret Editörü',
    shortHelp: 'Ürün açıklaması, fayda maddeleri ve CTA üretir.',
    summaryDescription: 'Platforma uygun ürün metinleri ve satış dili kurgular.',
    placeholder: 'Örn: Kablosuz blender için ürün sayfası metni',
    outputMode: 'Ürün başlığı + kısa açıklama + fayda maddeleri + CTA',
    sections: [
      {
        title: 'Ürün Bilgileri',
        fields: [
          { key: 'urun_adi', label: 'Ürün adı', type: 'text', placeholder: 'Örn: SmartBlend Pro' },
          { key: 'kategori', label: 'Kategori', type: 'text', placeholder: 'Örn: Küçük ev aletleri' },
          { key: 'hedef_musteri', label: 'Hedef müşteri', type: 'text', placeholder: 'Örn: Yoğun çalışan ebeveynler' },
          { key: 'platform', label: 'Platform', type: 'select', options: ['Shopify', 'Trendyol', 'Amazon', 'Hepsiburada', 'Kendi sitesi'] }
        ]
      },
      {
        title: 'Pazarlama Çerçevesi',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Güvenilir ve çözüm odaklı' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Dönüşüm oranını artırmak' }
        ]
      }
    ]
  }
};

export function getAgentEditorConfig(slug?: string | null): AgentEditorConfig {
  if (!slug) return agentEditorConfigs[DEFAULT_AGENT_SLUG];
  return agentEditorConfigs[(slug as AgentEditorSlug)] ?? agentEditorConfigs[DEFAULT_AGENT_SLUG];
}

export function buildDerivedPrompt(config: AgentEditorConfig, state: EditorState, freeNotes: string): string {
  const lines = [`Agent: ${config.title}`, `Hedef çıktı modu: ${config.outputMode}`, ''];

  for (const section of config.sections) {
    lines.push(`${section.title}:`);
    for (const field of section.fields) {
      const raw = state[field.key];
      if (typeof raw === 'string' && raw.trim()) {
        lines.push(`- ${field.label}: ${raw.trim()}`);
      }
    }
    lines.push('');
  }

  if (config.toggles?.length) {
    const activeToggles = config.toggles.filter((toggle) => Boolean(state[toggle.key])).map((toggle) => toggle.label);
    if (activeToggles.length) {
      lines.push('Opsiyonel tercihler:');
      for (const toggle of activeToggles) {
        lines.push(`- ${toggle}`);
      }
      lines.push('');
    }
  }

  if (freeNotes.trim()) {
    lines.push('Ek notlar:');
    lines.push(freeNotes.trim());
    lines.push('');
  }

  lines.push('Lütfen çıktıyı düzenli başlıklarla ve uygulanabilir adımlarla ver.');
  return lines.join('\n').trim();
}

export function buildFormSummary(config: AgentEditorConfig, state: EditorState): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];

  for (const section of config.sections) {
    for (const field of section.fields) {
      const value = state[field.key];
      if (typeof value === 'string' && value.trim()) {
        items.push({ label: field.label, value: value.trim() });
      }
    }
  }

  return items;
}

export function buildPreviewBlocks(config: AgentEditorConfig, state: EditorState, freeNotes: string): Array<{ title: string; content: string }> {
  const get = (key: string, fallback = 'Henüz belirtilmedi.') => {
    const value = state[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    return fallback;
  };

  const slug = config.slug;

  if (slug === 'yazilim') {
    return [
      { title: 'İstek Özeti', content: `${get('gorev_tipi')} | ${get('teknoloji_yigini')}` },
      { title: 'Beklenen Teknik Çıktı', content: get('beklenen_cikti') },
      { title: 'Kısıtlar', content: get('kisitlar') }
    ];
  }

  if (slug === 'sosyal') {
    return [
      { title: 'İçerik Özeti', content: `${get('platform')} - ${get('format')} | ${get('icerik_amaci')}` },
      { title: 'Önerilen Başlık', content: `${get('hedef_kitle')} için ${get('icerik_konusu')}` },
      { title: 'Önerilen Açıklama', content: get('ton') },
      { title: 'Hook / CTA Taslağı', content: `${get('cta')} | ${freeNotes.trim() || 'Ek not yok.'}` }
    ];
  }

  if (slug === 'eposta') {
    return [
      { title: 'Konu Satırı Taslağı', content: `${get('eposta_turu')} | ${get('amac')}` },
      { title: 'Giriş Paragrafı', content: `${get('alici_tipi')} için ${get('ton')} bir açılış` },
      { title: 'Gövde Özeti', content: get('ana_mesaj') },
      { title: 'Kapanış CTA', content: get('cta') }
    ];
  }

  if (slug === 'icerik') {
    return [
      { title: 'Başlık Önerisi', content: `${get('ana_konu')} - ${get('icerik_turu')}` },
      { title: 'Outline', content: `1) Giriş\n2) ${get('ana_konu')}\n3) Ana örnekler\n4) Sonuç` },
      { title: 'Ana Mesaj Blokları', content: `${get('amac')} | Ton: ${get('ton')}` }
    ];
  }

  if (slug === 'rapor') {
    return [
      { title: 'Yönetici Özeti', content: `${get('rapor_turu')} raporu | ${get('odak_noktasi')}` },
      { title: 'Bölüm Taslağı', content: `Özet\nVeri Analizi\nÖneriler\nAksiyon Planı` },
      { title: 'Metrik Odakları', content: get('veri_ozeti') }
    ];
  }

  if (slug === 'arastirma') {
    return [
      { title: 'Araştırma Kapsamı', content: `${get('arastirma_konusu')} - ${get('pazar_bolge')}` },
      { title: 'Alt Başlıklar', content: `Pazar dinamikleri\nRakip analizi\nFırsat alanları` },
      { title: 'Karşılaştırma Başlıkları', content: get('rakipler') }
    ];
  }

  if (slug === 'emlak') {
    return [
      { title: 'İlan Başlığı', content: `${get('ilan_tipi')} | ${get('konum')}` },
      { title: 'Kısa Açıklama', content: get('ozellikler') },
      { title: 'Satış Noktaları', content: `${get('hedef_musteri')} | ${get('amac')}` }
    ];
  }

  return [
    { title: 'Ürün Başlığı', content: `${get('urun_adi')} | ${get('kategori')}` },
    { title: 'Kısa Açıklama', content: `${get('hedef_musteri')} için ${get('platform')} odaklı metin` },
    { title: 'Fayda Maddeleri', content: `${get('amac')} | Ton: ${get('ton')}` },
    { title: 'CTA', content: freeNotes.trim() || 'Hemen keşfet ve sipariş ver.' }
  ];
}

export type EditorMetadata = {
  editorState: EditorState;
  derivedPrompt: string;
  freeNotes: string;
};

export function parseEditorMetadata(metadata: unknown): EditorMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return { editorState: {}, derivedPrompt: '', freeNotes: '' };
  }

  const source = metadata as Record<string, unknown>;
  const editorState = source.editor_state;

  return {
    editorState: editorState && typeof editorState === 'object' ? (editorState as EditorState) : {},
    derivedPrompt: typeof source.derived_prompt === 'string' ? source.derived_prompt : '',
    freeNotes: typeof source.free_notes === 'string' ? source.free_notes : ''
  };
}
