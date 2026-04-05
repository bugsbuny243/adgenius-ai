export type AgentCatalogItem = {
  slug: string
  name: string
  icon: string
  description: string
  systemPrompt: string
  placeholder: string
  isActive: boolean
}

export const V1_AGENT_CATALOG: AgentCatalogItem[] = [
  {
    slug: 'icerik',
    name: 'İçerik Agentı',
    icon: '✍️',
    description: 'Blog, landing ve sosyal metinler üretir.',
    systemPrompt: 'Sen uzman bir içerik stratejisti ve metin yazarısın. Sonucu net, uygulanabilir ve Türkçe ver.',
    placeholder: 'Örn: SaaS ürünüm için dönüşüm odaklı landing sayfası metni hazırla.',
    isActive: true,
  },
  {
    slug: 'eposta',
    name: 'E-posta Agentı',
    icon: '📧',
    description: 'Satış, onboarding ve takip e-postaları hazırlar.',
    systemPrompt: 'Sen B2B e-posta yazımında uzmansın. Sonuçları kısa, ikna edici ve aksiyon odaklı yaz.',
    placeholder: 'Örn: Deneme kullanan ama ödeme yapmayan kullanıcıya takip e-postası yaz.',
    isActive: true,
  },
  {
    slug: 'arastirma',
    name: 'Araştırma Agentı',
    icon: '🔎',
    description: 'Pazar ve rakip analizi çerçevesi çıkarır.',
    systemPrompt: 'Sen kıdemli bir pazar araştırmacısısın. Varsayımları açıkça belirt ve maddeli çıktılar üret.',
    placeholder: 'Örn: Türkiye e-ticaret CRM araçları için rakip analizi çıkar.',
    isActive: true,
  },
  {
    slug: 'eticaret',
    name: 'E-Ticaret Agentı',
    icon: '🛒',
    description: 'Ürün sayfası, kampanya ve satış kurguları üretir.',
    systemPrompt: 'Sen performans odaklı bir e-ticaret danışmanısın. Çıktıları ölçülebilir aksiyonlara dönüştür.',
    placeholder: 'Örn: Cilt bakım ürünü için dönüşüm artıran ürün sayfası taslağı yaz.',
    isActive: true,
  },
  {
    slug: 'sosyal',
    name: 'Sosyal Agentı',
    icon: '📱',
    description: 'Sosyal medya içerik planı ve post metni oluşturur.',
    systemPrompt: 'Sen sosyal medya stratejisti olarak çalışıyorsun. Platforma göre ton ve format öner.',
    placeholder: 'Örn: 1 haftalık LinkedIn içerik planı oluştur.',
    isActive: true,
  },
  {
    slug: 'rapor',
    name: 'Rapor Agentı',
    icon: '📊',
    description: 'Veri özetleri ve yönetici raporları hazırlar.',
    systemPrompt: 'Sen yönetici raporlama uzmanısın. Sonuçları net başlıklar ve kısa özetlerle sun.',
    placeholder: 'Örn: Aylık büyüme verilerini yönetici özeti formatında raporla.',
    isActive: true,
  },
  {
    slug: 'emlak',
    name: 'Emlak Agentı',
    icon: '🏠',
    description: 'İlan metni, müşteri yanıtı ve portföy anlatımı üretir.',
    systemPrompt: 'Sen emlak pazarlamasında uzmansın. Metinleri güven verici ve satış odaklı oluştur.',
    placeholder: 'Örn: 3+1 daire için premium ilan metni yaz.',
    isActive: true,
  },
  {
    slug: 'yazilim',
    name: 'Yazılım Agentı',
    icon: '💻',
    description: 'Teknik çözüm taslağı, PRD ve görev planı çıkarır.',
    systemPrompt: 'Sen kıdemli bir yazılım mimarısın. Çözümleri aşama aşama ve uygulanabilir yaz.',
    placeholder: 'Örn: Çok kiracılı SaaS için teknik backlog oluştur.',
    isActive: true,
  },
]
