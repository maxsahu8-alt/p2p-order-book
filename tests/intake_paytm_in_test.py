# Paytm receipt for money you RECEIVED: the sender's bank and digits (Kotak - 1612) must not become your account
import asyncio, json, time, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
T={"o.png":open(FX+"order_kucoin_sell_22000.txt").read(),"p.png":open(FX+"pay_paytm_from_rishabh.txt").read()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","vpas":["svdeep@axisbank"],"type":"Bank","opening":100000,"time":now-30*864e5}]
BUY_ORD=open(FX+"order_kucoin_buy_10731.txt").read().replace("10,731.19","22,000")
async def buy(pg):
  pass
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(RECS)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv Sahu')")
    await pg.evaluate("window.__T=%s"%json.dumps(T))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'ML Kit',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("o.png",1),mk("p.png",2)]);await pg.wait_for_timeout(3500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0],P=g.X.pay;const bk=ixBankOf({last4:P.last4,bank:P.bank||'',dir:P.dir,vpa:P.vpa},ixSide(g));return{side:ixSide(g),dir:P.dir,last4:P.last4,bank:P.bank,utr:P.utr,sender:P.sender,receiver:P.receiver,own:bk&&bk.id,overall:g.cmp.overall,risk:g.risk.level,ai:(g.reasonsAI||[]).length,card:document.body.innerText.includes('1612')}})()")
    print(r)
    chk("money received (SELL, dir in)",r["side"]=="SELL" and r["dir"]=="in")
    chk("sender's Kotak digits are not your account",not r["last4"] and not r["bank"] and not r["card"])
    chk("your bank is found from your UPI ID",r["own"]=="B1")
    chk("UTR read from the grouped reference",r["utr"]=="219216309656")
    chk("verified without AI",r["overall"]=="VERIFIED" and r["ai"]==0)
    # same Paytm layout for a BUY: "From" is YOUR account, so the digits are yours and money went out
    await pg.evaluate("window.__T=%s"%json.dumps({"o.png":BUY_ORD,"p.png":open(FX+"pay_paytm_from_me.txt").read()}))
    await pg.evaluate("ixS.groups=[];ixS.items=[];ixS.files=[]");await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    await pg.set_input_files("#i2-file",[mk("o.png",5),mk("p.png",6)]);await pg.wait_for_timeout(3500)
    r2=await pg.evaluate("(()=>{const g=ixS.groups[0],P=g.X.pay;const bk=ixBankOf({last4:P.last4,bank:P.bank||'',dir:P.dir,vpa:P.vpa},ixSide(g));return{side:ixSide(g),dir:P.dir,last4:P.last4,own:bk&&bk.id,sender:P.sender}})()")
    print(r2)
    chk("BUY: money went out and the digits are yours",r2["dir"]=="out" and r2["last4"]=="7410" and r2["own"]=="B1")
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");raise SystemExit(0 if ok else 1)
asyncio.run(main())
