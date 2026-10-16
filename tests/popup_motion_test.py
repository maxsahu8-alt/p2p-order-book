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
    top=lambda:pg.evaluate("document.querySelector('#aiPop .apbox').getBoundingClientRect().top")
    pg.evaluate("openAiPop()")
    ys=[]
    for i in range(6):
        ys.append(top());pg.wait_for_timeout(70)
    pg.wait_for_timeout(500);final=top();ys.append(final)
    print([round(y) for y in ys])
    chk('starts below the screen',ys[0]>=700)
    chk('slides in gradually (several in-between frames)',sum(1 for y in ys[:6] if final+8<y<780)>=2)
    chk('ends at its resting place',abs(top()-final)<1 and final<500)
    chk('bot button tucked away while open','under' in pg.get_attribute('#aiFab','class'))
    # close animation
    pg.evaluate("closeAiPop()");ys=[]
    for i in range(4):
        pg.wait_for_timeout(50);ys.append(top())
    print([round(y) for y in ys])
    chk('slides down gradually',ys[0]>final+2 and ys[-1]>ys[0])
    pg.wait_for_timeout(500)
    chk('hidden after closing',pg.evaluate("document.getElementById('aiPop').hidden"))
    chk('bot button comes back','under' not in pg.get_attribute('#aiFab','class'))
    # reopen works, then swipe down closes
    pg.evaluate("openAiPop()");pg.wait_for_timeout(700)
    hb=pg.locator('#aiPop .aphead').bounding_box()
    x=hb['x']+hb['width']/2;y=hb['y']+12
    pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x,y+60,steps=4);pg.wait_for_timeout(80)
    mid=pg.evaluate("document.querySelector('#aiPop').style.getPropertyValue('--dy')");chk('follows the finger',mid.endswith('px') and float(mid[:-2])>30)
    pg.mouse.move(x,y+200,steps=4);pg.mouse.up();pg.wait_for_timeout(700)
    chk('swipe down closes it',pg.evaluate("document.getElementById('aiPop').hidden"))
    pg.evaluate("openAiPop()");pg.wait_for_timeout(700)
    hb=pg.locator('#aiPop .aphead').bounding_box();x=hb['x']+hb['width']/2;y=hb['y']+12
    pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x,y+25,steps=2);pg.wait_for_timeout(250);pg.mouse.move(x,y+50,steps=2);pg.wait_for_timeout(250);pg.mouse.up();pg.wait_for_timeout(600)
    chk('short drag springs back',not pg.evaluate("document.getElementById('aiPop').hidden") and abs(top()-final)<2)
    chk('no page errors',not errs);print(errs)
print('FAILS',fails)
