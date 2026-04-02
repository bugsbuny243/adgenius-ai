/**
 * AdGenius Network — Publisher Embed Script
 * Usage: <div data-adgenius-slot="slot-key"></div>
 *        <script src="https://api.adgenius.ai/static/embed.js" async></script>
 */
;(function () {
  'use strict'

  var API_BASE = (window.ADGENIUS_API_BASE || 'https://api.adgenius.ai').replace(/\/$/, '')

  function getSessionId() {
    try {
      var key = '_ag_sid'
      var sid = sessionStorage.getItem(key)
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
        sessionStorage.setItem(key, sid)
      }
      return sid
    } catch (_) {
      return 'anon-' + Math.random().toString(36).slice(2)
    }
  }

  function getCountry() { return (navigator.language || '').split('-')[1] || '' }
  function getDevice() { return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop' }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function renderAd(container, ad) {
    var clickUrl = API_BASE + ad.click_url
    var requestId = (ad.tracking_data && ad.tracking_data.request_id) || ''

    container.innerHTML =
      '<a href="' + clickUrl + '" target="_blank" rel="noopener noreferrer" ' +
      'style="display:block;text-decoration:none;font-family:system-ui,sans-serif;' +
      'border:1px solid #e2e8f0;border-radius:10px;padding:16px;max-width:400px;' +
      'background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06);color:#1e293b;">' +
      (ad.image_url ? '<img src="' + ad.image_url + '" alt="" style="width:100%;border-radius:6px;margin-bottom:10px;display:block;" />' : '') +
      '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">' + _esc(ad.headline) + '</div>' +
      '<div style="font-size:13px;color:#64748b;margin-bottom:12px;line-height:1.5;">' + _esc(ad.body) + '</div>' +
      '<span style="display:inline-block;background:#4f46e5;color:#fff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;">' + _esc(ad.cta) + '</span>' +
      '<span style="display:block;font-size:10px;color:#cbd5e1;margin-top:8px;">Reklam · AdGenius Network</span>' +
      '</a>'

    if (requestId) {
      fetch(API_BASE + ad.impression_url, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, session_id: getSessionId() }),
      }).catch(function () {})
    }
  }

  function loadSlot(container) {
    var slotKey = container.getAttribute('data-adgenius-slot')
    if (!slotKey) return

    var params = new URLSearchParams({
      slot_key: slotKey,
      page_url: window.location.href,
      session_id: getSessionId(),
      country: getCountry(),
      device: getDevice(),
    })

    fetch(API_BASE + '/api/v1/serve/ad?' + params.toString(), { method: 'GET', credentials: 'omit' })
      .then(function (res) {
        if (res.status === 204 || !res.ok) throw new Error('No ad')
        return res.json()
      })
      .then(function (ad) { renderAd(container, ad) })
      .catch(function () { container.style.display = 'none' })
  }

  function init() {
    var slots = document.querySelectorAll('[data-adgenius-slot]')
    for (var i = 0; i < slots.length; i++) { loadSlot(slots[i]) }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else { init() }
})()
