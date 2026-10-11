import asyncio, json, os
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
BASE="Transfer Details\nPhonePe Transaction ID\nT26101001405459%s\nDebited from\n%s\nUTR: %s\nSend Again View History Split Expense Share Receipt\n"
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  O=open(FX+"order_buy_split.txt").read()
  b1={"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"XXXXXX2594","type":"Bank","opening":100000,"time":now-30*864e5}
  b2={"id":"B2","kind":"bank","name":"SBI","bankName":"SBI","accNo":"XXXXXX4871","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for label,r1,r2 in [("rupee sign lost","XXXXXX2594 30,000","XXXXXX4871 1,905.25"),("rupee sign read as 7","XXXXXX2594 730,000","XXXXXX4871 71,905.25"),("rupee sign kept","XXXXXX2594 ₹30,000","XXXXXX4871 ₹1,905.25")]:
      A=BASE%("1",r1,"250623501155");B=BASE%("2",r2,"250623501166")
      pg,e=await scen(b,[SET,b1,b2],{"a.png":A,"b.png":B,"o.png":O},["a.png","b.png","o.png"])
      g=await pg.evaluate("ixS.groups.map(g=>({n:g.items.length,part:g.partSum,amts:g.pays.map(p=>p.pay&&p.pay.amount),why:g.risk.reasons}))")
      print(label,g)
      chk(label+": one transaction with the 2 parts",len(g)==1 and g[0]["n"]==3)
      chk(label+": parts add up to the order total",g[0]["part"]==31905.25)
      chk(label+": no errors",not e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
