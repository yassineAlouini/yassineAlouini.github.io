"""Behavior checks against a running homepage preview.

python3 code/check-sidebar-cat.py http://localhost:8770
Requires Playwright Chromium and Firefox (authoring/verification only).
"""
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8770').rstrip('/')


def static_frame(page):
    return page.locator('#sidebar-cat').evaluate("e => e.toDataURL()")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width':1280,'height':900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.clock.install()
        page.goto(BASE, wait_until='networkidle')
        canvas = page.locator('#sidebar-cat')
        assert canvas.get_attribute('aria-hidden') == 'true'
        assert canvas.evaluate("e => getComputedStyle(e).pointerEvents") == 'none'
        # Exercise every autonomous scene with a controlled animation clock.
        scenes = [('ball',3000),('reactor',10000),('mouse',11000),('sections',10000),
                  ('matrix',10000),('book',8000),('groom',8000),('nap',7000)]
        for scene, elapsed in scenes:
            page.clock.run_for(elapsed)
            assert canvas.get_attribute('data-activity') == scene, scene
            print(f'{scene}: autonomous routine reached', flush=True)
        # The rest button actually stops canvas updates, then resumes play.
        button = page.locator('.cat-rest')
        button.click()
        page.clock.run_for(100)
        assert button.get_attribute('aria-pressed') == 'true'
        before = static_frame(page)
        page.clock.run_for(1000)
        assert static_frame(page) == before
        assert page.locator('.cat-curious').count() == 0
        button.click()
        page.clock.run_for(1000)
        assert button.get_attribute('aria-pressed') == 'false'
        assert static_frame(page) != before
        # A margin click rolls a ball; clicking the book still follows its link.
        page.mouse.click(1200,400)
        assert canvas.get_attribute('data-activity') == 'ball'
        book = page.locator('.book-link')
        target = book.get_attribute('href')
        page.route(target, lambda route: route.fulfill(body='Book destination'))
        book.click()
        assert page.url == target
        assert not errors, errors
        browser.close()

        # Responsive placement and live reduced-motion changes in both engines.
        for engine in [p.chromium,p.firefox]:
            browser = engine.launch()
            for width in [1280,1024,390,320]:
                page = browser.new_page(viewport={'width':width,'height':900})
                page.clock.install()
                page.goto(BASE, wait_until='networkidle')
                page.clock.run_for(300)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                assert page.locator('.book-link').is_visible()
                page.emulate_media(reduced_motion='reduce')
                page.clock.run_for(100)
                page.wait_for_function("document.querySelector('#sidebar-cat').dataset.activity === 'nap'")
                before = static_frame(page)
                page.clock.run_for(1000)
                assert static_frame(page) == before
                assert page.locator('.cat-curious').count() == 0
                page.set_viewport_size({'width':390,'height':700})
                page.clock.run_for(100)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.close()
                print(f'{engine.name} {width}px: responsive and reduced-motion checks pass', flush=True)
            page = browser.new_page(java_script_enabled=False)
            page.goto(BASE, wait_until='networkidle')
            assert page.locator('.cat-rest').is_hidden()
            assert page.locator('.book-link').is_visible()
            browser.close()


if __name__ == '__main__':
    main()
