# APLINDO — 3D AI Agent Office

A locally generated Three.js office campus for APLINDO (https://aplindo.tech), with Buyung Bahari (CEO), Muhammad (COO) and Anggit (CTO) and eleven AI agents who follow a daily timetable.

## Run

From this directory: `python3 -m http.server 4173 --directory dist`, then open http://localhost:4173.

No build or package install is needed. Three.js 0.160.0 and OrbitControls are vendored in `dist/vendor`. All models and textures are generated in the browser.

| File | Contents |
|---|---|
| `dist/team.js` | Default people and role catalog, desk seats, capacity rules (`validateTeam`), and the six SaaS products. With a bridge, people and roles are edited in ⚙️ → Tim instead. |
| `dist/schedule.js` | Daily timetable, seat assignment, simulation speed, WIB clock. Pure logic, no Three.js. |
| `dist/rooms.js` | Campus layout, furniture, room animations, corridors and the walking graph. |
| `dist/people.js` | Jointed person rig (1 unit = 1 m) with sitting, typing, coffee, walking and playing poses. |
| `dist/prayer.js` | Prayer postures and 2/3/4-rakaat step sequences. |
| `dist/nav.js` | Shortest corridor route between doors, sampled while walking. |
| `dist/app.js` | Renderer, camera, labels, HUD, popups and the frame loop. |
| `dist/live.js` | Live activity from the bridge (snapshot + Server-Sent Events). |
| `dist/settings.js` | ⚙️ settings drawer (admin login, WhatsApp QR, groups, people, rules, privacy). |
| `bridge/` | Integration service (see Live mode below). |

## Rooms

Lobby APLINDO, Ruang Direksi, AI Lab, Product Studio, War Room, Compliance Lab (Patuh.ai), Data Center, Pantry & Coffee Bar, Mushalla, Sport Hall, Tambang SaaS and Taman Inovasi. Each room has its own animation (neural hologram, product carousel and kanban, holographic meeting table, ISO shield and scanner, blinking racks, coffee steam and barista arm, and so on). Lighting follows the clock from day to night.

**Tambang SaaS** has one ore vein per product (ApartmentERP, SealRoute, SealRoute Sign, Patuh.ai, RTPintar, BlastifyX). Each sign shows a PnL figure; tap a sign for the product's description from aplindo.tech. PnL figures are sample data, not financial results.

## Timetable

Everyone arrives around 07:30, works at their desk, has coffee in two shifts (10:00 / 10:18 and 15:36 / 15:51), prays Dzuhur (iqamah 12:00) and Ashar (iqamah 15:20) together, takes lunch in the Pantry, Sport Hall or Lobby, joins the 14:00 War Room meeting where relevant, and walks back to the car park at about 17:00. Bima stays on call in the Data Center at night and on weekends. Prayer times are approximate for Jakarta.

People walk between rooms along the corridors and through door gaps. Prayers use four rakaat with tasyahud awal; Buyung leads as imam, men stand in the first row and women in white mukena in the back row.

- **Simulasi** (default): 07:20–17:30 runs in about 27 real minutes and the night in under 2. Desk work runs at 60×, the minutes when people walk slow to 10×, and the two prayers (about 3.5 minutes each) play in real time.
- **Jam nyata**: follows the current WIB time. The toolbar button switches mode; the choice is remembered in the browser.

## URL parameters

- `?t=12:00` or `?t=12:00:34` pins the simulated clock (useful for screenshots); add `&run` to let it continue from there.
- `?mode=real` starts in real WIB time.
- `?nav` draws the corridor graph and every seat.

## Controls

- Left/middle drag: pan. Right drag: orbit. Wheel: zoom.
- Touch: one finger to pan; two fingers to zoom and rotate.
- Arrow keys: pan. Toolbar: zoom, rotate, reset.
- Room buttons: smooth camera focus. Tap a person (label or body) for status, next activity and today's timetable.

The displayed metrics and activity are sample data, not a connection to live infrastructure.

## Tests

Serve the repository root (`python3 -m http.server 4175`) and open:

- `/tests/schedule-preview.html` — the full timetable, plus checks for both the default team and a full 26-person office: every seat exists, no two people share a seat at once, every route enters and leaves rooms only through doors, and everyone reaches the Mushalla before iqamah.
- `/tests/prayer-preview.html` — prayer postures, step order (including the 4-rakaat sequence) and that no posture sinks below the mat.

Both pages set `document.body.dataset.tests` to `passed` or `failed`.

Pose and sequence reference: https://tarjih.muhammadiyah.or.id/cara-duduk-tahiyat-pada-shalat-dua-rakaat . This is a stylized visual animation, not a recitation or instructional prayer timer.

## People and roles (⚙️ → Tim)

With a bridge deployed, admins manage the team inside the office:

- **People:** add, edit or remove. Fields: name, label, role, emoji, shirt colour, gender (prayer row and attire), hair or hijab colour, glasses, desk, coffee shift (or none), lunch place (Pantry, Sport Hall, Lobby or at the desk), the 14:00 meeting, night on-call, imam, and arrival offset. Jobs can be left empty to use the role's defaults.
- **Role catalog:** name, emoji, colour, default room and three default jobs. Renaming a role updates everyone who holds it. A role still in use cannot be deleted.
- **Rules:** checked both in the browser and in the bridge. There must be exactly one imam, and he must be male. Desks cannot be shared. Capacity: 26 desks, 15 men / 12 women in the Mushalla rows, 12 seats per coffee shift, Pantry 12 / Sport Hall 4 / Lobby 4 at lunch, and the War Room chairs left over after War Room desks for the meeting.
- **Changes apply live** for every viewer without a reload: newcomers walk in from the car park, and a changed desk means a walk to it. **Kembalikan default** restores the 14 people above.

## Live mode: WhatsApp groups (GOWA)

The office can show real activity from WhatsApp groups. Three services run in `docker-compose.yml`:

| Service | Role |
|---|---|
| `web` | nginx serving `dist/`, proxying `/api/` to the bridge (SSE-friendly) |
| `bridge` | `bridge/` — Node 24, no npm dependencies, SQLite (`node:sqlite`) in the `bridge-data` volume. Receives GOWA webhooks, keeps settings, streams activity to browsers at `/api/stream` |
| `gowa` | [go-whatsapp-web-multidevice](https://github.com/aldinokemal/go-whatsapp-web-multidevice) v9.5.0, private network only, session in the `gowa-data` volume |

**Dokploy → Environment** (all three are required for live mode):

```
ADMIN_PASSCODE=<passcode for the ⚙️ settings drawer>
WHATSAPP_WEBHOOK_SECRET=<long random string; signs GOWA → bridge webhooks>
GOWA_BASIC_AUTH=<user:password for the GOWA API>
```

Then, in the office:

1. Click **⚙️** → enter the passcode → **Koneksi** → **📷 Tampilkan QR**, and scan it with the office WhatsApp number (WhatsApp → Linked devices → Link a device). A pairing code works too.
2. After it connects, groups and members sync automatically. In **Grup WA**, tick the groups to read and pick the room each one lights up.
3. In **Orang**, accept the name-based suggestions (or type numbers) so senders map to people. WhatsApp often identifies group members by LID; sync fills it in.
4. Optionally adjust **Aturan** (keyword → activity) and **Privasi**.

How messages become activity:

- Typing → phone in hand and "✍️ Mengetik di <grup>"; a message → "💬 Chat di <grup>" for 2 minutes. Chat never moves anyone.
- A reply draws an arcing beam from the replier to the person replied to.
- Three or more people talking in a group within 10 minutes lights up that group's room ("🔥 Diskusi aktif").
- Keyword rules move people or set a status: `rapat sekarang` → War Room (30 min), `otw ngopi` → Pantry (15 min), `izin sakit` / `cuti` → away until end of day, `deploy prod` → status. Prayer times still win unless someone is on leave.
- Privacy defaults: message text is never stored and not shown (opt-in snippets), derived activity is kept 24 hours, numbers are masked in lists, and settings changes are written to an audit log.

The mode button cycles **⏩ Simulasi → 🕐 Jam nyata → 🟢 Live**. Without a bridge (plain static hosting) the office stays simulated and hides ⚙️. GOWA uses the unofficial WhatsApp Web protocol: use a dedicated number.

Bridge tests: `cd bridge && npm test` (Node 24; uses a fake GOWA). `?debug` exposes `window.__office` for browser checks.

Planned next: Google Workspace Calendar (free/busy), Jira Cloud webhooks, and AI agent task cards from Hermes (`hooks.outbound`) and the Claude Agent SDK.

## Deploy (Dokploy)

Create a **Docker Compose** service in Dokploy pointing at this repo (compose path `./docker-compose.yml`). In the service's **Domains** tab, add your domain with service `web` and container port `80`. The image is nginx serving `dist/`, with a `/healthz` endpoint.
