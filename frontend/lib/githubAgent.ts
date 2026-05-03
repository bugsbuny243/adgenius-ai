import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });

export async function pushCodeToGitHub(fileName: string, csharpCode: string) {
  // 1. Kodu GitHub'ın anlayacağı formata çevir
  const contentEncoded = Buffer.from(csharpCode, "utf8").toString("base64");

  // 2. Repoya direkt commit at!
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: "SENIN_GITHUB_KULLANICI_ADIN",
    repo: "koschei-monorepo",
    path: `Assets/Scripts/KoscheiAI/${fileName}`,
    message: `🤖 Koschei Agent: ${fileName} otonom olarak üretildi ve eklendi.`,
    content: contentEncoded,
    // (Varsa sha değeri eklenir ki dosya güncellenebilsin)
  });
}
