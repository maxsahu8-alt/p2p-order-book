import asyncio, json, time, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
now=int(time.time()*1000);D=864e5
def O(i,cp,side="SELL",st="Completed",ago=1):
  return {"id":"o%d"%i,"side":side,"coin":"USDT","qty":100,"rate":92,"status":st,"time":int(now-ago*3600e3),"cp":cp,"pay":"UPI","splits":[{"bank":"B1","amt":9200,"method":"UPI"}]}
RECS=[{"id":"B1","kind":"bank","name":"HDFC","holder":"Shiv Sahu","bankName":"HDFC Bank","accNo":"50100012341234","ifsc":"hdfc0001234","upi":"shiv@okhdfc","type":"Bank","opening":100000,"time":now-30*D},
 O(1,"Likith Shetty"),O(2,"Likith Rajesh Shetty",ago=5),O(3,"Ravi Kumar",st="Pending",ago=0.2),O(4,"Mohan Das",ago=30)]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n)
    ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    # templates
    await pg.evaluate("sheets.tpl()");await pg.wait_for_timeout(200)
    t=await pg.inner_text("#sheetBody")
    chk("tpl has account no",("50100012341234" in t))
    chk("tpl has amount",("9,200" in t))
    chk("tpl ifsc upper","HDFC0001234" in t)
    chk("tpl has counterparty name","Ravi Kumar" in t)
    await pg.evaluate("sheets.tpl({oid:'',bid:'',utr:'',mins:'5',amt:'',q:'please wait'})");await pg.wait_for_timeout(100)
    chk("tpl search",await pg.evaluate("document.querySelectorAll('#sheetBody .p7c').length")==1)
    await pg.evaluate("putRec({id:'tpl_x',kind:'tpl',name:'Mine',text:'Hi {name} pay {amount}',time:1})");await pg.evaluate("sheets.tpl()")
    chk("custom tpl",("Mine" in await pg.inner_text("#sheetBody")))
    # identity
    sug=await pg.evaluate("identSuggest().map(s=>[s.a.name,s.b.name,s.why])")
    chk("suggests Likith pair",any("Likith" in a and "Likith" in b for a,b,_ in sug))
    n0=await pg.evaluate("Object.keys(cpStats()).length")
    await pg.evaluate("identMerge(cpKey('Likith Shetty'),cpKey('Likith Rajesh Shetty'),['a','b'])");await pg.wait_for_timeout(100)
    n1=await pg.evaluate("Object.keys(cpStats()).length")
    chk("merge reduces clients",n1==n0-1)
    chk("keys equal after merge",await pg.evaluate("cpKey('Likith Shetty')===cpKey('Likith Rajesh Shetty')"))
    chk("orders summed",await pg.evaluate("cpStats()[cpKey('Likith Shetty')].n")==2)
    await pg.evaluate("sheets.ident()");chk("ident sheet",("merged" in (await pg.inner_text("#sheetBody")).lower()))
    await pg.evaluate("delRec('idn_'+Object.keys(cpStats()).length+'x')")
    await pg.evaluate("recs.filter(r=>r.kind==='ident').forEach(r=>delRec(r.id))");await pg.wait_for_timeout(100)
    chk("undo merge",await pg.evaluate("cpKey('Likith Shetty')!==cpKey('Likith Rajesh Shetty')"))
    # khata
    await pg.evaluate("""(async()=>{
      await putRec({id:'k1',kind:'khata',key:cpKey('Mohan Das'),name:'Mohan Das',t:'gave',cur:'INR',amt:5000,time:Date.now()-2*864e5,due:Date.now()-864e5*2});
      await putRec({id:'k2',kind:'khata',key:cpKey('Mohan Das'),name:'Mohan Das',t:'gave',cur:'USDT',amt:10,time:Date.now()-864e5,due:0});
      await putRec({id:'k3',kind:'khata',key:cpKey('Ravi Kumar'),name:'Ravi Kumar',t:'took',cur:'INR',amt:-1200,time:Date.now(),due:0});})()""");await pg.wait_for_timeout(150)
    B=await pg.evaluate("(()=>{const b=khBook();const m=b[cpKey('Mohan Das')];return [m.bal.INR,m.bal.USDT,b[cpKey('Ravi Kumar')].bal.INR,m.due>0]})()")
    chk("khata balances",B==[5000,10,-1200,True])
    chk("khata alert overdue",await pg.evaluate("(()=>{const l=[];khAlerts(l);return l.length===1&&l[0].hi&&/Mohan/.test(l[0].t)})()"))
    await pg.evaluate("sheets.khata()");t=await pg.inner_text("#sheetBody")
    chk("khata sheet totals","5,000" in t and "1,200" in t)
    await pg.evaluate("khPerson(khBook()[cpKey('Mohan Das')])");await pg.click("#kp-s");await pg.wait_for_timeout(200)
    chk("settle INR",await pg.evaluate("khBook()[cpKey('Mohan Das')].bal.INR")==0)
    chk("remind text",await pg.evaluate("/USDT/.test(khRemind(khBook()[cpKey('Mohan Das')]))"))
    # merge affects khata
    await pg.evaluate("identMerge(cpKey('Ravi Kumar'),cpKey('Mohan Das'),[])");await pg.wait_for_timeout(100)
    chk("khata joins merged",await pg.evaluate("khBook()[cpKey('Mohan Das')].bal.INR")==-1200)
    # drawer
    await pg.evaluate("buildFolders()")
    chk("drawer entries",await pg.evaluate("['tpl','ident','khata'].every(s=>document.querySelector('#dAll [data-sheet=\"'+s+'\"]'))"))
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
