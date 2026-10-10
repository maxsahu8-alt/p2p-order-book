import asyncio, json, os
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];now=ns["now"]
from playwright.async_api import async_playwright
STUB="""void(()=>{
 const N=()=>({status:null,amount:null,currency:null,sender:null,receiver:null,utr:null,method:null,bank:null,date:null,time:null,acct:null,conf:0.9});
 const O=()=>({id:null,status:null,buyer:null,seller:null,fiat:null,crypto:null,coin:null,price:null,method:null,when:null,acct:null,conf:0.9});
 window.__calls=[];
 verExtract=async(blobs)=>{const k=new Uint8Array(await blobs[0].arrayBuffer())[0];window.__calls.push(blobs.length);
  if(k===1)return{X:{pay:{...N(),status:'SUCCESS',amount:30000,receiver:'Bellary Mohammed Iliyaz Hussain',date:'2026-10-10',time:'01:39'},ord:O(),flags:[]}};
  if(k===2)return{X:{pay:{...N(),status:'SUCCESS',amount:1905,receiver:'Bellary Mohammed Iliyaz Hussain',date:'2026-10-10',time:'01:40'},ord:O(),flags:[]}};
  return{X:{pay:N(),ord:{...O(),id:'6ac943cde50cd5000167e73e',status:'Completed',seller:'MOHAMMED ILIYAZ HUSSAIN BELLARY',fiat:31905.25,crypto:325,coin:'USDT',price:98.17,when:'2026-10-10 01:13',side:'BUY'},flags:[]}}};
 ixAiReady=()=>true;
})()"""
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  bank={"id":"B1","kind":"bank","name":"Slice","bankName":"Slice","accNo":"1","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    pg,e=await scen(b,[SET,bank],{},[])
    await pg.evaluate(STUB)
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:'',conf:0,engine:'none',status:'fail',err:'unavailable'})})()")
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("a.png",1),mk("b.png",2),mk("o.png",3)]);await pg.wait_for_timeout(4000)
    g=await pg.evaluate("ixS.groups.map(g=>({n:g.items.length,part:g.partSum,fiat:g.X.ord.fiat,recv:g.X.pay.receiver,side:ixSide(g)}))");print(g)
    chk("AI called once per picture (3 calls, 1 image each)",await pg.evaluate("window.__calls.join()")=="1,1,1")
    chk("one transaction from 3 pictures",len(g)==1 and g[0]["n"]==3)
    chk("part payments 30,000 + 1,905 added up",g[0]["part"]==31905)
    chk("side BUY",g[0]["side"]=="BUY")
    chk("no errors",not e);print(e)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
