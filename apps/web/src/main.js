const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const deployBtn = document.querySelector("#deployBtn");
const runPromptBtn = document.querySelector("#runPromptBtn");
const promptInput = document.querySelector("#promptInput");
const projectInput = document.querySelector("#projectId");
const userInput = document.querySelector("#userId");
const functionUrlInput = document.querySelector("#functionUrl");
const functionKeyInput = document.querySelector("#functionKey");
const output = document.querySelector("#orchestratorOutput");
const statusPill = document.querySelector("#statusPill");
const agentList = document.querySelector("#agentList");
const agentProgress = document.querySelector("#agentProgress");

const agents = [
  "Koschei Gateway",
  "Gemini Strategist",
  "Gemini Creative",
  "Gemini Analyst",
  "Gemini Revenue",
  "Gemini Guardrails",
  "Supabase Realtime Sync"
];

agentList.innerHTML = agents.map((agent) => `<li>${agent}</li>`).join("");

const updateProgress = (percent) => {
  agentProgress.style.setProperty("--progress", `${percent}%`);
  agentProgress.querySelector("span").textContent = `${percent}%`;
};

const renderPreview = () => {
  const html = `<!doctype html><html><body style="font-family:Inter, ui-sans-serif; padding: 16px;">${editor.value}</body></html>`;
  preview.srcdoc = html;
};

const setStatus = (label, tone = "idle") => {
  statusPill.textContent = label;
  statusPill.dataset.tone = tone;
};

const readConfig = () => ({
  functionUrl: functionUrlInput.value.trim(),
  functionKey: functionKeyInput.value.trim(),
  projectId: projectInput.value.trim(),
  userId: userInput.value.trim(),
  prompt: promptInput.value.trim()
});

const runOrchestrator = async () => {
  const config = readConfig();

  if (!config.functionUrl || !config.functionKey || !config.prompt) {
    setStatus("Eksik konfigürasyon", "error");
    output.textContent = "Function URL, Function Key ve Prompt zorunlu.";
    return;
  }

  runPromptBtn.disabled = true;
  setStatus("Gemini orkestrasyonu çalışıyor", "running");
  updateProgress(20);

  try {
    const res = await fetch(config.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.functionKey}`,
        apikey: config.functionKey
      },
      body: JSON.stringify({
        projectId: config.projectId,
        userId: config.userId,
        prompt: `${config.prompt}\n\nLiveEditor:\n${editor.value}`
      })
    });

    updateProgress(75);
    const payload = await res.json();

    if (!res.ok || !payload.ok) {
      throw new Error(payload?.error ?? "Gemini çağrısı başarısız oldu.");
    }

    output.textContent = JSON.stringify(payload.data, null, 2);
    updateProgress(100);
    setStatus("Orkestrasyon tamamlandı", "success");
  } catch (error) {
    setStatus("Orkestrasyon hatası", "error");
    output.textContent = error.message;
    updateProgress(0);
  } finally {
    runPromptBtn.disabled = false;
  }
};

editor.addEventListener("input", renderPreview);
renderPreview();

const defaultPrompt =
  "1M kullanıcı ölçeği için growth planı, reklam kreatifleri, funnel optimizasyonu ve gelir senaryosu üret.";
promptInput.value = defaultPrompt;

deployBtn.addEventListener("click", () => {
  setStatus("Koschei paneli online", "success");
  deployBtn.textContent = "Sistem Aktif ⚡";
  deployBtn.disabled = true;
  updateProgress(12);
});

runPromptBtn.addEventListener("click", runOrchestrator);

if (window.adsbygoogle) {
  window.adsbygoogle.push({});
}
