import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
CORS={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"}
CG={"tether":{"inr":88.12,"inr_24h_change":0.31,"usd":1.0},"bitcoin":{"inr":8800000,"usd":100000,"inr_24h_change":1.2},"ethereum":{"inr":300000,"usd":3400,"inr_24h_change":-0.5},"binancecoin":{"inr":50000,"usd":600},"solana":{"inr":15000,"usd":170},"ripple":{"inr":50,"usd":0.55},"tron":{"inr":11,"usd":0.12},"dogecoin":{"inr":12,"usd":0.14},"usd-coin":{"inr":88.1,"usd":1.0}}
BN=[{"symbol":"BTCUSDT","lastPrice":"100000.00","priceChangePercent":"1.5"},{"symbol":"ETHUSDT","lastPrice":"3400.5","priceChangePercent":"-0.4"},{"symbol":"BNBUSDT","lastPrice":"600","priceChangePercent":"0.1"},{"symbol":"SOLUSDT","lastPrice":"170","priceChangePercent":"2"},{"symbol":"XRPUSDT","lastPrice":"0.55","priceChangePercent":"0"},{"symbol":"TRXUSDT","lastPrice":"0.12","priceChangePercent":"0"},{"symbol":"DOGEUSDT","lastPrice":"0.14","priceChangePercent":"3"}]
def p2p(price):return {"data":[{"adv":{"price":str(price),"minSingleTransAmount":"500","dynamicMaxSingleTransAmount":"50000","tradeMethods":[{"tradeMethodShortName":"UPI"}]},"advertiser":{"nickName":"Trader%s"%i}} for i in range(3)]}
now=int(time.time()*1000)
RECS=[{"id":"o1","side":"SELL","coin":"USDT","qty":100,"rate":90,"status":"Completed","time":now-3600e3,"cp":"A","pay":"UPI","splits":[]}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    state={"p2p":True,"down":False}
    async def route(r):
      u=r.request.url
      if not u.startswith("http"):return await r.continue_()
      if state["down"]:return await r.abort()
      if "coingecko" in u:return await r.fulfill(status=200,headers=CORS,body=json.dumps(CG))
      if "api.binance.com" in u:return await r.fulfill(status=200,headers=CORS,body=json.dumps(BN))
      if "p2p.binance.com" in u:
        if not state["p2p"]:return await r.abort()
        body=json.loads(r.request.post_data or "{}");return await r.fulfill(status=200,headers=CORS,body=json.dumps(p2p(90.5 if body.get("tradeType")=="BUY" else 89.2)))
      return await r.abort()
    await pg.route("**/*",route)
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(3000)
    t=await pg.inner_text("#mkStrip")
    chk("header shows USDT/INR",("USDT/INR" in t) and ("88.12" in t))
    chk("header shows 24h change","0.31" in t)
    chk("header shows P2P buy and sell","90.50" in t and "89.20" in t)
    chk("strip is inside the sticky header",await pg.evaluate("!!document.querySelector('header.xhead #mkStrip')"))
    await pg.evaluate("sheets.market()");await pg.wait_for_timeout(300)
    s=await pg.inner_text("#sheetBody")
    chk("market page hero","88.12" in s)
    chk("coin in USDT and rupees","100,000" in s and "88,12,000" in s.replace("₹","") or "88,12,000" in s)
    chk("P2P ads listed","Trader0" in s and "UPI" in s)
    chk("compares to your last sell rate","90" in s and "Your last sell rate" in s)
    # P2P blocked → still works
    state["p2p"]=False;await pg.evaluate("MK.p2pBuy=null;MK.p2pSell=null;MK.t=0");await pg.evaluate("mkRefresh()");await pg.wait_for_timeout(500)
    chk("works without P2P ads",await pg.evaluate("MK.usdtInr===88.12&&!MK.p2pBuy"))
    # offline → keeps old price
    state["down"]=True;await pg.evaluate("MK.t=Date.now()-20*60e3");await pg.evaluate("mkRefresh()");await pg.wait_for_timeout(500)
    t=await pg.inner_text("#mkStrip")
    chk("offline keeps last price marked old","88.12" in t and "old" in t.lower())
    await pg.evaluate("buildFolders()")
    chk("drawer entry",await pg.evaluate("!!document.querySelector('#dAll [data-sheet=\"market\"]')"))
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
