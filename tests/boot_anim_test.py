import asyncio, json, os, time
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000)
RECS=[{"id":"s_main","kind":"setting","stock":{},"prefs":{"owner":"shiv"}},
 {"id":"b1","kind":"bank","name":"HDFC","bal":25000,"opening":25000,"createdAt":now-9e7},
 {"id":"o1","side":"SELL","qty":100,"rate":98,"status":"Completed","time":now,"coin":"USDT","fiat":9800},
 {"id":"o2","side":"BUY","qty":100,"rate":97,"status":"Completed","time":now-1000,"coin":"USDT","fiat":9700}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":844});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP,wait_until="commit")
    shots=[]
    t0=time.time()
    for i,ms in enumerate([250,600,950,1400,2200]):
        await pg.wait_for_timeout(max(0,ms-int((time.time()-t0)*1000)))
        await pg.screenshot(path=f"/tmp/claude-0/boot_{i}.png");shots.append(ms)
    await pg.wait_for_timeout(1500)
    chk("boot class removed",await pg.evaluate("!document.documentElement.classList.contains('boot')"))
    chk("cards fully visible at end",await pg.evaluate("[...document.querySelectorAll('#p-home .hero2,#p-home .kpis .kpi')].every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).transform==='none')"))
    chk("bottom menu visible",await pg.evaluate("getComputedStyle(document.querySelector('nav.tabs')).opacity==='1'"))
    t=await pg.inner_text("#hTotal")
    chk("net worth text intact",t.startswith("₹") and "NaN" not in t and "undefined" not in t)
    chk("no page errors",not errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
