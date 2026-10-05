"""Rebuild the homepage GIF and still: python3 code/render-fusion-reactor.py.

Requires Pillow, Playwright, and Playwright's Chromium browser.
The normal site build does not require these tools.
"""
import base64
import io
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
frames = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content('<canvas id="fusion-reactor" width="320" height="220"></canvas>')
    page.add_script_tag(path=str(ROOT / "code/fusion-reactor-renderer.js"))
    palette_hex = page.evaluate("window.REACTOR_PALETTE")
    for frame in range(45):
        data = page.evaluate("""time => {
            window.drawFusionReactor(time);
            return document.querySelector('canvas').toDataURL().split(',')[1];
        }""", frame * 0.08)
        frames.append(Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB"))
    browser.close()

frames[0].save(ROOT / "assets/fusion-reactor.png")
# The renderer only ever writes its own palette (greys + plasma), so quantising to exactly
# those colours is lossless and keeps every frame on the same palette, without dithering.
rgb = [int(h[i:i + 2], 16) for h in palette_hex for i in (1, 3, 5)]
palette = Image.new("P", (1, 1)); palette.putpalette(rgb + rgb[:3] * (256 - len(palette_hex)))
frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
output = ROOT / "assets/fusion-reactor.gif"
frames[0].save(output, save_all=True, append_images=frames[1:],
               duration=80, loop=0, optimize=True, disposal=1)
print(f"Wrote {output}: {len(frames)} frames, 3.6 seconds, {output.stat().st_size:,} bytes")
