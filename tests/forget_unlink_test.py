from playwright.sync_api import sync_playwright
import json,time
APP="/home/claude/p2p-tracker.html"
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n)
    f+= 0 if c else 1
now=int(time.time()*1000)
recs=[{"id":"S","kind":"setting"},
{"id":"ixl_alias_t1","kind":"ixl","t":"alias","a":"menon ravi","b":"kumar menon ravi","da":"Ravi Menon","db":"Ravi Kumar Menon","n":1,"time":now,"last":now},
{"id":"idn_cp_ravi menon","kind":"ident","from":"cp_ravi menon","to":"cp_ravi kumar menon","names":["Ravi Menon","Ravi Kumar Menon"],"time":now}]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    pg.goto('file://'+APP);pg.wait_for_timeout(1200)
    pg.evaluate("sheets.ixmem()");pg.wait_for_timeout(500)
    chk("alias listed",pg.evaluate("!!document.querySelector('[data-ixdel=ixl_alias_t1]')"))
    pg.click('[data-ixdel=ixl_alias_t1]');pg.wait_for_timeout(700)
    chk("alias gone",pg.evaluate("!recs.some(r=>r.id==='ixl_alias_t1')"))
    chk("client link gone too",pg.evaluate("!recs.some(r=>r.kind==='ident')"))
    chk("no page errors",not errs)
print("FAILS",f)
