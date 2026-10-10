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
  A=open(FX+"gpay2_30000.txt").read()+"\nDebited from\nXXXX487410\n";B=open(FX+"gpay2_1905.txt").read()+"\nDebited from\nXXXXXX2394\n";O=open(FX+"order2_buy_split.txt").read()
  b1={"id":"BA","kind":"bank","name":"Axis Main","bankName":"Axis Bank","accNo":"91000487410","type":"Bank","opening":100000,"time":now-30*864e5}
  b2={"id":"BB","kind":"bank","name":"Slice","bankName":"Slice","accNo":"5552394","type":"Bank","opening":5000,"time":now-30*864e5}
  b3={"id":"BC","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"7770001","type":"Bank","opening":1000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,b1,b2,b3],{"a.png":A,"b.png":B,"o.png":O},["a.png","b.png","o.png"])
    r=await pg.evaluate("ixS.groups.map(g=>({part:g.partSum,l4:g.pays.map(x=>x.pay.last4),pick:g.pays.map(x=>{const k=ixPartBank(x,ixSide(g));return k&&k.id})}))")
    print(r)
    chk("one group with 2 parts",len(r)==1 and r[0]["part"]==31905)
    chk("each part matched to its own bank by the account digits",sorted([x for x in r[0]["pick"] if x])==["BA","BB"])
    chk("card lists the parts with a bank picker",await pg.evaluate("document.querySelectorAll('[data-ixpart]').length")==2)
    # user fixes a part by hand: pick HDFC for the 1,905 part
    await pg.evaluate("""(()=>{const g=ixS.groups[0];const x=g.pays.find(p=>p.pay.amount===1905);const s=document.querySelector('[data-ixpart="'+x.hash+'"]');s.value='BC';s.dispatchEvent(new Event('change',{bubbles:true}))})()""")
    chk("manual pick sticks",await pg.evaluate("(()=>{const g=ixS.groups[0];const x=g.pays.find(p=>p.pay.amount===1905);return x.bankPick==='BC'})()"))
    await pg.evaluate("ixS.autoOff=true")
    res=await pg.evaluate("ixSave(ixS.groups[0],true)");print(res)
    sp=await pg.evaluate("(orders.find(o=>o.side==='BUY')||{}).splits")
    chk("saved with a split per bank",sorted([(x['bank'],x['amt']) for x in sp])==[("BA",30000),("BC",1905)])
    bal=await pg.evaluate("balances().bal")
    chk("each bank balance reduced by its own part",abs(bal["BA"]-70000)<1 and abs(bal["BC"]-(1000-1905))<1 and abs(bal["BB"]-5000)<1)
    chk("no errors",not e);print(e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
