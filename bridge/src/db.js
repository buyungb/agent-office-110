import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// One SQLite file: JSON settings, derived activity events (never raw message text) and an audit log.
export function openDb(dir) {
  let file = ':memory:';
  if (dir !== ':memory:') { mkdirSync(dir, { recursive: true }); file = join(dir, 'office.db'); }
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, person TEXT, source TEXT, kind TEXT, label TEXT,
      place TEXT, room TEXT, start INTEGER, until INTEGER, ref TEXT, meta TEXT);
    CREATE INDEX IF NOT EXISTS events_until ON events(until);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at INTEGER, actor TEXT, action TEXT, detail TEXT);
  `);
  const q = {
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    setSetting: db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    upsertEvent: db.prepare(`INSERT INTO events (id, person, source, kind, label, place, room, start, until, ref, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET person = excluded.person, source = excluded.source,
      kind = excluded.kind, label = excluded.label, place = excluded.place, room = excluded.room, start = excluded.start,
      until = excluded.until, ref = excluded.ref, meta = excluded.meta`),
    deleteEvent: db.prepare('DELETE FROM events WHERE id = ?'),
    activeEvents: db.prepare('SELECT * FROM events WHERE until > ?'),
    purgeEvents: db.prepare('DELETE FROM events WHERE until < ?'),
    audit: db.prepare('INSERT INTO audit (at, actor, action, detail) VALUES (?, ?, ?, ?)'),
    recentAudit: db.prepare('SELECT at, actor, action, detail FROM audit ORDER BY id DESC LIMIT ?'),
    purgeAudit: db.prepare('DELETE FROM audit WHERE at < ?'),
  };
  return {
    getSetting(key, fallback) { const row = q.getSetting.get(key); return row ? JSON.parse(row.value) : fallback; },
    setSetting(key, value) { q.setSetting.run(key, JSON.stringify(value)); },
    upsertEvent(e) { q.upsertEvent.run(e.id, e.person ?? null, e.source, e.kind, e.label ?? null, e.place ?? null, e.room ?? null, e.start, e.until, e.ref ?? null, JSON.stringify(e.meta ?? {})); },
    deleteEvent(id) { q.deleteEvent.run(id); },
    activeEvents(now) { return q.activeEvents.all(now).map(r => ({ ...r, meta: JSON.parse(r.meta || '{}') })); },
    purge(before, auditBefore) { q.purgeEvents.run(before); q.purgeAudit.run(auditBefore); },
    audit(actor, action, detail = '') { q.audit.run(Date.now(), actor, action, detail); },
    recentAudit(n = 50) { return q.recentAudit.all(n); },
    close() { db.close(); },
  };
}
