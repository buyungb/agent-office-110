"""Shared helpers for the promo scripts: launching Chromium (software or GPU) and finding ffmpeg."""
import shutil, sys
from pathlib import Path


def launch(pw, gpu=False):
    """Software WebGL (SwiftShader) works everywhere; --gpu uses the machine's graphics card and is much faster."""
    if not gpu:
        return pw.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    angle = {'darwin': 'metal', 'win32': 'd3d11'}.get(sys.platform, 'vulkan')
    # The full Chromium build (not the headless shell) can reach the GPU in headless mode.
    try:
        return pw.chromium.launch(channel='chromium', args=['--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', f'--use-angle={angle}', '--enable-unsafe-swiftshader'])
    except Exception as error:  # missing system libraries or no GPU: render in software instead of failing
        print(f'  --gpu unavailable ({str(error).splitlines()[0][:120]}); falling back to software rendering', flush=True)
        return launch(pw, gpu=False)


def renderer(page):
    """Which WebGL renderer the page got, to confirm --gpu took effect."""
    return page.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl');const d=g&&g.getExtension('WEBGL_debug_renderer_info');return d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):'unknown';})()")


def default_ffmpeg():
    local = Path.home() / '.local/share/promo-tools/ffmpeg'
    return str(local) if local.exists() else (shutil.which('ffmpeg') or 'ffmpeg')
