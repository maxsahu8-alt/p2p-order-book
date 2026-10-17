from playwright.sync_api import sync_playwright
import json,time,os
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
fails=0
def chk(n,c):
    global fails
    print(("PASS " if c else "FAIL ")+n)
    if not c: fails+=1
now=int(time.time()*1000);D=864e5
B=[{"id":"B1","kind":"bank","name":"Sbi bank","accNo":"XXXX4521","type":"Bank","opening":184000,"time":now-30*D,"limits":{"UPI":100000},"lite":{"on":True,"bal":1150}},
{"id":"B2","kind":"bank","name":"Axis bank","accNo":"XXXX7410","type":"Bank","opening":52000,"time":now-30*D},
{"id":"B3","kind":"bank","name":"Icici bank","accNo":"XXXX0021","type":"Bank","opening":3200,"time":now-30*D,"status":"frozen"},
{"id":"B4","kind":"bank","name":"Cash","type":"Cash","opening":12000,"time":now-30*D}]
recs=[{"id":"S","kind":"setting","stock":{}}]+B
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    pg.goto('file://'+APP);pg.wait_for_timeout(1200)
    pg.click('nav >> text=Wallet');pg.wait_for_timeout(700)
    chk("filter chips shown",pg.evaluate("document.querySelectorAll('#bankFilter [data-bf]').length")==4)
    pg.click('#bankFilter [data-bf=issue]');pg.wait_for_timeout(400)
    chk("Frozen/paused filter shows one bank",pg.evaluate("document.querySelectorAll('#bankList .bank').length")==1)
    pg.click('#bankFilter [data-bf=all]');pg.wait_for_timeout(300)
    chk("Cash row has no extra tags",pg.evaluate("[...document.querySelectorAll('#bankList .bank')].pop().querySelectorAll('.cpb,.mtag').length")==0)
    pg.click('#wEye');pg.wait_for_timeout(300)
    chk("wallet eye hides amounts",pg.evaluate("document.body.classList.contains('hide-amt')"))
    pg.click('#wEye');pg.wait_for_timeout(200)
    chk("USDT stock card asks for opening stock",pg.evaluate("!!document.querySelector('#stockCards [data-sheet=stock]')"))
    chk("Balance by bank is collapsed",pg.evaluate("!document.querySelector('details.wcoll').open"))
    pg.locator('#bankList .bank').nth(1).scroll_into_view_if_needed();pg.wait_for_timeout(300)
    r=pg.locator('#bankList .bank').nth(1).bounding_box()
    pg.mouse.move(r['x']+100,r['y']+30);pg.mouse.down();pg.wait_for_timeout(750);pg.mouse.up();pg.wait_for_timeout(500)
    chk("hold a bank opens quick actions",pg.evaluate("[...document.querySelectorAll('.qab')].length")>=3)
    pg.click('.qab[data-q=pause]');pg.wait_for_timeout(700)
    chk("quick action pauses the bank",pg.evaluate("banks.find(b=>b.id==='B2').status")=="paused")
    pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    chk("no page errors",not errs)
print("RESULT","OK" if not fails else "FAILS")
