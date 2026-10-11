import asyncio, json, os
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
SET=ns["SET"];FX=ns["FX"];now=ns["now"];APP=ns["APP"]
from playwright.async_api import async_playwright
async def scen2(b,recs,reads,names):
  ctx=await b.new_context(viewport={"width":390,"height":900});pg=await ctx.new_page();errs=[]
  pg.on("pageerror",lambda e:errs.append(str(e)))
  await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
  await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(recs))})")
  await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
  await pg.evaluate("window.__R=%s"%json.dumps(reads))
  await pg.evaluate("void(()=>{ixOcr=async(it)=>{const r=window.__R[it.file.name]||{};return{text:r.text||'',alt:r.alt||'',big:r.big||'',conf:92,engine:'ML Kit',status:'ok'}};assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
  await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
  mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
  await pg.set_input_files("#i2-file",[mk(n,i+1) for i,n in enumerate(names)]);await pg.wait_for_timeout(3000)
  return pg,errs
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  O=open(FX+"order_buy_3207.txt").read()
  def pay(amount_line,utr=True):
    return "Transaction Successful\n01:40 am on 10 Oct 2026\nPaid to\nUM Udhayakumar M\n"+amount_line+"\nudhayakumardae46\n-3@okhdfcbank\nTransfer Details\nPhonePe Transaction ID\nT2610100140545960631964\nDebited from\nXXXXXX2594\n"+("UTR: 250623501155\n" if utr else "")+"Contact PhonePe Support\n"
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"SBI","accNo":"2594","type":"Bank","opening":100000,"time":now-30*864e5}
  async with async_playwright() as p:
    b=await p.chromium.launch()
    Q="ixS.groups.map(g=>({n:g.items.length,amt:g.X.pay&&g.X.pay.amount,why:g.risk.reasons,app:g.items.map(i=>i.app),conf:g.pays.map(p=>!!(p.pay&&p.pay.amountConflict))}))"
    # A: the second reading and the cut-out number agree on 3,207.21 while the first read ₹ as 7
    pg,e=await scen2(b,[SET,bank],{"o.png":{"text":O},"p.png":{"text":pay("73,207.21"),"alt":pay("₹3,207.21"),"big":"₹3,207.21"}},["o.png","p.png"])
    g=await pg.evaluate(Q);print("A",g)
    chk("A cut-out number settles the amount",g[0]["amt"]==3207.21 and not any(g[0]["conf"]))
    chk("A app recognised",any(x=="PhonePe" for x in g[0]["app"]))
    chk("A no errors",not e)
    # B: no cut-out, but the order total says which reading is right
    pg,e=await scen2(b,[SET,bank],{"o.png":{"text":O},"p.png":{"text":pay("73,207.21"),"alt":pay("₹3,207.21")}},["o.png","p.png"])
    g=await pg.evaluate(Q);print("B",g)
    chk("B order total settles the amount",g[0]["amt"]==3207.21)
    # C: the readings disagree and nothing can settle it: flagged, not hidden
    pg,e=await scen2(b,[SET,bank],{"p.png":{"text":pay("5,450.00"),"alt":pay("₹6,450.00")}},["p.png"])
    g=await pg.evaluate(Q);print("C",g)
    chk("C disagreement flagged in the risk reasons",any("Two readings" in w for g0 in g for w in g0["why"]))
    # D: UTR missing in the first reading is taken from the second
    pg,e=await scen2(b,[SET,bank],{"o.png":{"text":O},"p.png":{"text":pay("₹3,207.21",utr=False),"alt":pay("₹3,207.21",utr=True)}},["o.png","p.png"])
    u=await pg.evaluate("ixS.groups[0].X.pay.utr");print("D",u)
    chk("D UTR filled from the other reading",u=="250623501155")
    chk("D no errors",not e)
    # E: both readings agree: nothing changes, no new warning
    pg,e=await scen2(b,[SET,bank],{"o.png":{"text":O},"p.png":{"text":pay("₹3,207.21"),"alt":pay("₹3,207.21"),"big":"3,207.21"}},["o.png","p.png"])
    g=await pg.evaluate(Q);print("E",g)
    chk("E agreeing readings raise no warning",not any("Two readings" in w for w in g[0]["why"]) and g[0]["amt"]==3207.21)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
