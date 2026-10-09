import asyncio, json, time, os, datetime
os.environ.setdefault("APP","/home/claude/p2p-tracker.html")
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  PAY=open(FX+"pay_slice_deepak.txt").read();ORD=open(FX+"order_kucoin_tax.txt").read()
  B7={"id":"B7","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"91000000007410","type":"Bank","opening":100000,"time":now-30*864e5,"vpas":["svdeep@axisbank"]}
  d=datetime.datetime.now()
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg=await b.new_page()
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.goto("file://"+os.environ["APP"],wait_until="commit");await pg.wait_for_timeout(1200)
    A=lambda t:pg.evaluate("(t)=>{const r=ixTimeAlts(t);return [r.amb,r.alts.map(ixMs)]}",t)
    r=await A("Created At 10/09/2026 08:56:09");print(r);chk("10/09/2026 has two readings, day/month first",r==[True,["2026-09-10 08:56","2026-10-09 08:56"]])
    r=await A("2026-10-09 08:56");chk("year first has one reading",r==[False,["2026-10-09 08:56"]])
    r=await A("10/09 08:59");print(r);chk("no year, two readings, this year",r[0] and r[1][1]=="2026-10-09 08:59")
    r=await A("09 Oct '26, 08:49 am");chk("month name with 'yy",r==[False,["2026-10-09 08:49"]])
    r=await A("13/10/2026 10:00");chk("day 13 can only be day/month",r[0]==False and len(r[1])==1 and r[1][0].startswith("2026-10-13"))
    r=await A("10/13/2026 10:00 PM");chk("month first when second is 13",r[0]==False and r[1][0]=="2026-10-13 22:00")
    # A: exchange date month/day + payment with a month name
    pg,e=await scen(b,[SET,B7],{"p.png":PAY,"o.png":ORD},["p.png","o.png"])
    g=await pg.evaluate("ixS.groups.map(g=>({when:g.X.ord.when,alt:g.X.ord.whenAlt,pay:g.X.pay.date+' '+g.X.pay.time,note:g.dateNote,tf:g.cmp.fields.find(f=>f.k==='time')}))")
    print(g)
    chk("A order date is 9 Oct 08:56 (month/day), payment 9 Oct 08:49",g[0]["when"]=="2026-10-09 08:56" and g[0]["pay"]=="2026-10-09 08:49" and g[0]["alt"] is None)
    chk("A card says how the date was read",bool(g[0]["note"]) and "month/day" in g[0]["note"])
    chk("A payment 7 min before Created is a check, not a mismatch",g[0]["tf"]["res"]=="UNCLEAR")
    await pg.wait_for_timeout(3500);pf=await pg.evaluate("pref('ixDfmt')");print(pf)
    chk("A learned: exchange uses month/day",json.loads(pf or "{}").get("ord")=="MDY")
    chk("A no errors",not e)
    # B: order only, no payment: closest to today wins
    for fmt,nm in (("%d/%m/%Y","day-first"),("%m/%d/%Y","month-first")):
      dt=(d-datetime.timedelta(days=2)).strftime(fmt)
      o=ORD.replace("10/09/2026 08:56:09",dt+" 08:56:09")
      pg,e=await scen(b,[SET,B7],{"o.png":o},["o.png"])
      w=await pg.evaluate("ixS.groups.length?ixS.groups[0].X.ord.when:null");print(nm,dt,w)
      chk("B "+nm+" order-only date is the recent one",w==(d-datetime.timedelta(days=2)).strftime("%Y-%m-%d")+" 08:56")
    # C: learned format decides when both readings are old
    recs=[{**SET,"prefs":{"owner":"Shiv Sahu","ixDfmt":json.dumps({"ord":"MDY"})}},B7]
    o=ORD.replace("10/09/2026 08:56:09","05/06/2026 08:56:09")
    pg,e=await scen(b,recs,{"o.png":o},["o.png"])
    w=await pg.evaluate("ixS.groups.length?ixS.groups[0].X.ord.when:null");print("C",w)
    chk("C learned month/day makes 05/06/2026 = 6 May",w=="2026-05-06 08:56")
    pg,e=await scen(b,[SET,B7],{"o.png":o},["o.png"])
    w=await pg.evaluate("ixS.groups.length?ixS.groups[0].X.ord.when:null");print("C2",w)
    chk("C2 nothing learned: the date nearer today (5 Jun)",w=="2026-06-05 08:56")
    # D: payment date ambiguous too
    pay2=PAY.replace("09 Oct ‘26, 08:49 am","09/10/2026 08:49 am").replace("09 Oct '26, 08:49 am","09/10/2026 08:49 am")
    pg,e=await scen(b,[SET,B7],{"p.png":pay2,"o.png":ORD},["p.png","o.png"])
    g=await pg.evaluate("ixS.groups.map(g=>({when:g.X.ord.when,pay:g.X.pay.date+' '+g.X.pay.time,note:g.dateNote}))");print(g)
    chk("D payment 09/10/2026 + exchange 10/09/2026 settle on 9 Oct for both",g[0]["when"].startswith("2026-10-09") and g[0]["pay"].startswith("2026-10-09"))
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
