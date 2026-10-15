from playwright.sync_api import sync_playwright
fails=0
def chk(n,c):
    global fails
    print(("ok  " if c else "FAIL")+" "+n)
    if not c: fails+=1
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':800})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(3500)
    f=pg.locator('#aiFab')
    chk('green ok dot when nothing to flag','ok' in f.get_attribute('class'))
    # alert + bubble
    pg.evaluate("banks.push({id:'zz1',name:'Test Bank',type:'Savings',status:'frozen'})")
    pg.wait_for_timeout(7500)
    chk('red alert+warn','alert' in f.get_attribute('class') and 'warn' in f.get_attribute('class'))
    chk('bubble shown with text',pg.locator('.fabbub').count()==1 and 'Test Bank' in pg.locator('.fabbub').inner_text())
    pg.locator('.fabbub').click();pg.wait_for_timeout(500)
    chk('bubble tap opens Ask',pg.locator('.aipop.open').count()>0)
    pg.evaluate("closeAiPop()");pg.wait_for_timeout(400)
    pg.evaluate("banks.pop()")
    # single tap delayed but opens
    f.click();pg.wait_for_timeout(600);chk('single tap opens Ask',pg.locator('.aipop.open').count()>0)
    pg.evaluate("closeAiPop()");pg.wait_for_timeout(400)
    # double tap -> voice
    pg.evaluate("()=>{window.__v=0;window.voiceMode=function(){window.__v++}}")
    bx=f.bounding_box();cx=bx['x']+bx['width']/2;cy=bx['y']+bx['height']/2
    pg.mouse.click(cx,cy);pg.wait_for_timeout(90);pg.mouse.click(cx,cy);pg.wait_for_timeout(900)
    chk('double tap opens Ask and calls voice',pg.locator('.aipop.open').count()>0 and pg.evaluate("window.__v")==1)
    pg.evaluate("closeAiPop()");pg.wait_for_timeout(400)
    # happy on completed order
    pg.evaluate("orders.push({id:'t_new',status:'Completed',qty:1000,rate:95,time:Date.now(),side:'sell'})")
    pg.wait_for_timeout(1500);cl=f.get_attribute('class');chk('happy + big hop','happy' in cl and 'hopbig' in cl)
    pg.evaluate("orders.pop()")
    # long press menu
    bx=f.bounding_box();cx=bx['x']+bx['width']/2;cy=bx['y']+bx['height']/2
    pg.mouse.move(cx,cy);pg.mouse.down();pg.wait_for_timeout(800);pg.mouse.up();pg.wait_for_timeout(300)
    chk('long press opens menu',pg.locator('.fabmenu').count()==1)
    chk('long press did not open Ask',pg.locator('.aipop.open').count()==0)
    pg.fill('#fbName','Pexi');pg.click('[data-fb=name]');pg.wait_for_timeout(300)
    chk('name saved + header',pg.evaluate("localStorage.getItem('p2p_botname')")=='Pexi' and pg.locator('#apName').inner_text()=='Pexi')
    # snap
    bx=f.bounding_box();cx=bx['x']+bx['width']/2;cy=bx['y']+bx['height']/2
    pg.mouse.move(cx,cy);pg.mouse.down();pg.wait_for_timeout(700);pg.mouse.up();pg.wait_for_timeout(300)
    pg.click('[data-fb=snap]');pg.wait_for_timeout(500)
    pg.evaluate("window.__t=0");
    bx=f.bounding_box();pg.mouse.move(bx['x']+20,bx['y']+30);pg.mouse.down();pg.mouse.move(150,300,steps=6);pg.mouse.move(120,300,steps=2);pg.mouse.up();pg.wait_for_timeout(700)
    bb=f.bounding_box();chk('snapped to left edge',bb['x']<=6)
    # reset
    pg.evaluate("fabReset()");pg.wait_for_timeout(200)
    chk('reset position',abs(f.bounding_box()['x']-328)<6)
    pg.evaluate("openAiPop()");pg.wait_for_timeout(500)
    pg.click('.apgrid [data-apq="usdt kitna bacha"]');pg.wait_for_timeout(1500)
    chk('welcome tile asks the question',pg.locator('#apMsgs .msg.u').count()>=1 and pg.locator('.apwelmsg').is_hidden())
    chk('chips visible after first question',pg.locator('#apChips').is_visible())
    chk('messages carry a time',bool(pg.locator('#apMsgs .msg.u').first.get_attribute('data-t')))
    chk('no page errors',not errs)
    print(errs)
    pg.evaluate("localStorage.removeItem('p2p_fabsnap');localStorage.removeItem('p2p_botname')")
print('FAILS',fails)
