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
  O=open(FX+"order_sell_19000.txt").read();P=open(FX+"pay_axis_19000.txt").read()
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"State Bank of India","accNo":"XXXXXX2594","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,bank],{"o.png":O,"p.png":P},["o.png","p.png"])
    pre=await pg.evaluate("(()=>{const g=ixS.groups[0];return{why:g.risk.reasons,vp:(g.pays[0].pay||{}).vpa,rc:g.X.pay.receiver,mine:ixMyVpas()}})()")
    print(pre)
    r=await pg.evaluate("ixSave(ixS.groups[0],true)");print(r)
    await pg.wait_for_timeout(400)
    post=await pg.evaluate("({vpas:(banks.find(b=>b.id==='B1')||{}).vpas,mine:ixMyVpas(),names:ixMyNames()})");print(post)
    chk("saved",r.get("state")=="saved")
    chk("UPI ID learned on the bank",any("9522881143@upi"==v for v in (post["vpas"] or [])))
    chk("name learned",any("DEEPAK" in n.upper() for n in post["names"]))
    chk("no errors",not e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
