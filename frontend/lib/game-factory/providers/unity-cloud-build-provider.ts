import 'server-only';

import { getBuildStatus, triggerBuild } from '@/lib/unity-bridge';
import type { BuildStatusResult, BuildTriggerResult } from '@/lib/game-factory/types';

type GameProjectRef = { id: string };
type BuildJobRef = { external_build_id: string | null };

export class UnityCloudBuildProvider {
  async triggerBuild(gameProject: GameProjectRef): Promise<BuildTriggerResult> {
    void gameProject;
    const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
    if (!buildTargetId) throw new Error('UNITY_BUILD_TARGET_ID eksik.');

    const response = await triggerBuild(buildTargetId);
    return {
      externalBuildId: String(response.build),
      status: response.status === 'failure' ? 'failed' : response.status === 'success' ? 'succeeded' : 'triggered',
      message: 'Build kuyruğa alındı.'
    };
  }

  async getBuildStatus(buildJob: BuildJobRef): Promise<BuildStatusResult> {
    const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
    if (!buildTargetId) throw new Error('UNITY_BUILD_TARGET_ID eksik.');
    if (!buildJob.external_build_id) throw new Error('external_build_id eksik.');

    const buildNumber = Number(buildJob.external_build_id);
    const response = await getBuildStatus(buildTargetId, buildNumber);

    if (response.status === 'success') {
      return { status: 'succeeded', finishedAt: response.finished ?? null };
    }

    if (response.status === 'failure') {
      return { status: 'failed', errorMessage: 'Build başarısız oldu.' };
    }

    if (response.status === 'canceled') {
      return { status: 'canceled' };
    }

    return { status: 'building', startedAt: response.created ?? null };
  }
}
