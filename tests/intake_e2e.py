import asyncio, json, os
from playwright.async_api import async_playwright
T0=1_780_000_000_000
RECS=[{"id":"A","kind":"bank","name":"HDFC main","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":T0},
 {"id":"o1","side":"BUY","coin":"USDT","qty":100,"rate":25,"status":"Pending","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Ravi Kumar","note":"","time":T0,"splits":[]}]
FX="/home/claude/p2p-order-book/tests/fixtures/"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    # offline stand-in for the in-app OCR (needs a CDN download); everything after it is the real flow
    txt=open(FX+"pay_phonepe.txt").read()
    await pg.evaluate("t=>{ocrWorker={};ixOcr=async()=>({text:t,conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'asset1'})}}",txt)
    nav=await pg.evaluate("[...document.querySelectorAll('[id^=t-]')].map(e=>e.id)");print(nav)
    await pg.evaluate("(document.querySelector('#t-intake')||document.querySelector('[data-go=intake]')).click()");await pg.wait_for_timeout(300)
    await pg.set_input_files("#i2-file","/tmp/claude-0/pay/phonepe.png");await pg.wait_for_timeout(300)
    print("auto-saved?",await pg.evaluate("orders.length"))
    await pg.wait_for_timeout(3000)
    has=await pg.evaluate("!!document.querySelector('.paycard')");print("payment card shown:",has)
    await pg.evaluate("document.querySelector('.paycard').scrollIntoView({block:'center'})");await pg.screenshot(path="intake_card.png")
    await pg.click(".paycard [data-ok]");await pg.wait_for_timeout(800)
    o=await pg.evaluate("(()=>{const o=orders.find(x=>x.id==='o1');return {pv:o.pv,utr:o.utr,proofs:o.proofs,shots:(o.shots||[]).length,bank:allocated(o)}})()");print(o)
    await pg.screenshot(path="intake_done.png");print("errs",errs)
    await b.close()
asyncio.run(main())
