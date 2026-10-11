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
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"State Bank of India","accNo":"XXXXXX2594","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    async def run(payfile,bk):
      P=open(FX+payfile).read()
      pg,e=await scen(b,[SET,bk],{"o.png":O,"p.png":P},["o.png","p.png"])
      r=await pg.evaluate("(()=>{const g=ixS.groups[0],M=ixMine(g);return{lines:M.lines.map(l=>l.s+': '+l.t),why:g.risk.reasons,rc:g.X.pay.receiver,l4:(g.pays[0].pay||{}).last4}})()")
      print(payfile,r);return r,e
    r,e=await run("pay_axis_19000_acct.txt",bank)
    chk("account number ends like your bank: receiver accepted as yours",any(l.startswith("ok: Receiver") for l in r["lines"]))
    chk("no 'is this your account?' question",not any("not in your saved accounts" in l for l in r["lines"]))
    chk("no errors",not e)
    chk("names no longer reported as partly matching",not any("partly" in w for w in r["why"]))
    r2,e2=await run("pay_axis_19000.txt",bank)
    chk("bank name alone (no account number) still asks",any("not in your saved accounts" in l for l in r2["lines"]))
    other=dict(bank,accNo="XXXXXX7777")
    r3,e3=await run("pay_axis_19000_acct.txt",other)
    chk("account number that is NOT yours still asks",any("not in your saved accounts" in l for l in r3["lines"]))
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
