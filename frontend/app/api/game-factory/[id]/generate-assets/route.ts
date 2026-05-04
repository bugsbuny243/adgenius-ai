import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFIG_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'UPSTREAM_IMAGE_FETCH_FAILED'
  | 'STORAGE_UPLOAD_FAILED'
  | 'DB_INSERT_FAILED'
  | 'INTERNAL_ERROR';

type GameBriefRow = {
  workspace_id: string;
  visual_style: string | null;
  gameplay_goals: string | null;
};

type ReplicatePrediction = {
  status?: string;
  output?: string | string[] | null;
  error?: string;
};

function errorResponse(error: string, code: ErrorCode, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function buildEnvironmentPrompt(brief: GameBriefRow) {
  const visualStyle = (brief.visual_style ?? '').trim() || 'vibrant stylized fantasy';
  const gameplayGoals = (brief.gameplay_goals ?? '').trim() || 'readable traversal paths and clear gameplay landmarks';

  return [
    'Professional 2D game environment concept art, production-ready background asset, no characters, no text, no watermark.',
    `Visual style: ${visualStyle}.`,
    `Gameplay goals: ${gameplayGoals}.`,
    'Wide side-scroller composition, layered parallax depth cues, strong silhouette readability, clean lighting, high detail.'
  ].join(' ');
}

async function generateImageWithReplicate(prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  const model = process.env.REPLICATE_MODEL?.trim() || 'stability-ai/sdxl';

  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is missing.');
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: {
        prompt,
        width: 1344,
        height: 768,
        num_outputs: 1,
        output_format: 'png'
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Replicate request failed: ${response.status} ${text}`);
  }

  const prediction = (await response.json()) as ReplicatePrediction;
  const output = prediction.output;

  const imageUrl = Array.isArray(output) ? output[0] : output;
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error(prediction.error || 'Replicate did not return an image URL.');
  }

  return imageUrl;
}

async function generateImageWithHuggingFace(prompt: string): Promise<ArrayBuffer> {
  const token = process.env.HUGGINGFACE_API_KEY?.trim() || process.env.HF_TOKEN?.trim();
  const model = process.env.HUGGINGFACE_IMAGE_MODEL?.trim() || 'stabilityai/stable-diffusion-xl-base-1.0';

  if (!token) {
    throw new Error('HUGGINGFACE_API_KEY (veya HF_TOKEN) eksik.');
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: `${prompt}, game asset, highly detailed, 8k resolution, unity3d render, professional`
    })
  });

  if (!response.ok) {
    const maybeJson = await response.json().catch(() => null) as { error?: string; estimated_time?: number } | null;
    const estimated = typeof maybeJson?.estimated_time === 'number' ? ` Model yükleniyor, ${maybeJson.estimated_time}s sonra tekrar deneyin.` : '';
    throw new Error((maybeJson?.error || `Hugging Face request failed: ${response.status}`) + estimated);
  }

  return response.arrayBuffer();
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectIdRaw } = await context.params;
    const projectId = projectIdRaw?.trim();

    if (!projectId) {
      return errorResponse('Geçersiz proje kimliği.', 'BAD_REQUEST', 400);
    }

    let supabase;
    try {
      supabase = await createSupabaseServerClient();
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'Supabase başlatılamadı.', 'CONFIG_ERROR', 500);
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse('Kimlik doğrulama başarısız.', 'UNAUTHORIZED', 401);
    }

    const { data: brief, error: briefError } = await supabase
      .from('game_briefs')
      .select('workspace_id, visual_style, gameplay_goals')
      .eq('unity_game_project_id', projectId)
      .maybeSingle<GameBriefRow>();

    if (briefError) {
      return errorResponse(briefError.message, 'INTERNAL_ERROR', 500);
    }

    if (!brief) {
      return errorResponse('Proje için brief bulunamadı.', 'NOT_FOUND', 404);
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('workspace_id', brief.workspace_id)
      .maybeSingle<{ workspace_id: string }>();

    if (membershipError) {
      return errorResponse(membershipError.message, 'INTERNAL_ERROR', 500);
    }

    if (!membership) {
      return errorResponse('Bu projeye erişim yetkiniz yok.', 'FORBIDDEN', 403);
    }

    const prompt = buildEnvironmentPrompt(brief);

    const aiProvider = (process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase() || 'replicate');
    let imageBuffer: ArrayBuffer;
    try {
      if (aiProvider === 'huggingface') {
        imageBuffer = await generateImageWithHuggingFace(prompt);
      } else {
        const temporaryImageUrl = await generateImageWithReplicate(prompt);
        const imageResponse = await fetch(temporaryImageUrl);
        if (!imageResponse.ok) {
          return errorResponse('AI görseli indirilemedi.', 'UPSTREAM_IMAGE_FETCH_FAILED', 502);
        }
        imageBuffer = await imageResponse.arrayBuffer();
      }
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : 'AI görsel üretim hatası.', 'AI_PROVIDER_ERROR', 500);
    }

    const storagePath = `${projectId}/background-${Date.now()}.png`;
    const serviceRole = getSupabaseServiceRoleClient();

    const { error: uploadError } = await serviceRole.storage
      .from('game_assets')
      .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      return errorResponse(uploadError.message, 'STORAGE_UPLOAD_FAILED', 500);
    }

    const { data: publicUrlData } = serviceRole.storage.from('game_assets').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    const { error: insertError } = await serviceRole.from('game_artifacts').insert({
      artifact_type: 'background',
      project_id: projectId,
      workspace_id: brief.workspace_id,
      file_url: publicUrl,
      status: 'completed'
    });

    if (insertError) {
      return errorResponse(insertError.message, 'DB_INSERT_FAILED', 500);
    }

    return NextResponse.json({
      ok: true,
      project_id: projectId,
      artifact_type: 'background',
      file_url: publicUrl,
      prompt
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Beklenmeyen sunucu hatası.', 'INTERNAL_ERROR', 500);
  }
}
