import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace';

type AttachmentPayload = {
  attachmentType?: 'text_note' | 'url_reference' | 'file_metadata';
  title?: string;
  content?: string;
  sourceUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  linkGoalRunId?: string;
  linkOrchestrationRunId?: string;
};

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createServerSupabase(accessToken ?? undefined);
    const { workspace } = await resolveWorkspaceContext(supabase);

    const { data, error } = await supabase
      .from('attachments')
      .select('id, attachment_type, title, content, source_url, file_name, file_size_bytes, mime_type, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ attachments: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Attachment listesi okunamadı.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createServerSupabase(accessToken ?? undefined);
    const { workspace, user } = await resolveWorkspaceContext(supabase);

    const body = (await request.json()) as AttachmentPayload;
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: 'Attachment başlığı zorunludur.' }, { status: 422 });
    }

    const attachmentType = body.attachmentType ?? 'text_note';

    const { data: attachment, error: attachmentError } = await supabase
      .from('attachments')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        attachment_type: attachmentType,
        title,
        content: body.content,
        source_url: body.sourceUrl,
        file_name: body.fileName,
        file_size_bytes: body.fileSizeBytes,
        mime_type: body.mimeType,
      })
      .select('id, attachment_type, title, created_at')
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: attachmentError?.message ?? 'Attachment eklenemedi.' }, { status: 400 });
    }

    if (body.linkGoalRunId || body.linkOrchestrationRunId) {
      const { error: linkError } = await supabase.from('attachment_links').insert({
        workspace_id: workspace.id,
        attachment_id: attachment.id,
        goal_run_id: body.linkGoalRunId ?? null,
        orchestration_run_id: body.linkOrchestrationRunId ?? null,
        created_by: user.id,
      });

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Attachment kaydedilemedi.' },
      { status: 500 },
    );
  }
}
