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
    chk("advisor card shown",await pg.evaluate("!!document.querySelector('#bankAdvisor .badv')"))
    chk("high risk chip for 6 payers in 24h",await pg.evaluate("document.querySelector('#bankList').textContent.includes('Freeze risk High')"))
    chk("limit chip at 86%",await pg.evaluate("document.querySelector('#bankList').textContent.includes('limit 86% used')"))
    await pg.click("[data-sheet=bankmgr]");await pg.wait_for_timeout(300)
    # pin Kotak, move Sbi up, hide Axis
    await pg.click(".bmg[data-id=B4] [data-a=pin]");await pg.wait_for_timeout(400)
    await pg.click(".bmg[data-id=B3] [data-a=up]");await pg.wait_for_timeout(400)
    await pg.click(".bmg[data-id=B2] [data-a=hide]");await pg.wait_for_timeout(400)
    
    print(await pg.evaluate("allBanks.map(b=>b.name+(b.pinned?'*':'')+(b.hidden?'(h)':'')).join(' | ')"))
    await pg.evaluate("closeSheet()");await pg.wait_for_timeout(300)
    print(await pg.evaluate("[...document.querySelectorAll('#bankList .bname')].map(e=>e.textContent).join(' | ')"), await pg.evaluate("document.querySelector('#bankHidTog').textContent"))
    await pg.evaluate("sheets.ledger('B1')");await pg.wait_for_timeout(300);
    chk("pinned first",await pg.evaluate("allBanks[0].name")=="Kotak")
    chk("hidden bank not in list",await pg.evaluate("![...document.querySelectorAll('#bankList .bname')].some(e=>e.textContent.includes('Axis'))"))
    chk("no page errors",not [e for e in errs if "Failed to load" not in e])
    print("ALL OK" if ok else "SOME FAILED")
    await b.close()
asyncio.run(m())
