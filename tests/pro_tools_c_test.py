import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","type":"Bank","opening":1000,"time":now-9e8},
 {"id":"o1","side":"BUY","coin":"USDT","qty":100,"rate":90,"status":"Completed","time":now-7200e3,"cp":"A","pay":"UPI","splits":[{"bank":"B1","amt":9000,"method":"UPI"}]},
 {"id":"o2","side":"SELL","coin":"USDT","qty":100,"rate":93,"status":"Completed","time":now-3600e3,"cp":"B","pay":"UPI","splits":[{"bank":"B1","amt":9300,"method":"UPI"}]},
 {"id":"o3","side":"SELL","coin":"USDT","qty":10,"rate":93,"status":"Pending","time":now-60e3,"cp":"C","pay":"UPI","splits":[]}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))});")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("window.__W=[];window.P2PNative={setWidget:j=>{window.__W.push(j);return 'ok'}};__wLast=''")
    await pg.evaluate("renderAlerts()")
    W=await pg.evaluate("window.__W")
    chk("widget pushed",len(W)>=1)
    d=json.loads(W[-1])
    chk("widget profit text","₹" in d["profit"])
    chk("widget open count","1 open" in d["line"])
    n=len(W);await pg.evaluate("renderAlerts()")
    chk("no duplicate push",len(await pg.evaluate("window.__W"))==n)
    await pg.evaluate("sheets.glance()")
    chk("glance sheet","open orders" in (await pg.inner_text("#sheetBody")).lower())
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
