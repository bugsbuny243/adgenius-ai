import { NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/owner-auth';

export async function GET() {
  await requirePlatformOwner();

  const repo = process.env.OWNER_GITHUB_REPO?.trim() || 'Koschei';
  const owner = process.env.OWNER_GITHUB_OWNER?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();

  if (!owner || !token) {
    return NextResponse.json({ error: 'OWNER_GITHUB_OWNER veya GITHUB_TOKEN eksik.' }, { status: 500 });
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'GitHub verisi alınamadı.' }, { status: 500 });
  }

  const commits = await response.json();
  return NextResponse.json({ repo: `${owner}/${repo}`, commits });
}
