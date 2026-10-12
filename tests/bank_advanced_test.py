import asyncio,json,time
from playwright.async_api import async_playwright
now=int(time.time()*1000)
B=[{"id":"B1","kind":"bank","name":"Icici bank","upi":"MRX.eazypay@icici","accNo":"XXXX0021","type":"Bank","opening":0,"time":now-30*864e5,"limits":{"UPI":100000}},
{"id":"B2","kind":"bank","name":"Axis bank","upi":"s@axisbank","accNo":"XXXX7410","type":"Bank","opening":50000,"time":now-29*864e5,"limits":{"UPI":100000,"ALL":200000}},
{"id":"B3","kind":"bank","name":"Sbi bank","upi":"9522@upi","accNo":"XXXX2594","type":"Bank","opening":90000,"time":now-28*864e5,"limits":{"UPI":100000}},
{"id":"B4","kind":"bank","name":"Kotak","type":"Bank","opening":1000,"time":now-27*864e5}]
O=[]
for i,n in enumerate(["Raju","Amit","Sohail","Imran","Vikas","Neha"]):
  O.append({"id":"O%d"%i,"side":"SELL","coin":"USDT","qty":100,"rate":95,"status":"Completed","time":now-(i+1)*20*60e3,"cp":n,"splits":[{"bank":"B1","amt":9500,"method":"UPI"}],"pay":"UPI"})
O.append({"id":"OB","side":"BUY","coin":"USDT","qty":900,"rate":95,"status":"Completed","time":now-3*36e5,"cp":"Zed","splits":[{"bank":"B3","amt":85500,"method":"UPI"}],"pay":"UPI"})
recs=[{"id":"S","kind":"setting","stock":{}}]+B+O
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":1700});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    await pg.goto("file://"+__import__("os").environ.get("APP","/home/claude/p2p-tracker.html"));await pg.wait_for_timeout(900)
    await pg.evaluate("goPage('wallet')");await pg.wait_for_timeout(500)
    ok=True
    def chk(n,c):
      nonlocal ok
      print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
    chk("default thresholds 30/60",await pg.evaluate("JSON.stringify(riskThr())")=='{"md":30,"hi":60,"n":0}')
    # receive plan prefers a calm bank over the risky one
    pl=await pg.evaluate("plans(20000,'receive',false,'UPI')")
    print(pl)
    chk("receive plan avoids the busy ICICI",pl[0]["parts"][0]["id"]!="B1")
    # frozen / paused banks are never suggested
    await pg.evaluate("patchRec('B2',{status:'frozen'})");await pg.wait_for_timeout(300)
    pl=await pg.evaluate("plans(20000,'receive',false,'UPI')")
    chk("frozen bank not suggested",all(p["id"]!="B2" for x in pl for p in x["parts"]))
    pl=await pg.evaluate("plans(1000,'pay',false,'UPI')")
    chk("frozen bank not used for paying",all(p["id"]!="B2" for x in pl for p in x["parts"]))
    await pg.evaluate("patchRec('B2',{status:''})");await pg.wait_for_timeout(300)
    # receive cap: Sbi cap 5000, 20000 to receive -> spread, nothing over the cap on the capped bank
    await pg.evaluate("patchRec('B3',{rcvCap:5000})");await pg.evaluate("patchRec('B4',{rcvCap:8000})");await pg.evaluate("patchRec('B2',{rcvCap:4000})");await pg.wait_for_timeout(300)
    pl=await pg.evaluate("plans(20000,'receive',false,'UPI')")
    print(pl[0])
    chk("over the cap -> spread plan with several banks",pl[0]["title"]=="Spread by receive cap" and len(pl[0]["parts"])>=2)
    chk("spread adds up to the amount",abs(sum(p["amt"] for p in pl[0]["parts"])-20000)<0.01)
    # marking a bank frozen teaches the app: ICICI froze with the current busy pattern
    await pg.evaluate("sheets.bank('B1')");await pg.wait_for_timeout(300)
    await pg.select_option("#s-status","frozen");await pg.wait_for_timeout(100)
    chk("freeze date field appears",await pg.evaluate("!document.getElementById('s-fatw').hidden"))
    await pg.evaluate("document.getElementById('sf').requestSubmit()");await pg.wait_for_timeout(500)
    r=await pg.evaluate("({fp:allBanks.find(b=>b.id==='B1').frozenPts,thr:riskThr()})")
    print(r)
    chk("freeze recorded with its risk points",r["fp"]>=15)
    chk("thresholds tuned to your own freeze",r["thr"]["n"]==1 and r["thr"]["hi"]<=60)
    chk("chip is tappable with a reason",await pg.evaluate("[...document.querySelectorAll('#bankList [data-why]')].length>0"))
    chk("no page errors",not [e for e in errs if "Failed to load" not in e])
    print("ALL OK" if ok else "SOME FAILED")
    await b.close()
asyncio.run(m())
