# A sheet that loads a tool (QR maker) and is closed before the tool arrives must not throw.
from playwright.sync_api import sync_playwright
import os,json
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)+' @'+(e.stack or '')[:300]))
    pg.add_init_script("localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps([{"id":"S","kind":"setting"}])))
    pg.goto('file://'+APP);pg.wait_for_timeout(1000)
    pg.evaluate("setPref('myUpi','shiv@okhdfc');setPref('owner','Shiv')")
    for name in ["upiqr","paycard"]:
        for wait in (0,10,60):
            pg.evaluate(f"sheets.{name}()");pg.wait_for_timeout(wait);pg.evaluate("closeSheet()");pg.wait_for_timeout(1500)
    pg.evaluate("sheets.upiqr()");pg.evaluate("sheets.features()");pg.wait_for_timeout(2000)
    chk("closing or replacing the QR sheet early gives no error",not errs)
    print(errs[:2])
    b.close()
print("FAILS",f)
