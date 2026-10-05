import asyncio, json, time
from playwright.async_api import async_playwright
now=int(time.time()*1000);D=864e5
RECS=[{"id":"B1","kind":"bank","name":"HDFC","type":"Bank","opening":100000,"time":now-30*D},{"id":"B2","kind":"bank","name":"SBI","type":"Bank","opening":0,"time":now-30*D},
 {"id":"b1","side":"BUY","coin":"USDT","qty":100,"rate":88,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"A","note":"","time":now-3*D,"doneAt":now-3*D,"fee":10,"splits":[]},
 {"id":"s1","side":"SELL","coin":"USDT","qty":100,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"B","note":"","time":now-3600e3,"doneAt":now-3600e3,"fee":5,"splits":[{"bank":"B1","amt":9000,"method":"UPI"}]},
 {"id":"c1","side":"SELL","coin":"USDT","qty":50,"rate":95,"status":"Cancelled","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"C","note":"","time":now-7200e3,"splits":[]},
 {"id":"a1","side":"SELL","coin":"USDT","qty":20,"rate":95,"status":"Appeal","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"D","note":"","time":now-7200e3,"splits":[]},
 {"id":"x1","kind":"expense","amt":40,"cat":"Other","biz":True,"bank":"B1","time":now-1800e3},{"id":"x2","kind":"expense","amt":100,"cat":"Food","bank":"B1","time":now-1800e3},
 {"id":"m1","kind":"move","from":"B1","to":"B2","amt":1000,"cost":7,"method":"IMPS","time":now-900e3}]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    r=await pg.evaluate("(()=>{const n=Date.now();const R=profitReport(n-864e5*0.99,n+1);const A=profitReport(0,n+1);return [R.gross,R.fees,R.xfer,R.biz,R.pers,R.net,R.n,R.skipped,R.perUsdt,A.n,A.fees,A.gross,balances().bal.B1]})()")
    print(r)  # expect gross 200,fees5,xfer7,biz40,pers100,net148,n1,skipped2,1.48, all n2 fees15 gross200, B1=100000+9000-40-100-1007
    await pg.click("[data-sheet=profit]");await pg.wait_for_timeout(400)
    await pg.screenshot(path="profit_sheet.png")
    await pg.click("#pa-seg [data-k=all]");await pg.wait_for_timeout(300)
    print(await pg.evaluate("document.querySelector('.insw .rsug').innerText.replace(/\\n/g,' | ')"))
    await pg.click("#pa-seg [data-k=c]");await pg.wait_for_timeout(300)
    print("custom inputs:",await pg.evaluate("!!document.querySelector('#pa-a')"),"errs",errs)
    await b.close()
asyncio.run(main())
