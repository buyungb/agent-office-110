# APLINDO — 3D AI Agent Office

A locally generated Three.js office campus for APLINDO (https://aplindo.tech), with Buyung Bahari (CEO), Muhammad (COO) and Anggit (CTO) and eleven AI agents who follow a daily timetable.

## Run

From this directory: `python3 -m http.server 4173 --directory dist`, then open http://localhost:4173.

No build or package install is needed. Three.js 0.160.0 and OrbitControls are vendored in `dist/vendor`. All models and textures are generated in the browser.

| File | Contents |
|---|---|
| `dist/team.js` | People (name, role, seat, coffee shift, lunch place, jobs) and the six SaaS products. Edit names and roles here. |
| `dist/schedule.js` | Daily timetable, seat assignment, simulation speed, WIB clock. Pure logic, no Three.js. |
| `dist/rooms.js` | Campus layout, furniture, room animations, corridors and the walking graph. |
| `dist/people.js` | Jointed person rig (1 unit = 1 m) with sitting, typing, coffee, walking and playing poses. |
| `dist/prayer.js` | Prayer postures and 2/3/4-rakaat step sequences. |
| `dist/nav.js` | Shortest corridor route between doors, sampled while walking. |
| `dist/app.js` | Renderer, camera, labels, HUD, popups and the frame loop. |

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

- `/tests/schedule-preview.html` — the full timetable, plus checks that every seat exists, no two people share a seat at once, every route enters and leaves rooms only through doors, and everyone reaches the Mushalla before iqamah.
- `/tests/prayer-preview.html` — prayer postures, step order (including the 4-rakaat sequence) and that no posture sinks below the mat.

Both pages set `document.body.dataset.tests` to `passed` or `failed`.

Pose and sequence reference: https://tarjih.muhammadiyah.or.id/cara-duduk-tahiyat-pada-shalat-dua-rakaat . This is a stylized visual animation, not a recitation or instructional prayer timer.

## Deploy (Dokploy)

Create a **Docker Compose** service in Dokploy pointing at this repo (compose path `./docker-compose.yml`). In the service's **Domains** tab, add your domain with service `web` and container port `80`. The image is nginx serving `dist/`, with a `/healthz` endpoint.
