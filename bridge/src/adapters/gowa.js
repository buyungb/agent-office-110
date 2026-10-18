import { createHmac, timingSafeEqual } from 'node:crypto';

// GOWA webhooks carry `X-Hub-Signature-256: sha256=<hex HMAC of the raw body>`.
export function verifySignature(raw, header, secret) {
  if (!secret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  const given = Buffer.from(header.slice(7), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export class GowaError extends Error { constructor(message, status) { super(message); this.status = status; } }

// Thin REST client for go-whatsapp-web-multidevice v9 (device-scoped endpoints).
export function createGowa({ url, basicAuth, deviceId, fetchImpl = fetch }) {
  const auth = basicAuth ? 'Basic ' + Buffer.from(basicAuth.split(',')[0]).toString('base64') : null;
  async function call(method, path, { query, body, raw = false } = {}) {
    const u = new URL(path, url);
    for (const [k, v] of Object.entries(query || {})) u.searchParams.set(k, v);
    let res;
    try {
      res = await fetchImpl(u, { method, headers: { ...(auth && { authorization: auth }), 'x-device-id': deviceId, ...(body && { 'content-type': 'application/json' }) }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
    } catch (error) { throw new GowaError(`GOWA tidak bisa dihubungi (${u.origin}): ${error.cause?.code || error.message}`, 502); }
    if (raw) { if (!res.ok) throw new GowaError(`GOWA ${res.status}`, res.status); return res; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new GowaError(json.message || `GOWA ${res.status}`, res.status);
    return json.results;
  }
  const dev = encodeURIComponent(deviceId);
  async function ensureDevice() {
    const list = await call('GET', '/devices').catch(e => { if (e.status === 404) return []; throw e; });
    if (!(list || []).some(d => d.id === deviceId)) await call('POST', '/devices', { body: { device_id: deviceId } });
  }
  return {
    ensureDevice,
    async status() {
      try { const r = await call('GET', `/devices/${dev}/status`); return { reachable: true, connected: Boolean(r?.is_connected), loggedIn: Boolean(r?.is_logged_in) }; }
      catch (e) { if (e.status === 404) return { reachable: true, connected: false, loggedIn: false, missing: true }; return { reachable: false, connected: false, loggedIn: false, error: e.message }; }
    },
    // GOWA returns a link on its own host (often localhost); fetch it through the internal URL and inline it.
    async loginQr() {
      await ensureDevice();
      const r = await call('GET', `/devices/${dev}/login`);
      if (!r?.qr_link) throw new GowaError('GOWA tidak mengembalikan QR. Mungkin perangkat sudah login.', 409);
      const img = await call('GET', new URL(r.qr_link).pathname, { raw: true });
      const type = img.headers.get('content-type') || 'image/png';
      return { qr: `data:${type};base64,${Buffer.from(await img.arrayBuffer()).toString('base64')}`, duration: r.qr_duration || 30 };
    },
    async loginCode(phone) { await ensureDevice(); const r = await call('POST', `/devices/${dev}/login/code`, { query: { phone } }); return { pairCode: r?.pair_code }; },
    logout: () => call('POST', `/devices/${dev}/logout`),
    reconnect: () => call('POST', `/devices/${dev}/reconnect`),
    async groups() { const r = await call('GET', '/user/my/groups'); return (r?.data || []).map(g => ({ jid: g.JID, name: g.Name || g.JID, count: g.ParticipantCount ?? g.Participants?.length ?? null })); },
    async participants(jid) { const r = await call('GET', '/group/participants', { query: { group_id: jid } }); return (r?.participants || []).map(p => ({ jid: p.jid, phone: jidUser(p.phone_number || p.jid), lid: p.lid || '', name: p.display_name || '' })); },
  };
}

// '628123:12@s.whatsapp.net' → '628123'; '2515563@lid' → '2515563'.
export const jidUser = jid => String(jid || '').split('@')[0].split(':')[0];
