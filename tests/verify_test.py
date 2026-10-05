import asyncio, json, time
from playwright.async_api import async_playwright
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"HDFC","type":"Bank","opening":100000,"time":now-30*864e5},
 {"id":"o1","side":"SELL","coin":"USDT","qty":520,"rate":96.15,"status":"Pending","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Rahul Kumar","note":"","exId":"ABC123456","time":now-3600e3,"splits":[]},
 {"id":"o2","side":"SELL","coin":"USDT","qty":10,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"Old","note":"","time":now-5*864e5,"utr":"512345678901","splits":[]}]
GOOD={"payment":{"status":"SUCCESS","amount":50000,"currency":"INR","sender_name":"RAHUL K***","receiver_name":"Shiv Sahu","utr":"428811223344","payment_method":"UPI","bank_or_upi":"HDFC Bank","transaction_date":time.strftime("%Y-%m-%d"),"transaction_time":time.strftime("%H:%M",time.localtime(time.time()-1800)),"confidence":0.96},
 "order":{"order_id":"ABC123456","order_status":"PAID","buyer_name":"Rahul Kumar","seller_name":"Shiv Sahu","fiat_amount":50000,"crypto_amount":520,"crypto_symbol":"USDT","price":96.15,"payment_method":"UPI","order_datetime":time.strftime("%Y-%m-%d %H:%M",time.localtime(time.time()-3500)),"confidence":0.98},"risk_flags":[]}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    js="""(raw,mut)=>{const X=verParse(JSON.stringify(raw));if(mut){const f=new Function('X',mut);f(X)}const c=verCompare(X,{hashes:[]});return [c.overall,c.fields.map(f=>f.k+':'+f.res).join(' '),c.local.join('|'),c.flags.join(','),c.confidence]}"""
    tests=[("good",GOOD,None),
     ("amount mismatch",GOOD,"X.pay.amount=45000"),
     ("buyer name different",GOOD,"X.pay.sender='Suresh Patel'"),
     ("dup utr",GOOD,"X.pay.utr='512345678901'"),
     ("no utr",GOOD,"X.pay.utr=null"),
     ("payment before order",GOOD,"X.pay.time='00:01';X.pay.date='2020-01-01'"),
     ("failed",GOOD,"X.pay.status='FAILED'"),
     ("edited flag",{**GOOD,"risk_flags":["EDITED_LOOKING"]},None),
     ("low conf",GOOD,"X.pay.conf=0.5"),
     ("future",GOOD,"X.pay.date='2099-01-01'")]
    for n,r,m in tests:
        print(n,"->",await pg.evaluate(js,[r,m]) if False else await pg.evaluate("([a,b])=>("+js+")(a,b)",[r,m]))
    print("bad json:",await pg.evaluate("verParse('sorry I cannot')"),await pg.evaluate("verParse('{\"x\":1}')"))
    print("names:",await pg.evaluate("[verName('Rahul Kumar','KUMAR RAHUL'),verName('RAHUL K***','Rahul Kumar'),verName('Rahul Kumar','Rahul Sharma'),verName('Amit','Suresh Patel'),verName('Rahull Kumar','Rahul Kumar')]"))
    # e2e with stubbed AI
    await pg.evaluate("window.__raw=%s;aiCall=async()=>JSON.stringify(window.__raw)"%json.dumps(GOOD))
    await pg.evaluate("sheets.verify()")
    await pg.wait_for_timeout(300)
    await pg.evaluate("verS.pay=new File([new Uint8Array([1,2,3])],'p.png',{type:'image/png'});verS.ord=new File([new Uint8Array([4,5,6])],'o.png',{type:'image/png'});sheetVerify()")
    await pg.wait_for_timeout(200)
    await pg.click("#v-go");await pg.wait_for_timeout(1500)
    print("result:",await pg.evaluate("verS.res&&verS.res.cmp.overall"),"saved:",await pg.evaluate("recs.filter(r=>r.kind==='verif').length"))
    await pg.screenshot(path="ver_result.png",full_page=False)
    await pg.evaluate("document.querySelector('.vres').scrollIntoView()");await pg.screenshot(path="ver_result2.png")
    await pg.click("#v-att");await pg.wait_for_timeout(300)
    print("cands:",await pg.evaluate("document.querySelectorAll('[data-at]').length"))
    await pg.click("[data-at=o1]");await pg.wait_for_timeout(500)
    print("attached:",await pg.evaluate("(()=>{const o=orders.find(x=>x.id==='o1');return [o.utr,o.pv,(o.shots||[]).length]})()"))
    # failures
    await pg.evaluate("void(()=>{aiCall=async()=>'not json at all'})()");await pg.click("#v-go");await pg.wait_for_timeout(800)
    print("badjson msg:",await pg.evaluate("verS.msg"))
    await pg.evaluate("void(()=>{aiCall=async()=>{throw aiErr('busy','x')}})()");await pg.click("#v-go");await pg.wait_for_timeout(500)
    print("busy msg:",await pg.evaluate("verS.msg"))
    print("errs",errs)
    await b.close()
asyncio.run(main())
