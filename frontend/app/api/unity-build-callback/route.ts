import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Unity Cloud webhook devre dışı. Local build engine kullanılıyor.' }, { status: 410 });
}
