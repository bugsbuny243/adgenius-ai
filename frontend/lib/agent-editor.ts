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

export type PreviewTemplate = {
  title: string;
  template: string;
  emptyFallback?: string;
};

export type AgentEditorConfig = {
  slug: AgentEditorSlug;
  title: string;
  shortHelp: string;
  summaryDescription: string;
  placeholder: string;
  outputMode: string;
  sections: EditorSection[];
  previewSections: PreviewTemplate[];
  starterPacks: EditorStarterPack[];
  toggles?: EditorToggle[];
};

export type EditorState = Record<string, string | boolean>;

export type EditorStarterPack = {
  label: string;
  description: string;
  state: EditorState;
  freeNotes: string;
};

const DEFAULT_AGENT_SLUG: AgentEditorSlug = 'icerik';

export const agentEditorConfigs: Record<AgentEditorSlug, AgentEditorConfig> = {
  yazilim: {
    slug: 'yazilim',
    title: 'Yazılım Görev Editörü',
    shortHelp: 'Kod görevinin tipini, kısıtlarını ve beklenen çıktıyı net tanımlayın.',
    summaryDescription: 'Teknik çözüm planı, kod önerisi ve uygulanabilir adımlar üretir.',
    placeholder: 'Örn: Mevcut API sözleşmesini bozmadan checkout validasyon hatasını çöz.',
    outputMode: 'Teknik çözüm planı + örnek kod + test önerileri',
    sections: [
      {
        title: 'Görev Tanımı',
        fields: [
          { key: 'gorev_tipi', label: 'Görev tipi', type: 'select', options: ['bug fix', 'feature', 'refactor', 'explain'] },
          { key: 'teknoloji_stack', label: 'Teknoloji stack', type: 'text', placeholder: 'Örn: Next.js, TypeScript, Supabase' },
          { key: 'problem_aciklamasi', label: 'Problem açıklaması', type: 'textarea', placeholder: 'Hata nerede oluşuyor, beklenen/gerçek davranış ne?' }
        ]
      },
      {
        title: 'Teslim ve Kısıtlar',
        fields: [
          { key: 'beklenen_cikti', label: 'Beklenen çıktı', type: 'textarea', placeholder: 'Örn: Patch + kısa teknik açıklama + test checklisti' },
          { key: 'kisitlar', label: 'Kısıtlar', type: 'textarea', placeholder: 'Örn: Auth akışı ve deploy ayarlarına dokunma' },
          { key: 'kod_not_alani', label: 'Kod/not alanı', type: 'textarea', placeholder: 'İlgili kod parçaları veya teknik notlar' }
        ]
      }
    ],
    previewSections: [
      { title: 'Görev özeti', template: '{{gorev_tipi}} | {{teknoloji_stack}}' },
      { title: 'Problem özeti', template: '{{problem_aciklamasi}}' },
      { title: 'Beklenen teknik çıktı', template: '{{beklenen_cikti}}' },
      { title: 'Kısıt ve risk notu', template: '{{kisitlar}}' }
    ],
    starterPacks: [
      {
        label: 'Bug Fix',
        description: 'Canlı hata analizi ve düzeltme planı için başlangıç şablonu.',
        state: {
          gorev_tipi: 'bug fix',
          teknoloji_stack: 'Next.js + TypeScript + Supabase',
          beklenen_cikti: 'Kök neden analizi, önerilen patch ve test adımları'
        },
        freeNotes: 'Mevcut API sözleşmesini koru ve değişiklikleri küçük adımlara böl.'
      },
      {
        label: 'Refactor',
        description: 'Kod okunabilirliği ve sürdürülebilirlik odaklı görev başlangıcı.',
        state: {
          gorev_tipi: 'refactor',
          teknoloji_stack: 'TypeScript',
          beklenen_cikti: 'Refactor planı, risk listesi ve geri dönüş stratejisi'
        },
        freeNotes: 'Davranışı değiştirmeden sadeleştirme öner.'
      }
    ],
    toggles: [
      { key: 'test_oner', label: 'Test önerileri üret' },
      { key: 'performans_odakli', label: 'Performans odaklı yaklaşım' }
    ]
  },
  sosyal: {
    slug: 'sosyal',
    title: 'Sosyal Medya Editörü',
    shortHelp: 'Platform, kitle, ton ve CTA bilgisiyle net bir içerik brifi oluşturun.',
    summaryDescription: 'Platforma uygun içerik akışı, başlık taslağı ve CTA önerileri hazırlar.',
    placeholder: 'Örn: Lansman haftası için 3 reels + 2 story akışı',
    outputMode: 'İçerik özeti + başlık taslağı + format bazlı akış + CTA',
    sections: [
      {
        title: 'İçerik Çerçevesi',
        fields: [
          { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X'] },
          { key: 'hedef_kitle', label: 'Hedef kitle', type: 'text', placeholder: 'Örn: 24-35 yaş e-ticaret kurucuları' },
          { key: 'icerik_amaci', label: 'İçerik amacı', type: 'text', placeholder: 'Örn: Etkileşim artırma / topluluğu büyütme' },
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Samimi, motive edici, öğretici' }
        ]
      },
      {
        title: 'Mesaj',
        fields: [
          { key: 'konu', label: 'Konu', type: 'textarea', placeholder: 'Ana konu ve mesajı kısa bir paragrafla girin' },
          { key: 'cta', label: 'CTA', type: 'text', placeholder: 'Örn: Yoruma fikir bırak, kaydet, DM gönder' },
          { key: 'format', label: 'Format', type: 'select', options: ['post', 'reel', 'story', 'short', 'video thread'] }
        ]
      }
    ],
    previewSections: [
      { title: 'İçerik özeti', template: '{{platform}} | {{format}} | {{icerik_amaci}}' },
      { title: 'Başlık taslağı', template: '{{hedef_kitle}} için: {{konu}}' },
      { title: 'Ton ve mesaj', template: '{{ton}} tonunda kısa anlatım' },
      { title: 'CTA özeti', template: '{{cta}}' }
    ],
    starterPacks: [
      {
        label: 'Haftalık Plan',
        description: 'Haftalık sosyal medya içerik planı için hızlı başlangıç.',
        state: {
          platform: 'Instagram',
          format: 'reel',
          icerik_amaci: 'Etkileşim artırma',
          ton: 'Samimi ve enerjik'
        },
        freeNotes: 'Her içerik için bir hook ve alternatif CTA öner.'
      },
      {
        label: 'Lansman',
        description: 'Yeni ürün/hizmet duyurusu odaklı akış başlangıcı.',
        state: {
          platform: 'LinkedIn',
          format: 'post',
          icerik_amaci: 'Lansman duyurusu',
          ton: 'Güven veren ve profesyonel'
        },
        freeNotes: 'İlk cümle güçlü bir problemle başlasın.'
      }
    ]
  },
  eposta: {
    slug: 'eposta',
    title: 'E-posta Editörü',
    shortHelp: 'E-posta türünü, ana mesajı ve CTA’yı netleştirerek dönüşüm odaklı taslak alın.',
    summaryDescription: 'Konu satırı, gövde akışı ve kapanış CTA’sı olan e-posta çerçevesi üretir.',
    placeholder: 'Örn: Demo sonrası 2. takip e-postası, toplantı teyidi hedefli',
    outputMode: 'Konu satırı taslağı + giriş + gövde özeti + kapanış CTA',
    sections: [
      {
        title: 'E-posta Bilgileri',
        fields: [
          { key: 'eposta_turu', label: 'E-posta türü', type: 'select', options: ['Satış', 'Takip', 'Teklif', 'Onboarding', 'Bilgilendirme'] },
          { key: 'alici_tipi', label: 'Alıcı tipi', type: 'text', placeholder: 'Örn: Karar verici, mevcut müşteri, yeni lead' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Toplantı teyidi almak' },
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Net, profesyonel, sıcak' }
        ]
      },
      {
        title: 'Mesaj Çekirdeği',
        fields: [
          { key: 'ana_mesaj', label: 'Ana mesaj', type: 'textarea', placeholder: 'Alıcının neden ilgilenmesi gerektiğini net yazın' },
          { key: 'cta', label: 'CTA', type: 'text', placeholder: 'Örn: Salı 14:00 için kısa bir görüşme planlayalım' }
        ]
      }
    ],
    previewSections: [
      { title: 'Konu satırı taslağı', template: '{{eposta_turu}} | {{amac}}' },
      { title: 'Açılış cümlesi', template: '{{alici_tipi}} için {{ton}} bir başlangıç' },
      { title: 'Gövde özeti', template: '{{ana_mesaj}}' },
      { title: 'Kapanış CTA', template: '{{cta}}' }
    ],
    starterPacks: [
      {
        label: 'Takip Maili',
        description: 'Demo veya teklif sonrası dönüş alma odaklı.',
        state: {
          eposta_turu: 'Takip',
          amac: 'Toplantı teyidi almak',
          ton: 'Profesyonel ve sıcak'
        },
        freeNotes: 'Kısa ve net tut; gereksiz resmi ifadelerden kaçın.'
      },
      {
        label: 'Onboarding',
        description: 'Yeni kullanıcı aktivasyonunu hızlandıran başlangıç maili.',
        state: {
          eposta_turu: 'Onboarding',
          amac: 'İlk kullanım adımını tamamlatmak',
          ton: 'Yol gösterici ve güven veren'
        },
        freeNotes: 'Tek bir ana CTA olsun.'
      }
    ]
  },
  icerik: {
    slug: 'icerik',
    title: 'İçerik Üretim Editörü',
    shortHelp: 'İçerik türü, hedef kelime ve yazım tonunu belirleyerek güçlü bir brief oluşturun.',
    summaryDescription: 'Başlık taslağı, bölüm planı ve amaç odaklı içerik iskeleti üretir.',
    placeholder: 'Örn: B2B SaaS kullanıcı aktivasyonu için SEO blog briefi',
    outputMode: 'Başlık taslağı + bölüm yapısı + ana mesaj blokları',
    sections: [
      {
        title: 'İçerik Çekirdeği',
        fields: [
          { key: 'icerik_turu', label: 'İçerik türü', type: 'select', options: ['Blog', 'Landing', 'Rehber', 'Makale', 'Video metni'] },
          { key: 'ana_konu', label: 'Ana konu', type: 'text', placeholder: 'Örn: Aktivasyon oranını artıran onboarding adımları' },
          { key: 'hedef_kelimeler', label: 'Hedef kelimeler', type: 'textarea', placeholder: 'Virgülle ayırın: onboarding, aktivasyon, churn' }
        ]
      },
      {
        title: 'Yazım Hedefi',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Uzman ama anlaşılır' },
          { key: 'uzunluk', label: 'Uzunluk', type: 'select', options: ['Kısa', 'Orta', 'Uzun'] },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Organik trafik ve demo talebi üretmek' }
        ]
      }
    ],
    previewSections: [
      { title: 'Başlık taslağı', template: '{{ana_konu}} | {{icerik_turu}}' },
      { title: 'Bölüm yapısı', template: '1) Problem\n2) Yaklaşım\n3) Uygulama adımları\n4) Sonuç' },
      { title: 'Mesaj özeti', template: '{{amac}} | Ton: {{ton}}' },
      { title: 'Kelime odağı', template: '{{hedef_kelimeler}}' }
    ],
    starterPacks: [
      {
        label: 'SEO Blog',
        description: 'SEO odaklı blog briefi başlangıcı.',
        state: {
          icerik_turu: 'Blog',
          uzunluk: 'Orta',
          ton: 'Uzman ama sade',
          amac: 'Organik trafik artırma'
        },
        freeNotes: 'Örnekler gerçek senaryolardan gelsin.'
      },
      {
        label: 'Landing Metni',
        description: 'Dönüşüm odaklı landing içerik taslağı.',
        state: {
          icerik_turu: 'Landing',
          uzunluk: 'Kısa',
          ton: 'Net ve ikna edici',
          amac: 'Kayıt/dönüşüm artırma'
        },
        freeNotes: 'Hero, fayda blokları ve CTA ayrı başlıkta verilsin.'
      }
    ]
  },
  rapor: {
    slug: 'rapor',
    title: 'Rapor Editörü',
    shortHelp: 'Rapor türü, veri özeti ve hedef okuyucuya göre anlaşılır bir rapor planı hazırlayın.',
    summaryDescription: 'Yönetici özeti, bölüm akışı ve odak metrikleri ile raporu yapılandırır.',
    placeholder: 'Örn: Mart ayı performans özeti, yönetim sunumu formatında',
    outputMode: 'Yönetici özeti + bölüm yapısı + aksiyon odakları',
    sections: [
      {
        title: 'Rapor Girdileri',
        fields: [
          { key: 'rapor_turu', label: 'Rapor türü', type: 'select', options: ['Haftalık', 'Aylık', 'Çeyreklik', 'Kampanya', 'Stratejik'] },
          { key: 'veri_ozeti', label: 'Veri özeti', type: 'textarea', placeholder: 'Temel sayılar, trendler ve dikkat çeken değişimler' },
          { key: 'hedef_okuyucu', label: 'Hedef okuyucu', type: 'text', placeholder: 'Örn: C-level, ekip liderleri, müşteri ekibi' }
        ]
      },
      {
        title: 'Rapor Sunumu',
        fields: [
          { key: 'odak', label: 'Odak', type: 'text', placeholder: 'Örn: Büyüme, verimlilik, risk azaltma' },
          { key: 'format', label: 'Format', type: 'select', options: ['Madde madde', 'Anlatımsal', 'Tablo + özet'] }
        ]
      }
    ],
    previewSections: [
      { title: 'Yönetici özeti', template: '{{rapor_turu}} raporu | Odak: {{odak}}' },
      { title: 'Okuyucu uyumu', template: '{{hedef_okuyucu}} için {{format}} formatı' },
      { title: 'Bölüm yapısı', template: 'Özet\nVeri Analizi\nRiskler\nAksiyon Planı' },
      { title: 'Veri notları', template: '{{veri_ozeti}}' }
    ],
    starterPacks: [
      {
        label: 'Aylık Özet',
        description: 'Aylık performans ve aksiyon planı için rapor başlangıcı.',
        state: {
          rapor_turu: 'Aylık',
          format: 'Madde madde',
          odak: 'Büyüme ve verimlilik'
        },
        freeNotes: 'Her bölüm sonunda 1 aksiyon maddesi ekle.'
      },
      {
        label: 'Kampanya',
        description: 'Kampanya sonuçlarını özetleyen kısa rapor başlangıcı.',
        state: {
          rapor_turu: 'Kampanya',
          format: 'Tablo + özet',
          odak: 'ROI ve öğrenimler'
        },
        freeNotes: 'Metriklerin yanında kısa yorumlar da ver.'
      }
    ]
  },
  arastirma: {
    slug: 'arastirma',
    title: 'Araştırma Editörü',
    shortHelp: 'Konu, pazar ve rakip kapsamını belirleyerek derinlik seviyesine uygun araştırma brifi oluşturun.',
    summaryDescription: 'Araştırma kapsamı, karşılaştırma eksenleri ve bölüm planı üretir.',
    placeholder: 'Örn: Türkiye ödeme altyapılarında KOBİ odaklı rekabet analizi',
    outputMode: 'Araştırma özeti + karşılaştırma başlıkları + önerilen yapı',
    sections: [
      {
        title: 'Araştırma Parametreleri',
        fields: [
          { key: 'arastirma_konusu', label: 'Araştırma konusu', type: 'text', placeholder: 'Örn: AI destekli destek yazılımlarında fiyatlandırma eğilimleri' },
          { key: 'rakipler_markalar', label: 'Rakipler / markalar', type: 'textarea', placeholder: 'Karşılaştırılacak oyuncuları listeleyin' },
          { key: 'pazar_bolge', label: 'Pazar / bölge', type: 'text', placeholder: 'Örn: Türkiye, EMEA, Global' }
        ]
      },
      {
        title: 'Araştırma Hedefi',
        fields: [
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Konumlandırma stratejisi çıkarmak' },
          { key: 'derinlik', label: 'Derinlik', type: 'select', options: ['Yüzeysel', 'Orta', 'Derin'] }
        ]
      }
    ],
    previewSections: [
      { title: 'Araştırma özeti', template: '{{arastirma_konusu}} | {{pazar_bolge}}' },
      { title: 'Rakip kapsamı', template: '{{rakipler_markalar}}' },
      { title: 'Bölüm yapısı', template: 'Pazar görünümü\nRakip karşılaştırması\nFırsat alanları\nÖneriler' },
      { title: 'Derinlik ve amaç', template: '{{derinlik}} analiz | {{amac}}' }
    ],
    starterPacks: [
      {
        label: 'Rakip Analizi',
        description: 'Rakip odaklı araştırma için hızlı başlangıç.',
        state: {
          derinlik: 'Orta',
          pazar_bolge: 'Türkiye',
          amac: 'Pazar konumlandırma fırsatlarını görmek'
        },
        freeNotes: 'Tablo formatında kıyas maddeleri üret.'
      },
      {
        label: 'Pazar Taraması',
        description: 'Pazar dinamiklerini hızlıca toplamak için başlangıç.',
        state: {
          derinlik: 'Yüzeysel',
          pazar_bolge: 'EMEA',
          amac: 'Yeni pazara giriş fizibilitesi'
        },
        freeNotes: 'Bölümleri kısa ama aksiyon odaklı tut.'
      }
    ]
  },
  emlak: {
    slug: 'emlak',
    title: 'Emlak Editörü',
    shortHelp: 'İlan tipi, konum ve hedef müşteri bilgileriyle satış/kiralama odaklı metin planı oluşturun.',
    summaryDescription: 'İlan başlığı, açıklama omurgası ve CTA önerisi üretir.',
    placeholder: 'Örn: Kadıköy merkezde 2+1 kiralık daire, genç profesyoneller hedefli',
    outputMode: 'İlan başlığı + özellik özeti + hedef müşteri odaklı CTA',
    sections: [
      {
        title: 'İlan Bilgileri',
        fields: [
          { key: 'ilan_tipi', label: 'İlan tipi', type: 'select', options: ['Satılık', 'Kiralık', 'Ticari', 'Arsa'] },
          { key: 'konum', label: 'Konum', type: 'text', placeholder: 'Örn: İstanbul / Kadıköy' },
          { key: 'hedef_musteri', label: 'Hedef müşteri', type: 'text', placeholder: 'Örn: Yeni evli çiftler, yatırımcılar' },
          { key: 'one_cikan_ozellikler', label: 'Öne çıkan özellikler', type: 'textarea', placeholder: 'Örn: Metroya 5 dk, açık mutfak, otopark, balkon' }
        ]
      },
      {
        title: 'İletişim Dili',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Güven veren ve net' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Hızlı geri dönüş ve randevu almak' }
        ]
      }
    ],
    previewSections: [
      { title: 'İlan başlığı taslağı', template: '{{ilan_tipi}} | {{konum}}' },
      { title: 'Özellik özeti', template: '{{one_cikan_ozellikler}}' },
      { title: 'Hedef müşteri odağı', template: '{{hedef_musteri}} için {{ton}} anlatım' },
      { title: 'CTA özeti', template: '{{amac}}' }
    ],
    starterPacks: [
      {
        label: 'Kiralık Daire',
        description: 'Kiralık konut ilanı için başlangıç şablonu.',
        state: {
          ilan_tipi: 'Kiralık',
          ton: 'Samimi ve güven veren',
          amac: 'Hızlı randevu talebi almak'
        },
        freeNotes: 'İlk paragrafta lokasyon avantajını vurgula.'
      },
      {
        label: 'Satılık Konut',
        description: 'Satılık konut için ikna odaklı metin başlangıcı.',
        state: {
          ilan_tipi: 'Satılık',
          ton: 'Profesyonel ve net',
          amac: 'Nitelikli alıcı başvurusu toplamak'
        },
        freeNotes: 'Yatırım potansiyeline dair bir cümle öner.'
      }
    ]
  },
  eticaret: {
    slug: 'eticaret',
    title: 'E-ticaret Editörü',
    shortHelp: 'Ürün detaylarını ve hedef müşteri bilgisini girerek dönüşüm odaklı ürün metni brifi oluşturun.',
    summaryDescription: 'Ürün başlığı, fayda yapısı ve platforma uygun CTA üretir.',
    placeholder: 'Örn: Kablosuz blender için ürün sayfası metni, mobil kullanıcı odaklı',
    outputMode: 'Ürün özeti + fayda maddeleri + CTA taslağı',
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
        title: 'Pazarlama Hedefi',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Güvenilir ve çözüm odaklı' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Dönüşüm oranını artırmak' }
        ]
      }
    ],
    previewSections: [
      { title: 'Ürün özeti', template: '{{urun_adi}} | {{kategori}} | {{platform}}' },
      { title: 'Müşteri odağı', template: '{{hedef_musteri}} için {{ton}} mesaj' },
      { title: 'Fayda yapısı', template: 'Problem\nÇözüm\nÖne çıkan 3 fayda\nKarar CTA' },
      { title: 'CTA özeti', template: '{{amac}}' }
    ],
    starterPacks: [
      {
        label: 'Ürün Sayfası',
        description: 'E-ticaret ürün detay sayfası için hızlı başlangıç.',
        state: {
          platform: 'Shopify',
          ton: 'Güvenilir ve net',
          amac: 'Sepete ekleme oranını artırmak'
        },
        freeNotes: 'Mobil kullanıcılar için kısa paragraf ve madde yapısı öner.'
      },
      {
        label: 'Pazar Yeri',
        description: 'Pazaryeri listeleme metni için başlangıç.',
        state: {
          platform: 'Trendyol',
          ton: 'Bilgilendirici ve ikna edici',
          amac: 'Ürün detay sayfası dönüşümünü artırmak'
        },
        freeNotes: 'Başlıkta ana faydayı ilk 60 karakterde ver.'
      }
    ]
  }
};

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function interpolateTemplate(template: string, state: EditorState, fallback: string): string {
  const formatted = template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = state[key];
    if (typeof value === 'string' && value.trim()) return normalizeValue(value);
    return fallback;
  });

  return formatted;
}

export function getAgentEditorConfig(slug?: string | null): AgentEditorConfig {
  if (!slug) return agentEditorConfigs[DEFAULT_AGENT_SLUG];
  return agentEditorConfigs[(slug as AgentEditorSlug)] ?? agentEditorConfigs[DEFAULT_AGENT_SLUG];
}

export function getAgentStarterPacks(slug?: string | null): EditorStarterPack[] {
  return getAgentEditorConfig(slug).starterPacks;
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

  lines.push('Lütfen çıktıyı düzenli başlıklarla, kısa özetle ve uygulanabilir adımlarla ver.');
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
  const fallback = 'Henüz belirtilmedi';

  const configuredBlocks = config.previewSections.map((section) => ({
    title: section.title,
    content: interpolateTemplate(section.template, state, section.emptyFallback ?? fallback)
  }));

  if (freeNotes.trim()) {
    configuredBlocks.push({
      title: 'Ek not vurgusu',
      content: normalizeValue(freeNotes)
    });
  }

  return configuredBlocks;
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
