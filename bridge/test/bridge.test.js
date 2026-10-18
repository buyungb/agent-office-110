import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { startBridge } from '../src/server.js';
import { endOfDayWib } from '../src/mapping/whatsapp.js';
import { normalizePhone } from '../src/settings.js';

const SECRET = 'webhook-secret', GROUP = '120363000000000001@g.us';
const gowaCalls = [];
// Minimal GOWA stand-in for the REST calls the bridge makes.
async function fakeGowa(url, opts = {}) {
  const u = new URL(url);gowaCalls.push(`${opts.method} ${u.pathname}`);
  const json = results => new Response(JSON.stringify({ code: 'SUCCESS', results }), { headers: { 'content-type': 'application/json' } });
  if (u.pathname === '/devices' && opts.method === 'GET') return json([]);
  if (u.pathname === '/devices' && opts.method === 'POST') return json({ id: 'office', state: 'disconnected' });
  if (u.pathname === '/devices/office/status') return json({ device_id: 'office', is_connected: true, is_logged_in: false });
  if (u.pathname === '/devices/office/login') return json({ device_id: 'office', qr_link: 'http://localhost:3000/statics/images/qrcode/scan-qr-1.png', qr_duration: 30 });
  if (u.pathname === '/statics/images/qrcode/scan-qr-1.png') return new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { headers: { 'content-type': 'image/png' } });
  if (u.pathname === '/user/my/groups') return json({ data: [{ JID: GROUP, Name: 'APLINDO Dev', ParticipantCount: 3 }] });
  if (u.pathname === '/group/participants') return json({ group_id: GROUP, participants: [{ jid: '628111@s.whatsapp.net', phone_number: '628111@s.whatsapp.net', lid: '9001@lid', display_name: 'Arka Pratama' }] });
  return new Response('{}', { status: 404 });
}
let bridge, base, cookie;
const api = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(cookie && { cookie }), 'x-office-admin': '1', ...headers }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json(), headers: res.headers };
};
const hook = (payload, secret = SECRET) => {
  const raw = JSON.stringify(payload);
  return fetch(base + '/hooks/gowa', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex') }, body: raw }).then(async r => ({ status: r.status, body: await r.json() }));
};
const msg = (from, body, extra = {}) => ({ event: 'message', device_id: '628000@s.whatsapp.net', payload: { id: `m-${Math.random()}`, chat_id: GROUP, from: `${from}@s.whatsapp.net`, timestamp: new Date().toISOString(), is_from_me: false, body, ...extra } });
const eventsNow = async () => (await api('GET', '/api/state')).body.events;

before(async () => {
  bridge = await startBridge({ port: 0, dataDir: ':memory:', adminPasscode: 'rahasia', gowa: { url: 'http://gowa.test:3000', basicAuth: 'u:p', deviceId: 'office', webhookSecret: SECRET }, fetchImpl: fakeGowa });
  base = `http://127.0.0.1:${bridge.port}`;
});
after(() => bridge.stop());

test('public state and health work without login', async () => {
  assert.equal((await api('GET', '/api/health')).body.ok, true);
  const s = await api('GET', '/api/state');
  assert.deepEqual(s.body.events, []);assert.equal(s.body.status.whatsapp.configured, true);
});

test('admin routes need a session, the passcode, and the admin header', async () => {
  assert.equal((await api('GET', '/api/settings')).status, 401);
  assert.equal((await api('POST', '/api/admin/login', { passcode: 'salah' })).status, 401);
  const ok = await api('POST', '/api/admin/login', { passcode: 'rahasia' });
  assert.equal(ok.status, 200);cookie = ok.headers.get('set-cookie').split(';')[0];
  assert.match(ok.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.equal((await api('PUT', '/api/settings', { privacy: { showText: false } }, { 'x-office-admin': '' })).status, 403);
  assert.equal((await api('GET', '/api/settings')).status, 200);
});

test('webhook rejects a wrong signature', async () => {
  assert.equal((await hook(msg('628111', 'halo'), 'salah')).status, 401);
});

test('messages from disabled groups or unknown senders are ignored', async () => {
  assert.equal((await hook(msg('628111', 'halo'))).body.reason, 'group-disabled');
  await api('PUT', '/api/settings', { groups: { [GROUP]: { name: 'APLINDO Dev', enabled: true, room: 'trading' } } });
  assert.equal((await hook(msg('628999', 'halo'))).body.reason, 'unmapped');
  const s = await api('GET', '/api/settings');
  assert.equal(s.body.unmapped[0].group, 'APLINDO Dev');assert.doesNotMatch(s.body.unmapped[0].jid, /628999@/);
});

test('a mapped group message becomes a chat event without the message text', async () => {
  await api('PUT', '/api/settings', { people: { arka: { waPhone: '0811-1' }, satria: { waPhone: '628222' }, damar: { waLid: '7777@lid' } } });
  const r = await hook(msg('628111', 'rahasia klien jangan disimpan'));
  assert.equal(r.body.action, 'chat');assert.equal(r.body.person, 'arka');
  const chat = (await eventsNow()).find(e => e.id === 'wa:chat:arka');
  assert.equal(chat.room, 'trading');assert.doesNotMatch(chat.label, /rahasia/);
});

test('typing presence shows, and the next message clears it', async () => {
  await hook({ event: 'chat_presence', payload: { from: '628222@s.whatsapp.net', chat_id: GROUP, state: 'composing', is_group: true } });
  assert.ok((await eventsNow()).some(e => e.id === 'wa:typing:satria'));
  await hook(msg('628222', 'ok'));
  assert.ok(!(await eventsNow()).some(e => e.id === 'wa:typing:satria'));
});

test('keyword rules create intents; LID senders are matched', async () => {
  const r = await hook(msg('000', 'gaes otw ngopi ya', { from: '', from_lid: '7777@lid' }));
  assert.equal(r.body.person, 'damar');assert.equal(r.body.intent, 'coffee');
  const intent = (await eventsNow()).find(e => e.id === 'wa:intent:damar');
  assert.equal(intent.place, 'pantry');assert.ok(intent.until - intent.start <= 15 * 60_000 + 50);
});

test('three talkers light up the room, replies draw a line', async () => {
  const first = msg('628111', 'pagi');await hook(first);
  const r = await hook(msg('628222', 'pagi juga', { replied_to_id: first.payload.id }));
  assert.equal(r.body.replyTo, 'arka');assert.equal(r.body.roomHot, 'trading');
  const ev = await eventsNow();
  assert.ok(ev.some(e => e.kind === 'room_hot' && e.room === 'trading'));assert.ok(ev.some(e => e.kind === 'reply' && e.meta.to === 'arka'));
});

test('the SSE stream sends a snapshot and then live activity', async () => {
  const controller = new AbortController();
  const res = await fetch(base + '/api/stream', { signal: controller.signal });
  assert.equal(res.headers.get('content-type'), 'text/event-stream');
  const reader = res.body.getReader(), decoder = new TextDecoder();let text = '';
  const until = async pattern => { while (!pattern.test(text)) { const { value } = await reader.read(); text += decoder.decode(value); } };
  await until(/event: snapshot/);
  await api('POST', '/api/admin/test-event', { person: 'bima', label: '🧪 uji', minutes: 1 });
  await until(/event: activity\ndata: .*manual:bima/);
  controller.abort();
});

test('QR login inlines the image from GOWA and creates the device slot', async () => {
  const r = await api('POST', '/api/admin/whatsapp/login', {});
  assert.equal(r.status, 200);assert.match(r.body.qr, /^data:image\/png;base64,/);assert.equal(r.body.duration, 30);
  assert.ok(gowaCalls.includes('POST /devices'));
});

test('group sync stores group names and suggests matches by display name', async () => {
  await api('PUT', '/api/settings', { people: { arka: { waPhone: '' } } });
  const r = await api('POST', '/api/admin/whatsapp/sync', {});
  assert.equal(r.body.groups[GROUP].name, 'APLINDO Dev');assert.equal(r.body.groups[GROUP].enabled, true);
  assert.deepEqual(r.body.suggestions.arka, { waPhone: '628111', waLid: '9001@lid', name: 'Arka Pratama' });
});

test('invalid settings are rejected', async () => {
  assert.equal((await api('PUT', '/api/settings', { rules: [{ pattern: '(' }] })).status, 400);
  assert.equal((await api('PUT', '/api/settings', { people: { siapa: {} } })).status, 400);
});

test('helpers: phone normalisation and end of day in WIB', () => {
  assert.equal(normalizePhone('0812-3456-789'), '628123456789');assert.equal(normalizePhone('+62 812 3456'), '628123456');
  const t = Date.UTC(2026, 9, 18, 3, 0);// 10:00 WIB
  assert.equal(new Date(endOfDayWib(t) + 1).toISOString(), '2026-10-18T17:00:00.000Z');
});

// ---- Team management ----
const teamNow = async () => (await api('GET', '/api/team')).body;
const clone = v => JSON.parse(JSON.stringify(v));

test('team is public to read but only admins can change it', async () => {
  const t = await teamNow();
  assert.equal(t.people.length, 14);assert.ok(t.roles.some(r => r.id === 'ai-engineer'));
  const saved = cookie;cookie = null;
  assert.equal((await api('PUT', '/api/team', t)).status, 401);
  cookie = saved;
});

test('editing a person and a role is validated, stored and broadcast', async () => {
  const t = clone(await teamNow());
  const controller = new AbortController();
  const res = await fetch(base + '/api/stream', { signal: controller.signal });
  const reader = res.body.getReader(), decoder = new TextDecoder();let text = '';
  const until = async pattern => { while (!pattern.test(text)) { const { value } = await reader.read(); text += decoder.decode(value); } };
  await until(/event: snapshot/);
  t.people.find(p => p.id === 'arka').name = 'Arka Wijaya';
  t.roles.find(r => r.id === 'ai-engineer').name = 'Applied AI Engineer';
  const r = await api('PUT', '/api/team', t);
  assert.equal(r.status, 200);
  await until(/event: team\ndata: .*Arka Wijaya/);controller.abort();
  const after = await teamNow();
  assert.equal(after.people.find(p => p.id === 'arka').name, 'Arka Wijaya');
  assert.equal(after.roles.find(r => r.id === 'ai-engineer').name, 'Applied AI Engineer');
  assert.equal((await api('GET', '/api/settings')).body.team.find(p => p.id === 'arka').role, 'Applied AI Engineer');
});

test('invalid teams are rejected with every problem listed', async () => {
  const base0 = clone(await teamNow());
  const cases = [
    [t => { t.people.find(p => p.id === 'arka').imam = true; }, /satu imam/],
    [t => { t.people.forEach(p => p.imam = false); t.people.find(p => p.id === 'sekar').imam = true; }, /imam harus laki-laki/],
    [t => { t.people.find(p => p.id === 'satria').seat = 'ailab:0'; }, /meja yang sama/],
    [t => { t.roles = t.roles.filter(r => r.id !== 'cto'); }, /tidak ada di katalog/],
    [t => { t.people.forEach(p => { p.lunch = 'sport'; }); }, /Sport Hall penuh/],
    [t => { t.people.forEach(p => { p.meeting = true; }); }, /Kursi rapat War Room penuh/],
  ];
  for (const [change, message] of cases) {
    const t = clone(base0);change(t);
    const r = await api('PUT', '/api/team', t);
    assert.equal(r.status, 400, String(message));assert.ok(r.body.errors.some(e => message.test(e)), `${message} not in ${r.body.errors}`);
  }
});

test('adding and removing people keeps contact mappings in step', async () => {
  const t = clone(await teamNow());
  t.people.push({ id: 'nadia', name: 'Nadia Putri', short: 'Nadia', roleId: 'backend', gender: 'P', seat: 'studio:4', coffee: 'A', lunch: 'pantry', hijab: '#336699' });
  assert.equal((await api('PUT', '/api/team', t)).status, 200);
  await api('PUT', '/api/settings', { people: { nadia: { waPhone: '0855-1' } } });
  assert.equal((await api('GET', '/api/settings')).body.people.nadia.waPhone, '628551');
  const r = await hook(msg('628551', 'halo dari nadia'));assert.equal(r.body.person, 'nadia');
  t.people = t.people.filter(p => p.id !== 'nadia');
  assert.equal((await api('PUT', '/api/team', t)).status, 200);
  const s = (await api('GET', '/api/settings')).body;
  assert.equal(s.people.nadia, undefined);assert.ok(!(await eventsNow()).some(e => e.person === 'nadia'));
  assert.equal((await hook(msg('628551', 'masih ada?'))).body.reason, 'unmapped');
});

test('reset restores the default team', async () => {
  const r = await api('POST', '/api/team/reset', {});
  assert.equal(r.status, 200);
  const t = await teamNow();
  assert.equal(t.people.length, 14);assert.equal(t.people.find(p => p.id === 'arka').name, 'Arka');
});
