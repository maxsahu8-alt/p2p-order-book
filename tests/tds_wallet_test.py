import asyncio, json, os, time
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
T=int(time.time()*1000)-3600000
RECS=[{"id":"s_main","kind":"setting","stock":{"USDT":100},"prefs":{"owner":"shiv"}},
 {"id":"b1","coin":"USDT","side":"BUY","qty":400,"rate":100,"status":"Completed","time":T-7200000,"cp":"A"},
 {"id":"s1","coin":"USDT","side":"SELL","qty":302.78,"rate":104,"status":"Completed","time":T,"cp":"B","tds":327,"tdsQ":3.0278,"tdsSrc":"ledger"},
 {"id":"s2","coin":"USDT","side":"SELL","qty":50,"rate":100,"status":"Completed","time":T+1000,"cp":"C","tds":50},
 {"id":"s3","coin":"USDT","side":"SELL","qty":10,"rate":100,"status":"Pending","time":T+2000,"cp":"D","tds":10}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":844});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP,wait_until="commit");await pg.wait_for_timeout(1800)
    left=await pg.evaluate("stockLeft().USDT")
    exp=100+400-302.78-3.0278-50-0.5
    chk("USDT left minus sells and TDS (%s vs %s)"%(left,exp),abs(left-exp)<1e-6)
    chk("pending sell TDS ignored",await pg.evaluate("tdsCoin(orders.find(o=>o.id==='s3'))")==0)
    chk("TDS from rupees / rate",await pg.evaluate("tdsCoin(orders.find(o=>o.id==='s2'))")==0.5)
    L=await pg.evaluate("coinLedger('USDT')")
    labels=[r["label"] for r in L["rows"]]
    chk("ledger rows",labels==["Buy Crypto","Sell Crypto","Tax","Sell Crypto","Tax"])
    chk("running balance ends at stock",abs(L["bal"]-exp)<1e-6)
    await pg.evaluate("document.querySelector('#t-wallet').click()");await pg.wait_for_timeout(300)
    await pg.click('#stockCards [data-sheet="coinledger:USDT"]');await pg.wait_for_timeout(300)
    h=await pg.inner_text('#sheetBody')
    chk("sheet shows Tax and Sell Crypto",("Tax" in h) and ("Sell Crypto" in h) and "3.0278" in h)
    await pg.screenshot(path="/tmp/claude-0/ledger_sheet.png")
    chk("no page errors",not errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
