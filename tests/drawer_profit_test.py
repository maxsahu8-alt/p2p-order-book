from playwright.sync_api import sync_playwright
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
VIS="""()=>["home","orders","add","coins","wallet","direct","ai","ideas","settings","intake"].filter(n=>{const e=document.getElementById("p-"+n);return e&&!e.hidden})"""
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={"width":400,"height":860});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///home/claude/p2p-tracker.html');pg.wait_for_timeout(1200)
    pg.evaluate("()=>openDrawer()");pg.wait_for_timeout(300)
    pg.click('#drawer [data-dpc="profit"]');pg.wait_for_timeout(500)
    vis=pg.evaluate(VIS);txt=pg.evaluate("()=>document.body.innerText")
    chk("Today profit keeps a page visible (not blank)",len(vis)==1)
    chk("Today profit opens the Report sheet","This week" in txt and "Last month" in txt)
    pg.evaluate("()=>goTo('nosuchpage')");pg.wait_for_timeout(300)
    chk("unknown page name falls back to a visible page",len(pg.evaluate(VIS))==1)
    chk("no page errors",not errs)
print("FAILS",f)
