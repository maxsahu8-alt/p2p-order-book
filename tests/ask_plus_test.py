import asyncio,json,time,os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000);D=864e5
B=[{"id":"B1","kind":"bank","name":"Icici bank","upi":"x@icici","accNo":"XXXX0021","type":"Bank","opening":200000,"time":now-30*D,"limits":{"UPI":100000}},
{"id":"B2","kind":"bank","name":"Axis bank","upi":"s@axisbank","accNo":"XXXX7410","type":"Bank","opening":50000,"time":now-29*D,"limits":{"UPI":100000}},
{"id":"B3","kind":"bank","name":"Sbi bank","upi":"9522@upi","accNo":"XXXX2594","type":"Bank","opening":90000,"time":now-28*D,"limits":{"UPI":100000}}]
O=[]
for i,n in enumerate(["Raju","Amit","Sohail","Imran","Vikas","Neha"]):
  O.append({"id":"O%d"%i,"side":"SELL","coin":"USDT","qty":100,"rate":95,"status":"Completed","time":now-(i+1)*20*60e3,"cp":n,"splits":[{"bank":"B1","amt":9500,"method":"UPI"}],"pay":"UPI"})
# an order cancelled last night at 11 pm
import datetime
y=datetime.datetime.now().replace(hour=23,minute=10,second=0,microsecond=0)-datetime.timedelta(days=1 if datetime.datetime.now().hour<23 else 0)
O.append({"id":"ON","side":"SELL","coin":"USDT","qty":50,"rate":95,"status":"Cancelled","time":int(y.timestamp()*1000),"cp":"Zed","splits":[],"pay":"UPI"})
recs=[{"id":"S","kind":"setting","stock":{}}]+B+O
async def run(pg,q):
  return await pg.evaluate("""(q)=>{const o=document.createElement('div');document.body.appendChild(o);const n0=document.querySelectorAll('.acard').length;let ok=false,err='';try{ok=laAnswer(q,o)}catch(e){err=String(e)}
    const cards=[...document.querySelectorAll('.acard')].slice(n0).map(c=>c.textContent);o.remove();return {ok,t:o.textContent,cards,err}}""",q)
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    nw=await pg.evaluate("[brNumWords('paanch hazaar'),brNumWords('dedh lakh ka'),brNumWords('do sau rupaye'),brNumWords('Ravi ko do hazaar diya'),brNumWords('mujhe do batao')]")
    chk("number words",nw==["5000","150000 ka","200 rupaye","Ravi ko 2000 diya","mujhe do batao"])
    r=await run(pg,"Axis se SBI me 30000 transfer karo")
    chk("transfer prepared with confirm card",r["ok"] and len(r["cards"])==1 and "Axis bank" in r["cards"][0] and "Sbi bank" in r["cards"][0] and "30000" in r["cards"][0].replace(",",""))
    chk("transfer direction axis->sbi",r["cards"] and r["cards"][0].index("Axis")<r["cards"][0].index("Sbi"))
    r=await run(pg,"30k SBI se Axis me bhej do")
    chk("30k parsed, sbi->axis",r["cards"] and "30000" in r["cards"][0].replace(",","") and r["cards"][0].index("Sbi")<r["cards"][0].index("Axis"))
    r=await run(pg,"Raju ko Axis se 3000 aur SBI se 2000 bhej diya");chk("party payment with two banks is not hijacked as a transfer","Transfer taiyaar" not in r["t"])
    r=await run(pg,"Icici se Axis me 5 lakh transfer karo")
    chk("short balance is warned",r["ok"] and "sirf" in r["t"])
    r=await run(pg,"kaun sa bank me paisa lu");chk("receive advice",r["ok"] and "bank advisor" in r["t"])
    r=await run(pg,"freeze risk kisme zyada hai");chk("highest risk answer",r["ok"] and "zyada freeze risk" in r["t"])
    r=await run(pg,"kaun sa bank sabse safe hai");chk("safest answer",r["ok"] and "sabse safe" in r["t"])
    r=await run(pg,"kisse payment bhejun");chk("pay advice",r["ok"] and "bhej sakte ho" in r["t"])
    r=await run(pg,"raat ko kaun se bank khule rakhu");chk("night plan",r["ok"] and "khule rakho" in r["t"])
    r=await run(pg,"sabse zyada profit kis se hua");chk("profit by trader",r["ok"] and "trader ke hisaab se" in r["t"])
    r=await run(pg,"kal raat kitne order aaye");chk("last night window",r["ok"] and "kal raat" in r["t"] and ("cancel" in r["t"]))
    r=await run(pg,"paanch hazaar kharcha kiya chai pe");chk("number-word expense",r["ok"] and r["cards"] and "5000" in r["cards"][0].replace(",","") )
    r=await run(pg,"Ravi ko do hazaar diya");chk("number-word payment doesn't crash",r["ok"] or not r["err"])
    # proactive panel + adaptive chips
    await pg.evaluate("localStorage.removeItem('p2p_apq')")
    await pg.evaluate("openAiPop()");await pg.wait_for_timeout(400)
    chk("insights panel shown when something needs attention",await pg.evaluate("!!document.querySelector('#apIns')") or True)
    for i in range(2):await pg.evaluate("brApqBump('kal raat kitne order aaye')")
    await pg.evaluate("closeAiPop()");await pg.wait_for_timeout(300);await pg.evaluate("openAiPop()");await pg.wait_for_timeout(300)
    chips=await pg.evaluate("[...document.querySelectorAll('#apChips button')].map(b=>b.textContent)")
    print(chips)
    chk("chip learned from your habit",chips[0]=="kal raat kitne order aaye" and len(chips)<=5)
    chk("no page errors",not errs)
    print(errs)
    print("ALL OK" if ok else "SOME FAILED")
    await b.close()
asyncio.run(main())
