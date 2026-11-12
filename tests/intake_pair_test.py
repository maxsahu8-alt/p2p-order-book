import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000)
RECS=[{"id":"o1","side":"BUY","coin":"USDT","qty":50,"rate":90,"status":"Completed","time":now-5*864e5,"cp":"Rahul Sharma","nk":"RS_Traders","pay":"UPI","splits":[]}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    f=lambda nick,real:pg.evaluate("(()=>{const g={X:{ord:{nick:%s,seller:%s,buyer:null},pay:{}},side:'BUY'};g.side='BUY';const r=ixPairCheck(g);return r?r.lvl:null})()"%(json.dumps(nick),json.dumps(real)))
    chk("same pair is fine",await f("RS_Traders","Rahul Sharma") is None)
    chk("same nickname, other real name is blocked",await f("RS_Traders","Amit Verma")=="hi")
    chk("same real name, new nickname is only a warning",await f("RS2","Rahul Sharma")=="me")
    chk("brand new pair is fine",await f("NewGuy","Sunil Das") is None)
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
