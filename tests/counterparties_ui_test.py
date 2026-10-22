from playwright.sync_api import sync_playwright
import json,time
now=int(time.time()*1000)
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
R=[{"id":"S","kind":"setting"}]
def od(i,cp,st="Completed",qty=100,rate=95):
    R.append({"id":"O%d"%i,"side":"BUY","coin":"USDT","qty":qty,"rate":rate,"status":st,"platform":"KuCoin","time":now-i*1e5,"mode":"P2P","cp":cp})
od(1,"Nishita",qty=105);od(2,"MOCHI RAM MAHATO",qty=53)
for i in range(3,7):od(i,"Parvej khan",st="Cancelled" if i<5 else "Completed")
od(8,"Dheepak Raja");od(9,"Dheepak Raja")
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(R)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    pg.evaluate("sheets.cps()");pg.wait_for_timeout(400)
    chk("4 people listed",pg.evaluate("document.querySelectorAll('#cpl .cprow').length")==4)
    chk("single order says '1 order'",pg.evaluate("[...document.querySelectorAll('#cpl .cpm')].some(e=>/^1 order ·/.test(e.textContent))"))
    chk("plural for 2 orders",pg.evaluate("[...document.querySelectorAll('#cpl .cpm')].some(e=>/^2 orders ·/.test(e.textContent))"))
    chk("initials avatar",pg.evaluate("[...document.querySelectorAll('#cpl .cpav')].map(e=>e.textContent).includes('MM')"))
    chk("filter counts: All 4",pg.evaluate("document.querySelector('#cpf [data-f=all] i').textContent")=="4")
    chk("Parvej is risky (2 of 4 cancelled)",pg.evaluate("document.querySelector('#cpf [data-f=risk] i').textContent")=="1")
    pg.click("#cpf [data-f=risk]");pg.wait_for_timeout(150)
    chk("Risky filter shows 1 row",pg.evaluate("document.querySelectorAll('#cpl .cprow').length")==1)
    pg.click("#cpf [data-f=all]");pg.wait_for_timeout(150)
    pg.click("#cpl .tagbtns[data-n='Nishita'] [data-t=star]");pg.wait_for_timeout(400)
    chk("star tags Nishita and moves her up",pg.evaluate("document.querySelector('#cpl .cprow .cpn').textContent.startsWith('Nishita')"))
    chk("Trusted count 1",pg.evaluate("document.querySelector('#cpf [data-f=star] i').textContent")=="1")
    pg.click("#cpf [data-f=star]");pg.wait_for_timeout(150)
    chk("Trusted filter shows 1 row",pg.evaluate("document.querySelectorAll('#cpl .cprow').length")==1)
    pg.click("#cpf [data-f=block]");pg.wait_for_timeout(150)
    chk("Blocked filter empty message",pg.evaluate("!!document.querySelector('#cpl .empty')"))
    pg.click("#cpf [data-f=all]");pg.wait_for_timeout(150)
    pg.fill("#cpq","moch");pg.wait_for_timeout(150)
    chk("search works",pg.evaluate("document.querySelectorAll('#cpl .cprow').length")==1)
    pg.fill("#cpq","");pg.wait_for_timeout(150)
    pg.screenshot(path='/tmp/claude-0/-home-claude/9b72aef0-0d4a-55ae-b6d6-e1b833fc0685/scratchpad/cp_dark.png')
    pg.click("#cpl .tagbtns[data-n='Parvej khan'] [data-t=block]");pg.wait_for_timeout(300)
    chk("block tag saved",pg.evaluate("cpTag('Parvej khan')&&cpTag('Parvej khan').tag==='block'"))
    pg.click("#cpl [data-tr='Dheepak Raja']");pg.wait_for_timeout(500)
    chk("tapping a person opens 360",pg.evaluate("/Dheepak/.test(document.body.innerText)&&!document.querySelector('#cpl')"))
    pg.evaluate("document.documentElement.dataset.theme='light'");pg.wait_for_timeout(200);pg.screenshot(path='/tmp/claude-0/-home-claude/9b72aef0-0d4a-55ae-b6d6-e1b833fc0685/scratchpad/cp_light.png')
    chk("no page errors",not errs)
    print(errs)
print("FAILS",f)
