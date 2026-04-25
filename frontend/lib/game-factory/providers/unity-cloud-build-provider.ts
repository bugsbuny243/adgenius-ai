import { getServerEnv } from '@/lib/env';
import type { ArtifactResult, BuildStatusResult, BuildTriggerResult } from '@/lib/game-factory/types';

type GameProjectRef = { id: string; unity_branch: string | null; unity_commit_sha: string | null };
type BuildJobRef = { external_build_id: string | null };

const UNITY_BASE_URL = 'https://build-api.cloud.unity3d.com/api/v1';

export class UnityCloudBuildProvider {
  private readonly env = getServerEnv();

  private config() {
    const {
      UNITY_ORG_ID,
      UNITY_PROJECT_ID,
      UNITY_BUILD_TARGET_ID,
      UNITY_SERVICE_ACCOUNT_KEY_ID,
      UNITY_SERVICE_ACCOUNT_SECRET_KEY
    } = this.env;
    const missingVars = [
      !UNITY_ORG_ID ? 'UNITY_ORG_ID' : null,
      !UNITY_PROJECT_ID ? 'UNITY_PROJECT_ID' : null,
      !UNITY_BUILD_TARGET_ID ? 'UNITY_BUILD_TARGET_ID' : null,
      !UNITY_SERVICE_ACCOUNT_KEY_ID ? 'UNITY_SERVICE_ACCOUNT_KEY_ID' : null,
      !UNITY_SERVICE_ACCOUNT_SECRET_KEY ? 'UNITY_SERVICE_ACCOUNT_SECRET_KEY' : null
    ].filter((item): item is string => Boolean(item));

    if (missingVars.length > 0) {
      throw new Error(`Unity Build Automation yapılandırması eksik. Zorunlu ortam değişkenleri: ${missingVars.join(', ')}`);
    }

    return {
      orgId: UNITY_ORG_ID,
      projectId: UNITY_PROJECT_ID,
      targetId: UNITY_BUILD_TARGET_ID,
      authorizationHeader: `Basic ${Buffer.from(
        `${UNITY_SERVICE_ACCOUNT_KEY_ID}:${UNITY_SERVICE_ACCOUNT_SECRET_KEY}`,
        'utf8'
      ).toString('base64')}`
    };
  }

  async triggerBuild(gameProject: GameProjectRef): Promise<BuildTriggerResult> {
    const { orgId, projectId, targetId, authorizationHeader } = this.config();

    const endpoint = `${UNITY_BASE_URL}/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorizationHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clean: false,
        delay: 0,
        commit: gameProject.unity_commit_sha,
        branch: gameProject.unity_branch ?? undefined
      })
    });

    if (!resp.ok) {
      throw new Error(`Unity build tetikleme başarısız. Endpoint ve target ayarlarını doğrulayın: ${resp.status} ${await resp.text()}`);
    }

    const data = await resp.json();
    return {
      externalBuildId: data?.build ?? data?.buildtargetid ?? null,
      status: 'triggered',
      message: 'Unity Build Automation tetiklendi.'
    };
  }

  async getBuildStatus(buildJob: BuildJobRef): Promise<BuildStatusResult> {
    const { orgId, projectId, targetId, authorizationHeader } = this.config();
    if (!buildJob.external_build_id) {
      throw new Error('Unity build durumu sorgulanamıyor: external_build_id kaydı bulunamadı.');
    }

    const endpoint = `${UNITY_BASE_URL}/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds/${buildJob.external_build_id}`;
    const resp = await fetch(endpoint, {
      headers: { Authorization: authorizationHeader }
    });

    if (!resp.ok) {
      throw new Error(`Unity build durumu alınamadı: ${resp.status} ${await resp.text()}`);
    }

    const data = await resp.json();
    const platformStatus = String(data?.buildStatus ?? '').toLowerCase();

    if (platformStatus.includes('success')) return { status: 'succeeded', logsUrl: data?.links?.log }; 
    if (platformStatus.includes('fail')) return { status: 'failed', errorMessage: data?.lastBuiltRevision }; 
    if (platformStatus.includes('cancel')) return { status: 'canceled' };
    if (platformStatus.includes('sent') || platformStatus.includes('started')) return { status: 'building', startedAt: data?.buildStartTime };

    return { status: 'triggered' };
  }

  async getArtifacts(buildJob: BuildJobRef): Promise<ArtifactResult[]> {
    const { orgId, projectId, targetId, authorizationHeader } = this.config();
    if (!buildJob.external_build_id) {
      return [];
    }

    const endpoint = `${UNITY_BASE_URL}/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds/${buildJob.external_build_id}/artifacts`;
    const resp = await fetch(endpoint, {
      headers: { Authorization: authorizationHeader }
    });

    if (!resp.ok) {
      throw new Error(`Unity artifact sorgulaması başarısız: ${resp.status} ${await resp.text()}`);
    }

    const data = await resp.json();
    const items = Array.isArray(data) ? data : data?.items ?? [];

    return items
      .filter((item: { href?: string; type?: string }) => Boolean(item?.href))
      .map((item: { href: string; path?: string; type?: string; size?: number }) => ({
        artifactType: item.type?.includes('aab') ? 'aab' : item.type?.includes('apk') ? 'apk' : item.type?.includes('log') ? 'logs' : 'build_report',
        fileName: item.path,
        fileUrl: item.href,
        fileSizeBytes: item.size
      }));
  }
}
