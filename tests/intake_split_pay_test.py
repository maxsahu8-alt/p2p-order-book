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
  A2=open(FX+"gpay2_30000.txt").read();B2=open(FX+"gpay2_1905.txt").read();O2=open(FX+"order2_buy_split.txt").read()
  async with async_playwright() as p:
    b=await p.chromium.launch()
    # same three pictures read the way the phone reader does (prepared image, no clean labels): must still be ONE transaction, no question asked
    pg2,e2=await scen(b,[SET,bank],{"a.png":A2,"b.png":B2,"o.png":O2},["a.png","b.png","o.png"])
    g2=await pg2.evaluate("ixS.groups.map(g=>({n:g.items.length,part:g.partSum,types:g.items.map(i=>i.cls.type)}))")
    print(g2)
    chk("phone-reader text: one transaction of 3",len(g2)==1 and g2[0]["n"]==3 and g2[0]["part"]==31905)
    chk("phone-reader text: no UNKNOWN picture",all(t!="UNKNOWN" for t in g2[0]["types"]))
    chk("phone-reader text: no errors",not e2)
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
