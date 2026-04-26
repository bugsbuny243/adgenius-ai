export type GameAgentPlanKey = 'starter' | 'pro' | 'studio';

export type GameAgentPlan = {
  planKey: GameAgentPlanKey;
  name: string;
  priceLabel: string;
  amountTry: number;
  currency: 'TRY';
  shopierUrl: string;
  summary: string;
  includes: string[];
  excludes: string[];
  warnings: string[];
};

export const GAME_AGENT_PLANS: GameAgentPlan[] = [
  {
    planKey: 'starter',
    name: 'Starter',
    priceLabel: '499 TL',
    amountTry: 499,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531862',
    summary: 'Basit prototip testleri için.',
    includes: [
      '1 basit Android oyun fikri brief’i',
      '1 oluşturulmuş Unity proje taslağı',
      'Temel 2D runner/casual oyun yapısı',
      'Proje detay sayfası',
      'Shopier ödeme sonrası owner onaylı erişim'
    ],
    excludes: [
      'Google Play yayınının garanti edilmesi',
      'Karmaşık multiplayer/MMO oyunlar',
      'İleri seviye özel sanat üretimi',
      'Sınırsız revizyon',
      'Gelir garantisi',
      'Mağaza kabul garantisi'
    ],
    warnings: [
      'Ödeme sonrası paket erişimi owner tarafından manuel onaylanır.',
      'Google Play yayın onayı Google’ın inceleme sürecine bağlıdır.',
      'Koschei oyun üretim ve build hazırlık sürecini otomatikleştirir; mağaza kabulü veya gelir garantisi vermez.'
    ]
  },
  {
    planKey: 'pro',
    name: 'Pro',
    priceLabel: '1.999 TL',
    amountTry: 1999,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531900',
    summary: 'Daha tamamlanmış mobil oyun paketi isteyen kullanıcılar için.',
    includes: [
      'Daha detaylı oyun brief’i',
      'Oluşturulmuş Unity proje taslağı',
      'Android build hazırlığı',
      'Temel mağaza metin taslağı',
      'Temel monetizasyon/reklam yerleşim notları',
      'Shopier ödeme sonrası owner onaylı erişim'
    ],
    excludes: [
      'Google Play onay garantisi',
      'İleri seviye online multiplayer',
      'Özel backend sunucuları',
      'Lisanslı üçüncü taraf asset maliyetleri',
      'Sınırsız revizyon',
      'Gelir garantisi'
    ],
    warnings: [
      'Karmaşık online/multiplayer oyunlar bu paketlere dahil değildir.',
      'Google Play yayın onayı Google’ın inceleme sürecine bağlıdır.',
      'Koschei mağaza kabulü veya gelir garantisi vermez.'
    ]
  },
  {
    planKey: 'studio',
    name: 'Studio',
    priceLabel: '6.999 TL',
    amountTry: 6999,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531961',
    summary: 'Daha ciddi lansman hazırlıkları için.',
    includes: [
      'Daha güçlü oyun konsepti/brief',
      'Oluşturulmuş Unity proje taslağı',
      'Android AAB build flow hazırlığı',
      'Store listing taslağı',
      'Release notes taslağı',
      'Owner incelemeli yayın hazırlığı',
      'Owner tarafından öncelikli manuel inceleme'
    ],
    excludes: [
      'Google Play onay garantisi',
      'Gelir garantisi',
      'PUBG/DarkOrbit seviyesinde MMO üretimi',
      'Ayrı anlaşma olmadan özel 3D asset',
      'Ayrı anlaşma olmadan uzun dönem live ops/backend',
      'Kullanıcı adına hukuki/hesap sorumluluğu'
    ],
    warnings: [
      'Yayın ve build süreçleri owner değerlendirmesine tabi olabilir.',
      'Google Play mağaza kabulü veya gelir garantisi verilmez.',
      'Her paket Game Agent içindir; diğer ajanlar ileride farklı fiyatlandırılacaktır.'
    ]
  }
];

export const GAME_AGENT_PLAN_MAP = Object.fromEntries(
  GAME_AGENT_PLANS.map((plan) => [plan.planKey, plan])
) as Record<GameAgentPlanKey, GameAgentPlan>;

export const GAME_AGENT_PUBLIC_NOTICES = [
  'Ödeme sonrası paket erişimi owner tarafından manuel onaylanır.',
  'Google Play yayın onayı Google’ın inceleme sürecine bağlıdır.',
  'Koschei oyun üretim ve build hazırlık sürecini otomatikleştirir; mağaza kabulü veya gelir garantisi vermez.',
  'Karmaşık online/multiplayer oyunlar bu paketlere dahil değildir.',
  'Her paket Game Agent içindir; diğer ajanlar ileride farklı fiyatlandırılacaktır.'
] as const;
