import asyncio, json, os, sys
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  A=open(FX+"pay_gpay_30000.txt").read();B=open(FX+"pay_gpay_1905.txt").read();O=open(FX+"order_buy_split.txt").read()
  bank={"id":"B1","kind":"bank","name":"Slice","bankName":"Slice","accNo":"1","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,bank],{"a.png":A,"b.png":B,"o.png":O},["a.png","b.png","o.png"])
    g=await pg.evaluate("ixS.groups.map(g=>({n:g.items.length,part:g.partSum,seller:g.X.ord.seller,recv:g.X.pay.receiver,side:ixSide(g)}))")
    chk("one transaction from 3 screenshots",len(g)==1 and g[0]["n"]==3)
    chk("30,000 + 1,905 read as parts of 31,905",g[0]["part"]==31905)
    chk("misread 71,905 does not stay",await pg.evaluate("payParse(%s).amount===0"%json.dumps(B)))
    chk("receiver name read from wrapped lines","Hussain" in (g[0]["recv"] or ""))
    chk("seller has the wrapped surname","BELLARY" in (g[0]["seller"] or ""))
    # a genuine 7,500 with no rupee sign is still read
    chk("7,500 Split Expense stays 7500",await pg.evaluate("payParse('Payment Successful\\nBob Kumar\\n7,500 Split Expense\\nDone').amount")==7500)
    chk("no errors",not e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
