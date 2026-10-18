import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { config as defaults } from './config.js';
import { openDb } from './db.js';
import { createStream } from './stream.js';
import { createEvents } from './events.js';
import { createSettings, maskPhone, normalizePhone } from './settings.js';
import { createAuth } from './auth.js';
import { createGowa, verifySignature, GowaError } from './adapters/gowa.js';
import { createWhatsAppMapper } from './mapping/whatsapp.js';

const MAX_BODY = 1_000_000;
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];let size = 0;
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Body terlalu besar'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));req.on('error', reject);
  });
}
const parseJson = raw => { try { return raw.length ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('JSON tidak valid'), { status: 400 }); } };
function send(res, status, data, headers = {}) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(JSON.stringify(data)); }

export async function startBridge(overrides = {}) {
  const config = { ...defaults, ...overrides, gowa: { ...defaults.gowa, ...overrides.gowa } };
  const { DEFAULT_TEAM, normalizeTeam, validateTeam, resolveTeam } = await import(pathToFileURL(config.teamFile));
  const db = openDb(config.dataDir);
  const stream = createStream();
  // People and roles are edited in the office (⚙️ → Tim); defaults come from dist/team.js.
  let teamData = normalizeTeam(db.getSetting('team', DEFAULT_TEAM)), resolved = resolveTeam(teamData);
  const currentTeam = () => resolved;
  const settings = createSettings(db, currentTeam);
  const events = createEvents({ db, broadcast: stream.broadcast, retentionHours: () => settings.get('privacy').retentionHours });
  const auth = createAuth(config.adminPasscode);
  const gowa = createGowa({ ...config.gowa, fetchImpl: overrides.fetchImpl || fetch });
  const status = { whatsapp: { configured: Boolean(config.gowa.webhookSecret), reachable: null, connected: false, loggedIn: false, lastEventAt: null, needsSync: false } };
  const setStatus = (source, patch) => { Object.assign(status[source], patch); stream.broadcast('status', status); };
  const wa = createWhatsAppMapper({ settings, events, onStatus: patch => setStatus('whatsapp', patch) });
  async function refreshWhatsApp() { const s = await gowa.status(); setStatus('whatsapp', { reachable: s.reachable, connected: s.connected, loggedIn: s.loggedIn, error: s.error || null }); return s; }
  const poll = setInterval(() => refreshWhatsApp().catch(() => {}), 30_000);poll.unref();
  refreshWhatsApp().catch(() => {});

  const teamSummary = () => resolved.map(p => ({ id: p.id, name: p.name, short: p.short, role: p.role }));
  const snapshot = () => ({ events: events.list(), status, mode: settings.get('mode'), team: teamData, at: Date.now() });
  function saveTeam(next, action) {
    const data = normalizeTeam(next), errors = validateTeam(data);
    if (errors.length) throw Object.assign(new Error(errors[0]), { status: 400, errors });
    teamData = data;resolved = resolveTeam(data);db.setSetting('team', data);settings.prunePeople();
    const ids = new Set(data.people.map(p => p.id));
    for (const e of events.list()) if (e.person && !ids.has(e.person)) events.remove(e.id);
    audit(action, `${data.people.length} orang, ${data.roles.length} peran`);stream.broadcast('team', data);
    return { ok: true, team: data };
  }
  const audit = (action, detail = '') => db.audit('admin', action, detail);

  // Admin-only routes require a session and a custom header (blocks cross-site form posts).
  const admin = {
    'GET /api/settings': () => ({ team: teamSummary(), people: settings.get('people'), groups: settings.get('groups'), rules: settings.get('rules'), privacy: settings.get('privacy'), mode: settings.get('mode'), status, unmapped: wa.unmapped().map(u => ({ ...u, jid: settings.get('privacy').maskNumbers ? maskPhone(u.jid.split('@')[0]) : u.jid })) }),
    'PUT /api/settings': body => { const changed = settings.update(body); audit('settings.update', changed.join(',')); stream.broadcast('mode', settings.get('mode')); return { ok: true, changed }; },
    'GET /api/admin/audit': () => db.recentAudit(50),
    'PUT /api/team': body => saveTeam(body, 'team.update'),
    'POST /api/team/reset': () => saveTeam(DEFAULT_TEAM, 'team.reset'),
    'POST /api/admin/test-event': body => {
      if (!resolved.some(p => p.id === body.person)) throw Object.assign(new Error('person tidak dikenal'), { status: 400 });
      const minutes = Math.max(.1, Math.min(120, Number(body.minutes) || 2));
      const ev = events.put({ id: `manual:${body.person}`, person: body.person, source: 'manual', kind: body.kind || 'intent', place: body.place ?? null, room: body.room ?? null, label: String(body.label || '🧪 Event uji').slice(0, 60), until: Date.now() + minutes * 60_000 });
      audit('test-event', body.person);return ev;
    },
    'DELETE /api/admin/test-event': body => ({ removed: events.remove(`manual:${body.person}`) }),
    'GET /api/admin/whatsapp/status': () => refreshWhatsApp(),
    'POST /api/admin/whatsapp/login': async () => { const r = await gowa.loginQr(); audit('whatsapp.login-qr'); return r; },
    'POST /api/admin/whatsapp/login-code': async body => { const phone = normalizePhone(body.phone); if (phone.length < 9) throw Object.assign(new Error('Nomor tidak valid'), { status: 400 }); const r = await gowa.loginCode(phone); audit('whatsapp.login-code', maskPhone(phone)); return r; },
    'POST /api/admin/whatsapp/logout': async () => { await gowa.logout(); audit('whatsapp.logout'); return refreshWhatsApp(); },
    'POST /api/admin/whatsapp/reconnect': async () => { await gowa.reconnect(); return refreshWhatsApp(); },
    // Reads groups and members from WhatsApp, stores group names, and suggests person ↔ number matches by name.
    'POST /api/admin/whatsapp/sync': async () => {
      const groups = await gowa.groups(), known = settings.get('groups'), patch = {};
      for (const g of groups) patch[g.jid] = { name: g.name, enabled: known[g.jid]?.enabled ?? false, room: known[g.jid]?.room ?? null };
      if (groups.length) settings.update({ groups: patch });
      const enabled = groups.filter(g => patch[g.jid].enabled);
      const members = new Map();
      for (const g of (enabled.length ? enabled : groups).slice(0, 20)) for (const m of await gowa.participants(g.jid).catch(() => [])) members.set(m.lid || m.phone, m);
      const people = settings.get('people'), suggestions = {};
      for (const p of resolved) {
        if (people[p.id].waPhone || people[p.id].waLid) continue;
        const names = [p.short, p.name].map(s => s.toLowerCase());
        const hit = [...members.values()].find(m => m.name && names.some(n => m.name.toLowerCase().includes(n)));
        if (hit) suggestions[p.id] = { waPhone: hit.phone, waLid: hit.lid, name: hit.name };
      }
      setStatus('whatsapp', { needsSync: false });audit('whatsapp.sync', `${groups.length} grup`);
      return { groups: settings.get('groups'), members: members.size, suggestions };
    },
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://bridge');const route = `${req.method} ${url.pathname}`;
    try {
      if (route === 'GET /api/health') return send(res, 200, { ok: true });
      if (route === 'GET /api/state') return send(res, 200, snapshot());
      if (route === 'GET /api/team') return send(res, 200, teamData);
      if (route === 'GET /api/stream') return stream.open(req, res, snapshot);
      if (route === 'GET /api/admin/me') return send(res, 200, { admin: auth.isAdmin(req), enabled: auth.enabled, team: teamSummary() });
      if (route === 'POST /api/admin/login') { const r = auth.login(req, parseJson(await readBody(req)).passcode); return send(res, r.status, r.error ? { error: r.error } : { ok: true }, r.cookie ? { 'set-cookie': r.cookie } : {}); }
      if (route === 'POST /api/admin/logout') return send(res, 200, { ok: true }, { 'set-cookie': auth.logout(req) });
      if (route === 'POST /hooks/gowa') {
        const raw = await readBody(req);
        if (!verifySignature(raw, req.headers['x-hub-signature-256'], config.gowa.webhookSecret)) return send(res, 401, { error: 'signature' });
        return send(res, 200, wa.handle(parseJson(raw)));
      }
      const handler = admin[route];
      if (handler) {
        if (!auth.isAdmin(req)) return send(res, 401, { error: 'Login admin diperlukan.' });
        if (req.method !== 'GET' && req.headers['x-office-admin'] !== '1') return send(res, 403, { error: 'Header admin tidak ada.' });
        const body = req.method === 'GET' ? {} : parseJson(await readBody(req));
        return send(res, 200, await handler(body));
      }
      send(res, 404, { error: 'not found' });
    } catch (error) {
      const code = error instanceof GowaError ? (error.status >= 500 || !error.status ? 502 : error.status) : error.status || (error instanceof SyntaxError || /harus|tidak dikenal|bukan grup|Invalid regular/.test(error.message) ? 400 : 500);
      if (code >= 500 && !(error instanceof GowaError)) console.error(error);
      send(res, code, { error: error.message, ...(error.errors && { errors: error.errors }) });
    }
  });
  await new Promise(r => server.listen(config.port, r));
  const stop = () => new Promise(r => { clearInterval(poll); events.stop(); stream.close(); server.close(() => { db.close(); r(); }); });
  return { server, stop, port: server.address().port, events, settings };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bridge = await startBridge();
  console.log(`office-bridge listening on :${bridge.port}`);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => bridge.stop().then(() => process.exit(0)));
}
