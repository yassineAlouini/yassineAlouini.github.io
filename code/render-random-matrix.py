"""Export the homepage RMT GIF/still: python3 code/render-random-matrix.py.

Authoring dependencies: Pillow, Playwright and Playwright Chromium.
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
    page.set_content('<canvas width="96" height="64"></canvas>')
    page.add_script_tag(path=str(ROOT / "code/random-matrix-renderer.js"))
    colors = page.evaluate("window.MATRIX_PALETTE")
    rgb = [int(c[i:i+2],16) for c in colors for i in (1,3,5)]
    palette = Image.new("P", (1,1))
    palette.putpalette(rgb + rgb[:3] * (256-len(colors)))
    for index in range(36):
        data = page.evaluate("""t => {
            drawRandomMatrix(t);
            return document.querySelector('canvas').toDataURL().split(',')[1];
        }""", index/36)
        native = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
        # Match the reactor's 16:11 stage while retaining whole, crisp pixels.
        frame = Image.new("RGB", (384,264), "white")
        frame.paste(native.resize((384,256), Image.Resampling.NEAREST), (0,4))
        frames.append(frame.quantize(palette=palette,dither=Image.Dither.NONE))
    browser.close()
frames[9].save(ROOT / "assets/random-matrix.png")
output = ROOT / "assets/random-matrix.gif"
frames[0].save(output, save_all=True, append_images=frames[1:],
               duration=100, loop=0, optimize=True, disposal=1)
print(f"Wrote {output}: 384×264, 3.6 seconds, {output.stat().st_size:,} bytes")
