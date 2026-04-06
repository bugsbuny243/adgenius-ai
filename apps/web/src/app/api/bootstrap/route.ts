import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

function getAccessToken(request: Request) {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.replace('Bearer ', '').trim() : null;
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabase(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Kullanıcı doğrulanamadı' }, { status: 401 });
    }

    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ ok: true, existing: true });
    }

    const slug = `ws-${user.id.replace(/-/g, '').slice(0, 12)}`;
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: user.email?.split('@')[0] ?? 'Çalışma Alanım',
        slug,
        owner_id: user.id,
      })
      .select('id')
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: `Workspace oluşturulamadı: ${wsError?.message}` },
        { status: 500 },
      );
    }

    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    });

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.email?.split('@')[0] ?? null,
    });

    await supabase.from('subscriptions').insert({
      workspace_id: workspace.id,
      plan_name: 'free',
      run_limit: 30,
      status: 'active',
    });

    const { count } = await supabase
      .from('agent_types')
      .select('id', { count: 'exact', head: true });

    if (count === 0) {
      await supabase.from('agent_types').insert([
        {
          slug: 'icerik',
          name: 'İçerik Agentı',
          icon: '📝',
          description: 'Blog yazıları, landing metinleri ve kampanya içerikleri üretir.',
          system_prompt:
            'Sen uzman bir Türkçe içerik stratejisti ve copywriter agentsın. Net, faydalı ve dönüşüm odaklı yaz.',
          placeholder: 'Örn: B2B SaaS ürünüm için 3 farklı landing hero metni üret.',
          is_active: true,
        },
        {
          slug: 'eposta',
          name: 'E-posta Agentı',
          icon: '✉️',
          description: 'Satış, onboarding ve takip e-postaları hazırlar.',
          system_prompt:
            'Sen yüksek açılma ve yanıt oranı odaklı bir e-posta uzmanısın. Kısa, ikna edici ve kişiselleştirilmiş yaz.',
          placeholder: 'Örn: Demo sonrası 2 adımlı takip e-postası hazırla.',
          is_active: true,
        },
        {
          slug: 'arastirma',
          name: 'Araştırma Agentı',
          icon: '🔎',
          description: 'Pazar, rakip ve trend araştırmalarını özetler.',
          system_prompt:
            'Sen analitik düşünceye sahip bir araştırma agentsın. Veriyi net başlıklarla, aksiyon önerileriyle sun.',
          placeholder: 'Örn: Türkiye e-ticaret pazarında niş fırsatları özetle.',
          is_active: true,
        },
        {
          slug: 'eticaret',
          name: 'E-ticaret Agentı',
          icon: '🛒',
          description: 'Ürün açıklamaları, kampanya fikirleri ve satış metinleri üretir.',
          system_prompt:
            'Sen dönüşüm optimizasyonuna odaklı bir e-ticaret uzmanısın. Satış odaklı ama güven veren bir ton kullan.',
          placeholder: 'Örn: Doğal içerikli şampuan için ürün sayfası açıklaması yaz.',
          is_active: true,
        },
        {
          slug: 'sosyal',
          name: 'Sosyal Medya Agentı',
          icon: '📱',
          description: 'Platform bazlı içerik takvimi ve post metinleri oluşturur.',
          system_prompt:
            'Sen viral potansiyeli yüksek ama marka uyumlu sosyal medya içerikleri üreten bir agentsın.',
          placeholder: 'Örn: LinkedIn için 1 haftalık thought-leadership planı oluştur.',
          is_active: true,
        },
        {
          slug: 'rapor',
          name: 'Raporlama Agentı',
          icon: '📊',
          description: 'Performans verilerini anlaşılır yönetici özetlerine dönüştürür.',
          system_prompt:
            'Sen veri odaklı bir raporlama agentsın. Karmaşık verileri sadeleştir, içgörü ve öneri sun.',
          placeholder: 'Örn: Son 30 gün reklam performansını yönetici özeti formatında yaz.',
          is_active: true,
        },
        {
          slug: 'emlak',
          name: 'Emlak Agentı',
          icon: '🏠',
          description: 'İlan metinleri, müşteri yanıtları ve bölge analizleri hazırlar.',
          system_prompt:
            'Sen emlak pazarlama uzmanı bir agentsın. Güven veren, net ve ikna edici iletişim kur.',
          placeholder: 'Örn: Kadıköy 2+1 daire için premium ilan metni oluştur.',
          is_active: true,
        },
        {
          slug: 'yazilim',
          name: 'Yazılım Agentı',
          icon: '💻',
          description: 'Teknik dokümantasyon, kullanıcı hikayeleri ve kod planları üretir.',
          system_prompt:
            'Sen kıdemli bir yazılım product engineer agentsın. Yapılandırılmış, uygulanabilir ve temiz çıktılar üret.',
          placeholder: 'Örn: Bir görev takip uygulaması için MVP teknik planını çıkar.',
          is_active: true,
        },
      ]);
    }

    return NextResponse.json({ ok: true, workspaceId: workspace.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
