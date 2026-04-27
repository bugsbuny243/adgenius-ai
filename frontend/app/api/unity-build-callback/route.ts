import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("=== UNITY BUILD WEBHOOK GELDİ ===");
    console.log(JSON.stringify(body, null, 2));   // ← Tüm payload'ı logla

    const buildNumber = body.buildNumber || body.build?.buildNumber;
    const status = (body.buildStatus || body.status || '').toLowerCase();
    const links = body.links || {};

    let downloadUrl = null;
    if (links.share_url?.href) downloadUrl = links.share_url.href;
    else if (links.artifacts?.[0]?.files?.[0]?.href) downloadUrl = links.artifacts[0].files[0].href;

    if (status.includes('success') || status.includes('succeeded')) {
      const { error } = await supabase
        .from('builds')
        .update({
          status: 'succeeded',
          download_url: downloadUrl,
          completed_at: new Date().toISOString(),
          raw_webhook: body,
        })
        .eq('unity_build_number', buildNumber);   // ← Bu alanı kendi tablonla uyumlu yap (build_id veya başka neyse)

      if (error) {
        console.error("Supabase update error:", error);
      } else {
        console.log(`✅ Build #${buildNumber} başarıyla güncellendi! Download URL: ${downloadUrl}`);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return new Response('Error', { status: 500 });
  }
}
