// Dosya: frontend/lib/game-factory/agent-coder.ts
import { runTextWithAiEngine } from "@/lib/ai-engine"; // Mevcut yapay zeka motorun

async function createOrUpdateFileOnGitHub(params: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string;
}) {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN tanımlı değil.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${params.path}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: params.message,
        content: params.content,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API hatası (${response.status}): ${errorText}`);
  }
}

export async function generateAndCommitCSharpCode(brief: string, fileName: string) {
  try {
    console.log(`🤖 Koschei AGI: ${fileName} için kod yazmaya başlıyor...`);

    // 1. AI'a C# Yazdırma Emri (Sadece Kod)
    const prompt = `Sen kıdemli bir Unity C# geliştiricisisin. 
    Müşterinin oyun fikri: "${brief}". 
    Bana bu oyun için sadece ${fileName} isimli dosyanın C# kodunu yaz. 
    Lütfen markdown kod bloğu veya ekstra açıklama ekleme, sadece saf kod döndür.`;
    
    let csharpCode = await runTextWithAiEngine(prompt);

    // Markdown işaretleri gelirse temizle
    csharpCode = csharpCode.replace(/```csharp/g, "").replace(/```/g, "").trim();

    // 2. Kodu GitHub'ın anlayacağı formata (Base64) çevir
    const contentEncoded = Buffer.from(csharpCode).toString("base64");

    // 3. Monorepo'ya Otonom Commit At!
    // Kodları Unity projenin içindeki Scripts/KoscheiGenerated klasörüne yollar
    const targetPath = `unity-client/Assets/Scripts/KoscheiGenerated/${fileName}`;

    await createOrUpdateFileOnGitHub({
      owner: process.env.GITHUB_OWNER as string,
      repo: process.env.GITHUB_REPO as string,
      path: targetPath,
      message: `🤖 Koschei AGI: ${fileName} otonom olarak üretildi ve eklendi.`,
      content: contentEncoded,
    });

    console.log(`✅ Başarılı: ${fileName} GitHub'a gönderildi!`);
    return { success: true };
  } catch (error) {
    console.error("❌ C# Agent Hatası:", error);
    return { success: false, error };
  }
}
