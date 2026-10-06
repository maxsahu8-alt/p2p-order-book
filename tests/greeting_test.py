import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000)
RECS=[{"id":"s_main","kind":"setting","stock":{},"prefs":{"owner":"shiv sahu"}}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(1500)
    lab=await pg.evaluate("[5,11,12,16,17,20,21,23,0,4].map(h=>gtLabel(h)[0])")
    chk("time of day labels",lab==["Good morning","Good morning","Good afternoon","Good afternoon","Good evening","Good evening","Good night","Good night","Good night","Good night"])
    t=await pg.inner_text("#pageTitle")
    chk("home shows first name only","Shiv" in t and "Sahu" not in t and "P2P Order Book" not in t)
    chk("greeting present",any(x in t for x in ["Good morning","Good afternoon","Good evening","Good night"]))
    await pg.screenshot(path="/tmp/claude-0/gt_home.png")
    await pg.evaluate("goPage('orders')");await pg.wait_for_timeout(200)
    chk("other pages keep their title",(await pg.inner_text("#pageTitle")).strip()=="Orders" and await pg.evaluate("!document.querySelector('header.xhead').classList.contains('gr')"))
    await pg.evaluate("goPage('home')");await pg.wait_for_timeout(300)
    chk("home greeting returns","Shiv" in await pg.inner_text("#pageTitle"))
    await pg.evaluate("setPref('owner','')");await pg.wait_for_timeout(300)
    chk("no name falls back to app name","P2P Order Book" in await pg.inner_text("#pageTitle"))
    await pg.evaluate("setPref('owner','deepak kumar')");await pg.wait_for_timeout(300)
    chk("name change updates live","Deepak" in await pg.inner_text("#pageTitle"))
    chk("saved dot instead of text",await pg.evaluate("getComputedStyle(document.getElementById('syncNote')).display==='none'"))
    chk("no page errors",not errs)
    if errs:print(errs)
    for h in (6,14,19,22):
      await pg.evaluate(f"(()=>{{const o=gtLabel;window.gtLabel=()=>o({h});homeTitle(true)}})()");await pg.wait_for_timeout(1200)
      await pg.screenshot(path=f"/tmp/claude-0/gt_{h}.png",clip={"x":0,"y":0,"width":390,"height":120})
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
