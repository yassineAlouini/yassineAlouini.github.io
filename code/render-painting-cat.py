"""Generate the Sketchbook's pixel-art GIF and still with Pillow.

Run: python3 code/render-painting-cat.py
The website itself has no Pillow or build-time dependency.
"""
from math import sin, tau
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PALETTE = ["#ffffff", "#193653", "#526276", "#91a0af", "#d2d8de", "#eef0f1",
           "#b69a70", "#745020", "#f6efdf", "#a8c3ce", "#547e98", "#7e8c64", "#c5a46e", "#b57052"]


def draw_frame(frame):
    im = Image.new("RGB", (128, 96), PALETTE[0])
    d = ImageDraw.Draw(im)
    navy, grey, light, ochre, wood = PALETTE[1], PALETTE[3], PALETTE[4], PALETTE[6], PALETTE[7]
    # Quiet ground shadow and a timber easel.
    d.rectangle((18, 85, 110, 87), fill=PALETTE[5])
    d.polygon([(88, 17), (91, 17), (107, 84), (103, 84)], fill=wood)
    d.polygon([(84, 17), (88, 17), (76, 84), (72, 84)], fill=wood)
    d.rectangle((79, 64, 103, 67), fill=navy)
    d.rectangle((79, 63, 103, 64), fill=ochre)
    d.rectangle((73, 22, 110, 61), fill=navy)
    d.rectangle((75, 24, 108, 59), fill=ochre)
    d.rectangle((77, 26, 106, 57), fill=PALETTE[8])
    # A tiny coastline on the canvas; brush strokes grow and reset each cycle.
    d.rectangle((80, 42, 103, 53), fill=PALETTE[9])
    d.polygon([(80, 44), (89, 39), (97, 43), (103, 43), (103, 46), (80, 46)], fill=PALETTE[12])
    d.rectangle((85, 36, 89, 42), fill=PALETTE[8])
    d.polygon([(84, 36), (87, 33), (91, 36)], fill=PALETTE[13])
    progress = frame % 32
    for x in range(80, 80 + min(24, progress)):
        y = 49 + (1 if x % 9 > 4 else 0)
        d.rectangle((x, y, x, y + 1), fill=PALETTE[10])
    # Curled tail: pixel steps, without anti-aliasing.
    wag = round(2 * sin(tau * frame / 32))
    d.line([(35, 76), (25, 76), (21, 72), (21, 62 + wag), (24, 59 + wag), (29, 59 + wag)], fill=navy, width=7)
    d.line([(35, 75), (25, 75), (23, 71), (23, 63 + wag), (25, 61 + wag), (29, 61 + wag)], fill=grey, width=3)
    # Cat silhouette, apron, feet.
    d.polygon([(38, 49), (53, 49), (60, 58), (61, 78), (55, 84), (34, 84), (31, 78), (33, 59)], fill=navy)
    d.polygon([(38, 51), (52, 51), (57, 59), (58, 78), (54, 81), (36, 81), (34, 77), (36, 59)], fill=grey)
    d.rectangle((34, 81, 44, 85), fill=navy)
    d.rectangle((49, 81, 60, 85), fill=navy)
    d.rectangle((36, 81, 42, 83), fill=light)
    d.rectangle((51, 81, 58, 83), fill=light)
    d.polygon([(43, 52), (53, 54), (55, 61), (56, 77), (40, 77), (40, 61)], fill=ochre)
    d.rectangle((42, 68, 52, 73), fill=wood)
    d.rectangle((44, 68, 51, 69), fill=PALETTE[8])
    # Pointed ears and expressive face in three greys.
    d.polygon([(32, 39), (33, 23), (42, 29), (52, 28), (59, 23), (62, 39), (59, 49), (52, 54), (39, 52), (32, 45)], fill=navy)
    d.polygon([(35, 38), (35, 28), (42, 33), (53, 32), (57, 28), (59, 38), (57, 46), (51, 51), (40, 49), (35, 44)], fill=grey)
    d.polygon([(36, 29), (36, 35), (40, 33)], fill=PALETTE[8])
    d.polygon([(57, 29), (54, 33), (57, 35)], fill=PALETTE[8])
    d.rectangle((45, 34, 47, 37), fill=navy)
    d.rectangle((49, 33, 51, 36), fill=navy)
    d.rectangle((43, 43, 56, 47), fill=light)
    if frame % 32 in (24, 25):
        d.line((41, 40, 44, 40), fill=navy)
        d.line((52, 39, 55, 39), fill=navy)
    else:
        d.rectangle((42, 38, 44, 41), fill=navy)
        d.rectangle((53, 37, 55, 40), fill=navy)
        d.point((43, 38), fill=PALETTE[0])
        d.point((54, 37), fill=PALETTE[0])
    d.rectangle((49, 43, 51, 44), fill=wood)
    d.line((50, 45, 50, 47), fill=navy)
    d.line((34, 43, 40, 44), fill=navy)
    d.line((35, 47, 40, 46), fill=navy)
    # Palette held in the near paw.
    d.polygon([(54, 61), (67, 59), (71, 63), (69, 70), (56, 71), (52, 67)], fill=navy)
    d.polygon([(55, 63), (66, 61), (69, 64), (67, 68), (56, 69), (54, 66)], fill=PALETTE[8])
    for x, y, color in [(58, 64, PALETTE[11]), (63, 63, PALETTE[12]), (66, 66, PALETTE[10])]:
        d.rectangle((x, y, x + 2, y + 2), fill=color)
    # Far paw paints in a gentle, looping arc.
    tip_y = 43 + round(4 * sin(tau * frame / 32))
    d.line([(55, 56), (63, 53), (71, tip_y + 8)], fill=navy, width=7)
    d.line([(56, 55), (64, 52), (71, tip_y + 8)], fill=light, width=3)
    d.line([(70, tip_y + 10), (82, tip_y)], fill=wood, width=2)
    d.rectangle((81, tip_y - 1, 84, tip_y + 1), fill=PALETTE[10])
    return im.resize((256, 192), Image.Resampling.NEAREST)


def main():
    frames = [draw_frame(frame) for frame in range(32)]
    frames[0].save(ROOT / "assets/painting-cat.png")
    palette = Image.new("P", (1, 1))
    rgb = [int(h[i:i + 2], 16) for h in PALETTE for i in (1, 3, 5)]
    palette.putpalette(rgb + [255, 255, 255] * (256 - len(PALETTE)))
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    target = ROOT / "assets/painting-cat.gif"
    indexed[0].save(target, save_all=True, append_images=indexed[1:], duration=100,
                    loop=0, optimize=True, disposal=1)
    print(f"Wrote {target}: 32 frames, 3.2 seconds, {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
