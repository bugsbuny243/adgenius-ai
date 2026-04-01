;(function () {
  'use strict'
  var API_BASE = (window.ADGENIUS_API_BASE || 'http://localhost:8000').replace(/\/$/, '')
  function getSessionId() { var k='adgenius_session_id'; var v=sessionStorage.getItem(k); if(v) return v; v=(crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()); sessionStorage.setItem(k,v); return v }
  function getCountry() { return (navigator.language || '').split('-')[1] || '' }
  function getDevice() { return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop' }
  function renderAd(container, ad) {
    var requestId = (ad.tracking_data && ad.tracking_data.request_id) || ''
    var clickUrl = API_BASE + ad.click_url
    container.innerHTML = '<a href="' + clickUrl + '"><h4>' + (ad.headline||'') + '</h4><p>' + (ad.body||'') + '</p></a>'
    if (requestId) {
      fetch(API_BASE + ad.impression_url, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: requestId, session_id: getSessionId() }) }).catch(function () {})
    }
  }
  function loadSlot(container) {
    var slotKey = container.getAttribute('data-adgenius-slot')
    if (!slotKey) return
    var params = new URLSearchParams({ slot_key: slotKey, page_url: window.location.href, session_id: getSessionId(), country: getCountry(), device: getDevice() })
    fetch(API_BASE + '/api/v1/serve/ad?' + params.toString(), { method: 'GET', credentials: 'omit' })
      .then(function(res) { if (!res.ok) throw new Error('No ad'); return res.json() })
      .then(function(ad) { renderAd(container, ad) })
      .catch(function() { container.style.display = 'none' })
  }
  function init() { var slots = document.querySelectorAll('[data-adgenius-slot]'); for (var i = 0; i < slots.length; i++) { loadSlot(slots[i]) } }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init) } else { init() }
})()
