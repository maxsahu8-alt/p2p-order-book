import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
T={n:open(FX+f).read() for n,f in {"pay1.png":"pay_phonepe.txt","ord1.png":"order_kucoin.txt"}.items()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":now-30*864e5}]
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
    await pg.evaluate("void(()=>{window.__slow=0;ixOcr=async(it)=>{if(it.file.name==='ord1.png'&&window.__slow)await new Promise(r=>setTimeout(r,window.__slow));return {text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'}};assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    files=[mk("pay1.png",1),mk("ord1.png",2)]
    # live view + cancel
    await pg.evaluate("window.__slow=6000")
    await pg.set_input_files("#i2-file",files);await pg.wait_for_timeout(300)
    await pg.click("#i2-go");await pg.wait_for_timeout(2600)
    live=await pg.evaluate("(document.querySelector('.ixlive')||{}).innerText||''")
    chk("live view shows a detected field",("✓" in live) and ("Amount" in live))
    chk("cancel button present",await pg.evaluate("!!document.querySelector('[data-ixcancel]')"))
    await pg.click("[data-ixcancel]");await pg.wait_for_timeout(300)
    chk("cancel stops the run",await pg.evaluate("!ixS.busy&&!document.querySelector('.ixprog')"))
    await pg.wait_for_timeout(5000)
    chk("cancelled run shows no result",await pg.evaluate("document.querySelectorAll('#i2-ix .vres').length")==0)
    # normal run
    await pg.evaluate("window.__slow=0")
    await pg.click("#i2-go");await pg.wait_for_timeout(3000)
    chk("result drawn",await pg.evaluate("document.querySelectorAll('#i2-ix .vres').length")==1)
    sc=await pg.evaluate("(document.querySelector('.ixsc')||{}).innerText||''")
    chk("two separate scores",("Extraction confidence" in sc) and ("Transaction match" in sc))
    v=await pg.evaluate("(()=>{const s=ixScores(ixS.groups[0]);return [s.ext,s.match]})()")
    chk("scores are numbers 0-100",all(isinstance(x,int) and 0<=x<=100 for x in v))
    print("scores",v)
    chk("no debug button by default",await pg.evaluate("!document.querySelector('[data-ix=debug]')"))
    await pg.evaluate("setPref('dev',true);ixDraw()")
    chk("debug button when developer on",await pg.evaluate("!!document.querySelector('[data-ix=debug]')"))
    await pg.click("[data-ix=debug]");await pg.wait_for_timeout(200)
    t=await pg.inner_text("#sheetBody")
    chk("debug screen content",all(k.lower() in t.lower() for k in ["Processing time","Match calculation","AI response","Screenshot 1"]))
    # name dedupe + account label
    r=await pg.evaluate("[ixNameClean('DHIRAJ KUMAR kumar'),ixNameClean('Likith Shetty'),ixNameClean('anand kumar kumar-Anand'),ixAcctOk('Sender A...'),ixAcctOk('XXXXXXXX5842'),ixAcctOk('A/C No. ******5842')]")
    chk("name duplicate removed",r[0]=="DHIRAJ KUMAR" and r[1]=="Likith Shetty")
    chk("account label guard",r[3] is False and r[4] is True and r[5] is True)
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
