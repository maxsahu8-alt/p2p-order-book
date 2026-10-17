import asyncio, json, os
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
LITE="""Transaction Successful
12:12 pm on 17 Oct 2026
Paid to
Rohit Raj
reetdhoni@axl
₹3,207
PhonePe Transaction ID
T2610171212131305109256
Debited from
UPI Lite
UTR: 518620073356
Powered by
UPI YES BANK
"""
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  O=open(FX+"order_buy_3207.txt").read()
  L=lambda a:{"on":True,"app":"PhonePe","bal":a+4000}
  b1={"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"XXXXXX7410","type":"Bank","opening":100000,"time":now-30*864e5,"lite":L(900)}
  b2={"id":"B2","kind":"bank","name":"SBI","bankName":"SBI","accNo":"XXXXXX4521","type":"Bank","opening":100000,"time":now-30*864e5,"lite":L(900)}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,b1,b2],{"a.png":LITE,"o.png":O},["a.png","o.png"])
    print(await pg.evaluate("JSON.stringify(ixS.groups.map(g=>({n:g.items.length,pays:g.pays.map(p=>p.pay&&{lite:p.pay.lite,bank:p.pay.bank,amt:p.pay.amount,l4:p.pay.last4}),x:g.X&&g.X.pay&&{lite:g.X.pay.lite,amt:g.X.pay.amount}})))"))
    n=await pg.evaluate("document.querySelectorAll('[data-ixlite]').length")
    chk("Lite bank picker is shown",n==1)
    w=await pg.evaluate("(()=>{const g=ixS.groups[0];return {amb:g.liteAmbig,cur:g.liteCur,lite:g.X.pay.lite}})()")
    print(w)
    chk("receipt without a bank logo is flagged as unsure",w["lite"] and w["amb"])
    await pg.select_option("[data-ixlite]","B2");await pg.wait_for_timeout(600)
    w=await pg.evaluate("(()=>{const g=ixS.groups[0];const pp=g.pays[0].pay;return {bank:g.X.pay.bank,l4:pp.last4,sel:(document.querySelector('[data-ixlite]')||{}).value,txt:document.querySelector('[data-ixlite]')?document.querySelector('[data-ixlite]').closest('.ixmine').textContent:''}})()")
    print(w)
    chk("choosing SBI moves the payment to SBI",w["l4"]=="4521" and w["sel"]=="B2")
    chk("card says you chose it",'You chose this bank' in w["txt"])
    await pg.select_option("[data-ixlite]","B1");await pg.wait_for_timeout(500)
    l4=await pg.evaluate("ixS.groups[0].pays[0].pay.last4")
    chk("changing back to Axis works",l4=="7410")
    await pg.select_option("[data-ixlite]","B2");await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(1800)
    R=await pg.evaluate("""(()=>{const st=ixS.groups[0].save;const A=balances().bal;return {state:st&&st.state,lb:{B1:banks.find(b=>b.id==='B1').lite.bal,B2:banks.find(b=>b.id==='B2').lite.bal},mv:recs.filter(r=>r.kind==='litemove').map(r=>[r.bank,r.dir,r.amt]),bal:{B1:Math.round(A['B1']),B2:Math.round(A['B2'])}}})()""")
    print(R)
    chk("saved",R["state"]=="saved")
    chk("Lite of SBI went down by 3207, Axis Lite untouched",R["lb"]["B2"]==4900-3207 and R["lb"]["B1"]==4900)
    chk("Lite spend recorded on SBI",R["mv"]==[["B2","spend",3207]])
    chk("bank balances not reduced (Lite spend has no bank effect)",R["bal"]["B1"]==100000 and R["bal"]["B2"]==100000)
    chk("no page errors",not e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
