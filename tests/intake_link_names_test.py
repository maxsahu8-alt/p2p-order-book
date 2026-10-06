import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
T={n:open(FX+f).read() for n,f in {"pay1.png":"pay_phonepe.txt","ord1.png":"order_kucoin.txt"}.items()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":now-30*864e5},
 {"id":"o9","side":"BUY","coin":"USDT","qty":50,"rate":90,"status":"Completed","time":now-5*864e5,"cp":"Sono","pay":"UPI","splits":[]}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("window.__T=%s"%json.dumps(T))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.click("#i2-go");await pg.wait_for_timeout(2800)
    await pg.evaluate("void(()=>{const g=ixS.groups[0];g.side='BUY';g.order.ord.seller='Sono';(g.pays[0].pay||g.X.pay).receiver='DHIRAJ KUMAR';g.X.ord.seller='Sono';g.X.pay.receiver='DHIRAJ KUMAR';ixDraw()})()")
    await pg.wait_for_timeout(200)
    cand=await pg.evaluate("(()=>{const c=ixLinkCand(ixS.groups[0]);return c?[c.nick,c.real]:null})()")
    chk("link offered for two different names",cand==["Sono","DHIRAJ KUMAR"])
    chk("button visible",await pg.evaluate("!!document.querySelector('[data-ix=linknames]')"))
    await pg.evaluate("document.querySelector('[data-ix=linknames]').click()");await pg.wait_for_timeout(400)
    chk("same client key after link",await pg.evaluate("cpKey('Sono')===cpKey('DHIRAJ KUMAR')"))
    chk("old orders now under the real name",await pg.evaluate("(()=>{const s=cpStats()[cpKey('DHIRAJ KUMAR')];return !!s&&s.name==='DHIRAJ KUMAR'&&s.n>=1})()"))
    chk("names count as same person later",await pg.evaluate("verName('Sono','DHIRAJ KUMAR')==='M'"))
    chk("aka shown for trader",await pg.evaluate("akaNames('DHIRAJ KUMAR').includes('Sono')"))
    chk("offer gone after linking",await pg.evaluate("!ixLinkCand(ixS.groups[0])"))
    await pg.evaluate("sheets.trader('DHIRAJ KUMAR')");chk("trader sheet shows also known as","also known as" in (await pg.inner_text("#sheetBody")).lower())
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
