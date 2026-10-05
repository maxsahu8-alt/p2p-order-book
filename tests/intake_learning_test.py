import asyncio, json, time
from playwright.async_api import async_playwright
FX="/home/claude/p2p-order-book/tests/fixtures/"
ORD=open(FX+"order_bybit_buy_wrapped.txt").read();PAY=open(FX+"pay_gpay_phonepe_out.txt").read()
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"SBI","bankName":"State Bank of India","accNo":"XXXXXX7781","type":"Bank","opening":100000,"time":now-30*864e5}]
bad=[]
def check(n,c):
    print(("PASS " if c else "FAIL ")+n)
    if not c: bad.append(n)
def variant(o,p,tag,amt,label=None):
    # a different deal: new order id, UTR, amount, time (so it is not a duplicate)
    o=o.replace("8bd4ce2970fa500002443","9cd4ce2970fa5000025"+tag).replace("4,707.29",amt).replace("48.0042","%.4f"%(float(amt.replace(",",""))/98.06)).replace("19:20:16","21:45:10")
    p=p.replace("412355610213","5123556102"+tag).replace("T2610051932575190000001","T26100521455751900"+tag).replace("4,707.29",amt).replace("07:32 pm","09:45 pm")
    if label: o=o.replace("Counterparty",label)
    return o,p
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    T={}
    await pg.evaluate("void(()=>{setPref('owner','Shiv');ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})};aiCfg.prov='builtin';i2Max=0})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    async def run(o,pay,k):
        T.update({f"o{k}.png":o,f"p{k}.png":pay});await pg.evaluate("window.__T=%s"%json.dumps(T))
        await pg.evaluate("document.querySelector('#i2-clear').click()")
        await pg.set_input_files("#i2-file",[mk(f"p{k}.png",10+k),mk(f"o{k}.png",50+k)]);await pg.wait_for_timeout(2500)
        return await pg.evaluate("(()=>{const g=ixS.groups[0];return {ov:g.cmp.overall,ai:g.ai,seller:g.X.ord.seller,cp:g.X.ord.cp,f:g.cmp.fields.map(f=>f.k+':'+f.res),mine:ixMine(g).lines.map(l=>l.s+':'+l.t),bank:g.X.pay.bank,why:ixWhy(g)}})()")
    # 1) partial name -> save -> alias learned -> next deal matches
    r1=await run(ORD,PAY,1);print(r1["f"],r1["mine"])
    check("first deal: partial name needs review","seller:UNCLEAR" in r1["f"] and r1["ov"]=="REVIEW")
    await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(1200)
    st=await pg.evaluate("[ixS.groups[0].save.state,ixS.groups[0].save.msg,recs.filter(r=>r.kind==='ixl'&&r.t==='alias').length]")
    print(st);check("saved and alias learned",st[0]=="saved" and st[2]==1 and "Learned" in st[1])
    o2,p2=variant(ORD,PAY,"11","3,100.00")
    r2=await run(o2,p2,2);print(r2["f"],r2["mine"])
    check("second deal: same two names now match","seller:MATCH" in r2["f"])
    print("r2:",r2["ov"],r2["ai"],r2["why"])
    check("second deal: no AI needed",r2["ai"] in (None,False,"na") and r2["ov"]=="VERIFIED")
    check("known seller shown",any("Known seller" in l for l in r2["mine"]))
    # 2) a screen layout the phone cannot read ("Dealer" label); AI reads it once; the phone then reads it alone
    o3,p3=variant(ORD,PAY,"22","2,200.00","Dealer")
    AI={"payment":{"status":"SUCCESS","amount":2200.0,"receiver_name":"Ravi Kumar Menon","utr":"512355610222","payment_method":"UPI","bank_or_upi":"State Bank of India","transaction_date":"2026-10-05","transaction_time":"21:45","confidence":0.97},
        "order":{"order_id":"9cd4ce2970fa500002522d56","buyer_name":None,"seller_name":"Ravi Menon","fiat_amount":2200.0,"crypto_amount":22.4,"crypto_symbol":"USDT","price":98.06,"order_type":"BUY","confidence":0.96},"risk_flags":[]}
    await pg.evaluate("void((a)=>{aiCfg.prov='gemini';aiCall=async()=>JSON.stringify(a)})(%s)"%json.dumps(AI))
    r3=await run(o3,p3,3)
    check("unread name is explained",any("name was not found" in l for l in r3["mine"]))
    await pg.evaluate("document.querySelector('[data-ix=deep]').click()");await pg.wait_for_timeout(1500)
    r3=await pg.evaluate("(()=>{const g=ixS.groups[0];return {ai:g.ai,seller:g.X.ord.seller}})()")
    labs=await pg.evaluate("recs.filter(r=>r.kind==='ixl'&&r.t==='lab').map(r=>r.s+'.'+r.f+':'+r.l)")
    print(r3["ai"],r3["seller"],labs)
    check("AI was used for the unknown layout",r3["ai"]=="ok")
    check("label learned from the AI",any(x=="ord.cp:dealer" for x in labs))
    await pg.evaluate("void(()=>{aiCfg.prov='builtin';i2Max=0})()")
    o4,p4=variant(ORD,PAY,"33","2,900.00","Dealer")
    r4=await run(o4,p4,4)
    print(r4["ai"],r4["seller"],r4["cp"])
    check("phone reads the same layout alone",r4["cp"]=="Ravi Menon" and r4["ai"]!="ok")
    # 3) bank read from a logo is remembered by last 4
    pb=await pg.evaluate("(t)=>payParse(t).bank",PAY.replace("XXXXXX7781","XXXXXX7781"))
    accs=await pg.evaluate("recs.filter(r=>r.kind==='ixl'&&r.t==='acct').map(r=>r.l4+':'+r.bank)")
    print(accs,pb)
    check("account bank learned",any(a.startswith("7781:") for a in accs) and pb)
    # 4) AI-used metric + memory sheet
    await pg.evaluate("renderIxHist()")
    strip=await pg.evaluate("document.querySelector('.ixhsum')&&document.querySelector('.ixhsum').innerText")
    print(strip.replace("\n"," "))
    check("summary shows AI usage and learned count","used AI" in strip and "learned" in strip)
    await pg.evaluate("sheets.ixmem()");await pg.wait_for_timeout(300)
    n=await pg.evaluate("document.querySelectorAll('#sheetBody [data-ixdel]').length")
    check("memory sheet lists items",n>=3)
    await pg.screenshot(path="learn_sheet.png",full_page=True)
    await pg.evaluate("document.querySelector('#sheetBody [data-ixdel]').click()");await pg.wait_for_timeout(300)
    n2=await pg.evaluate("document.querySelectorAll('#sheetBody [data-ixdel]').length")
    check("one item can be forgotten",n2==n-1)
    await pg.evaluate("document.querySelector('#ixl-all').click()");await pg.evaluate("document.querySelector('#ixl-all').click()");await pg.wait_for_timeout(500)
    left=await pg.evaluate("recs.filter(r=>r.kind==='ixl').length")
    check("forget everything works",left==0)
    check("name alias gone after forgetting",await pg.evaluate("verName('Ravi Kumar Menon','Ravi Menon')")=="U")
    check("no page errors",not errs)
    if errs: print(errs)
    await b.close()
asyncio.run(main())
print("ALL OK" if not bad else "FAILED: "+", ".join(bad))
