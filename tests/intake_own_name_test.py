# BUY paid from my own bank: the name my bank prints (DEEPAK SAHU) is me, and the counterparty is only the seller.
import asyncio, json, time
from playwright.async_api import async_playwright
FX="/home/claude/p2p-order-book/tests/fixtures/"
T={"pay1.png":open(FX+"pay_gpay_amit_4797.txt").read(),"ord1.png":open(FX+"order_kucoin_buy_4797.txt").read()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":now-30*864e5}]
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
async def run(owner,pay=None):
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    if owner: await pg.evaluate(f"setPref('owner',{json.dumps(owner)})")
    await pg.evaluate("window.__T=%s"%json.dumps({**T,**({"pay1.png":pay} if pay else {})}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0];const row=k=>(g.cmp.f||g.cmp.fields||[]).find(x=>x.k===k);return {side:ixSide(g),buyer:g.X.ord.buyer,seller:g.X.ord.seller,sender:g.X.pay.sender,rb:(row('buyer')||{}).res,rs:(row('seller')||{}).res,time:(row('time')||{}).res,overall:g.cmp.overall}})()")
    await b.close();return r,errs
for owner in ("Shiv","Shiv Sahu",""):
    r,errs=asyncio.run(run(owner))
    print(owner or "(no owner name)",r)
    chk(f"[{owner or 'none'}] it is a BUY",r["side"]=="BUY")
    chk(f"[{owner or 'none'}] Sender vs Buyer is not a mismatch",r["rb"] in("MATCH",)) 
    chk(f"[{owner or 'none'}] Receiver vs Seller matches",r["rs"]=="MATCH")
    chk(f"[{owner or 'none'}] buyer is not the counterparty",(r["buyer"] or "").upper().find("AMIT")<0)
    chk(f"[{owner or 'none'}] no page errors",not errs)
# not my bank: someone else's account paid -> must still be flagged
other=T["pay1.png"].replace("Axis Bank 7410","Axis Bank 1111").replace("DEEPAK SAHU","RAJESH VERMA")
r,errs=asyncio.run(run("Shiv",other));print("third party",r)
chk("third-party payer is still flagged (not MATCH)",r["rb"]!="MATCH" and r["overall"]!="VERIFIED")
# my bank, but paid to the wrong person -> must still mismatch
wrong=T["pay1.png"].replace("To AMIT MISHRA","To SUNIL GUPTA").replace("To: AMIT MISHRA","To: SUNIL GUPTA")
r,errs=asyncio.run(run("Shiv",wrong));print("wrong receiver",r)
chk("wrong receiver is still flagged",r["rs"]!="MATCH" and r["overall"]!="VERIFIED")
print("FAILS",f)
