import asyncio, json, time
from playwright.async_api import async_playwright
FX="/home/claude/p2p-order-book/tests/fixtures/"
T={"o.png":open(FX+"order_bybit_buy_wrapped.txt").read(),"p.png":open(FX+"pay_gpay_phonepe_out.txt").read()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"SBI","bankName":"State Bank of India","accNo":"","type":"Bank","opening":100000,"time":now-30*864e5}]
bad=[]
def check(n,c):
    print(("PASS " if c else "FAIL ")+n)
    if not c: bad.append(n)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps(RECS))})")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    await pg.evaluate("window.__T=%s"%json.dumps(T))
    await pg.evaluate("void(()=>{setPref('owner','Shiv');ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("p.png",1),mk("o.png",2)]);await pg.wait_for_timeout(2500)
    r=await pg.evaluate("(()=>{const g=ixS.groups[0],X=g.X;return {n:ixS.groups.length,ord:X.ord,pay:X.pay,inf:g.inferred,ov:g.cmp.overall,fields:g.cmp.fields.map(f=>f.k+':'+f.res),mine:ixMine(g).lines.map(l=>l.s+':'+l.t)}})()")
    print(json.dumps(r,indent=1)[:2500])
    check("one transaction",r["n"]==1)
    check("wrapped order id joined",r["ord"]["id"]=="8bd4ce2970fa500002443d56")
    check("counterparty read as seller",r["ord"]["seller"]=="Ravi Menon")
    check("you are the buyer (inferred)",r["ord"]["buyer"]=="Shiv" and "buyer" in r["inf"])
    check("receiver cleaned",r["pay"]["receiver"]=="Ravi Kumar Menon")
    check("handle not taken as bank",not r["pay"]["bank"])
    check("order date month-first resolved",r["ord"]["when"].startswith("2026-10-05"))
    check("payment time read",r["pay"]["time"]=="19:32")
    check("partial seller name asks for review",r["ov"]=="REVIEW" and "seller:UNCLEAR" in r["fields"])
    check("unknown account is flagged, not blocked",any(l.startswith("warn:") for l in r["mine"]))
    # teach the app that ••7781 is the SBI account
    await pg.screenshot(path="real_before.png",full_page=True)
    await pg.evaluate("void(()=>{setPref('owner','Shiv')})()")
    await pg.evaluate("document.querySelector('[data-ix^=\"own:\"]').click()");await pg.wait_for_timeout(500)
    r2=await pg.evaluate("(()=>{const g=ixS.groups[0];return {acc:banks.find(b=>b.id==='B1').accNo,mine:ixMine(g).lines.map(l=>l.s+':'+l.t),inf:g.inferred,sender:g.X.pay.sender}})()")
    print(r2)
    check("account saved on the bank","7781" in r2["acc"])
    check("now paid from your SBI",any("Paid from your" in l for l in r2["mine"]))
    check("sender inferred as you",r2["sender"]=="Shiv")
    await pg.screenshot(path="real_after.png",full_page=True)
    check("no page errors",not errs)
    await b.close()
asyncio.run(main())
print("ALL OK" if not bad else "FAILED: "+", ".join(bad))
