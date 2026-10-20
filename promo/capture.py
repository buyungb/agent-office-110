#!/usr/bin/env python3
"""Renders the OrangPinter promo videos frame by frame and assembles MP4s for Reels/TikTok.

Needs: a static server for the repo root (python -m http.server 4176), Playwright Chromium, and an ffmpeg
with libx264 (found on PATH, or pass --ffmpeg). Add --gpu on a laptop/PC to render with its graphics card.

  python3 promo/capture.py v1 v2            # render selected videos
  python3 promo/capture.py all --fps 30     # everything
  python3 promo/capture.py v3 --preview 5   # every 5th frame only, for a quick look

Frames are rendered on a virtual clock (promo/harness.js), so motion is smooth at any render speed.
"""
import argparse, json, math, shutil, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from scenes import SCENES  # noqa: E402
from browser import launch, renderer, default_ffmpeg  # noqa: E402

BRAND = json.loads((ROOT / 'brand.json').read_text())
VIEW = dict(width=540, height=960)  # x2 device scale = 1080x1920
OVERVIEW = dict(x=0, y=4, z=0, zoom=.72 * 1.45)  # portrait: fill the frame with the campus


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


def track(keys, t, value):
    """Interpolates a keyframe list [(t, ...), ...] with smoothstep easing between neighbours."""
    if t <= keys[0][0]:
        return value(keys[0])
    for a, b in zip(keys, keys[1:]):
        if t <= b[0]:
            u = smooth((t - a[0]) / (b[0] - a[0]))
            va, vb = value(a), value(b)
            return tuple(lerp(x, y, u) for x, y in zip(va, vb)) if isinstance(va, tuple) else lerp(va, vb, u)
    return value(keys[-1])


def linear(keys, t):
    if t <= keys[0][0]:
        return keys[0][1]
    for a, b in zip(keys, keys[1:]):
        if t <= b[0]:
            return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0]))
    return keys[-1][1]


def fade(t, start, end, edge=.25):
    return max(0.0, min(1.0, (t - start) / edge, (end - t) / edge))


def render(name, scene, args, pw):
    out = ROOT / 'out'
    frames = out / f'frames-{name}'
    if args.encode_only:
        return encode(name, scene, args, frames, time.time())
    shutil.rmtree(frames, ignore_errors=True)
    frames.mkdir(parents=True)
    cfg = dict(live=scene['live'], brandColor=BRAND['color'], brandName=BRAND['name'], brandMark=BRAND['mark'],
               tagline=BRAND['tagline'], handle=BRAND['handle'], by=BRAND['by'])
    browser = launch(pw, args.gpu)
    page = browser.new_page(viewport=VIEW, device_scale_factor=2)
    page.on('pageerror', lambda e: print(f'  [pageerror] {e}', flush=True))
    page.add_init_script(f'window.__promoConfig={json.dumps(cfg)};\n' + (ROOT / 'harness.js').read_text())
    url = f"{args.base}/dist/?{scene['query']}&brand={BRAND['id']}&promo&debug&dpr=2" + ('&mode=live' if scene['live'] else '&mode=sim')
    page.goto(url, wait_until='load')
    page.wait_for_function('window.__office && window.__office.people.length > 0 && !document.querySelector("#loading")', timeout=60000)
    page.evaluate('document.fonts.ready')
    print(f'  WebGL renderer: {renderer(page)}', flush=True)
    rooms = page.evaluate('Object.fromEntries(Object.entries(__office.rooms).map(([k, r]) => [k, {x: r.x, z: r.z, span: r.span}]))')
    if scene.get('travel'):
        page.evaluate(f"__office.setTravelSpeed({scene['travel']})")
    for _ in range(8):  # let resize observers, the first team snapshot and textures settle
        page.evaluate('__promo.step(1000/30)')

    def cam(key):
        _, room, angle, factor = key
        if room == 'all':
            return (OVERVIEW['x'], OVERVIEW['y'], OVERVIEW['z'], OVERVIEW['zoom'] * factor, angle)
        if isinstance(room, tuple):  # ('pt', x, z): a point between rooms, framed like a small room
            return (room[1], 2, room[2], 86 / (20 * 1.65) * factor, angle)
        r = rooms[room]
        return (r['x'], 2, r['z'], 86 / (r['span'] * 1.65) * factor, angle)

    fps, total = args.fps, int(scene['seconds'] * args.fps)
    actions = sorted(scene.get('actions', []), key=lambda a: a[0])
    done = 0
    started = time.time()
    for f in range(total):
        t = f / fps
        x, y, z, zoom, angle = track(scene['camera'], t, cam)
        items = [dict(kind=k, text=txt, y=yy, opacity=round(fade(t, s, e), 3)) for s, e, k, txt, yy in scene.get('captions', []) if s - .3 <= t <= e + .3]
        if scene.get('hook') and t <= scene['hook'][1] + .3:
            s, e, txt = scene['hook']
            items.append(dict(kind='hook', text=txt, y=140, opacity=round(fade(t, s - .3, e), 3)))
        extras = {}
        if scene.get('clock'):
            m = linear(scene['minute'], t)
            extras['clock'] = f'{int(m // 60):02d}.{int(m % 60):02d}'
        chat = scene.get('chat')
        if chat and chat['start'] - .3 <= t <= chat['end'] + .3:
            op = fade(t, chat['start'], chat['end'])
            msgs = [dict(from_=w, text=txt, opacity=round(min(op, smooth((t - mt) / .3)), 3)) for mt, w, txt in chat['messages'] if t >= mt][-3:]
            extras['chat'] = dict(title=chat['title'], messages=[dict(**{'from': m['from_']}, text=m['text'], opacity=m['opacity']) for m in msgs])
        if t >= scene['end']:
            extras['end'] = dict(opacity=round(smooth((t - scene['end']) / .4), 3))
        js = [f"__office.setMinute({linear(scene['minute'], t):.5f});", f'__office.setCamera({x:.4f},{y:.4f},{z:.4f},{zoom:.5f},{angle:.5f});',
              f'__promo.overlay({json.dumps(items)},{json.dumps(extras)});']
        labels = [m for lt, m in scene.get('labels', [(0, 'name')]) if lt <= t][-1]
        js.append(f"document.querySelector('#labels').dataset.labels='{labels}';")
        while done < len(actions) and actions[done][0] <= t:
            js.append(actions[done][1])
            done += 1
        skip = args.preview and f % args.preview
        js.append('__promo.advance(1000/30);' if skip else '__promo.step(1000/30);')
        page.evaluate('(()=>{' + ''.join(js) + '})()')
        if skip:
            continue
        page.screenshot(path=str(frames / f'{f:05d}.jpg'), type='jpeg', quality=92, timeout=180000)
        if f % 30 == 0:
            el = time.time() - started
            print(f'  {name}: frame {f}/{total} · {el / max(f, 1):.2f} s/frame · ~{el / max(f, 1) * (total - f) / 60:.0f} min left', flush=True)
    browser.close()
    if args.preview:
        print(f'  preview frames in {frames}')
        return
    encode(name, scene, args, frames, started)


def encode(name, scene, args, frames, started):
    fps, total = args.fps, int(scene['seconds'] * args.fps)
    have = len(list(frames.glob('*.jpg'))) if frames.exists() else 0
    if have < total:
        sys.exit(f'  {name}: only {have}/{total} frames in {frames}; render it first')
    target = ROOT / 'out' / scene['file']
    cmd = [args.ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-framerate', str(fps), '-i', str(frames / '%05d.jpg'),
           '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-vf', 'scale=1080:1920:flags=lanczos:out_range=tv,format=yuv420p',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-threads', '2', '-x264-params', 'rc-lookahead=20', '-r', str(fps), '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', str(target)]
    subprocess.run(cmd, check=True)
    print(f'  wrote {target} in {(time.time() - started) / 60:.1f} min', flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('videos', nargs='+', help="scene ids (v1..v5) or 'all'")
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--base', default='http://localhost:4176')
    ap.add_argument('--preview', type=int, default=0, help='only save every Nth frame, no MP4')
    ap.add_argument('--encode-only', action='store_true', help='assemble the MP4 from frames already rendered')
    ap.add_argument('--ffmpeg', default=default_ffmpeg(), help='ffmpeg with libx264 (default: the one on PATH)')
    ap.add_argument('--gpu', action='store_true', help='render with the graphics card (much faster on a laptop/PC)')
    args = ap.parse_args()
    names = list(SCENES) if args.videos == ['all'] else args.videos
    with sync_playwright() as pw:
        for name in names:
            print(f'rendering {name}', flush=True)
            render(name, SCENES[name], args, pw)


if __name__ == '__main__':
    main()
