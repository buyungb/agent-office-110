// Live activity events: kept in memory for speed, mirrored to SQLite so a restart keeps what is still active.
// put(e, {persist:false}) keeps an event (e.g. a chat bubble with message text) out of the database entirely.
export function createEvents({ db, broadcast, retentionHours = () => 24, now = () => Date.now() }) {
  const live = new Map(db.activeEvents(now()).map(e => [e.id, e]));
  function put(e, { persist = true } = {}) {
    const ev = { start: now(), meta: {}, ...e };
    if (!ev.id || !ev.source || !ev.kind || !(ev.until > ev.start)) throw new Error('event needs id, source, kind and until > start');
    live.set(ev.id, ev);if (persist) db.upsertEvent(ev);broadcast('activity', ev);return ev;
  }
  function remove(id) { if (!live.delete(id)) return false; db.deleteEvent(id); broadcast('remove', { id }); return true; }
  function sweep() {
    const t = now();
    for (const [id, e] of live) if (e.until <= t) { live.delete(id); broadcast('remove', { id }); }
    const keep = retentionHours() * 3_600_000;
    db.purge(t - keep, t - 30 * 86_400_000);
  }
  const timer = setInterval(sweep, 5_000);timer.unref();
  return { put, remove, sweep, list: () => [...live.values()], get: id => live.get(id), stop: () => clearInterval(timer) };
}
