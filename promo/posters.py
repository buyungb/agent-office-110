#!/usr/bin/env python3
"""Renders the OrangPinter posters: a clean office still per poster, then the poster template on top.

  python promo/posters.py             # all six
  python promo/posters.py p1 p3 --gpu # selected, using the graphics card
Needs the same static server and Playwright setup as capture.py.
"""
import argparse, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from browser import launch  # noqa: E402

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'out'
M = lambda h, m=0: h * 60 + m
# poster: (file, width, height, still: room, minute, camera angle, zoom factor, label mode)
POSTERS = {
    'p1': ('op-p1-hero.png', 1080, 1350, ('all', M(9, 6), .2, 1.25, 'off')),
    'p2': ('op-p2-whatsapp.png', 1080, 1350, ('trading', M(10, 42), .1, 1.0, 'name')),
    'p3': ('op-p3-paket.png', 1080, 1350, ('all', M(20, 30), .35, 1.15, 'off')),
    'p4': ('op-p4-launch-story.png', 1080, 1920, ('all', M(20, 30), .1, 1.45, 'off')),
    'p5': ('op-p5-demo-story.png', 1080, 1920, ('lobby', M(9, 30), .15, .95, 'name')),
    'p6': ('op-p6-square.png', 1080, 1080, ('all', M(9, 6), .3, 1.2, 'off')),
}


def still(pw, name, w, h, shot, args):
    room, minute, angle, factor, labels = shot
    browser = launch(pw, args.gpu)
    page = browser.new_page(viewport=dict(width=w // 2, height=h // 2), device_scale_factor=2)
    page.add_init_script('window.__promoConfig={"live":false};\n' + (ROOT / 'harness.js').read_text())
    page.goto(f'{args.base}/dist/?t=09:00&brand=orangpinter&promo&debug&dpr=2&mode=sim&labels={labels}')
    page.wait_for_function('window.__office && window.__office.people.length > 0 && !document.querySelector("#loading")', timeout=60000)
    page.evaluate('document.fonts.ready')
    r = page.evaluate(f"(() => {{ const r = __office.rooms['{room}']; return {{x: r.x, z: r.z, span: r.span}}; }})()")
    x, y, z, zoom = (0, 4, 0, .72 * factor) if room == 'all' else (r['x'], 2, r['z'], 86 / (r['span'] * 1.65) * factor)
    for _ in range(6):
        page.evaluate(f'__office.setMinute({minute});__office.setCamera({x},{y},{z},{zoom},{angle});__promo.step(1000/30);')
    path = OUT / f'still-{name}.jpg'
    page.screenshot(path=str(path), type='jpeg', quality=94, timeout=180000)
    browser.close()
    return path


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('posters', nargs='*', help='p1..p6 (default: all)')
    ap.add_argument('--base', default='http://localhost:4176')
    ap.add_argument('--gpu', action='store_true', help='render the office stills with the graphics card')
    args = ap.parse_args()
    names = args.posters or list(POSTERS)
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        for name in names:
            file, w, h, shot = POSTERS[name]
            bg = still(pw, name, w, h, shot, args)
            browser = pw.chromium.launch()
            page = browser.new_page(viewport=dict(width=w, height=h))
            page.goto(f'{args.base}/promo/posters/poster.html?p={name}&bg=../out/{bg.name}')
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT / file), clip=dict(x=0, y=0, width=w, height=h))
            browser.close()
            print(f'wrote {OUT / file}', flush=True)


if __name__ == '__main__':
    main()
