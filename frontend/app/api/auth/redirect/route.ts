import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isPlatformOwner } from '@/lib/owner-auth';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ redirectTo: '/signin' }, { status: 401 });
  }

  const redirectTo = isPlatformOwner(user) ? '/owner/dashboard' : '/dashboard';
  return NextResponse.json({ redirectTo });
}
