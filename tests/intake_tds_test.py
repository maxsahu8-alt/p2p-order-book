import asyncio, json, time, os, sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("APP","/home/claude/p2p-tracker.html")
import importlib.util
spec=importlib.util.spec_from_file_location("s2",os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py")
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns);scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  PAY=open(FX+"pay_slice_deepak.txt").read();ORD=open(FX+"order_kucoin_tax.txt").read()
  B7={"id":"B7","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"91000000007410","type":"Bank","opening":100000,"time":now-30*864e5,"vpas":["svdeep@axisbank"]}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,B7],{"p.png":PAY,"o.png":ORD},["p.png","o.png"])
    g=(await pg.evaluate("ixS.groups.map(g=>({side:ixSide(g),tds:g.X.ord.tds,tq:g.X.ord.tdsQ,id:g.X.ord.id,buyer:g.X.ord.buyer,sender:g.X.pay.sender,fl:g.X.pay.fromLabel,acct:(g.cmp.fields.find(f=>f.k==='acct')||{}),saved:!!g.saved}))"))[0];print(g)
    chk("sell, TDS read as 330 rupees and 3.0278 USDT",g["side"]=="SELL" and g["tds"]==330 and g["tq"]==3.0278)
    chk("order id whole",g["id"]=="6ac85edie50cd50001678f0a")
    chk("buyer is the counterparty, no bank label as sender",g["buyer"]=="Sonu" and not g["sender"] and g["fl"]=="slice savings")
    a=g["acct"];print(a)
    chk("accounts row has from (client) and to (you)","From (client)" in a.get("pay","") and "To (you)" in a.get("pay","") and "slice savings" in a["pay"] and "svdeep@axisbank" in a["pay"])
    chk("card shows TDS row",await pg.evaluate("!!document.querySelector('.ixtds')"))
    await pg.evaluate("ixS.autoOff=true");await pg.evaluate("document.querySelector('[data-ix=save]')&&document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(1000)
    r=await pg.evaluate("orders.map(o=>({side:o.side,tds:o.tds,tdsQ:o.tdsQ,exId:o.exId,cp:o.cp}))");print(r)
    chk("saved sell carries TDS 330",len(r)==1 and r[0]["side"]=="SELL" and r[0]["tds"]==330 and r[0]["tdsQ"]==3.0278)
    chk("no errors",not e);print(e)
    # manual: no tax line -> Add 1%
    pg,e=await scen(b,[SET,B7],{"p.png":PAY,"o.png":ORD.replace("3.0278USDT(1%)","")},["p.png","o.png"])
    chk("no tax line: not read",await pg.evaluate("ixS.groups[0].X.ord.tds==null"))
    await pg.evaluate("document.querySelector('[data-ix=tds1]').click()");await pg.wait_for_timeout(300)
    chk("Add 1% sets 330",await pg.evaluate("ixS.groups[0].tdsSet")==330)
    # wallet history: TDS comes later as its own Tax line
    import datetime
    Y=datetime.datetime.now().year
    ms=lambda m,d,h,mi:int(datetime.datetime(Y,m,d,h,mi).timestamp()*1000)
    S1={"id":"o_s1","side":"SELL","coin":"USDT","qty":302.780072,"rate":108.99,"status":"Completed","cp":"Sonu","time":ms(10,9,8,56),"doneAt":ms(10,9,8,59),"splits":[]}
    S2={"id":"o_s2","side":"SELL","coin":"USDT","qty":50,"rate":108.5,"status":"Completed","cp":"Amit","time":ms(10,9,8,25),"doneAt":ms(10,9,8,29),"splits":[]}
    LED=open(FX+"ledger_kucoin_tax.txt").read()
    pg,e=await scen(b,[SET,B7,S1,S2],{"l.png":LED},["l.png"])
    r=await pg.evaluate("ixS.items.map(i=>[i.cls.type,i.ledger&&i.ledger.pairs.length])");print(r)
    chk("ledger screenshot recognised, 2 TDS lines",r==[["EX_LEDGER",2]])
    chk("no 'couldn't tell' prompt and no groups",await pg.evaluate("ixS.groups.length===0&&!document.querySelector('[data-ix^=type]')"))
    chk("ledger card shows",await pg.evaluate("!!document.querySelector('.ixledger [data-ledsave]')"))
    await pg.evaluate("document.querySelector('[data-ledsave]').click()");await pg.wait_for_timeout(900)
    r=await pg.evaluate("orders.map(o=>[o.id,o.tds,o.tdsQ,o.tdsSrc])");print(r)
    d={x[0]:x for x in r}
    chk("order 1 got TDS 330 (3.0278 USDT)",d["o_s1"][1]==330 and d["o_s1"][2]==3.0278 and d["o_s1"][3]=="ledger")
    chk("order 2 got TDS 54.25 (0.5 USDT)",d["o_s2"][1]==54.25 and d["o_s2"][2]==0.5)
    await pg.evaluate("sheetOrderDetail('o_s1')");await pg.wait_for_timeout(300)
    chk("detail says confirmed in wallet history","confirmed in wallet history" in await pg.inner_text("#sheetBody"))
    chk("ledger no errors",not e);print(e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
