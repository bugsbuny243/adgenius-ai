import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type ReleasePreflightStatus = 'ready' | 'blocked';

export type ReleasePreflightResult = {
  ok: boolean;
  status: ReleasePreflightStatus;
  blockers: string[];
  warnings: string[];
  checks: Record<string, boolean>;
  selectedTrack: string;
};

type RunReleasePreflightInput = {
  supabase: SupabaseClient;
  projectId: string;
  workspaceId: string;
  userId: string;
};

function asNonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeTrack(input: unknown): 'internal' | 'closed' | 'production' {
  if (input === 'closed' || input === 'production') return input;
  return 'internal';
}

export async function runReleasePreflight(input: RunReleasePreflightInput): Promise<ReleasePreflightResult> {
  const { supabase, projectId, userId, workspaceId } = input;

  const [
    { data: project },
    { data: latestAabArtifact },
    { data: readiness },
    { data: listingAssets },
    { data: monetization },
    { count: iapCount },
    { data: latestReleaseJob }
  ] = await Promise.all([
    supabase
      .from('unity_game_projects')
      .select('id, user_id, workspace_id, package_name, release_track, google_play_integration_id, game_brief')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('game_artifacts')
      .select('id, file_url')
      .eq('unity_game_project_id', projectId)
      .eq('artifact_type', 'aab')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('play_console_readiness')
      .select('id, release_track, data_safety_status, target_audience_status, app_content_status, ads_declaration_status, privacy_policy_status, manual_data_safety_confirmed, manual_target_audience_confirmed, manual_app_content_confirmed, internal_testing_confirmed')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('play_store_listing_assets')
      .select('store_title, short_description, full_description, privacy_policy_url')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('game_monetization_configs')
      .select('iap_required, ads_required, privacy_policy_required')
      .eq('unity_game_project_id', projectId)
      .maybeSingle(),
    supabase
      .from('game_iap_products')
      .select('*', { count: 'exact', head: true })
      .eq('unity_game_project_id', projectId),
    supabase
      .from('game_release_jobs')
      .select('status, track')
      .eq('unity_game_project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks: Record<string, boolean> = {};

  checks.unity_game_project_exists = Boolean(project?.id);
  if (!checks.unity_game_project_exists) {
    blockers.push('unity_game_project kaydı bulunamadı.');
  }

  const brief = asObject(project?.game_brief);
  const monetizationBrief = {
    iapRequired: Boolean(brief.iapRequired),
    adsRequired: Boolean(brief.adsRequired)
  };

  checks.package_name_exists = asNonEmpty(project?.package_name);
  if (!checks.package_name_exists) blockers.push('Package name eksik.');

  checks.latest_aab_exists = Boolean(latestAabArtifact?.id);
  if (!checks.latest_aab_exists) blockers.push('Son AAB artifact bulunamadı.');

  checks.artifact_file_url_exists = asNonEmpty(latestAabArtifact?.file_url);
  if (!checks.artifact_file_url_exists) blockers.push('AAB artifact file_url eksik.');

  let integrationValid = false;
  if (project?.google_play_integration_id) {
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('id, status')
      .eq('id', project.google_play_integration_id)
      .eq('user_id', userId)
      .eq('provider', 'google_play')
      .maybeSingle();
    integrationValid = Boolean(integration && integration.status === 'connected');
  }
  checks.google_play_integration_valid = integrationValid;
  if (!integrationValid) {
    blockers.push('Google Play bağlantısı bulunamadı veya doğrulanmamış.');
  }

  const selectedTrack = normalizeTrack(readiness?.release_track ?? latestReleaseJob?.track ?? project?.release_track);
  checks.release_track_exists = asNonEmpty(selectedTrack);
  if (!checks.release_track_exists) blockers.push('Release track seçilmelidir.');

  const storeTitle = listingAssets?.store_title ?? (typeof brief.title === 'string' ? brief.title : null);
  const shortDescription = listingAssets?.short_description ?? (typeof brief.storeShortDescription === 'string' ? brief.storeShortDescription : null);
  const fullDescription = listingAssets?.full_description ?? (typeof brief.storeFullDescription === 'string' ? brief.storeFullDescription : null);

  checks.store_title_exists = asNonEmpty(storeTitle);
  checks.store_short_description_exists = asNonEmpty(shortDescription);
  checks.store_full_description_exists = asNonEmpty(fullDescription);
  if (!checks.store_title_exists || !checks.store_short_description_exists || !checks.store_full_description_exists) {
    blockers.push('Store listing için title/short description/full description zorunlu.');
  }

  const privacyPolicyRequired = Boolean(monetization?.privacy_policy_required);
  const privacyPolicyUrl = listingAssets?.privacy_policy_url ?? (typeof brief.privacyPolicyUrl === 'string' ? brief.privacyPolicyUrl : null);
  checks.privacy_policy_ready = !privacyPolicyRequired || asNonEmpty(privacyPolicyUrl) || readiness?.privacy_policy_status === 'completed';
  if (!checks.privacy_policy_ready) blockers.push('Privacy policy zorunlu ama eksik.');

  checks.data_safety_ready = readiness?.data_safety_status === 'completed' || Boolean(readiness?.manual_data_safety_confirmed);
  if (!checks.data_safety_ready) blockers.push('Data Safety tamamlanmalı veya manuel onay verilmelidir.');

  checks.target_audience_ready =
    readiness?.target_audience_status === 'completed' ||
    readiness?.app_content_status === 'completed' ||
    Boolean(readiness?.manual_target_audience_confirmed) ||
    Boolean(readiness?.manual_app_content_confirmed);
  if (!checks.target_audience_ready) blockers.push('Target audience / app content tamamlanmalı veya manuel onay verilmelidir.');

  const adsEnabled = Boolean(monetization?.ads_required || monetizationBrief.adsRequired);
  checks.ads_declaration_ready = !adsEnabled || readiness?.ads_declaration_status === 'completed';
  if (!checks.ads_declaration_ready) blockers.push('Ads etkinse ads declaration completed olmalıdır.');

  const iapRequired = Boolean(monetization?.iap_required || monetizationBrief.iapRequired);
  const iapProductsExist = (iapCount ?? 0) > 0;
  checks.iap_products_ready = !iapRequired || iapProductsExist;
  if (!checks.iap_products_ready) blockers.push('iap_required=true ise en az bir IAP ürünü gereklidir.');

  checks.production_track_gate =
    selectedTrack !== 'production' ||
    Boolean(readiness?.internal_testing_confirmed) ||
    latestReleaseJob?.status === 'published';
  if (!checks.production_track_gate) {
    blockers.push('Production yayını için önce internal testing başarılı olmalı veya manuel onay verilmelidir.');
  }

  if (!project?.google_play_integration_id) {
    warnings.push('Play Store yayını için kullanıcıya ait Google Play Console hesabı gerekir.');
  }

  const status: ReleasePreflightStatus = blockers.length === 0 ? 'ready' : 'blocked';

  await supabase.from('play_release_preflight_checks').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    user_id: userId,
    release_track: selectedTrack,
    ok: status === 'ready',
    status,
    blockers,
    warnings,
    details: checks
  });

  await supabase.from('play_console_readiness').upsert(
    {
      workspace_id: workspaceId,
      project_id: projectId,
      user_id: userId,
      package_name: project?.package_name ?? null,
      google_play_integration_id: project?.google_play_integration_id ?? null,
      release_track: selectedTrack,
      aab_artifact_status: checks.latest_aab_exists && checks.artifact_file_url_exists ? 'completed' : 'missing',
      store_listing_status: checks.store_title_exists && checks.store_short_description_exists && checks.store_full_description_exists ? 'completed' : 'missing',
      app_content_status: checks.target_audience_ready ? 'completed' : 'pending',
      data_safety_status: checks.data_safety_ready ? 'completed' : 'pending',
      target_audience_status: checks.target_audience_ready ? 'completed' : 'pending',
      ads_declaration_status: checks.ads_declaration_ready ? 'completed' : (adsEnabled ? 'required' : 'not_required'),
      monetization_status: checks.iap_products_ready ? 'completed' : (iapRequired ? 'pending' : 'not_required'),
      privacy_policy_status: checks.privacy_policy_ready ? 'completed' : (privacyPolicyRequired ? 'required' : 'not_required'),
      blocker_reasons: blockers,
      status,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'project_id' }
  );

  return {
    ok: status === 'ready',
    status,
    blockers,
    warnings,
    checks,
    selectedTrack
  };
}
