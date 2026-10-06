import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000);D=864e5
def O(i,cp,side="SELL",st="Completed",ago=1,bank="B1",pay="UPI",rate=92):
  return {"id":"o%d"%i,"side":side,"coin":"USDT","qty":100,"rate":rate,"status":st,"time":int(now-ago*3600e3),"cp":cp,"pay":pay,"splits":[{"bank":bank,"amt":100*rate,"method":"UPI"}]}
RECS=[{"id":"B1","kind":"bank","name":"HDFC","type":"Bank","opening":100000,"time":now-40*D,"limits":{"UPI":50000}},
 {"id":"B2","kind":"bank","name":"SBI","type":"Bank","opening":20000,"time":now-40*D},
 O(1,"Ravi",side="BUY",rate=90,ago=24*60),O(2,"Ravi",ago=24*50,rate=93),O(3,"Ravi",ago=24*49,rate=93),O(4,"Ravi",ago=24*48,rate=93),
 O(5,"Sita",ago=2,bank="B2",pay="IMPS"),O(6,"Sita",ago=3,bank="B2"),O(7,"Amit",st="Pending",ago=1)]
# 7 day streak on B1
for k in range(8,16):RECS.append(O(k,"X%d"%k,ago=24*(k-8)+3))
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    # day close
    await pg.evaluate("sheets.dayclose()");t=await pg.inner_text("#sheetBody")
    chk("dayclose open order flagged","open order" in t.lower())
    await pg.fill("[data-dc=B2]","1");await pg.fill("#dc-u","5")
    chk("dayclose diff shown",("short" in (await pg.inner_text("#sheetBody")).lower()) or ("extra" in (await pg.inner_text("#sheetBody")).lower()))
    await pg.click("#dc-s");await pg.wait_for_timeout(200)
    chk("dayclose saved",await pg.evaluate("!!dcToday()&&dcToday().rec.length>=1"))
    chk("dayclose reopen prefilled",await pg.evaluate("(sheets.dayclose(),document.querySelector('[data-dc=B2]').value)")=="1")
    # insights
    for tab in ["clients","methods","time","quiet"]:
      await pg.evaluate(f"sheets.insights('{tab}','all')");await pg.wait_for_timeout(80)
    await pg.evaluate("sheets.insights('clients','all')")
    chk("insights ranks Ravi",("Ravi" in await pg.inner_text("#sheetBody")))
    chk("inactive finds Ravi",await pg.evaluate("insInactive().some(c=>c.name==='Ravi')"))
    d=await pg.evaluate("(()=>{const D=insData(0);return [Object.keys(D.M).sort().join(),D.C[cpKey('Ravi')].n]})()")
    chk("insights data",d[0]=="IMPS,UPI" and d[1]==4)
    # bank health
    h=await pg.evaluate("bhData().map(x=>[x.b.id,x.streak,x.lv,x.adv])")
    chk("streak counted",any(x[0]=="B1" and x[1]>=7 for x in h))
    chk("rest advice",any("Rest" in x[3] for x in h if x[0]=="B1"))
    await pg.evaluate("putRec({id:'fz1',kind:'freeze',bank:'B1',type:'frozen',time:Date.now(),cr24:12,note:'x'})");await pg.wait_for_timeout(100)
    await pg.evaluate("putRec({id:'fz2',kind:'freeze',bank:'B2',type:'frozen',time:Date.now()-5*864e5,cr24:8})");await pg.wait_for_timeout(100)
    chk("frozen state",await pg.evaluate("!!bhState('B1')"))
    chk("safe limit learned",await pg.evaluate("bhLimitSafe()")>0)
    chk("freeze alert",await pg.evaluate("(()=>{const l=[];bhAlerts(l);return l.some(a=>a.hi&&/frozen/.test(a.t))})()"))
    await pg.evaluate("sheets.bankhealth()");chk("bankhealth sheet","FROZEN" in await pg.inner_text("#sheetBody"))
    await pg.evaluate("putRec({id:'fz3',kind:'freeze',bank:'B1',type:'unfrozen',time:Date.now()+1000})");await pg.wait_for_timeout(100)
    chk("unfrozen clears",await pg.evaluate("!bhState('B1')"))
    await pg.evaluate("buildFolders()")
    chk("drawer entries",await pg.evaluate("['dayclose','insights','bankhealth'].every(s=>document.querySelector('#dAll [data-sheet=\"'+s+'\"]'))"))
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
