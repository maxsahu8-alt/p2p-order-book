import asyncio, json, time, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
pay=open(FX+"pay_phonepe.txt").read(); order=open(FX+"order_kucoin.txt").read()
now=int(time.time()*1000)
SET={"id":"s_main","kind":"setting","stock":{},"prefs":{"owner":"Shiv Sahu"}}
B1={"id":"B1","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":now-30*864e5}
LIST="""My Orders
Buy USDT   Completed
₹2,500.00  Price ₹90.91
27.50 USDT
Counterparty Ravi Kumar
2026-10-05 21:30

Sell USDT   Completed
₹4,550.00  Price ₹91.00
50.00 USDT
Counterparty Anita Verma
2026-10-05 22:10
"""
async def scen(b,recs,texts,names,after=None):
  ctx=await b.new_context(viewport={"width":390,"height":900});pg=await ctx.new_page();errs=[]
  pg.on("pageerror",lambda e:errs.append(str(e)))
  await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
  await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(recs))})")
  await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
  await pg.evaluate("window.__T=%s"%json.dumps(texts))
  await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
  await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
  mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
  await pg.set_input_files("#i2-file",[mk(n,i+1) for i,n in enumerate(names)]);await pg.wait_for_timeout(3000)
  return pg,errs
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch()
    G="ixS.groups.map(g=>({ov:g.cmp.overall,risk:g.risk.level,why:g.risk.reasons,fixes:g.fixes,saved:!!g.saved,auto:!!g.auto,qty:g.X.ord.crypto,fiat:g.X.ord.fiat,rate:g.X.ord.price,tgt:g.target&&g.target.id,autoT:!!g.autoT}))"
    # A: quantity misread (72.50 instead of 27.50)
    pg,e=await scen(b,[SET,B1],{"p.png":pay,"o.png":order.replace("27.50 USDT","72.50 USDT")},["p.png","o.png"])
    g=(await pg.evaluate(G))[0];print("A",g)
    chk("A quantity corrected to 27.5",g["qty"]==27.5 and len(g["fixes"])==1)
    chk("A fixed value is not auto-saved, needs your look",not g["saved"] and g["risk"]!="LOW")
    chk("A no errors",not e)
    # B: total misread
    pg,e=await scen(b,[SET,B1],{"p.png":pay,"o.png":order.replace("₹2,500.00","₹2,590.00")},["p.png","o.png"])
    g=(await pg.evaluate(G))[0];print("B",g)
    chk("B total corrected to 2500",g["fiat"]==2500 and len(g["fixes"])==1)
    # C: odd UTR
    pg,e=await scen(b,[SET,B1],{"p.png":pay.replace("UTR 628151234567","UTR 6281512345"),"o.png":order},["p.png","o.png"])
    g=(await pg.evaluate(G))[0];print("C",g)
    chk("C short UTR flagged",any("UTR has" in w or "UTR" in w for w in g["why"]) and not g["saved"])
    # D: clean pair is auto-saved, then undone
    pg,e=await scen(b,[SET,B1],{"p.png":pay,"o.png":order},["p.png","o.png"])
    g=(await pg.evaluate(G))[0];print("D",g)
    chk("D verified + low is auto-saved",g["ov"]=="VERIFIED" and g["risk"]=="LOW" and g["saved"] and g["auto"])
    n=await pg.evaluate("orders.length");chk("D one order exists",n==1)
    chk("D auto banner shown",await pg.evaluate("!!document.querySelector('.ixautob')"))
    await pg.evaluate("document.querySelector('[data-ixundo]').click()");await pg.wait_for_timeout(200)
    await pg.evaluate("document.querySelector('[data-ixundo]')&&document.querySelector('[data-ixundo]').click()");await pg.wait_for_timeout(900)
    chk("D undo removes the order",await pg.evaluate("orders.length")==0)
    chk("D no errors",not e)
    # D2: switch off
    pg,e=await scen(b,[{**SET,"prefs":{"owner":"Shiv Sahu","ixAuto":"0"}},B1],{"p.png":pay,"o.png":order},["p.png","o.png"])
    chk("D2 switched off: nothing saved",await pg.evaluate("orders.length")==0)
    # E: payment alone finds the open order
    OPEN={"id":"o_open","side":"BUY","coin":"USDT","qty":27.5,"rate":90.91,"status":"Pending","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Ravi Kumar","splits":[],"time":int(time.mktime((2026,10,5,21,30,0,0,0,-1))*1000)}
    pg,e=await scen(b,[SET,B1,OPEN],{"p.png":pay},["p.png"])
    g=(await pg.evaluate(G))[0];print("E",g)
    chk("E payment alone matched to open order",g["tgt"]=="o_open" and g["autoT"])
    r=await pg.evaluate("(()=>{const o=orders.find(x=>x.id==='o_open');return{sp:(o.splits||[]).map(s=>[s.bank,s.amt]),utr:o.utr||null,n:orders.length}})()");print("E saved",r)
    chk("E bank split + UTR attached to that order, no new order",r["n"]==1 and r["utr"]=="628151234567" and r["sp"]==[["B1",2500]])
    chk("E no errors",not e)
    # E undo restores the open order
    await pg.evaluate("document.querySelector('[data-ixundo]').click()");await pg.wait_for_timeout(200)
    await pg.evaluate("document.querySelector('[data-ixundo]')&&document.querySelector('[data-ixundo]').click()");await pg.wait_for_timeout(900)
    r=await pg.evaluate("(()=>{const o=orders.find(x=>x.id==='o_open');return{sp:(o.splits||[]).length,utr:o.utr||null,n:orders.length}})()")
    chk("E undo puts the open order back as it was",r=={"sp":0,"utr":None,"n":1})
    # E2: two open orders with the same amount: the name decides
    ANITA={**OPEN,"id":"o_anita","cp":"Anita Verma"}
    pg,e=await scen(b,[SET,B1,ANITA,OPEN],{"p.png":pay},["p.png"])
    g=(await pg.evaluate(G))[0];chk("E2 picks Ravi, not Anita",g["tgt"]=="o_open")
    # E3: only another person's order is open: never matched
    pg,e=await scen(b,[SET,B1,ANITA],{"p.png":pay},["p.png"])
    g=(await pg.evaluate(G))[0];chk("E3 other person's order is not touched",g["tgt"] is None and not g["saved"])
    # I: a cancelled order on its own
    CAN1="Order Cancelled\nBuy USDT\n₹2,500.00\n27.50 USDT\nCancelled by system, payment timeout\nOrder No. 1851234567890123499"
    CAN2="Order Cancelled\n₹2,500.00\n27.50 USDT\nYou cancelled this order"
    for nm,txt in (("I1",CAN1),("I2",CAN2)):
      pg,e=await scen(b,[SET,B1],{"c.png":txt},["c.png"])
      t=await pg.evaluate("ixS.items[0].cls.type");print(nm,"type",t)
      chk(nm+" recognised as an order",t in("EX_ORDER","CRYPTO_ORDER"))
      chk(nm+" not stuck as unknown",await pg.evaluate("ixS.groups[0].order!=null"))
      if nm=="I2":
        await pg.evaluate("document.querySelector('[data-ix=\"side:BUY\"]').click()");await pg.wait_for_timeout(300)
      await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(900)
      r=await pg.evaluate("orders.map(o=>[o.status,o.side,o.qty,o.rate,o.note])");print(nm,"saved",r)
      chk(nm+" saved as a Cancelled order",len(r)==1 and r[0][0]=="Cancelled")
      chk(nm+" no errors",not e)
    # F: new UPI id for a known person
    OLD={**OPEN,"id":"o_old","status":"Completed","vpa":"ravi.old@ybl","time":now-5*864e5,"splits":[{"bank":"B1","amt":2500,"method":"UPI"}]}
    NEWP=pay.replace("RAVI KUMAR","RAVI KUMAR\nravi.new@okaxis")
    pg,e=await scen(b,[SET,B1,OLD],{"p.png":NEWP,"o.png":order},["p.png","o.png"])
    g=(await pg.evaluate(G))[0];print("F",g)
    chk("F changed UPI id is flagged",any("New UPI ID" in w for w in g["why"]) and not g["saved"])
    # G: list screenshot
    pg,e=await scen(b,[SET,B1],{"l.png":LIST},["l.png"])
    ln=await pg.evaluate("(ixS.items.find(x=>x.list)||{list:[]}).list.length");print("G rows",ln)
    chk("G two orders found in one picture",ln==2)
    chk("G list card shown",await pg.evaluate("!!document.querySelector('.ixlist [data-lisave]')"))
    await pg.evaluate("document.querySelector('[data-lisave]').click()");await pg.wait_for_timeout(900)
    chk("G both orders added",await pg.evaluate("orders.length")==2)
    sd=await pg.evaluate("orders.map(o=>[o.side,o.qty,o.rate,o.cp]).sort()");print("G orders",sd)
    # G2: adding again is not duplicated
    await pg.evaluate("ixS.items.forEach(x=>{x.listSel=null;x.listDone=null});ixDraw()")
    chk("G2 duplicates greyed out",await pg.evaluate("document.querySelectorAll('.ixlr.dup').length")==2)
    chk("G no errors",not e)
    # H: existing single order screenshot is not mistaken for a list
    pg,e=await scen(b,[SET,B1],{"o.png":order},["o.png"])
    chk("H single order not a list",await pg.evaluate("!ixS.items.some(x=>x.list)"))
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
