from playwright.sync_api import sync_playwright
import json,time
now=int(time.time()*1000);f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
R=[{"id":"S","kind":"setting"},
{"id":"O1","side":"SELL","coin":"USDT","qty":100,"rate":95,"status":"Completed","platform":"KuCoin","time":now-6e5,"mode":"P2P"},
{"id":"ix_a","kind":"ix","key":"a","amount":5083,"name":"MOCHI RAM MAHATO","orderRef":"6ad43ca925c578000104144e","overall":"REVIEW","risk":"LOW","ai":True,"side":"BUY","types":["PAY_RECEIPT","EX_ORDER"],"saved":False,"time":now-1e5,"why":["Sender ↔ Buyer: not found in the screenshots","Paid from an account not in your bank list"]},
{"id":"ix_b","kind":"ix","key":"b","amount":10000,"name":"Nishita","orderRef":"x7bbdaf","overall":"REVIEW","risk":"MEDIUM","ai":True,"side":"SELL","types":["PAY_RECEIPT"],"saved":True,"orderId":"O1","time":now-2e5},
{"id":"ix_c","kind":"ix","key":"c","amount":67.96,"name":"ROHIT RAJ","orderRef":"","overall":"MISMATCH","risk":"HIGH","ai":False,"side":"BUY","types":["PAY_RECEIPT"],"saved":False,"time":now-3e5}]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(R)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1000)
    pg.evaluate("goPage('intake')");pg.wait_for_timeout(500);pg.evaluate('renderIxHist()');pg.wait_for_timeout(200)
    chk("3 rows listed and tappable",pg.evaluate("document.querySelectorAll('#i2-hist [data-ixh]').length")==3)
    pg.click('#i2-hist [data-ixh=ix_a]');pg.wait_for_timeout(400)
    t=pg.evaluate("document.querySelector('#sheetBody').textContent")
    chk("tap opens the detail sheet",'MOCHI RAM MAHATO' in t and 'Checked only' in t)
    chk("shows why it needs a look",'not found in the screenshots' in t and 'bank list' in t)
    chk("unsaved one offers Scan again, no Open order",pg.evaluate("!!document.querySelector('#ixh-scan')&&!document.querySelector('#ixh-open')"))
    pg.click('#ixh-del');pg.wait_for_timeout(500)
    chk("remove deletes only that row",pg.evaluate("!recs.some(r=>r.id==='ix_a')&&recs.some(r=>r.id==='ix_b')&&document.querySelectorAll('#i2-hist [data-ixh]').length===2"))
    pg.click('#i2-hist [data-ixh=ix_b]');pg.wait_for_timeout(400)
    chk("saved one offers Open order",pg.evaluate("!!document.querySelector('#ixh-open')"))
    pg.click('#ixh-open');pg.wait_for_timeout(500)
    chk("Open order shows the order sheet",'SELL' in pg.evaluate("document.querySelector('#sheetBody').textContent") and pg.evaluate("!!document.querySelector('#os-edit')"))
    pg.evaluate("closeSheet()")
    pg.click('#i2-hist [data-ixh=ix_c]');pg.wait_for_timeout(300)
    chk("old check without a saved reason says so",'not kept' in pg.evaluate("document.querySelector('#sheetBody').textContent"))
    pg.evaluate("closeSheet()")
    pg.click('[data-ixclr]');pg.wait_for_timeout(200);pg.click('[data-ixclr]');pg.wait_for_timeout(600)
    chk("Clear not saved keeps the saved one",pg.evaluate("recs.filter(r=>r.kind==='ix').map(r=>r.id).join()")=="ix_b")
    chk("no page errors",not errs)
print("FAILS",f)
