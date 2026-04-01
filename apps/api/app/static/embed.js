// FULL FILE
(function () {
  async function init(slotId) {
    const serveRes = await fetch(`/api/v1/serving/serve?slot_id=${encodeURIComponent(slotId)}`);
    const ad = await serveRes.json();
    const container = document.currentScript?.parentElement || document.body;
    const card = document.createElement('div');
    card.innerHTML = `<strong>${ad.title}</strong><p>${ad.body}</p><button>${ad.cta}</button>`;
    container.appendChild(card);
    await fetch('/api/v1/serving/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': ad.request_id },
      body: JSON.stringify({ request_id: ad.request_id, ad_id: ad.ad_id, slot_id: slotId }),
    });
  }
  window.AdGeniusEmbed = { init };
})();
