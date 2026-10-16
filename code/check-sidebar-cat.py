"""Check cursor-following, idle sleep and plasma against a running preview.

python3 code/check-sidebar-cat.py http://localhost:8770
Requires Playwright Chromium and Firefox (verification only).
"""
import math
import sys
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8770').rstrip('/')


def static_frame(page):
    return page.locator('#sidebar-cat').evaluate('e => e.toDataURL()')


def position(canvas):
    return tuple(float(canvas.get_attribute('data-'+axis)) for axis in ['x','y'])


def main():
    with sync_playwright() as p:
        browser=p.chromium.launch()
        page=browser.new_page(viewport={'width':1280,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        # Deterministic burst timing for verification, without a production test mode.
        page.add_init_script('''Math.random=()=>0;
          window.plasmaColors=new Set();window.catClears=0;window.maxClearArea=0;
          const clear=CanvasRenderingContext2D.prototype.clearRect;
          CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){
            if(this.canvas.id==='sidebar-cat'){catClears++;maxClearArea=Math.max(maxClearArea,w*h);}
            return clear.call(this,x,y,w,h);
          };
          const stroke=CanvasRenderingContext2D.prototype.stroke;
          CanvasRenderingContext2D.prototype.stroke=function(...args){
            if(['#d4459a','#ff7ab8','#ffd6ea'].includes(this.strokeStyle))plasmaColors.add(this.strokeStyle);
            return stroke.apply(this,args);
          };''')
        page.clock.install()
        page.goto(BASE,wait_until='networkidle')
        canvas=page.locator('#sidebar-cat')
        page.clock.run_for(100)
        assert canvas.get_attribute('data-activity')=='nap'
        before=static_frame(page);clear_count=page.evaluate("catClears")
        page.clock.run_for(1000)
        assert static_frame(page)==before and page.evaluate("catClears")==clear_count
        assert canvas.evaluate("e=>getComputedStyle(e).pointerEvents")=='none'
        assert canvas.get_attribute('aria-hidden')=='true'

        # Follow actual pointer input and measure continuous progress toward it.
        start=position(canvas);target=(900,490)
        page.mouse.move(*target)
        samples=[start]
        for _ in range(18):
            page.clock.run_for(100);samples.append(position(canvas))
        assert math.dist(samples[-1],target)<math.dist(start,target)
        assert math.dist(samples[-1],target)<95
        assert all(math.dist(a,b)<35 for a,b in zip(samples,samples[1:]))
        assert sum(abs(b[0]-a[0])>.1 and abs(b[1]-a[1])>.1 for a,b in zip(samples,samples[1:]))>4
        print('Cursor following: continuous, diagonal movement toward pointer',flush=True)

        # Keep the mouse active until a random plasma trick occurs.
        burst_seen=False;charge_seen=False
        for i in range(50):
            page.mouse.move(950+(i%2)*30,400+(i%3)*10)
            page.clock.run_for(100)
            charge_seen|=canvas.get_attribute('data-charging')=='true'
            if canvas.get_attribute('data-beam')=='true':
                assert charge_seen, 'Burst fired before charge-up'
                burst_seen=True
        assert burst_seen and charge_seen
        assert int(canvas.get_attribute('data-shots'))>=1
        assert page.evaluate("['#d4459a','#ff7ab8','#ffd6ea'].every(c=>plasmaColors.has(c))")
        print('Charge-up precedes mouth beam; reactor palette drawn while pointer is active',flush=True)

        page.clock.run_for(5500)
        assert canvas.get_attribute('data-activity')=='nap'
        assert canvas.get_attribute('data-beam')=='false'
        before=static_frame(page);sleep_position=position(canvas);clear_count=page.evaluate("catClears")
        page.clock.run_for(1000)
        assert static_frame(page)==before and position(canvas)==sleep_position
        assert page.evaluate("catClears")==clear_count
        assert page.evaluate("maxClearArea")<1280*900*.25
        # Clicking the sleeping cat gives an affectionate reaction without a hit overlay.
        x,y=sleep_position;page.mouse.click(x,y-10);page.clock.run_for(100)
        assert canvas.get_attribute('data-petting')=='true'
        assert canvas.get_attribute('data-emotion')=='content'
        assert canvas.get_attribute('data-beam')=='false'
        page.screenshot(path='/tmp/cat-petted.png')
        page.clock.run_for(2000)
        page.locator('.cat-pet').focus();page.keyboard.press('Enter');page.clock.run_for(100)
        assert canvas.get_attribute('data-petting')=='true'
        page.clock.run_for(2000)
        page.mouse.move(700,300);page.clock.run_for(700)
        assert canvas.get_attribute('data-activity')=='follow'
        assert static_frame(page)!=before
        print('Idle sleep and pointer-driven wake verified',flush=True)

        button=page.locator('.cat-rest')
        button.click();page.clock.run_for(100)
        page.mouse.move(800,400);page.clock.run_for(1000)
        assert canvas.get_attribute('data-activity')=='nap'
        assert button.get_attribute('aria-pressed')=='true'
        button.click();page.mouse.move(600,300);page.clock.run_for(1000)
        assert canvas.get_attribute('data-activity')=='follow'
        book=page.locator('.book-link');url=book.get_attribute('href')
        page.route(url,lambda route:route.fulfill(body='Book destination'))
        book.click();assert page.url==url
        assert not errors,errors
        browser.close()

        browser=p.chromium.launch()
        page=browser.new_page(viewport={'width':1280,'height':900})
        page.add_init_script('Math.random=()=>.99')
        page.clock.install();page.goto(BASE,wait_until='networkidle')
        page.mouse.move(1000,500);page.clock.run_for(100)
        page.mouse.move(350,250);page.clock.run_for(120)
        assert page.locator('#sidebar-cat').get_attribute('data-trick')=='leap'
        page.screenshot(path='/tmp/cat-leaping.png')
        page.close()
        page=browser.new_page(viewport={'width':1280,'height':900})
        page.add_init_script('Math.random=()=>.99')
        page.clock.install();page.goto(BASE,wait_until='networkidle');page.clock.run_for(100)
        canvas=page.locator('#sidebar-cat');x,y=position(canvas);rolled=False
        for i in range(20):
            page.mouse.move(x-55+(i%2),y-30);page.clock.run_for(180)
            if canvas.get_attribute('data-trick')=='roll':
                rolled=True;page.clock.run_for(700);page.screenshot(path='/tmp/cat-back-roll.png');break
        assert rolled, 'Nearby slow cursor did not elicit a back-roll'
        browser.close()
        print('Mouse and keyboard petting, leaps, back-rolls, idle zero-redraw and partial clears pass',flush=True)

        for engine in [p.chromium,p.firefox]:
            browser=engine.launch()
            for width in [1280,1024,390,320]:
                page=browser.new_page(viewport={'width':width,'height':900})
                page.clock.install();page.goto(BASE,wait_until='networkidle')
                page.mouse.move(width*.6,330);page.clock.run_for(400)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.emulate_media(reduced_motion='reduce');page.clock.run_for(100)
                page.wait_for_function("document.querySelector('#sidebar-cat').dataset.activity==='nap'")
                before=static_frame(page)
                page.mouse.move(width*.3,400);page.clock.run_for(1000)
                assert static_frame(page)==before
                assert page.locator('#sidebar-cat').get_attribute('data-beam')=='false'
                assert page.locator('.book-link').is_visible()
                page.close()
                print(f'{engine.name} {width}px: layout, reduced-motion sleep and beam suppression pass',flush=True)
            page=browser.new_page(java_script_enabled=False)
            page.goto(BASE,wait_until='networkidle')
            assert page.locator('.cat-rest').is_hidden()
            assert page.locator('.book-link').is_visible()
            browser.close()


if __name__=='__main__':
    main()
