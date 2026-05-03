// Dosya: frontend/lib/game-factory/agent-coder.ts
import { Octokit } from "@octokit/rest";
import { runTextWithAiEngine } from "@/lib/ai-engine"; // Mevcut yapay zeka motorun

// Koschei'nin GitHub elleri (Sisteme senin adına dosya yükleyecek)
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });

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
    
    await octokit.rest.repos.createOrUpdateFileContents({
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
