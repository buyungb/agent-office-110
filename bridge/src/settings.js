// Settings live in SQLite as JSON per key. Defaults favour privacy: no message text, short retention.
export const DEFAULT_RULES = [
  { id: 'meeting', enabled: true, pattern: '\\b(rapat|meeting|meet)\\b.{0,20}\\b(sekarang|skrg|now|mulai|dimulai)\\b|\\bkumpul di war ?room\\b', kind: 'intent', place: 'meeting', room: 'meeting', label: '📊 Rapat (dari WhatsApp)', minutes: 30 },
  { id: 'coffee', enabled: true, pattern: '\\b(otw|yuk|ayo|ayok)\\s+ngopi\\b|\\bngopi\\s+(yuk|dulu|kuy)\\b', kind: 'intent', place: 'pantry', room: 'gym', label: '☕ Ngopi (dari WhatsApp)', minutes: 15 },
  { id: 'leave', enabled: true, pattern: '\\b(izin|ijin)\\s+(sakit|cuti|tidak masuk|ga masuk|gak masuk|nggak masuk)\\b|\\bcuti hari ini\\b|\\bsick leave\\b', kind: 'leave', place: 'parking', room: null, label: '🏠 Izin / cuti hari ini', minutes: 'endOfDay' },
  { id: 'deploy', enabled: true, pattern: '\\bdeploy(ing)?\\s+(ke\\s+)?(prod|production)\\b|\\brilis\\s+(ke\\s+)?prod', kind: 'intent', place: null, room: 'dc', label: '🚀 Deploy ke production', minutes: 10 },
];
export const DEFAULT_PRIVACY = { showText: false, maskNumbers: true, retentionHours: 24 };
export const PLACES = ['meeting', 'pantry', 'parking', 'desk', null];

// team() returns the current (resolved) team; contact mappings exist only for people in it.
export function createSettings(db, team) {
  const people = () => { const saved = db.getSetting('people', {}); return Object.fromEntries(team().map(p => [p.id, { waPhone: '', waLid: '', email: '', ...saved[p.id] }])); };
  const get = key => {
    switch (key) {
      case 'people': return people();
      case 'groups': return db.getSetting('groups', {});
      case 'rules': return db.getSetting('rules', DEFAULT_RULES);
      case 'privacy': return { ...DEFAULT_PRIVACY, ...db.getSetting('privacy', {}) };
      case 'mode': return db.getSetting('mode', { default: 'live' });
      default: return db.getSetting(key, null);
    }
  };
  // Validates and stores a partial update; returns the list of changed keys.
  function update(patch) {
    const changed = [];
    if (patch.people) {
      const next = people();
      for (const [id, m] of Object.entries(patch.people)) {
        if (!next[id]) throw new Error(`orang tidak dikenal: ${id}`);
        next[id] = { waPhone: normalizePhone(m.waPhone ?? next[id].waPhone), waLid: String(m.waLid ?? next[id].waLid).trim(), email: String(m.email ?? next[id].email).trim().toLowerCase() };
      }
      db.setSetting('people', next);changed.push('people');
    }
    if (patch.groups) {
      const next = get('groups');
      for (const [jid, g] of Object.entries(patch.groups)) {
        if (!jid.endsWith('@g.us')) throw new Error(`bukan grup: ${jid}`);
        next[jid] = { name: String(g.name ?? next[jid]?.name ?? jid).slice(0, 80), enabled: Boolean(g.enabled), room: g.room || null };
      }
      db.setSetting('groups', next);changed.push('groups');
    }
    if (patch.rules) {
      if (!Array.isArray(patch.rules)) throw new Error('rules harus array');
      const rules = patch.rules.map((r, i) => {
        new RegExp(r.pattern, 'i');
        const minutes = r.minutes === 'endOfDay' ? 'endOfDay' : Math.max(1, Math.min(480, Number(r.minutes) || 15));
        return { id: String(r.id || `rule-${i}`), enabled: Boolean(r.enabled), pattern: String(r.pattern), kind: ['intent', 'leave'].includes(r.kind) ? r.kind : 'intent', place: PLACES.includes(r.place) ? r.place : null, room: r.room || null, label: String(r.label || '').slice(0, 60), minutes };
      });
      db.setSetting('rules', rules);changed.push('rules');
    }
    if (patch.privacy) {
      const p = { ...get('privacy'), ...patch.privacy };
      db.setSetting('privacy', { showText: Boolean(p.showText), maskNumbers: Boolean(p.maskNumbers), retentionHours: Math.max(1, Math.min(720, Number(p.retentionHours) || 24)) });changed.push('privacy');
    }
    if (patch.mode) { db.setSetting('mode', { default: patch.mode.default === 'sim' ? 'sim' : 'live' });changed.push('mode'); }
    return changed;
  }
  // Drops contact mappings of people who were removed from the team.
  function prunePeople() { db.setSetting('people', people()); }
  return { get, update, prunePeople };
}

// Indonesian numbers in any common form → 62xxxxxxxxx (digits only).
export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}
export const maskPhone = digits => digits ? `${digits.slice(0, 5)}•••${digits.slice(-3)}` : '';
