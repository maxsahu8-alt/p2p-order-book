import asyncio, json, time
from playwright.async_api import async_playwright
FX="/home/claude/p2p-order-book/tests/fixtures/"
T={n:open(FX+f).read() for n,f in {"pay1.png":"pay_phonepe.txt","ord1.png":"order_kucoin.txt","ord2.png":"order_binance2.txt","pay2.png":"pay_imps_anita.txt","note.png":"pay_not_payment.txt"}.items()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","bankName":"HDFC Bank","accNo":"50100012341234","type":"Bank","opening":100000,"time":now-30*864e5}]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    await pg.evaluate("window.__T=%s"%json.dumps(T))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    def mk(name,n): return {"name":name,"mimeType":"image/png","buffer":bytes([n]*40)}
    # 1) simple pair, payment first
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    print("groups:",await pg.evaluate("ixS.groups.length"),await pg.evaluate("ixS.groups.map(g=>[g.cmp.overall,g.risk.level,g.conf,g.order?1:0,g.pays.length,g.reasonsAI.join('|'),g.cmp.fields.map(f=>f.k+':'+f.res).join(' ')])"))
    await pg.screenshot(path="ix_one.png",full_page=True)
    # save
    await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(800)
    print("saved:",await pg.evaluate("(()=>{const o=orders[0];return [orders.length,o&&o.side,o.qty,o.rate,o.utr,o.exId,o.cp,o.pv,(o.splits||[]).length,ixS.groups[0].save.state,recs.filter(r=>r.kind==='ix').map(r=>r.saved)]})()"))
    await pg.evaluate("document.querySelector('#i2-clear').click()")
    # 2) same screenshots again → duplicate warning
    await pg.set_input_files("#i2-file",[mk("pay1.png",1),mk("ord1.png",2)]);await pg.wait_for_timeout(2500)
    print("dups:",await pg.evaluate("ixS.groups.map(g=>g.dups.map(d=>d.k))"))
    await pg.evaluate("document.querySelector('#i2-clear').click()")
    # 3) four screenshots shuffled → 2 groups
    await pg.set_input_files("#i2-file",[mk("pay2.png",13),mk("ord1.png",12),mk("ord2.png",14),mk("note.png",15)]);await pg.wait_for_timeout(3000)
    print("multi:",await pg.evaluate("ixS.groups.map(g=>[g.order&&g.order.ord.id,g.pays.length,g.unknown.length,g.cmp.overall,g.risk.level])"))
    print("cls:",await pg.evaluate("ixS.items.map(i=>i.file.name+':'+i.cls.type)"))
    print("header:",await pg.evaluate("(document.querySelector('.ixhead .ah')||{}).textContent"))
    await pg.screenshot(path="ix_multi.png",full_page=True)
    await pg.evaluate("document.querySelector('#i2-clear').click()")
    # 4) save failure is not an analysis failure
    await pg.set_input_files("#i2-file",[mk("pay2.png",21),mk("ord2.png",22)]);await pg.wait_for_timeout(2500)
    await pg.evaluate("void(()=>{window.__p=putRec;putRec=async()=>{throw new Error('disk full')}})()")
    await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(800)
    print("fail save:",await pg.evaluate("[ixS.groups[0].save.state,ixS.groups[0].save.msg,ixS.groups[0].cmp.overall]"),await pg.evaluate("document.querySelector('.ixsave b').textContent"))
    await pg.evaluate("void(()=>{putRec=window.__p})()")
    # 5) AI fallback + conflicting
    await pg.evaluate("void(()=>{aiCfg.prov='gemini';aiCall=async()=>JSON.stringify({payment:{status:'SUCCESS',amount:9000,sender_name:'Anita Verma',receiver_name:'Shiv Sahu',utr:'527812345678',payment_method:'IMPS',confidence:0.95},order:{order_id:'22998877665544332211',buyer_name:'Anita Verma',seller_name:'Shiv Sahu',fiat_amount:9000,crypto_amount:100,crypto_symbol:'USDT',price:90,payment_method:'IMPS',order_datetime:'2026-10-05 20:10',confidence:0.95},risk_flags:[]})})()")
    await pg.evaluate("document.querySelector('[data-ix=deep]').click()");await pg.wait_for_timeout(1200)
    print("deep:",await pg.evaluate("[ixS.groups[0].ai,ixS.groups[0].cmp.overall,ixS.groups[0].risk.level,ixS.groups[0].conflicts]"))
    await pg.screenshot(path="ix_deep.png",full_page=True)
    print("hist:",await pg.evaluate("document.querySelector('#i2-hist').innerText.replace(/\\n/g,' | ').slice(0,300)"))
    print("errs",errs)
    await b.close()
asyncio.run(main())
