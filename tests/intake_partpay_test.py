import asyncio, json, time, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
pay=open(FX+"pay_phonepe.txt").read(); order=open(FX+"order_kucoin.txt").read()
payA=pay.replace("~2,500","~1,500")
payB=(pay.replace("~2,500","~1,000").replace("T2610052141123456789","T2610052144987654321").replace("UTR 628151234567","UTR 628159999999")
      .replace("09:41 PM","09:44 PM").replace("XXXXXX1234 (HDFC","XXXXXX9876 (SBI").replace("Bank)","Bank)"))
T={"payA.png":payA,"payB.png":payB,"ord1.png":order}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":now-30*864e5},
      {"id":"B2","kind":"bank","name":"SBI","bankName":"SBI","accNo":"30000000009876","type":"Bank","opening":100000,"time":now-30*864e5}]
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
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("payA.png",1),mk("payB.png",2),mk("ord1.png",3)]);await pg.wait_for_timeout(2800)
    info=await pg.evaluate("ixS.groups.map(g=>[g.order?1:0,g.pays.length,g.pays.map(x=>x.support?'s':'p').join('')])")
    print("groups:",info)
    chk("one group with order and two part payments",len(info)==1 and info[0][0]==1 and info[0][1]==2)
    await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(900)
    r=await pg.evaluate("(()=>{const o=orders[0];return o?{n:orders.length,sp:(o.splits||[]).map(s=>[s.bank,s.amt]),qty:o.qty}:null})()")
    print("saved:",r)
    chk("one order saved",r and r["n"]==1)
    chk("two bank splits saved (HDFC 1500 + SBI 1000)",r and sorted(map(tuple,r["sp"]))==[("B1",1500),("B2",1000)])
    chk("fully allocated (no 'not assigned to a bank')",await pg.evaluate("(()=>{const o=orders[0];return Math.abs(allocated(o)-orderTotal(o))<1})()"))
    chk("no page errors "+str(errs),not errs)
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
