import asyncio, json, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
RECS=[{"id":"s_main","kind":"setting","stock":{},"prefs":{"owner":"shiv"}}]
SET="(id,v)=>{const e=document.querySelector(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}"
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":844});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file://"+APP,wait_until="commit");await pg.wait_for_timeout(1500)
    # intake reader
    r=await pg.evaluate("""(()=>{const t='Order Details\\nOrder No. 1234567890123456789\\nStatus Completed\\nBuyer Roopak Dass\\nTotal Price ₹14,000.00\\nPrice ₹108.72\\nQuantity 128.77 USDT\\nTDS ₹140.00';return ixOrdFrom(t,0.9)})()""")
    chk("intake reads TDS 140",r.get("tds")==140)
    r2=await pg.evaluate("""ixOrdFrom('Order No. 1234567890123456789\\nTotal Price ₹14,000.00\\nQuantity 128.77 USDT\\nStatus Completed',0.9).tds""")
    chk("no TDS line gives null",r2 is None)
    # form: a sell with TDS
    async def form(sd,tds):
      await pg.evaluate("document.querySelector('#t-add').click()");await pg.wait_for_timeout(300)
      await pg.click('#sideSeg [data-v=%s]'%sd)
      await pg.fill('#f-qty','100');await pg.fill('#f-rate','108')
      await pg.evaluate("document.querySelector('#pdet').open=true")
      await pg.select_option('#f-status','Pending')
      if tds=="auto":
        await pg.click('#f-tds1')
      else:
        await pg.fill('#f-tds',tds)
      v=await pg.input_value('#f-tds')
      await pg.evaluate("document.querySelector('#form').requestSubmit()");await pg.wait_for_timeout(800)
      return v
    v=await form("SELL","auto")
    chk("fill 1% = 108",v=="108")
    o=await pg.evaluate("orders.map(x=>({side:x.side,tds:x.tds}))")
    chk("SELL order saved with tds 108",any(x["side"]=="SELL" and x["tds"]==108 for x in o))
    await form("BUY","50")
    o=await pg.evaluate("orders.filter(x=>x.side==='BUY').map(x=>x.tds)")
    chk("BUY order saved and never keeps TDS",len(o)==1 and o[0] is None)
    # report + detail with injected sell
    rep=await pg.evaluate("""(()=>{const n=Date.now();orders.push({id:'t1',side:'SELL',coin:'USDT',qty:50,rate:108,status:'Completed',tds:54,time:n,doneAt:n,splits:[]});orders.push({id:'t2',side:'BUY',coin:'USDT',qty:50,rate:100,status:'Completed',tds:99,time:n,doneAt:n,splits:[]});const R=profitReport(n-1e6,n+1e6);return {tds:R.tds}})()""")
    chk("report counts TDS on sells only",rep["tds"]>=54 and rep["tds"]<54+109 )
    await pg.evaluate("sheetOrderDetail('t1')");await pg.wait_for_timeout(300)
    chk("detail shows TDS",("TDS deducted" in await pg.inner_text("#sheetBody")))
    chk("no page errors",not errs);print(errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
