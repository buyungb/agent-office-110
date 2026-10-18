import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_MS = 12 * 3_600_000;
const sha = s => createHash('sha256').update(String(s)).digest();
export const safeEqual = (a, b) => timingSafeEqual(sha(a), sha(b));

// Admin = whoever knows ADMIN_PASSCODE. Sessions are random tokens in an HttpOnly, SameSite=Strict cookie.
export function createAuth(passcode) {
  const sessions = new Map(), attempts = new Map();
  function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
  function cookie(req) { const m = /(?:^|;\s*)office_admin=([a-f0-9]{64})/.exec(req.headers.cookie || ''); return m?.[1]; }
  function isAdmin(req) {
    const token = cookie(req), exp = token && sessions.get(token);
    if (!exp) return false;
    if (exp < Date.now()) { sessions.delete(token); return false; }
    return true;
  }
  function login(req, given) {
    if (!passcode) return { status: 503, error: 'ADMIN_PASSCODE belum diatur di environment bridge.' };
    const ip = clientIp(req), now = Date.now(), a = attempts.get(ip) || { n: 0, reset: now + 600_000 };
    if (a.reset < now) { a.n = 0; a.reset = now + 600_000; }
    if (a.n >= 5) return { status: 429, error: 'Terlalu banyak percobaan. Coba lagi 10 menit lagi.' };
    if (!safeEqual(given || '', passcode)) { a.n++; attempts.set(ip, a); return { status: 401, error: 'Passcode salah.' }; }
    attempts.delete(ip);
    const token = randomBytes(32).toString('hex');sessions.set(token, now + SESSION_MS);
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return { status: 200, cookie: `office_admin=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${SESSION_MS / 1000}${secure}` };
  }
  function logout(req) { sessions.delete(cookie(req)); return 'office_admin=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0'; }
  return { isAdmin, login, logout, enabled: Boolean(passcode) };
}
