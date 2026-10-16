"""Verify lossless assets and browser format/motion selection.

python3 code/check-web-assets.py http://localhost:8771
Requires Pillow, Playwright Chromium and Firefox (authoring only).
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8771').rstrip('/')


def main():
    with Image.open(ROOT/'assets/random-matrix.gif') as gif, Image.open(ROOT/'assets/random-matrix.webp') as webp:
        assert gif.size==webp.size and gif.n_frames==webp.n_frames
        totals=[0,0]
        for i in range(gif.n_frames):
            gif.seek(i);webp.seek(i);gif.load();webp.load()
            assert ImageChops.difference(gif.convert('RGB'),webp.convert('RGB')).getbbox() is None,i
            totals[0]+=gif.info['duration'];totals[1]+=webp.info['duration']
        assert totals==[7200,7200] and gif.info['loop']==webp.info['loop']==0
    with Image.open(ROOT/'assets/kaggle.ico') as ico, Image.open(ROOT/'assets/kaggle.png') as png:
        assert ico.size==png.size
        assert list(ico.convert('RGBA').getdata())==list(png.convert('RGBA').getdata())
    print('Every animation pixel, frame, timing and loop preserved; official icon pixels unchanged.',flush=True)
    with sync_playwright() as p:
        for engine in [p.chromium,p.firefox]:
            browser=engine.launch()
            for width in [1280,390]:
                page=browser.new_page(viewport={'width':width,'height':900})
                requested=[];errors=[]
                page.on('request',lambda req:requested.append(req.url))
                page.on('pageerror',lambda err:errors.append(str(err)))
                page.goto(BASE,wait_until='networkidle')
                matrix=page.locator('#random-matrix');reactor=page.locator('#fusion-reactor')
                assert matrix.evaluate('e=>e.currentSrc.endsWith("random-matrix.webp")&&e.complete')
                assert reactor.evaluate('e=>e.currentSrc.endsWith("fusion-reactor.gif")&&e.complete')
                assert sum('random-matrix.webp' in u for u in requested)==1,requested
                assert sum('fusion-reactor.gif' in u for u in requested)==1,requested
                assert not any(u.endswith(('random-matrix.gif','random-matrix.png','fusion-reactor.png')) for u in requested),requested
                assert page.locator('link[rel="icon"]').get_attribute('href')=='/assets/favicon.svg'
                page.emulate_media(reduced_motion='reduce')
                for img in [matrix,reactor]:
                    page.wait_for_function('e=>e.currentSrc.endsWith(".png")&&e.complete',arg=img.element_handle())
                page.emulate_media(reduced_motion='no-preference')
                page.wait_for_function('e=>e.currentSrc.endsWith(".webp")',arg=matrix.element_handle())
                # Both animation source formats must pause together offscreen.
                page.set_viewport_size({'width':width,'height':100});page.evaluate('scrollTo(0,0)')
                page.wait_for_function("[...document.querySelectorAll('.matrix source')].every(e=>e.media==='not all')")
                matrix.scroll_into_view_if_needed()
                page.wait_for_function('e=>e.currentSrc.endsWith(".webp")',arg=matrix.element_handle())
                assert not errors,errors
                page.close()
                print(f'{engine.name} {width}px: one animated download per figure, reduced motion, offscreen pause/resume pass.',flush=True)
            page=browser.new_page(java_script_enabled=False,reduced_motion='reduce')
            page.goto(BASE,wait_until='networkidle')
            assert all(img.evaluate('e=>e.currentSrc.endsWith(".png")') for img in page.locator('.reactor img').all())
            browser.close()


if __name__=='__main__':
    main()
