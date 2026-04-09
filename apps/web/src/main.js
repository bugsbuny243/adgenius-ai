const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const deployBtn = document.querySelector("#deployBtn");
const agentList = document.querySelector("#agentList");

const agents = [
  "Koschei Gateway (front orchestrator)",
  "Gemini Strategist (campaign planning)",
  "Gemini Creative (copy + visual prompt generation)",
  "Gemini Analyst (KPI anomaly detection)",
  "Gemini Revenue (AdSense placement optimizer)",
  "Supabase Sync Agent (state + auth + realtime)"
];

agentList.innerHTML = agents.map((agent) => `<li>${agent}</li>`).join("");

const renderPreview = () => {
  const html = `<!doctype html><html><body style="font-family:Inter;padding:16px;">${editor.value}</body></html>`;
  preview.srcdoc = html;
};

editor.addEventListener("input", renderPreview);
renderPreview();

deployBtn.addEventListener("click", () => {
  deployBtn.textContent = "Gemini ağı devrede ⚡";
  deployBtn.disabled = true;
});

if (window.adsbygoogle) {
  window.adsbygoogle.push({});
}
