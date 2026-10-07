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
    await pg.goto("file://"+APP,wait_until="commit");await pg.wait_for_timeout(1500)
    await pg.evaluate("showLock('unlock')");await pg.wait_for_timeout(400)
    chk("lock shows logo",await pg.evaluate("!!document.querySelector('#lockBrand svg')"))
    chk("lock shows Pexai word",await pg.evaluate("!!document.querySelector('#lockBrand .pxw i')"))
    await pg.screenshot(path="/tmp/claude-0/lock_brand.png")
    await pg.evaluate("$('#lock').hidden=true")
    await pg.evaluate("sheets.about()");await pg.wait_for_timeout(500)
    chk("about tagline",await pg.evaluate("!!document.querySelector('#sheetBody .abt')"))
    await pg.screenshot(path="/tmp/claude-0/about_brand.png")
    await pg.evaluate("closeSheet()")
    png=await pg.evaluate("pxLogoPng()")
    chk("pdf logo png made",bool(png) and png.startswith("data:image/png"))
    chk("widget help uses name",await pg.evaluate("!/\\$\\{APP_NAME\\}/.test(document.body.innerHTML)"))
    chk("no page errors",not errs)
    print(errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
