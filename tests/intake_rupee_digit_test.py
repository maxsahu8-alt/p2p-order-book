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
  P=open(FX+"pay_phonepe_3207.txt").read();O=open(FX+"order_buy_3207.txt").read()
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"SBI","accNo":"2594","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,bank],{"o.png":O,"p.png":P},["o.png","p.png"])
    g=await pg.evaluate("ixS.groups.map(g=>({n:g.items.length,amt:g.X.pay&&g.X.pay.amount,fixed:g.X.pay&&g.X.pay.amountFixed,risk:g.risk||null}))")
    print(g)
    chk("one transaction",len(g)==1 and g[0]["n"]==2)
    chk("73,207.21 corrected to 3,207.21",g and g[0]["amt"]==3207.21)
    chk("a real 73,207.21 with no matching order is untouched",await pg.evaluate("payParse('Paid to\\nBob\\n73,207.21\\nUTR: 250623501155').amount")==73207.21)
    chk("no errors",not e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
