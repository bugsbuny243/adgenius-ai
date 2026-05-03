export type GameAgentPlanKey = 'starter' | 'pro' | 'studio' | 'multiplayer';

export type GameAgentPlan = {
  planKey: GameAgentPlanKey;
  name: string;
  priceLabel: string;
  amountTry: number;
  currency: 'TRY';
  shopierUrl: string;
  summary: string;
  includes: string[];
  warnings: string[];
};

export const GAME_AGENT_PLANS: GameAgentPlan[] = [
  {
    planKey: 'starter',
    name: 'INDIE',
    priceLabel: '4.999 TL',
    amountTry: 4999,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531862',
    summary: 'Google Play çıkışına hazır bağımsız mobil oyun paketi.',
    includes: [
      'Google Play yayın hazırlığı ve teknik checklist',
      'Mağaza kabul desteği (listing + policy uyum odaklı yönlendirme)',
      'Otonom sanat üretimi (2D/konsept asset akışı)',
      '1 oluşturulmuş Unity proje taslağı',
      'Shopier (TradeVisual) ödeme sonrası owner onaylı erişim'
    ],
    warnings: [
      'Ödeme sonrası paket erişimi owner tarafından manuel onaylanır.',
      'Google Play yayın onayı Google’ın inceleme sürecine bağlıdır.'
    ]
  },
  {
    planKey: 'pro',
    name: 'PRO',
    priceLabel: '9.999 TL',
    amountTry: 9999,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531900',
    summary: 'Monetizasyon ve ölçeklenebilir build mimarisi ile üst düzey mobil paket.',
    includes: [
      'Monetizasyon entegrasyonu (AdMob / Unity Ads)',
      '3. taraf kütüphane ve bağımlılık yönetimi',
      'Google Play onay hedefli build mimarisi',
      'Android build + mağaza metin taslağı',
      'Shopier (TradeVisual) ödeme sonrası owner onaylı erişim'
    ],
    warnings: [
      'Ödeme sonrası paket erişimi owner tarafından manuel onaylanır.',
      'Google Play yayın onayı Google’ın inceleme sürecine bağlıdır.'
    ]
  },
  {
    planKey: 'studio',
    name: 'STUDIO AI',
    priceLabel: '19.999 TL',
    amountTry: 19999,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531961',
    summary: 'MMO ölçeğine yakın içerik ve canlı operasyon hazırlığı için premium paket.',
    includes: [
      'MMO (DarkOrbit) seviyesinde evren kurgusu',
      'Meshy AI ile özel 3D asset üretim hattı',
      'Live Ops backend destek planı',
      'Android AAB release hazırlığı + release notes',
      'Shopier (TradeVisual) ödeme sonrası owner öncelikli erişim'
    ],
    warnings: [
      'Yayın ve build süreçleri owner değerlendirmesine tabi olabilir.',
      'Paket Game Agent kapsamındadır; ileri özelleştirmeler ayrıca planlanabilir.'
    ]
  },
  {
    planKey: 'multiplayer',
    name: 'MULTIPLAYER',
    priceLabel: '39.999 TL',
    amountTry: 39999,
    currency: 'TRY',
    shopierUrl: 'https://www.shopier.com/TradeVisual/46836097',
    summary: 'Üst düzey çevrimiçi mimari, dedicated server operasyonu ve VIP destek paketi.',
    includes: [
      'Sınırsız senkronizasyon ve replikasyon mimarisi',
      'Dedicated Server (Railway) kurulum + yönetim akışı',
      'VIP 7/24 teknik ve hukuki danışmanlık koordinasyonu',
      'Lobi/eşleştirme + ölçeklenebilir netcode şablonları',
      'Shopier (TradeVisual) ödeme sonrası owner öncelikli erişim'
    ],
    warnings: [
      'Multiplayer kapsamı proje detayına göre owner tarafından yapılandırılır.',
      'Operasyonel hukuki süreçler danışmanlık koordinasyonu ile yürütülür.'
    ]
  }
];

export const GAME_AGENT_PLAN_MAP = Object.fromEntries(
  GAME_AGENT_PLANS.map((plan) => [plan.planKey, plan])
) as Record<GameAgentPlanKey, GameAgentPlan>;

export const GAME_AGENT_PUBLIC_NOTICES = [
  'Ödeme sonrası paket erişimi owner tarafından manuel onaylanır.',
  'Google Play yayın onayı Google’ın inceleme sürecine bağlıdır.',
  'Paketlerin tamamı üst düzey çözüm kapsamı hedefiyle tasarlanmıştır.',
  'Her paket Game Agent içindir; diğer ajanlar ileride farklı fiyatlandırılacaktır.'
] as const;
