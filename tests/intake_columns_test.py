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
  P=open(FX+"pay_axis_19000.txt").read()
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"SBI","accNo":"2594","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for name in ["order_sell_19000.txt","order_sell_19000_cols.txt"]:
      O=open(FX+name).read()
      pg,e=await scen(b,[SET,bank],{"o.png":O,"p.png":P},["o.png","p.png"])
      g=await pg.evaluate("ixS.groups.map(g=>({n:g.items.length,o:g.X.ord}))")
      o=g[0]["o"]
      chk(name+": one transaction",len(g)==1 and g[0]["n"]==2)
      chk(name+": total is 19,000 rupees, not the coin amount",o["fiat"]==19000)
      chk(name+": price 108.98 and 174.343916 USDT",o["price"]==108.98 and abs(o["crypto"]-174.343916)<1e-6)
      chk(name+": counterparty Nishita",o["cp"]=="Nishita")
      chk(name+": no errors",not e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
