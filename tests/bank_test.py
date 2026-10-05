import asyncio, json, time
from playwright.async_api import async_playwright
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC main","type":"Bank","opening":10000,"time":now-9e8,"limits":{"ALL":50000}},
 {"id":"B2","kind":"bank","name":"SBI old","type":"Bank","opening":500,"time":now-9e8,"status":"frozen"},
 {"id":"o1","side":"SELL","coin":"USDT","qty":100,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Ravi","note":"","time":now-3600e3,"splits":[{"bank":"B1","amt":9000,"method":"UPI"}]},
 {"id":"o2","side":"BUY","coin":"USDT","qty":50,"rate":89,"status":"Pending","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Amit","note":"","time":now-1800e3,"splits":[{"bank":"B1","amt":4450,"method":"UPI"}]},
 {"id":"o3","side":"SELL","coin":"USDT","qty":10,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Old","note":"","time":now-5*864e5,"splits":[{"bank":"B1","amt":900,"method":"UPI"}]}]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    await pg.click("#t-wallet");await pg.wait_for_timeout(400)
    print("rows:",await pg.evaluate("[...document.querySelectorAll('#bankList .bank')].map(e=>e.innerText.replace(/\\n/g,' | '))"))
    await pg.evaluate("document.querySelector('#bankList .bank').click()");await pg.wait_for_timeout(400)
    await pg.screenshot(path="bank_ledger.png")
    print("stats:",await pg.evaluate("document.querySelector('.bstats').innerText.replace(/\\n/g,' | ')"))
    await pg.click("#l-rec");await pg.wait_for_timeout(300)
    await pg.fill("#br-real","15000");await pg.wait_for_timeout(200)
    print("diff:",await pg.inner_text("#br-diff"),"fixbtn hidden:",await pg.evaluate("document.querySelector('#br-fix').hidden"))
    pg.on("dialog",lambda d:asyncio.ensure_future(d.accept()))
    await pg.click("#br-fix");await pg.wait_for_timeout(500)
    print("after:",await pg.evaluate("[balances().bal.B1, recs.filter(r=>r.kind==='bankrec').length, recs.find(r=>r.id==='B1').opening]"))
    await pg.screenshot(path="bank_after.png")
    print("errs",errs)
    await b.close()
asyncio.run(main())
