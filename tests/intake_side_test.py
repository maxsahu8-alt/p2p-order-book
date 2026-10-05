import asyncio, json, time
from playwright.async_api import async_playwright
FX="/home/claude/p2p-order-book/tests/fixtures/"
T={n:open(FX+f).read() for n,f in {"pay1.png":"pay_phonepe.txt","ord1.png":"order_kucoin.txt"}.items()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":now-30*864e5}]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    await pg.evaluate("window.__T=%s"%json.dumps(T))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    J="(()=>{const g=ixS.groups[0],M=ixMine(g);return [ixSide(g),M.verdict,M.lines.map(l=>l.s+':'+l.t),g.X.ord.side,g.X.pay.dir,g.X.pay.sender,g.X.pay.receiver,g.X.pay.acct,g.cmp.overall,g.risk.level,g.risk.reasons]})()"
    print("1 default:",await pg.evaluate(J))
    await pg.screenshot(path="buy_default.png",full_page=True)
    await pg.evaluate("void(()=>{settings.prefs=settings.prefs||{};settings.prefs.owner='Shiv Sahu';ixS.groups.forEach(g=>ixVerify(g));ixDraw()})()")
    print("2 owner Shiv Sahu:",await pg.evaluate(J))
    await pg.evaluate("document.querySelector('[data-ix=flip]').click()");await pg.wait_for_timeout(300)
    print("3 flipped:",await pg.evaluate(J))
    await pg.screenshot(path="buy_flipped.png",full_page=True)
    print("errs",errs)
    await b.close()
asyncio.run(main())
