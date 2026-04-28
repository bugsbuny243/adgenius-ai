import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { runTextWithAiEngine } from '@/lib/ai-engine';

type GenerateAppFactoryRequest = {
  prompt?: unknown;
};

type AppFactoryPreset = {
  key: 'salon' | 'boutique' | 'smb_crm' | 'agency';
  title: string;
  keywords: string[];
  coreFeatures: string[];
  entities: string[];
  pwaRecommended: boolean;
};

type AppFactoryBlueprint = {
  summary: string;
  needsAnalysis: string[];
  features: {
    auth: string[];
    dashboard: string[];
    crudModules: Array<{ name: string; operations: Array<'create' | 'read' | 'update' | 'delete'> }>;
    responsiveNotes: string[];
  };
  stack: {
    frontend: 'Next.js';
    backend: 'Supabase';
    styling: 'Tailwind CSS';
  };
  migrations: string[];
  pwa: {
    enabled: boolean;
    notes: string[];
  };
  deployment: {
    repositoryName: string;
    previewProvider: 'Vercel';
    pushPlan: string[];
  };
};

const PRESETS: AppFactoryPreset[] = [
  {
    key: 'salon',
    title: 'Kuaför salonu randevu ve stok yönetimi',
    keywords: ['kuaför', 'salon', 'randevu', 'stok'],
    coreFeatures: [
      'Çalışan bazlı takvim ve müsaitlik yönetimi',
      'Müşteri randevu oluşturma/iptal ve hatırlatma',
      'Ürün stok giriş-çıkış ve kritik stok uyarıları',
      'Hizmet bazlı gelir raporları'
    ],
    entities: ['customers', 'appointments', 'services', 'staff', 'products', 'stock_movements'],
    pwaRecommended: true
  },
  {
    key: 'boutique',
    title: 'Butik e-ticaret yönetimi',
    keywords: ['butik', 'giyim', 'e-ticaret', 'magaza', 'mağaza'],
    coreFeatures: [
      'Ürün katalog, varyant (beden/renk) ve stok yönetimi',
      'Sepet, ödeme akışı ve sipariş takibi',
      'Kampanya kuponları ve indirim kuralları',
      'Kargo durumları ve müşteri bilgilendirme'
    ],
    entities: ['products', 'product_variants', 'customers', 'orders', 'order_items', 'coupons'],
    pwaRecommended: true
  },
  {
    key: 'smb_crm',
    title: 'KOBİ gelir-gider ve müşteri yönetimi',
    keywords: ['küçük işletme', 'gelir', 'gider', 'müşteri yönetimi'],
    coreFeatures: [
      'Gelir-gider kayıtları ve kategori bazlı raporlama',
      'Müşteri kartı, iletişim geçmişi ve notlar',
      'Tahsilat/alacak takibi ve ödeme hatırlatmaları',
      'Aylık finansal özet paneli'
    ],
    entities: ['customers', 'income_entries', 'expense_entries', 'invoices', 'payments'],
    pwaRecommended: false
  },
  {
    key: 'agency',
    title: 'Sosyal medya ajansı müşteri/proje paneli',
    keywords: ['sosyal medya', 'ajans', 'proje', 'müşteri', 'panel'],
    coreFeatures: [
      'Müşteri onboarding ve marka bilgileri yönetimi',
      'Proje, görev, teslim tarihi ve durum takibi',
      'İçerik takvimi ve onay süreci',
      'Performans KPI dashboard (erişim, etkileşim, dönüşüm)'
    ],
    entities: ['clients', 'projects', 'tasks', 'content_calendar', 'approvals', 'kpi_reports'],
    pwaRecommended: true
  }
];

function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolvePreset(prompt: string): AppFactoryPreset {
  const normalized = prompt.toLocaleLowerCase('tr-TR');
  for (const preset of PRESETS) {
    if (preset.keywords.some((keyword) => normalized.includes(keyword))) {
      return preset;
    }
  }
  return PRESETS[2];
}

function buildFallbackBlueprint(prompt: string, preset: AppFactoryPreset): AppFactoryBlueprint {
  return {
    summary: `${preset.title} için full-stack web uygulama üretim planı`,
    needsAnalysis: [
      `${preset.title} için kullanıcı rolleri ve temel süreç akışları çıkarıldı.`,
      'Kritik veri varlıkları tanımlandı ve CRUD gereksinimleri eşleştirildi.',
      'Dashboard metrikleri iş hedefleriyle hizalandı.'
    ],
    features: {
      auth: ['E-posta/şifre ile kayıt-giriş', 'Şifre sıfırlama', 'Rol bazlı yetki kontrolü'],
      dashboard: ['Toplam kayıt özeti', 'Son 7 gün aktivite grafiği', 'Aksiyon kartları ve kısa yollar'],
      crudModules: preset.entities.map((name) => ({
        name,
        operations: ['create', 'read', 'update', 'delete']
      })),
      responsiveNotes: ['Mobil-first layout', 'Kart ve tablo hibrit görünüm', 'Touch-friendly form kontrolleri']
    },
    stack: {
      frontend: 'Next.js',
      backend: 'Supabase',
      styling: 'Tailwind CSS'
    },
    migrations: preset.entities.map(
      (entity) => `create table if not exists public.${entity} (...); -- ${entity} modülü için tablo`
    ),
    pwa: {
      enabled: preset.pwaRecommended,
      notes: preset.pwaRecommended
        ? ['Manifest ve service worker eklenir', 'Offline cache ile temel ekranlar erişilebilir olur']
        : ['PWA opsiyonel bırakıldı; web sürümü varsayılan']
    },
    deployment: {
      repositoryName: `koschei-app-factory-${preset.key}-${slugify(prompt).slice(0, 24) || 'project'}`,
      previewProvider: 'Vercel',
      pushPlan: [
        'Scaffold dosyaları oluşturulur',
        'Supabase migration dosyaları eklenir',
        'GitHub repository oluşturulup initial commit push edilir'
      ]
    }
  };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

async function generateBlueprintWithAi(prompt: string, preset: AppFactoryPreset): Promise<AppFactoryBlueprint> {
  const fallback = buildFallbackBlueprint(prompt, preset);

  try {
    const ai = await runTextWithAiEngine({
      agentSlug: 'yazilim',
      agentMode: 'analysis',
      userInput: prompt,
      systemPrompt:
        'Sen bir kıdemli ürün ve full-stack mimari uzmanısın. Sadece geçerli JSON dön. ' +
        'JSON şeması: {summary:string,needsAnalysis:string[],features:{auth:string[],dashboard:string[],crudModules:[{name:string,operations:string[]}]' +
        ',responsiveNotes:string[]},stack:{frontend:string,backend:string,styling:string},migrations:string[],pwa:{enabled:boolean,notes:string[]},' +
        'deployment:{repositoryName:string,previewProvider:string,pushPlan:string[]}}. ' +
        'Stack her zaman Next.js + Supabase + Tailwind olmalı. CRUD modülleri her zaman create/read/update/delete içermeli.'
    });

    const parsed = extractJsonObject(ai.text);
    if (!parsed) return fallback;

    const crudRaw = Array.isArray((parsed.features as { crudModules?: unknown } | undefined)?.crudModules)
      ? ((parsed.features as { crudModules: unknown[] }).crudModules as unknown[])
      : [];

    const crudModules = crudRaw
      .map((entry) => {
        const item = entry as { name?: unknown; operations?: unknown };
        const name = isNonEmptyString(item.name) ? item.name.trim() : '';
        const operationsRaw = Array.isArray(item.operations) ? item.operations : [];
        const operations = Array.from(
          new Set(
            operationsRaw
              .filter(isNonEmptyString)
              .map((op) => op.trim().toLowerCase())
              .filter((op): op is 'create' | 'read' | 'update' | 'delete' =>
                op === 'create' || op === 'read' || op === 'update' || op === 'delete'
              )
          )
        );

        if (!name) return null;
        const normalizedOps: Array<'create' | 'read' | 'update' | 'delete'> =
          operations.length === 4 ? operations : ['create', 'read', 'update', 'delete'];
        return { name, operations: normalizedOps };
      })
      .filter((item): item is { name: string; operations: Array<'create' | 'read' | 'update' | 'delete'> } => Boolean(item));

    return {
      summary: isNonEmptyString(parsed.summary) ? parsed.summary.trim() : fallback.summary,
      needsAnalysis: Array.isArray(parsed.needsAnalysis)
        ? parsed.needsAnalysis.filter(isNonEmptyString).map((item) => item.trim())
        : fallback.needsAnalysis,
      features: {
        auth: Array.isArray((parsed.features as { auth?: unknown } | undefined)?.auth)
          ? (((parsed.features as { auth: unknown[] }).auth as unknown[]).filter(isNonEmptyString).map((item) => item.trim()))
          : fallback.features.auth,
        dashboard: Array.isArray((parsed.features as { dashboard?: unknown } | undefined)?.dashboard)
          ? (((parsed.features as { dashboard: unknown[] }).dashboard as unknown[])
              .filter(isNonEmptyString)
              .map((item) => item.trim()))
          : fallback.features.dashboard,
        crudModules: crudModules.length ? crudModules : fallback.features.crudModules,
        responsiveNotes: Array.isArray((parsed.features as { responsiveNotes?: unknown } | undefined)?.responsiveNotes)
          ? (((parsed.features as { responsiveNotes: unknown[] }).responsiveNotes as unknown[])
              .filter(isNonEmptyString)
              .map((item) => item.trim()))
          : fallback.features.responsiveNotes,
      },
      stack: {
        frontend: 'Next.js',
        backend: 'Supabase',
        styling: 'Tailwind CSS'
      },
      migrations: Array.isArray(parsed.migrations)
        ? parsed.migrations.filter(isNonEmptyString).map((item) => item.trim())
        : fallback.migrations,
      pwa: {
        enabled:
          typeof (parsed.pwa as { enabled?: unknown } | undefined)?.enabled === 'boolean'
            ? Boolean((parsed.pwa as { enabled: boolean }).enabled)
            : fallback.pwa.enabled,
        notes: Array.isArray((parsed.pwa as { notes?: unknown } | undefined)?.notes)
          ? (((parsed.pwa as { notes: unknown[] }).notes as unknown[]).filter(isNonEmptyString).map((item) => item.trim()))
          : fallback.pwa.notes
      },
      deployment: {
        repositoryName: isNonEmptyString((parsed.deployment as { repositoryName?: unknown } | undefined)?.repositoryName)
          ? slugify((parsed.deployment as { repositoryName: string }).repositoryName)
          : fallback.deployment.repositoryName,
        previewProvider: 'Vercel',
        pushPlan: Array.isArray((parsed.deployment as { pushPlan?: unknown } | undefined)?.pushPlan)
          ? (((parsed.deployment as { pushPlan: unknown[] }).pushPlan as unknown[])
              .filter(isNonEmptyString)
              .map((item) => item.trim()))
          : fallback.deployment.pushPlan
      }
    };
  } catch (error) {
    console.error('[app-factory/generate] ai_generation_failed', error);
    return fallback;
  }
}

function buildPreviewUrl(repoName: string) {
  const base = process.env.APP_FACTORY_PREVIEW_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/+$/, '')}/${repoName}`;
  }
  return `https://${repoName}.vercel.app`;
}

async function ensureGithubRepository(repoName: string) {
  const token = process.env.APP_FACTORY_GITHUB_TOKEN?.trim();
  const owner = process.env.APP_FACTORY_GITHUB_OWNER?.trim();
  if (!token || !owner) {
    return `https://github.com/${owner || 'your-org'}/${repoName}`;
  }

  const createResponse = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: true,
      description: 'Koschei App Factory tarafından otomatik üretildi.'
    })
  });

  if (!createResponse.ok && createResponse.status !== 422) {
    const details = await createResponse.text();
    throw new Error(`github_repo_create_failed:${createResponse.status}:${details.slice(0, 180)}`);
  }

  return `https://github.com/${owner}/${repoName}`;
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  let body: GenerateAppFactoryRequest;
  try {
    body = (await request.json()) as GenerateAppFactoryRequest;
  } catch {
    return json({ ok: false, error: 'Geçersiz JSON body.' }, 400);
  }

  const prompt = isNonEmptyString(body.prompt) ? body.prompt.trim() : '';
  if (!prompt) {
    return json({ ok: false, error: 'prompt zorunludur.' }, 400);
  }

  const preset = resolvePreset(prompt);
  const projectId = crypto.randomUUID();
  const blueprint = await generateBlueprintWithAi(prompt, preset);

  const repoName = slugify(blueprint.deployment.repositoryName || `koschei-app-factory-${projectId.slice(0, 8)}`);
  const previewUrl = buildPreviewUrl(repoName);

  let repoUrl = `https://github.com/your-org/${repoName}`;
  try {
    repoUrl = await ensureGithubRepository(repoName);
  } catch (error) {
    console.error('[app-factory/generate] github_provision_failed', error);
  }

  const { error: insertError } = await context.supabase.from('app_factory_projects').insert({
    id: projectId,
    workspace_id: context.workspaceId,
    user_id: context.userId,
    prompt,
    app_type: preset.key,
    project_summary: blueprint.summary,
    blueprint,
    migration_plan: blueprint.migrations,
    pwa_enabled: blueprint.pwa.enabled,
    repo_url: repoUrl,
    preview_url: previewUrl,
    status: 'generated'
  });

  if (insertError) {
    console.error('[app-factory/generate] insert_failed', insertError);
    return json({ ok: false, error: 'Proje kaydedilemedi.' }, 500);
  }

  return json({ projectId, repoUrl, previewUrl }, 200);
}
