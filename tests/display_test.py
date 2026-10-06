import asyncio, json, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
RECS=[{"id":"s_main","kind":"setting","stock":{},"prefs":{"owner":"shiv"}}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(1500)
    chk("default 100",await pg.evaluate("zoomPct()")==100)
    await pg.evaluate("goPage('settings')");await pg.wait_for_timeout(300)
    await pg.click("#zm-plus");await pg.click("#zm-plus");await pg.wait_for_timeout(200)
    chk("plus raises to 110",await pg.evaluate("zoomPct()")==110 and (await pg.inner_text("#zm-val"))=="110%")
    chk("page zoomed",await pg.evaluate("document.documentElement.style.zoom")=="1.1")
    await pg.click("#zm-minus");await pg.wait_for_timeout(100)
    chk("minus",await pg.evaluate("zoomPct()")==105)
    for _ in range(12):await pg.click("#zm-minus")
    chk("min clamp 80",await pg.evaluate("zoomPct()")==80)
    await pg.screenshot(path="/tmp/claude-0/zm80.png")
    await pg.click("#zm-reset");await pg.wait_for_timeout(100)
    chk("reset",await pg.evaluate("zoomPct()")==100 and await pg.evaluate("document.documentElement.style.zoom")=="")
    await pg.click("#st-calm",force=True) if False else await pg.evaluate("document.getElementById('st-calm').click()");await pg.wait_for_timeout(100)
    chk("calm on",await pg.evaluate("document.body.classList.contains('calm')"))
    await pg.evaluate("zoomSet(120)");await pg.wait_for_timeout(1500);await pg.reload();await pg.wait_for_timeout(1500)
    chk("persists after reload",await pg.evaluate("zoomPct()")==120 and await pg.evaluate("document.documentElement.style.zoom")=="1.2")
    await pg.screenshot(path="/tmp/claude-0/zm120.png")
    chk("no page errors",not errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
