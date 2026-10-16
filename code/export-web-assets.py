"""Lossless browser assets: python3 code/export-web-assets.py (Pillow only).

The original GIF, PNG and official Kaggle ICO files remain available as sources
and fallbacks. No authoring dependencies are needed to serve the site.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'


def main():
    with Image.open(ASSETS / 'random-matrix.gif') as source:
        frames, durations = [], []
        for index in range(source.n_frames):
            source.seek(index)
            frames.append(source.convert('RGB'))
            durations.append(source.info['duration'])
    target = ASSETS / 'random-matrix.webp'
    frames[0].save(target, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, lossless=True, method=6)
    print(f'{target.name}: {target.stat().st_size:,} bytes (lossless)')

    # Keep the official mark's pixels; discard the ICO's extra resolutions.
    with Image.open(ASSETS / 'kaggle.ico') as source:
        source.convert('RGBA').save(ASSETS / 'kaggle.png', optimize=True)
    print(f'kaggle.png: {(ASSETS / "kaggle.png").stat().st_size:,} bytes')

    # A simple personal-site initial, with SVG and legacy ICO variants.
    points = [(16,13),(24,13),(32,28),(40,13),(48,13),(36,36),(36,51),(28,51),(28,36)]
    path = 'M' + ' '.join(f'{x},{y}' for x,y in points) + 'Z'
    (ASSETS / 'favicon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<rect width="64" height="64" rx="12" fill="#193653"/>'
        f'<path d="{path}" fill="#fff"/></svg>\n')
    icon = Image.new('RGBA', (256,256))
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((0,0,255,255), radius=48, fill='#193653')
    draw.polygon([(x*4,y*4) for x,y in points], fill='white')
    icon.save(ROOT / 'favicon.ico', sizes=[(16,16),(32,32),(48,48)])


if __name__ == '__main__':
    main()
