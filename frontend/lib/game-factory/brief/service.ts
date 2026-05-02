import { isNonEmptyString } from './validation';

export type GameBrief = {
  title: string; slug: string; packageName: string; summary: string; gameType: 'runner_2d'; targetPlatform: 'android';
  mechanics: string[]; visualStyle: string; controls: string; monetizationNotes: string; releaseNotes: string;
  storeShortDescription: string; storeFullDescription: string;
};

function toSlug(input: string) {
  return input.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function normalizeBrief(raw: Record<string, unknown>, prompt: string): GameBrief {
  const title = isNonEmptyString(raw.title) ? raw.title.trim() : '';
  const slug = isNonEmptyString(raw.slug) ? toSlug(raw.slug) : toSlug(title);
  return {
    title,
    slug: slug || 'oyun',
    packageName: isNonEmptyString(raw.packageName) ? raw.packageName.trim() : `com.koschei.generated.${(slug || 'game').replace(/-/g, '')}`,
    summary: isNonEmptyString(raw.summary) ? raw.summary.trim() : prompt,
    gameType: 'runner_2d',
    targetPlatform: 'android',
    mechanics: Array.isArray(raw.mechanics) ? raw.mechanics.filter(isNonEmptyString).map((v) => v.trim()) : ['runner'],
    visualStyle: isNonEmptyString(raw.visualStyle) ? raw.visualStyle.trim() : '2D stylized',
    controls: isNonEmptyString(raw.controls) ? raw.controls.trim() : 'Tap to jump',
    monetizationNotes: isNonEmptyString(raw.monetizationNotes) ? raw.monetizationNotes.trim() : 'Rewarded ads',
    releaseNotes: isNonEmptyString(raw.releaseNotes) ? raw.releaseNotes.trim() : 'Initial release',
    storeShortDescription: isNonEmptyString(raw.storeShortDescription) ? raw.storeShortDescription.trim() : title,
    storeFullDescription: isNonEmptyString(raw.storeFullDescription) ? raw.storeFullDescription.trim() : prompt
  };
}
