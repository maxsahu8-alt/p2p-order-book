import asyncio,json,time,os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000)
B=[{"id":"B1","kind":"bank","name":"Sbi bank","accNo":"XXXX4521","type":"Bank","opening":10000,"time":now-9e8,"lite":{"on":True,"app":"PhonePe","bal":300,"auto":{"on":True,"below":200,"amt":1000}}},
{"id":"B2","kind":"bank","name":"Axis bank","accNo":"XXXX7410","type":"Bank","opening":5000,"time":now-9e8,"lite":{"on":True,"app":"Google Pay","bal":50}}]
recs=[{"id":"S","kind":"setting","stock":{}}]+B
PHONEPE="""Transaction Successful
12:12 pm on 17 Oct 2026
Paid to
Rohit Raj
reetdhoni@axl
₹67.96
PhonePe Transaction ID
T2610171212131305109256
Debited from
UPI Lite
UTR: 518620073356
Powered by
UPI YES BANK"""
LOAD="""Money added to UPI Lite
₹2,000
PhonePe Transaction ID
T2610171212131305100000
Debited from SBI XXXX4521
UTR: 518620070000"""
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    r=await pg.evaluate("(t)=>{const P=payParse(t);return{lite:P.lite,load:P.liteLoad,bank:(payBank(P)||{}).name,sender:P.sender}}",PHONEPE)
    chk("PhonePe Lite receipt -> Sbi (app match), no sender",r["lite"] and r["bank"]=="Sbi bank" and not r["sender"])
    r=await pg.evaluate("(t)=>{const P=payParse(t);return{lite:P.lite,load:P.liteLoad}}",LOAD)
    chk("'Money added to UPI Lite' is a load, not a Lite payment",r["load"] and not r["lite"])
    # auto top-up: spend 150 -> 150 < 200 -> +1000
    nb=await pg.evaluate("liteApply(banks.find(b=>b.id==='B1'),'spend',150,'t')")
    chk("auto top-up after spend (300-150=150 -> +1000 = 1150)",nb==1150)
    nb=await pg.evaluate("liteApply(banks.find(b=>b.id==='B1'),'in',9000,'t')")
    chk("Lite never goes above 5000",nb==5000)
    await pg.wait_for_timeout(800)
    bal=await pg.evaluate("Math.round(balances().bal['B1'])")
    chk('bank balance fell only by what really went into Lite (10000-1000-3850)',bal==5150)
    err2=await pg.evaluate("(async()=>{const b={id:'ZZ',name:'Empty bank',lite:{on:true,bal:0}};try{await liteApply(b,'in',999999,'t');return 'noerr'}catch(e){return String(e.message||e)}})()")
    chk("cannot load more than the bank has (Low balance error)",'Low balance' in err2)
    # auto top-up also after a withdraw that leaves Lite below the limit
    nb=await pg.evaluate("(async()=>{const b=banks.find(x=>x.id==='B1');b.lite={...b.lite,bal:1000};return await liteApply(b,'out',900,'t')})()")
    chk("auto top-up after withdraw below limit (100 -> +1000 = 1100)",nb==1100)
    # bot
    async def ask(q):
      return await pg.evaluate("""(q)=>{const o=document.createElement('div');document.body.appendChild(o);const n0=document.querySelectorAll('.acard').length;let ok=false;try{ok=laAnswer(q,o)}catch(e){}
        const c=[...document.querySelectorAll('.acard')].slice(n0).map(x=>x.textContent);o.remove();return {ok,t:o.textContent,c}}""",q)
    a=await ask("lite me kitna hai")
    chk("bot: Lite balance lists banks",a["ok"] and "Sbi bank" in a["t"] and "Axis bank" in a["t"])
    a=await ask("axis bank lite me 500 load karo")
    chk("bot: load card prepared",a["ok"] and any("load" in x.lower() and "500" in x for x in a["c"]))
    # wallet total line + which tip + low balance in attention
    await pg.evaluate("go&&go('wallet')") if False else None
    await pg.click("nav >> text=Wallet");await pg.wait_for_timeout(600)
    wl=await pg.evaluate("(document.getElementById('wLite')||{}).textContent||''")
    chk("wallet shows Lite total",bool(wl) and "UPI Lite" in wl)
    chk("no page errors",not errs)
    print(errs)
  print("RESULT","OK" if ok else "FAILS")
asyncio.run(main())
