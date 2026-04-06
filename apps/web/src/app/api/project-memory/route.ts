import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace';

type MemoryPayload = {
  title?: string;
  content?: string;
  memoryType?: 'output' | 'note' | 'reference' | 'tone_rule' | 'constraint';
  tags?: string[];
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
      .from('project_memory_items')
      .select('id, title, content, memory_type, tags, is_pinned, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Project memory okunamadı.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createServerSupabase(accessToken ?? undefined);
    const { workspace, user } = await resolveWorkspaceContext(supabase);

    const body = (await request.json()) as MemoryPayload;
    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!title || !content) {
      return NextResponse.json({ error: 'Başlık ve içerik zorunludur.' }, { status: 422 });
    }

    const { data, error } = await supabase
      .from('project_memory_items')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        title,
        content,
        memory_type: body.memoryType ?? 'note',
        tags: body.tags ?? [],
      })
      .select('id, title, content, memory_type, tags, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Project memory kaydedilemedi.' },
      { status: 500 },
    );
  }
}
