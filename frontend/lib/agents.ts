export type FinalAgentSlug = 'game_agent' | 'youtube_agent' | 'blogger_agent' | 'business_agent';

export type AgentCard = {
  slug: FinalAgentSlug;
  name: string;
  description: string;
  href: string;
};

export const FINAL_AGENT_SLUGS: FinalAgentSlug[] = ['game_agent', 'youtube_agent', 'blogger_agent', 'business_agent'];

export const FINAL_AGENT_CARDS: AgentCard[] = [
  {
    slug: 'game_agent',
    name: 'Koschei Game Agent',
    description: 'Oyun fikrini üretim planına dönüştürür ve game pipeline adımlarını yönetir.',
    href: '/game-factory'
  },
  {
    slug: 'youtube_agent',
    name: 'Koschei YouTube Agent',
    description: 'YouTube içerik fikri, başlık, açıklama ve yayın planı üretir.',
    href: '/agents/youtube_agent'
  },
  {
    slug: 'blogger_agent',
    name: 'Koschei Blogger Agent',
    description: 'Blog planı, SEO başlıkları ve yayın hazırlığı üretir.',
    href: '/agents/blogger_agent'
  },
  {
    slug: 'business_agent',
    name: 'Koschei İşletme Agent',
    description: 'İşletme süreçleri, karar akışları ve operasyon planları üretir.',
    href: '/agents/business_agent'
  }
];

export const LEGACY_AGENT_SLUG_MAP: Record<string, FinalAgentSlug> = {
  game_factory: 'game_agent',
  channel_planner: 'youtube_agent',
  publisher: 'youtube_agent',
  blogger: 'blogger_agent',
  business_general: 'business_agent',
  sheets: 'business_agent',
  mail: 'business_agent',
  seo: 'business_agent',
  research: 'business_agent',
  yazilim: 'business_agent',
  sosyal: 'business_agent',
  eposta: 'business_agent',
  icerik: 'business_agent',
  rapor: 'business_agent',
  arastirma: 'business_agent',
  emlak: 'business_agent',
  eticaret: 'business_agent'
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toCanonicalAgentSlug(input: string): FinalAgentSlug | null {
  const normalized = input.trim().toLowerCase();
  if (FINAL_AGENT_SLUGS.includes(normalized as FinalAgentSlug)) return normalized as FinalAgentSlug;
  return LEGACY_AGENT_SLUG_MAP[normalized] ?? null;
}

export function toAgentRouteBySlug(slug: string): string {
  const canonical = toCanonicalAgentSlug(slug);
  if (!canonical) return '/agents';
  if (canonical === 'game_agent') return '/game-factory';
  return `/agents/${canonical}`;
}
