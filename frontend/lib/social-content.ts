export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok';

export type SocialContentDraft = {
  brief: string;
  platforms: SocialPlatform[];
  youtubeTitle: string | null;
  youtubeDescription: string | null;
  instagramCaption: string | null;
  tiktokCaption: string | null;
};

const PLATFORM_SET = new Set<SocialPlatform>(['youtube', 'instagram', 'tiktok']);

function cleanLine(value: string): string {
  return value.replace(/^[\-*#\d.)\s]+/, '').trim();
}

function takeNonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePlatform(value: unknown): SocialPlatform | null {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  return PLATFORM_SET.has(lowered as SocialPlatform) ? (lowered as SocialPlatform) : null;
}

function parseJsonOutput(rawText: string): Partial<SocialContentDraft> | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('{')) return null;

  try {
    const payload = JSON.parse(trimmed) as Record<string, unknown>;
    const platforms = Array.isArray(payload.platforms)
      ? payload.platforms
          .map((entry) => normalizePlatform(entry))
          .filter((entry): entry is SocialPlatform => Boolean(entry))
      : [];

    return {
      brief: takeNonEmpty(payload.brief) ?? '',
      platforms,
      youtubeTitle: takeNonEmpty(payload.youtube_title) ?? takeNonEmpty(payload.youtubeTitle),
      youtubeDescription: takeNonEmpty(payload.youtube_description) ?? takeNonEmpty(payload.youtubeDescription),
      instagramCaption: takeNonEmpty(payload.instagram_caption) ?? takeNonEmpty(payload.instagramCaption),
      tiktokCaption: takeNonEmpty(payload.tiktok_caption) ?? takeNonEmpty(payload.tiktokCaption)
    };
  } catch {
    return null;
  }
}

function parseLabeledOutput(rawText: string): Partial<SocialContentDraft> {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result: Partial<SocialContentDraft> = {};

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!result.youtubeTitle && (lower.includes('youtube title:') || lower.includes('youtube başlık:'))) {
      result.youtubeTitle = cleanLine(line.split(':').slice(1).join(':'));
      continue;
    }

    if (!result.youtubeDescription && (lower.includes('youtube description:') || lower.includes('youtube açıklama:'))) {
      result.youtubeDescription = cleanLine(line.split(':').slice(1).join(':'));
      continue;
    }

    if (!result.instagramCaption && (lower.includes('instagram caption:') || lower.includes('instagram:'))) {
      result.instagramCaption = cleanLine(line.split(':').slice(1).join(':'));
      continue;
    }

    if (!result.tiktokCaption && (lower.includes('tiktok caption:') || lower.includes('tiktok:'))) {
      result.tiktokCaption = cleanLine(line.split(':').slice(1).join(':'));
    }
  }

  return result;
}

function fallbackBrief(sourceBrief: string, rawText: string): string {
  const normalizedBrief = sourceBrief.trim();
  if (normalizedBrief) return normalizedBrief;

  const firstNonEmpty = rawText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstNonEmpty ? firstNonEmpty.slice(0, 280) : 'Sosyal içerik taslağı';
}

function derivePlatforms(
  preferredPlatforms: SocialPlatform[],
  payload: Pick<SocialContentDraft, 'youtubeTitle' | 'youtubeDescription' | 'instagramCaption' | 'tiktokCaption'>
): SocialPlatform[] {
  const derived = new Set<SocialPlatform>(preferredPlatforms);

  if (payload.youtubeTitle || payload.youtubeDescription) derived.add('youtube');
  if (payload.instagramCaption) derived.add('instagram');
  if (payload.tiktokCaption) derived.add('tiktok');

  return derived.size > 0 ? Array.from(derived) : ['youtube'];
}

export function normalizeSocialContentDraft(input: {
  sourceBrief: string;
  sourcePlatforms?: SocialPlatform[];
  rawText: string;
}): SocialContentDraft {
  const fromJson = parseJsonOutput(input.rawText);
  const fromLabels = parseLabeledOutput(input.rawText);

  const youtubeTitle = takeNonEmpty(fromJson?.youtubeTitle) ?? takeNonEmpty(fromLabels.youtubeTitle) ?? takeNonEmpty(input.rawText.slice(0, 90));
  const youtubeDescription = takeNonEmpty(fromJson?.youtubeDescription) ?? takeNonEmpty(fromLabels.youtubeDescription) ?? takeNonEmpty(input.rawText);
  const instagramCaption = takeNonEmpty(fromJson?.instagramCaption) ?? takeNonEmpty(fromLabels.instagramCaption) ?? takeNonEmpty(input.rawText.slice(0, 2200));
  const tiktokCaption = takeNonEmpty(fromJson?.tiktokCaption) ?? takeNonEmpty(fromLabels.tiktokCaption) ?? takeNonEmpty(input.rawText.slice(0, 300));

  const basePlatforms = fromJson?.platforms?.length ? fromJson.platforms : input.sourcePlatforms ?? [];
  const platforms = derivePlatforms(basePlatforms, {
    youtubeTitle,
    youtubeDescription,
    instagramCaption,
    tiktokCaption
  });

  return {
    brief: fallbackBrief(fromJson?.brief || input.sourceBrief, input.rawText),
    platforms,
    youtubeTitle,
    youtubeDescription,
    instagramCaption,
    tiktokCaption
  };
}

export function createSocialPublishPayload(
  draft: SocialContentDraft,
  platform: SocialPlatform
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    brief: draft.brief,
    platform
  };

  if (platform === 'youtube') {
    payload.youtube_title = draft.youtubeTitle;
    payload.youtube_description = draft.youtubeDescription;
  }
  if (platform === 'instagram') {
    payload.instagram_caption = draft.instagramCaption;
  }
  if (platform === 'tiktok') {
    payload.tiktok_caption = draft.tiktokCaption;
  }

  return payload;
}
