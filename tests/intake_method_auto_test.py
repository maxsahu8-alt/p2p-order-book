# The exchange page does not show the payment method. It is read from the payment instead of showing "NOT FOUND",
# and it does not pull the match score down. A real difference (order says IMPS, payment is UPI) is still flagged.
import asyncio, json, time, os
from playwright.async_api import async_playwright
FX="/home/claude/p2p-order-book/tests/fixtures/"
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
PAY=open(FX+"pay_gpay_amit_4797.txt").read();ORD=open(FX+"order_kucoin_buy_4797.txt").read()
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":now-30*864e5}]
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
async def run(ordtxt):
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv')")
    await pg.evaluate("window.__T=%s"%json.dumps({"pay1.png":PAY,"ord1.png":ordtxt}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0];const m=g.cmp.fields.find(x=>x.k==='method')||{};return {res:m.res,ord:m.ord,pay:m.pay,match:ixScores(g).match,overall:g.cmp.overall,shown:document.body.innerText.includes('FROM PAYMENT')}})()")
    await b.close();return r,errs
r,errs=asyncio.run(run(ORD));print("order without method:",r)
chk("method row is taken from the payment (AUTO, not NOT FOUND)",r["res"]=="AUTO" and "UPI" in (r["ord"] or ""))
chk("match score is not pulled down by it (100%)",r["match"]==100)
chk("the card says FROM PAYMENT",r["shown"])
chk("overall stays VERIFIED",r["overall"]=="VERIFIED")
r,errs2=asyncio.run(run(ORD+"\nPayment Method IMPS"));print("order says IMPS:",r)
chk("a different method on the order is still flagged",r["res"]=="UNCLEAR")
chk("no page errors",not errs and not errs2)
print("FAILS",f)
