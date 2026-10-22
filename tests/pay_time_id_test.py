# The PhonePe transaction id (T + yymmddHHMMSS...) carries the payment time. A misread clock must not beat it.
import asyncio, json, time, datetime as dt, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
# a payment 40 minutes ago (kept relative so the test never goes stale)
pay=dt.datetime.now()-dt.timedelta(minutes=40);order=pay-dt.timedelta(minutes=7)
tid="T"+pay.strftime("%y%m%d%H%M%S")+"88954583"
hh=int(pay.strftime("%I"));ap=pay.strftime("%p").lower();day=pay.strftime("%d %b %Y")
good=f"{hh}:{pay.strftime('%M')} {ap} on {day}";drop=good[1:] if hh>=10 else good  # lose the first digit of 10/11/12
want=pay.strftime("%H:%M")
def PAYTXT(clock):return f"Transaction Successful\n{clock}\nPaid to\nBhagwani Devi\n₹1,455\n••••••5760@ybl\nBanking Name : Bhagwani Devi\nPhonePe Transaction ID\n{tid}\nDebited from\nXXXX487410\nUTR: 915620757521"
ORD=f"Transaction Complete\nSuccess! 14.85 USDT has been added to your Funding Account.\nBuy USDT\nTotal Amount 1,455.6 INR\nUSDT Price 98.02 INR\nAmount 14.85 USDT\nCounterparty Bhagwani Devi(rin***@gmail.com)\nOrder Number 6ada506510996b0001094bc2\nCreated At {order.strftime('%m/%d/%Y %H:%M:%S')}"
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":now-30*864e5}]
async def run(paytxt):
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv')")
    await pg.evaluate("window.__T=%s"%json.dumps({"pay1.png":paytxt,"ord1.png":ORD}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0];const row=k=>(g.cmp.f||g.cmp.fields||[]).find(x=>x.k===k);return {t:g.X.pay.time,tm:(row('time')||{}).res,overall:g.cmp.overall,note:g.dateNote||''}})()")
    # AI path: the AI repeats the misread time on top of the phone reading
    r2=await pg.evaluate("(()=>{const g=ixS.groups[0];const X=g.X;X.pay.date=X.pay.date;X.pay.time='%s';ixResolveDates(g,X);return {t:X.pay.time,note:g.dateNote||''}})()"%("13:42" if want!="13:42" else "01:42"))
    await b.close();return r,r2,errs
r,r2,errs=asyncio.run(run(PAYTXT(drop)))
print("dropped-digit reading:",drop,"->",r,r2)
chk("misread clock is corrected from the transaction id (time="+want+")",r["t"]==want)
chk("Date & time row matches the order",r["tm"]=="MATCH")
chk("the card says where the time came from",("transaction id" in r["note"]) or drop==good)
chk("AI repeating the wrong time is corrected too",r2["t"]==want)
chk("no page errors",not errs)
r,r2,errs=asyncio.run(run(PAYTXT(good)))
chk("a correct clock is left alone",r["t"]==want and r["tm"]=="MATCH")
print("FAILS",f)
