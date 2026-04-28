import { NextResponse } from 'next/server';

export async function PATCH() {
  return NextResponse.json(
    { ok: false, error: 'Owner payments local route not implemented yet' },
    { status: 501 }
  );
}
