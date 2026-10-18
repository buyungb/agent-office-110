import { jidUser } from '../adapters/gowa.js';
import { normalizePhone } from '../settings.js';

const MIN = 60_000;
const MEDIA = { image: '📷 gambar', video: '🎬 video', audio: '🎤 pesan suara', document: '📄 dokumen', sticker: '🙂 stiker', location: '📍 lokasi', contact: '👤 kontak' };
const mediaOf = p => Object.keys(MEDIA).find(k => p[k]);
// End of today in Jakarta (UTC+7, no DST).
export function endOfDayWib(t) { const off = 7 * 3_600_000, day = 86_400_000; return Math.floor((t + off) / day) * day + day - off - 1; }

// Turns GOWA webhook events into office activity events. Message text is read here only and never stored.
export function createWhatsAppMapper({ settings, events, onStatus = () => {}, now = () => Date.now() }) {
  const senders = new Map();// message id → person (for reply lines)
  const groupActivity = new Map();// group jid → [{person, at}]
  const unmapped = new Map();// sender key → {jid, lid, name, group, at} for the settings screen
  let lastEventAt = null;

  function personFor(p) {
    const phone = jidUser(p.from), lid = jidUser(p.from_lid);
    for (const [id, m] of Object.entries(settings.get('people'))) {
      if (m.waPhone && normalizePhone(m.waPhone) === phone) return id;
      if (m.waLid && jidUser(m.waLid) === lid && lid) return id;
    }
    return null;
  }
  function remember(map, key, value, limit = 500) { map.delete(key); map.set(key, value); if (map.size > limit) map.delete(map.keys().next().value); }

  // Pop-up bubble with the message itself, shown for 8 seconds and never written to SQLite.
  function bubble(p, group, person) {
    const t = now(), text = String(p.body || '').replace(/\s+/g, ' ').trim(), media = mediaOf(p);
    const allowed = settings.get('privacy').showText && group.showText !== false;
    const label = !allowed ? '💬 mengirim pesan' : text ? (text.length > 80 ? text.slice(0, 79) + '…' : text) : media ? `${MEDIA[media]}` : '💬 pesan';
    const sender = person ? null : String(p.sender_display_name || p.from_name || 'Anggota grup').slice(0, 40);
    events.put({ id: `wa:bubble:${p.id || t}`, person, source: 'whatsapp', kind: 'bubble', label, room: group.room || (person ? null : 'lobby'), until: t + 8_000,
      meta: { group: p.chat_id, groupName: group.name, ...(sender && { sender }), ...(media && { media }) } }, { persist: false });
  }
  function handle(body) {
    const { event, payload: p = {} } = body || {};
    lastEventAt = now();onStatus({ lastEventAt });
    if (event === 'group.participants') { onStatus({ needsSync: true }); return { action: 'needs-sync' }; }
    if (event !== 'message' && event !== 'chat_presence') return { action: 'ignored', reason: 'event' };
    if (!String(p.chat_id || '').endsWith('@g.us')) return { action: 'ignored', reason: 'not-group' };
    const group = settings.get('groups')[p.chat_id];
    if (!group?.enabled) return { action: 'ignored', reason: 'group-disabled' };
    if (p.is_from_me) return { action: 'ignored', reason: 'own-message' };
    const person = personFor(p);
    if (!person) { if (event === 'message') bubble(p, group, null);remember(unmapped, p.from_lid || p.from, { jid: p.from || '', lid: p.from_lid || '', name: p.sender_display_name || p.from_name || '', group: group.name, at: now() }, 100); return { action: 'ignored', reason: 'unmapped' }; }
    const t = now(), base = { person, source: 'whatsapp', room: group.room, meta: { group: p.chat_id, groupName: group.name } };

    if (event === 'chat_presence') {
      if (p.state === 'composing') { events.put({ ...base, id: `wa:typing:${person}`, kind: 'typing', label: `✍️ Mengetik di ${group.name}`, until: t + 15_000 }); return { action: 'typing', person }; }
      events.remove(`wa:typing:${person}`);return { action: 'paused', person };
    }

    // message
    events.remove(`wa:typing:${person}`);
    const text = String(p.body || '');
    const media = mediaOf(p);
    // The 2-minute status never carries message text (it is stored); the 8-second bubble may (it is not).
    events.put({ ...base, id: `wa:chat:${person}`, kind: 'chat', label: `💬 Chat di ${group.name}${media ? ` (${MEDIA[media]})` : ''}`, until: t + 2 * MIN });
    bubble(p, group, person);
    const results = { action: 'chat', person };
    if (p.replied_to_id && senders.has(p.replied_to_id)) {
      const to = senders.get(p.replied_to_id);
      if (to !== person) { events.put({ ...base, id: `wa:reply:${p.id}`, kind: 'reply', label: `↩️ Membalas di ${group.name}`, until: t + 12_000, meta: { ...base.meta, to } });results.replyTo = to; }
    }
    if (p.id) remember(senders, p.id, person);
    // Three or more people talking in one group within 10 minutes lights up its room.
    const recent = (groupActivity.get(p.chat_id) || []).filter(a => a.at > t - 10 * MIN);recent.push({ person, at: t });groupActivity.set(p.chat_id, recent);
    const talkers = new Set(recent.map(a => a.person));
    if (group.room && talkers.size >= 3) { events.put({ id: `wa:room:${group.room}`, person: null, source: 'whatsapp', kind: 'room_hot', room: group.room, label: `🔥 Diskusi aktif · ${group.name}`, until: t + 10 * MIN, meta: { group: p.chat_id, people: [...talkers] } });results.roomHot = group.room; }
    // First matching keyword rule becomes an intent with a time limit.
    for (const rule of settings.get('rules')) {
      if (!rule.enabled || !text) continue;
      let re;try { re = new RegExp(rule.pattern, 'i'); } catch { continue; }
      if (!re.test(text)) continue;
      const until = rule.minutes === 'endOfDay' ? endOfDayWib(t) : t + rule.minutes * MIN;
      events.put({ ...base, id: `wa:intent:${person}`, kind: rule.kind, place: rule.place, room: rule.room ?? group.room, label: rule.label, until, ref: rule.id });
      results.intent = rule.id;break;
    }
    return results;
  }
  return { handle, unmapped: () => [...unmapped.values()].reverse(), get lastEventAt() { return lastEventAt; } };
}
