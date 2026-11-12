# real KuCoin + GPay screenshots (28 Oct 2026): the two names on the order page and the paying account must read cleanly without AI
import asyncio, json, os, sys
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":1}]
f=0
def chk(n,c):
  global f
  print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
async def run(pay,order):
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv Sahu')")
    await pg.evaluate("window.__T=%s"%json.dumps({"pay1.png":open(FX+pay).read(),"ord1.png":open(FX+order).read()}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0];const row=k=>g.cmp.fields.find(x=>x.k===k)||{};return{cp:g.X.ord.cp,nick:g.X.ord.nick,l4:g.X.pay.last4,buyer:row('buyer').res,seller:row('seller').res,overall:g.cmp.overall,risk:g.risk.level,ai:g.reasonsAI}})()")
    await b.close();return r,errs
r,errs=asyncio.run(run("pay_gpay_mahnder.txt","order_kucoin_mahnder.txt"));print(r)
chk("wrapped counterparty name is read whole",r["cp"]=="mahnder Thakur")
chk("masked e-mail is kept as the second name",r["nick"]=="mah***@gmail.com")
chk("paying account is the 7410 chip, not the phone number",r["l4"]=="7410")
chk("your name vs banking name is a match",r["buyer"]=="MATCH" and r["seller"]=="MATCH")
chk("verified, low risk, no AI needed",r["overall"]=="VERIFIED" and r["risk"]=="LOW" and not r["ai"])
chk("no page errors",not errs)
r,errs=asyncio.run(run("pay_phonepe_affan.txt","order_kucoin_affan.txt"));print(r)
chk("name wrapped over two lines is read whole",r["cp"]=="MOHAMED AFFAN ABBAS KASKAR" and r["nick"]=="aff***@gmail.com")
chk("UPI Lite payment asks for review, not AI",r["overall"]=="REVIEW" and not r["ai"])
print("FAILS",f);sys.exit(1 if f else 0)
