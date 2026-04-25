export type GameAgentPlanKey = 'game_agent_starter' | 'game_agent_creator' | 'game_agent_studio';

export type GameAgentPackage = {
  planKey: GameAgentPlanKey;
  name: string;
  price: string;
  amountTry: number;
  shopierUrl: string;
  features: string[];
};

export const GAME_AGENT_PACKAGES: GameAgentPackage[] = [
  {
    planKey: 'game_agent_starter',
    name: 'Game Agent Starter',
    price: '499 TL',
    amountTry: 499,
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531862',
    features: [
      'Basit oyun fikri oluşturma',
      'Game Factory proje oluşturma',
      'Sınırlı oyun üretim hakkı',
      'AAB hazırlık akışı'
    ]
  },
  {
    planKey: 'game_agent_creator',
    name: 'Game Agent Creator',
    price: '1.999 TL',
    amountTry: 1999,
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531900',
    features: [
      'Daha yüksek oyun üretim hakkı',
      'Unity build akışı',
      'AAB çıktı takibi',
      'Yayın hazırlığı'
    ]
  },
  {
    planKey: 'game_agent_studio',
    name: 'Game Agent Studio',
    price: '6.999 TL',
    amountTry: 6999,
    shopierUrl: 'https://www.shopier.com/TradeVisual/46531961',
    features: [
      'Gelişmiş Game Factory kullanımı',
      'Daha yüksek build/üretim limiti',
      'Öncelikli oyun üretim akışı',
      'Yayın hazırlığı ve bağlantı yönetimi'
    ]
  }
];

export const GAME_AGENT_PACKAGE_MAP = Object.fromEntries(
  GAME_AGENT_PACKAGES.map((item) => [item.planKey, item])
) as Record<GameAgentPlanKey, GameAgentPackage>;
