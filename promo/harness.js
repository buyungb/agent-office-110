// Injected before the office loads (promo/capture.py). window.__promoConfig is set just before this script.
// 1. A virtual clock: requestAnimationFrame callbacks run only on __promo.step(ms), and performance.now / Date.now
//    follow that clock, so every frame is rendered at an exact 1/30 s no matter how slow the software renderer is.
// 2. A fake bridge (/api/* and EventSource) so Live mode, chat bubbles and the team editor can be shown with
//    made-up demo data. Nothing here talks to WhatsApp or a real server.
// 3. An overlay layer for captions and the end card, drawn into the same page so screenshots include it.
(() => {
  const cfg = window.__promoConfig || {};
  const epoch = Date.parse('2026-10-20T03:00:00Z');// a fixed weekday morning in WIB
  let virt = 0;const queue = [];
  performance.now = () => virt;
  Date.now = () => epoch + virt;
  window.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};

  // ---- fake bridge ----
  const state = { events: [], status: { whatsapp: { configured: true, reachable: true, connected: true, loggedIn: true, lastEventAt: null, needsSync: false } }, mode: { default: 'live' }, team: null, at: epoch };
  let source = null;
  const json = body => Promise.resolve(new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }));
  const realFetch = window.fetch.bind(window);
  window.fetch = (url, opts = {}) => {
    const u = new URL(String(url), location.href);
    if (!u.pathname.startsWith('/api/')) return realFetch(url, opts);
    if (!cfg.live) return Promise.resolve(new Response('not found', { status: 404 }));
    const route = `${(opts.method || 'GET').toUpperCase()} ${u.pathname}`;
    if (route === 'GET /api/state') return json(state);
    if (route === 'GET /api/admin/me') return json({ admin: true, enabled: true, team: [] });
    if (route === 'GET /api/settings') return json({ team: [], people: {}, groups: {}, rules: [], privacy: { showText: true, maskNumbers: true, retentionHours: 24 }, mode: state.mode, status: state.status, unmapped: [] });
    if (route === 'GET /api/admin/audit') return json([]);
    if (route === 'PUT /api/team') { const team = JSON.parse(opts.body); state.team = team; setTimeout(() => emit('team', team), 0); return json({ ok: true, team }); }
    return json({ ok: true });
  };
  class FakeEventSource {
    constructor() { this.listeners = {}; source = this; setTimeout(() => { this.onopen?.(); emit('snapshot', state); }, 0); }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    close() {}
  }
  if (cfg.live) window.EventSource = FakeEventSource;
  function emit(type, data) { for (const fn of source?.listeners[type] || []) fn({ data: JSON.stringify(data) }); }
  if (cfg.live) import('/dist/team.js').then(m => { state.team = JSON.parse(JSON.stringify(m.DEFAULT_TEAM)); emit('team', state.team); });

  // ---- overlay ----
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = s => esc(s).replace(/\*\*(.+?)\*\*/gs, '<em>$1</em>').replace(/\n/g, '<br>');
  const css = `
    #promo-layer{position:fixed;inset:0;z-index:100;pointer-events:none;font-family:Fredoka,Nunito,sans-serif;color:#fff}
    #promo-layer .cap{position:absolute;left:28px;right:64px;text-align:left;text-shadow:0 2px 0 #0b1220,0 0 18px #0b1220cc,0 0 2px #000}
    #promo-layer .hook{font-size:40px;line-height:1.32;font-weight:700;letter-spacing:-.5px}
    #promo-layer .sub{font-size:25px;line-height:1.42;font-weight:600}
    #promo-layer .line{background:#0b1220d9;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:1px 12px 3px;border-radius:12px;text-shadow:none}
    #promo-layer em{font-style:normal;color:${cfg.brandColor || '#ff7a1a'}}
    #promo-layer .pill{display:inline-block;background:${cfg.brandColor || '#ff7a1a'};color:#1a0d02;text-shadow:none;border-radius:12px;padding:6px 14px;font-size:20px;font-weight:700;margin-bottom:10px}
    #promo-layer .clock{position:absolute;right:64px;top:118px;font:700 30px Fredoka,sans-serif;background:#0b1220d9;border:2px solid ${cfg.brandColor || '#ff7a1a'};border-radius:14px;padding:6px 14px;text-shadow:none}
    #promo-layer .chat{position:absolute;left:24px;right:64px;top:118px;display:grid;gap:7px}
    #promo-layer .msg{background:#f4fff4;color:#11251a;text-shadow:none;border-radius:16px 16px 16px 4px;padding:7px 12px;font:700 16px/1.25 Nunito,sans-serif;box-shadow:0 6px 16px #0007;max-width:80%}
    #promo-layer .msg b{display:block;font:800 13px Nunito,sans-serif;color:#1f8a4c}
    #promo-layer .chat-head{background:#1f8a4cee;border-radius:12px;padding:7px 12px;font:700 15px Nunito,sans-serif;justify-self:start;text-shadow:none}
    #promo-layer .end{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 30%,#1b2a4a 0%,#0b1220 60%,#05080f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}
    #promo-layer .end .logo{font:700 64px Fredoka,sans-serif;color:${cfg.brandColor || '#ff7a1a'};text-shadow:0 0 30px ${cfg.brandColor || '#ff7a1a'}88}
    #promo-layer .end .logo span{display:inline-grid;place-items:center;width:84px;height:84px;border-radius:22px;background:${cfg.brandColor || '#ff7a1a'};color:#0b1220;margin-right:14px;text-shadow:none;vertical-align:middle}
    #promo-layer .end .tag{font:600 24px Fredoka,sans-serif;color:#dbe6ff}
    #promo-layer .end .cta{margin-top:18px;background:${cfg.brandColor || '#ff7a1a'};color:#1a0d02;font:700 30px Fredoka,sans-serif;border-radius:18px;padding:14px 26px}
    #promo-layer .end .handle{font:600 20px Nunito,sans-serif;color:#aab8d6}
    #promo-layer .end .by{position:absolute;bottom:230px;font:600 16px Nunito,sans-serif;color:#7d8bab}`;
  function layer() {
    let el = document.getElementById('promo-layer');
    if (!el) { const st = document.createElement('style'); st.textContent = css; document.head.append(st); el = document.createElement('div'); el.id = 'promo-layer'; document.body.append(el); }
    return el;
  }
  // items: [{kind:'hook'|'sub'|'pill', text, y, opacity}], extras: {clock, chat:{title, messages}, end:{opacity}}
  let last = '';
  function overlay(items, extras = {}) {
    const html = items.map(i => i.kind === 'pill'
      ? `<div class="cap" style="top:${i.y}px;opacity:${i.opacity ?? 1}"><span class="pill">${rich(i.text)}</span></div>`
      : `<div class="cap ${i.kind}" style="top:${i.y}px;opacity:${i.opacity ?? 1};transform:translateY(${(1 - (i.opacity ?? 1)) * 14}px)"><span class="line">${rich(i.text)}</span></div>`).join('')
      + (extras.clock ? `<div class="clock">🕐 ${esc(extras.clock)}</div>` : '')
      + (extras.chat ? `<div class="chat"><div class="chat-head">💬 ${esc(extras.chat.title)}</div>${extras.chat.messages.map(m => `<div class="msg" style="opacity:${m.opacity}"><b>${esc(m.from)}</b>${esc(m.text)}</div>`).join('')}</div>` : '')
      + (extras.end ? `<div class="end" style="opacity:${extras.end.opacity}"><div class="logo"><span>${esc(cfg.brandMark || 'O')}</span>${esc(cfg.brandName || 'OrangPinter')}</div><div class="tag">${esc(cfg.tagline || '')}</div><div class="cta">Komen <b>KANTOR</b> untuk demo</div><div class="handle">${esc(cfg.handle || '')}</div><div class="by">${esc(cfg.by || '')}</div></div>` : '');
    if (html !== last) { layer().innerHTML = html; last = html; }
  }

  window.__promo = {
    step(ms) { virt += ms; const due = queue.splice(0); for (const cb of due) cb(virt); },
    advance(ms) { virt += ms; },// move the clock without rendering (preview frames that are not saved)
    get ms() { return virt; },
    overlay,
    // A WhatsApp-style live event (made-up demo data), timed on the virtual clock.
    activity(e) { const ev = { start: Date.now(), meta: {}, source: 'whatsapp', ...e }; ev.until = ev.start + (e.ttl ?? 8000); delete ev.ttl; state.events.push(ev); emit('activity', ev); },
  };
})();
