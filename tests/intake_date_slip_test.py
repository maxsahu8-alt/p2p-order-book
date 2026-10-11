import asyncio, json, os
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  O=open(FX+"order_sell_19000.txt").read()
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"SBI","accNo":"2594","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for name,expect_time in [("pay_axis_19000.txt",True),("pay_axis_19000_slip.txt",True),("pay_axis_19000_notime.txt",False)]:
      P=open(FX+name).read()
      pg,e=await scen(b,[SET,bank],{"o.png":O,"p.png":P},["o.png","p.png"])
      r=await pg.evaluate("(()=>{const g=ixS.groups[0];const t=g.cmp.fields.find(x=>x.k==='time');return{t:t.res,lvl:g.risk.level,why:g.risk.reasons}})()")
      print(name,r)
      if expect_time: chk(name+": payment time read and matches",r["t"]=="MATCH")
      else: chk(name+": time not read is not a Medium alarm when everything else matches",not any("Date" in x for x in r["why"]))
      chk(name+": no errors",not e)
    pg=await b.new_page()
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.goto("file:///home/claude/p2p-tracker.html",wait_until="commit");await pg.wait_for_timeout(1200)
    for t in ["11 0CT 2O26, 11.47 AM","11 OCT 2026, 11:47 AM","11 N0V 2026 3.05 PM"]:
      v=await pg.evaluate("payTime(%s)"%json.dumps(t));chk("payTime reads "+t,bool(v))
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
