# OrangPinter promo kit

Renders the Reels/TikTok videos and posters for selling the office as **OrangPinter**, straight from the live 3D office.
Re-run it whenever the office changes; outputs go to `promo/out/` (not committed).

| Output | Size | Script |
|---|---|---|
| `op-v1-kantor-hidup.mp4` … `op-v5-sholat.mp4` | 1080×1920, 30 fps, H.264 + silent AAC | `capture.py` |
| `op-p1…p3-*.png` (feed), `op-p4/p5-*-story.png`, `op-p6-square.png` | 1080×1350 · 1080×1920 · 1080×1080 | `posters.py` |

## How it works

- `harness.js` is injected before the office loads:
  - **Virtual clock:** it replaces `requestAnimationFrame`, `performance.now` and `Date.now`, so each frame is exactly 1/30 s apart. Motion stays smooth even though the software renderer takes about 3 s per 1080×1920 frame.
  - **Fake bridge:** it stubs `/api/*` and `EventSource`, so Live mode, WhatsApp bubbles and the ⚙️ team editor run on **made-up demo data**.
  - **Overlay layer:** captions, the chat panel and the end card are drawn in the same page.
- `scenes.py` holds each video's timeline: camera keyframes per room, simulated minute, captions (inside the TikTok/IG safe zone), label mode, live events and UI actions.
- The office runs with `?brand=orangpinter&promo&debug&dpr=2`:
  - `promo` hides the HUD;
  - `debug` exposes `window.__office.setMinute / setCamera / setTravelSpeed`;
  - `dpr=2` renders a sharp canvas.

  None of these change the office without the parameters.
- `brand.json` holds the end-card name, colour, tagline and the placeholder handle `@orangpinter · orangpinter.id`. Edit it, and `dist/brand.js` for the in-office signage, before the real launch.

## Run on your own computer (recommended)

A laptop or PC renders much faster than a small server, especially with `--gpu`. No bridge, Docker or Node is needed.

**1. Install once**

| | Mac | Windows | Linux |
|---|---|---|---|
| Python 3.10+ | `brew install python` | [python.org](https://www.python.org/downloads/) (tick "Add to PATH") | usually installed |
| ffmpeg | `brew install ffmpeg` | `winget install ffmpeg` | `sudo apt install ffmpeg` |
| Playwright | `pip3 install playwright` then `python3 -m playwright install chromium` | `pip install playwright` then `python -m playwright install chromium` | same as Mac |

On Windows, type `python` where the steps below say `python3`.

**2. Render.** From the repository folder (after `git pull`):

```bash
# terminal 1 — keep running
python3 -m http.server 4176

# terminal 2
python3 promo/capture.py v2 --preview 15 --gpu   # quick check: every 15th frame as JPEG in promo/out/frames-v2
python3 promo/capture.py all --gpu               # the five MP4s
python3 promo/posters.py --gpu                   # the six PNGs
```

- **`--gpu`:** renders with the graphics card. If Chromium cannot reach a GPU, the script says so and falls back to software rendering (slower, same result). The first line of each video prints the WebGL renderer in use.
- **Re-assembling:** `--encode-only` rebuilds an MP4 from frames already in `promo/out/frames-<id>` without rendering again.
- **Fonts:** the office and posters load Fredoka/Nunito from Google Fonts, so stay online while rendering.
- **Output:** everything lands in `promo/out/`: `op-v1…v5-*.mp4` and `op-p1…p6-*.png`.

## Run on this dev server

The server has no system libraries for Chromium, so they were extracted locally; set this first:

```bash
export LD_LIBRARY_PATH=~/.local/share/browser-tools/root/usr/lib/x86_64-linux-gnu
PY=~/.local/share/browser-tools/venv/bin/python
$PY promo/capture.py all      # ~3 s per frame in software; long renders can be stopped when memory runs low
```

Add the trending audio inside TikTok/Instagram when posting; the files carry a silent track on purpose.
