export type QueueStatus = 'draft' | 'queued' | 'processing' | 'published' | 'failed' | string | null;

export function toQueueStatusLabel(status: QueueStatus): string {
  if (!status) return 'Durum bilinmiyor';
  if (status === 'draft') return 'Taslak';
  if (status === 'queued') return 'Sıraya alındı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'published') return 'Yayın hazırlığında';
  if (status === 'failed') return 'Başarısız';
  return status;
}

export function toQueueStateHint(status: QueueStatus): string {
  if (status === 'draft') return 'Gönderime hazır';
  if (status === 'queued') return 'Yayın hazırlığında';
  if (status === 'processing') return 'İşlem sürüyor';
  if (status === 'published') return 'Yayın hazırlığında';
  if (status === 'failed') return 'Tekrar denenebilir';
  return 'Durum bilgisi sınırlı';
}

export function toPlatformLabel(platform: string | null): string {
  if (!platform) return 'Platform belirtilmedi';
  const normalized = platform.toLowerCase();
  if (normalized === 'youtube') return 'YouTube';
  if (normalized === 'instagram') return 'Instagram';
  if (normalized === 'tiktok') return 'TikTok';
  return platform;
}

function takeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function truncate(input: string, maxLength = 140): string {
  return input.length > maxLength ? `${input.slice(0, maxLength - 1)}…` : input;
}

export function deriveQueuePreview(input: {
  payload: unknown;
  targetPlatform: string | null;
  contentItem?: {
    brief: string | null;
    youtube_title: string | null;
    youtube_description: string | null;
    instagram_caption: string | null;
    tiktok_caption: string | null;
  } | null;
  savedOutput?: { title: string | null; content: string | null } | null;
}): { summary: string; detail?: string; payloadPartial: boolean } {
  const platform = input.targetPlatform?.toLowerCase() ?? null;
  const payload = input.payload && typeof input.payload === 'object' ? (input.payload as Record<string, unknown>) : null;

  const payloadBrief = takeString(payload?.brief);
  const payloadTitle = takeString(payload?.youtube_title) || takeString(payload?.title);
  const payloadDescription = takeString(payload?.youtube_description) || takeString(payload?.description);
  const payloadCaption = takeString(payload?.instagram_caption) || takeString(payload?.tiktok_caption) || takeString(payload?.caption);

  const fallbackBrief = takeString(input.contentItem?.brief);
  const fallbackTitle = takeString(input.contentItem?.youtube_title) || takeString(input.savedOutput?.title);
  const fallbackDescription = takeString(input.contentItem?.youtube_description);
  const fallbackCaption =
    (platform === 'instagram' ? takeString(input.contentItem?.instagram_caption) : null) ||
    (platform === 'tiktok' ? takeString(input.contentItem?.tiktok_caption) : null) ||
    takeString(input.savedOutput?.content);

  const summaryCandidate = payloadBrief || fallbackBrief || payloadTitle || fallbackTitle || payloadCaption || fallbackCaption;
  const detailCandidate =
    (platform === 'youtube' ? payloadTitle || fallbackTitle || payloadDescription || fallbackDescription : null) ||
    payloadCaption ||
    fallbackCaption ||
    payloadDescription ||
    fallbackDescription;

  return {
    summary: summaryCandidate ? truncate(summaryCandidate) : 'İçerik özeti bulunamadı',
    detail: detailCandidate ? truncate(detailCandidate, 180) : undefined,
    payloadPartial: !payload || (!payloadBrief && !payloadTitle && !payloadDescription && !payloadCaption)
  };
}

export function sanitizeUserFacingEngineLabel(value: unknown): string {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized.includes('araştırma') || normalized.includes('research') || normalized.includes('koschei-research')) {
    return 'Araştırma destekli mod';
  }
  if (normalized.includes('derin') || normalized.includes('deep') || normalized.includes('koschei-deep')) {
    return 'Derin analiz modu';
  }
  if (normalized.includes('hızlı') || normalized.includes('hizli') || normalized.includes('fast') || normalized.includes('koschei-fast')) {
    return 'Hızlı mod';
  }
  return 'Koschei AI motoru';
}

export function neutralizeVendorTerms(text: string): string {
  return text
    .replace(/gemini(-[a-z0-9.]+)?/gi, 'Koschei AI motoru')
    .replace(/google\s*genai/gi, 'Koschei AI motoru')
    .replace(/openai/gi, 'Koschei AI motoru')
    .replace(/gpt-?5(\.[0-9]+|\s*mini|\s*nano)?/gi, 'Koschei AI motoru')
    .replace(/google search/gi, 'Araştırma destekli mod')
    .replace(/model\s*:\s*[a-z0-9_.-]+/gi, 'mod: Koschei AI motoru');
}
