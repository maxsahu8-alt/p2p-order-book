from playwright.sync_api import sync_playwright
fails=0
def chk(n,c):
    global fails
    print(("ok  " if c else "FAIL")+" "+n)
    if not c: fails+=1
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':800})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(2500)
    sc=lambda:pg.evaluate("(()=>{const m=getComputedStyle(document.querySelector('#aiPop .apbox')).transform;if(m==='none')return 1;const v=m.match(/matrix\\(([^)]+)\\)/);return v?parseFloat(v[1].split(',')[0]):1})()")
    # --- zoom out of the bot
    fb=pg.locator('#aiFab').bounding_box()
    pg.evaluate("openAiPop()");ss=[]
    for i in range(7):
        pg.wait_for_timeout(60);ss.append(round(sc(),2))
    pg.wait_for_timeout(500);fin=round(sc(),2);print(ss,fin)
    chk('opens by zooming up (several in-between sizes)',sum(1 for v in ss if .2<v<.97)>=2 and fin==1)
    ox=pg.evaluate("document.getElementById('aiPop').style.getPropertyValue('--ox')");chk('zoom starts at the bot',ox.endswith('px') and abs(float(ox[:-2])-(fb['x']+fb['width']/2-(390-min(390,520))/2))<2)
    chk('bot button tucked away while open','under' in pg.get_attribute('#aiFab','class'))
    # --- no keyboard by itself
    pg.wait_for_timeout(500)
    chk('keyboard is not opened automatically',pg.evaluate("document.activeElement&&document.activeElement.id")!='apIn')
    # --- background does not scroll
    pg.mouse.move(195,100);pg.mouse.wheel(0,400);pg.wait_for_timeout(250)
    chk('page behind does not scroll',pg.evaluate("scrollY")==0)
    # --- zoom back into the bot
    pg.evaluate("closeAiPop()");cs=[]
    for i in range(5):
        pg.wait_for_timeout(55);cs.append(round(sc(),2))
    print(cs)
    chk('closes by shrinking back',cs[0]<1 and cs[-1]<cs[0] and cs[-1]<.8)
    pg.wait_for_timeout(500)
    chk('hidden after closing',pg.evaluate("document.getElementById('aiPop').hidden"))
    chk('scroll unlocked after closing',not pg.evaluate("document.documentElement.classList.contains('aplock')"))
    chk('bot button comes back','under' not in pg.get_attribute('#aiFab','class'))
    pg.mouse.wheel(0,400);pg.wait_for_timeout(250);chk('page scrolls again',pg.evaluate("scrollY")>0)
    pg.evaluate("scrollTo(0,0)")
    # --- swipe down slides away
    pg.evaluate("openAiPop()");pg.wait_for_timeout(800)
    hb=pg.locator('#aiPop .aphead').bounding_box();x=hb['x']+hb['width']/2;y=hb['y']+12
    pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x,y+60,steps=4);pg.wait_for_timeout(80)
    mid=pg.evaluate("document.querySelector('#aiPop').style.getPropertyValue('--dy')");chk('follows the finger',mid.endswith('px') and float(mid[:-2])>30)
    pg.mouse.move(x,y+200,steps=4);pg.mouse.up();pg.wait_for_timeout(120)
    chk('swipe uses the slide-down exit',pg.evaluate("document.getElementById('aiPop').classList.contains('swipe')"))
    pg.wait_for_timeout(500);chk('swipe down closes it',pg.evaluate("document.getElementById('aiPop').hidden"))
    # --- short drag springs back
    pg.evaluate("openAiPop()");pg.wait_for_timeout(800)
    top0=pg.evaluate("document.querySelector('#aiPop .apbox').getBoundingClientRect().top")
    hb=pg.locator('#aiPop .aphead').bounding_box();x=hb['x']+hb['width']/2;y=hb['y']+12
    pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x,y+25,steps=2);pg.wait_for_timeout(250);pg.mouse.move(x,y+50,steps=2);pg.wait_for_timeout(250);pg.mouse.up();pg.wait_for_timeout(600)
    chk('short drag springs back',not pg.evaluate("document.getElementById('aiPop').hidden") and abs(pg.evaluate("document.querySelector('#aiPop .apbox').getBoundingClientRect().top")-top0)<2)
    pg.evaluate("closeAiPop()");pg.wait_for_timeout(500)
    # --- bot remembers its place (keyboard-sized resize, reload)
    bx=pg.locator('#aiFab').bounding_box();cx=bx['x']+bx['width']/2;cy=bx['y']+bx['height']/2
    pg.mouse.move(cx,cy);pg.mouse.down();pg.mouse.move(cx-120,cy-90,steps=6);pg.mouse.move(cx-140,cy-110,steps=2);pg.mouse.up();pg.wait_for_timeout(400)
    spot=pg.locator('#aiFab').bounding_box()
    pg.set_viewport_size({'width':390,'height':430});pg.wait_for_timeout(300)
    pg.set_viewport_size({'width':390,'height':800});pg.wait_for_timeout(400)
    after=pg.locator('#aiFab').bounding_box()
    chk('bot returns to its spot after the keyboard goes away',abs(after['x']-spot['x'])<2 and abs(after['y']-spot['y'])<2)
    pg.reload();pg.wait_for_timeout(2500)
    again=pg.locator('#aiFab').bounding_box()
    chk('bot keeps its spot after restart',abs(again['x']-spot['x'])<3 and abs(again['y']-spot['y'])<3)
    chk('no page errors',not errs);print(errs)
print('FAILS',fails)
