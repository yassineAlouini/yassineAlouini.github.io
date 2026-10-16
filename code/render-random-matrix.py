"""Export Wigner-to-semicircle GIF: python3 code/render-random-matrix.py.

Authoring dependencies: NumPy, Pillow, Playwright and Playwright Chromium.
"""
import base64
import io
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SIZES = (16, 24, 40, 64, 96, 160, 256, 384, 512)
FRAME_COUNT = 72

def spectral_stages():
    rng = np.random.default_rng(731)
    g = rng.standard_normal((max(SIZES), max(SIZES)))
    stages = []
    for stage, n in enumerate(SIZES):
        # GOE/Wigner normalization: off-diagonal variance 1/n, diagonal 2/n.
        w = (g[:n,:n] + g[:n,:n].T) / np.sqrt(2*n)
        eigenvalues = np.linalg.eigvalsh(w)
        counts, edges = np.histogram(eigenvalues, bins=40, range=(-2.4,2.4))
        density = counts / (n * np.diff(edges))
        stages.append(dict(n=n, stage=stage, density=density.tolist(),
                           corner=(w[:12,:12]*np.sqrt(n)).tolist()))
    return stages

def main():
    stages = spectral_stages()
    frames = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content('<canvas width="192" height="132"></canvas>')
        page.add_script_tag(path=str(ROOT / "code/random-matrix-renderer.js"))
        colors = page.evaluate("window.MATRIX_PALETTE")
        rgb = [int(c[i:i+2],16) for c in colors for i in (1,3,5)]
        palette = Image.new("P", (1,1))
        palette.putpalette(rgb + rgb[:3] * (256-len(colors)))
        for index in range(FRAME_COUNT):
            # Grow N, hold the limiting picture, then restart the experiment.
            stage = min(len(stages)-1, index//6)
            data = page.evaluate("""([t,stage]) => {
                drawRandomMatrix(t,stage);
                return document.querySelector('canvas').toDataURL().split(',')[1];
            }""", [index/FRAME_COUNT, stages[stage]])
            native = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
            frame = native.resize((384,264), Image.Resampling.NEAREST)
            frames.append(frame.quantize(palette=palette,dither=Image.Dither.NONE))
        browser.close()
    frames[60].save(ROOT / "assets/random-matrix.png")
    output = ROOT / "assets/random-matrix.gif"
    frames[0].save(output, save_all=True, append_images=frames[1:],
                   duration=100, loop=0, optimize=True, disposal=1)
    print(f"Wrote {output}: 384×264, 7.2 seconds, {output.stat().st_size:,} bytes")

if __name__ == "__main__":
    main()
