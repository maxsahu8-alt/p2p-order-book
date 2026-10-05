import asyncio, json, time
from playwright.async_api import async_playwright
now=int(time.time()*1000);D=864e5
RECS=[{"id":"B1","kind":"bank","name":"HDFC","type":"Bank","opening":100000,"time":now-30*D}]
for i in range(12):
    RECS.append({"id":f"n{i}","side":"SELL","coin":"USDT","qty":100,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":f"C{i}","note":"","time":now-(i+1)*3600e3,"splits":[{"bank":"B1","amt":9000,"method":"UPI"}],"utr":f"UTR1234567{i:02d}"})
RECS.append({"id":"big","side":"SELL","coin":"USDT","qty":1000,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Whale","note":"","time":now-600e3,"splits":[{"bank":"B1","amt":90000,"method":"UPI"}]})
RECS.append({"id":"dup","side":"SELL","coin":"USDT","qty":100,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Dup","note":"","time":now-500e3,"splits":[{"bank":"B1","amt":8000,"method":"UPI"}],"utr":"UTR123456700"})
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    print("orders",await pg.evaluate("orders.length"),errs)
    print(await pg.evaluate("(()=>{const R=riskReport();return [R.out.length,JSON.stringify(R.cnt),Math.round(sizeRef().lim)]})()"))
    await pg.evaluate("sheets.risk()");await pg.wait_for_timeout(300);await pg.screenshot(path="risk_sheet.png")
    await pg.click("[data-rk=big]");await pg.wait_for_timeout(400)
    print("after check:",await pg.evaluate("[riskReport().out.length, recs.find(r=>r.id==='big').rk]"))
    await pg.fill("#rk-lim","500");await pg.click("#rk-save");await pg.wait_for_timeout(400)
    print("manual 500:",await pg.evaluate("[riskReport().out.length, sizeRef().lim]"),"errs",errs)
    await b.close()
asyncio.run(main())
