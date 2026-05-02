export type BriefRequest = { prompt?: unknown; userPrompt?: unknown; gameIdea?: unknown; targetPlatform?: unknown; platform?: unknown };

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parsePrompt(body: BriefRequest): string {
  const promptValue = body.prompt ?? body.userPrompt ?? body.gameIdea;
  return typeof promptValue === 'string' ? promptValue.trim() : '';
}

export function parsePlatform(body: BriefRequest): 'android' {
  const platformValue = body.targetPlatform ?? body.platform;
  const raw = typeof platformValue === 'string' ? platformValue.trim().toLowerCase() : 'android';
  return raw === 'android' ? 'android' : 'android';
}
