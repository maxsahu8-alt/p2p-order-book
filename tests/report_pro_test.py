from playwright.sync_api import sync_playwright
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={"width":390,"height":860});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1200)
    pg.evaluate("()=>sheets.report()");pg.wait_for_timeout(300)
    chk("report opens with profit card",pg.locator("#sheetBody .rpbig").count()==1)
    for k in ["today","yesterday","week","month","lastmonth","all"]:
        pg.click(f'#repP [data-p="{k}"]');pg.wait_for_timeout(150)
        chk(k+" draws",pg.locator("#rpBody .rphero").count()==1 and pg.locator("#rpBody #rpCh").count()==1)
    chk("share text kept",pg.evaluate("()=>document.querySelector('#repTxt').textContent.includes('Orders:')"))
    chk("whatsapp link set",pg.evaluate("()=>document.querySelector('#repWa').href.startsWith('https://wa.me/')"))
    chk("no page errors",not errs)
print("FAILS",f)
