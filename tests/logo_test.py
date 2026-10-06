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
    await pg.goto("file://"+APP);await pg.wait_for_timeout(700)
    chk("splash shows at start",await pg.evaluate("!!document.getElementById('pxSplash')"))
    chk("splash ignores taps",await pg.evaluate("getComputedStyle(document.getElementById('pxSplash')).pointerEvents")=="none")
    await pg.screenshot(path="/tmp/claude-0/splash.png")
    await pg.wait_for_timeout(2300)
    chk("splash gone later",await pg.evaluate("!document.getElementById('pxSplash')"))
    await pg.evaluate("sheets.about()");await pg.wait_for_timeout(500)
    chk("about shows new logo",await pg.evaluate("!!document.querySelector('#sheetBody .abl #pxg')"))
    chk("old bars gone from about",await pg.evaluate("!document.querySelector('#sheetBody .abl rect')"))
    chk("ai part animated in about",await pg.evaluate("!!document.querySelector('#sheetBody .pxw i')"))
    chk("app name Pexai",("Pexai" in await pg.inner_text("#sheetBody")))
    await pg.screenshot(path="/tmp/claude-0/about_logo.png")
    await pg.evaluate("closeSheet();setPref('owner','')");await pg.wait_for_timeout(500)
    chk("home fallback shows animated Pexai",await pg.evaluate("!!document.querySelector('#pageTitle .pxw i')"))
    chk("no page errors",not errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
