"""Check shared navigation in Firefox and Chromium against a running preview.

Run: python3 code/check-navigation.py [http://localhost:8766]
Requires Playwright and its Firefox/Chromium browsers; not needed to serve the site.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8766").rstrip("/")
BLOG = Path(__file__).resolve().parents[2] / "blog"
PATHS = ["/", "/sketches/", "/blog/"] + [
    f"/blog/posts/{p.name}" for p in sorted((BLOG / "posts").glob("*.html"))
]
EXPECTED = [
    ["Home", "/"], ["Blog", "/blog/"], ["Sketchbook", "/sketches/"],
    ["GitHub", "https://github.com/yassineAlouini"],
]


async def main():
    async with async_playwright() as p:
        for engine in (p.firefox, p.chromium):
            browser = await engine.launch()
            page = await browser.new_page()
            stale_requests = []

            async def stale_stylesheet(route):
                # Simulate a browser retaining the old, unversioned layout CSS.
                stale_requests.append(route.request.url)
                await route.fulfill(content_type="text/css", body="body{max-width:1040px;margin:0 auto;padding:64px 24px 32px}")

            await page.route("**/style.css", stale_stylesheet)
            for width in (1280, 390, 320):
                await page.set_viewport_size({"width": width, "height": 900})
                reference = None
                for path in PATHS:
                    response = await page.goto(BASE + path, wait_until="domcontentloaded")
                    assert response.status in (200, 304), (path, response.status)
                    header = page.locator(".site-header")
                    assert await header.count() == 1, path
                    assert await header.locator("nav a").evaluate_all(
                        "els => els.map(a => [a.textContent, a.getAttribute('href')])"
                    ) == EXPECTED, path
                    assert await page.locator("link[href='/assets/site-navigation.css?v=1']").count() == 1
                    metrics = await header.evaluate("""e => {
                        const r = e.getBoundingClientRect(), s = getComputedStyle(e);
                        const n = e.querySelector('nav'), ns = getComputedStyle(n);
                        return [r.x,r.y,r.width,r.height,s.paddingBottom,s.borderBottomWidth,
                            ns.font,ns.gap,ns.flexWrap,getComputedStyle(e.querySelector('.site-home')).font,
                            [...n.querySelectorAll('a')].map(a => {const r=a.getBoundingClientRect();
                                return [r.x,r.y,r.width,r.height,getComputedStyle(a).font];})];
                    }""")
                    if reference is None:
                        reference = metrics
                    assert metrics == reference, (engine.name, width, path, metrics, reference)
                    assert await header.evaluate("e => e.getBoundingClientRect().right <= innerWidth"), path
                    current = header.locator("[aria-current]")
                    assert await current.count() == 1, path
                    expected = "/" if path == "/" else "/sketches/" if path == "/sketches/" else "/blog/"
                    assert await current.get_attribute("href") == expected, path
                print(f"{engine.name}: identical header geometry, fonts, links and active states on {len(PATHS)} pages at {width}px.")
            await page.goto(BASE + "/blog/", wait_until="domcontentloaded")
            nav = page.get_by_role("navigation", name="Main navigation")
            await nav.get_by_role("link", name="Sketchbook").click()
            assert page.url == BASE + "/sketches/"
            await page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="Home", exact=True).click()
            assert page.url == BASE + "/"
            assert not stale_requests, f"Reused unversioned stylesheets: {stale_requests}"
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
