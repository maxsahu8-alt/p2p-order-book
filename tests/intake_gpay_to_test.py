# GPay receipt without the "Pay again" button read: the "To <name>" header still means money went out (BUY from own bank)
import asyncio, json, time, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
T={"o2.png":open(FX+"order_kucoin_buy_10731.txt").read(),"p2.png":open(FX+"pay_gpay_to_header_10731.txt").read()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":now-30*864e5}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv Sahu')")
    await pg.evaluate("window.__T=%s"%json.dumps(T))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'ML Kit',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("o2.png",3),mk("p2.png",4)]);await pg.wait_for_timeout(3500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0];const f=k=>(g.cmp.fields.find(x=>x.k===k)||{}).res;return{dir:g.X.pay.dir,buyer:f('buyer'),seller:f('seller'),overall:g.cmp.overall,risk:g.risk.level,ai:(g.reasonsAI||[]).length}})()")
    print(r)
    chk("money went out",r["dir"]=="out");chk("Sender vs Buyer matches (bank name vs nickname)",r["buyer"]=="MATCH");chk("seller matches",r["seller"]=="MATCH")
    chk("verified, low risk, no AI needed",r["overall"]=="VERIFIED" and r["risk"]=="LOW" and r["ai"]==0);chk("no page errors",not errs)
    await b.close()
  print("ALL OK" if ok else "FAILED")
  raise SystemExit(0 if ok else 1)
asyncio.run(main())
