import asyncio, json, time
from playwright.async_api import async_playwright
# Realistic bad OCR: the order text lacks a clean amount/name, the payment is a normal receipt
ORD_WEAK="""Order Details
Buy USDT
Order ID 1851234567890123456
Unit price 88.50
Quantity 28.59 USDT
Status Completed
Payment method IMPS
"""
PAY="""Payment Successful
₹2,530.26
Paid to RAVI KUMAR
Oct 5, 2026 at 09:41 PM
UTR 628151234567
Federal Bank
"""
ORD_AMT_DIFF="""KuCoin P2P Order Completed
Order No. 7777777777777777777
Buyer Shiv Sahu
Seller Ravi Kumar
Total Price ₹3,000.00
Price ₹90
Quantity 33.33 USDT
"""
UNK="""random text with nothing recognisable here at all 12345"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("localStorage.setItem('p2p_orders_v1','[]')")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    await pg.evaluate("window.__T=%s"%json.dumps({"o.png":ORD_WEAK,"p.png":PAY,"o2.png":ORD_AMT_DIFF,"u.png":UNK}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'})})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    async def run(files,label):
        await pg.evaluate("document.querySelector('#i2-clear').click()")
        await pg.set_input_files("#i2-file",files);await pg.wait_for_timeout(2500)
        print(label,await pg.evaluate("ixS.groups.map(g=>({order:!!g.order,pays:g.pays.length,items:g.items.length,overall:g.cmp.overall,types:g.items.map(i=>i.cls.type)}))"))
    await run([mk("o.png",1),mk("p.png",2)],"weak order + payment:")
    await run([mk("p.png",3),mk("o.png",4)],"payment first:")
    await run([mk("o2.png",5),mk("p.png",6)],"amount differs (must stay ONE tx):")
    await run([mk("u.png",7),mk("p.png",8)],"payment + unknown:")
    await run([mk("o.png",9),mk("u.png",10)],"order + unknown:")
    await run([mk("o.png",11),mk("p.png",12)],"for save:")
    await pg.evaluate("sheets && 0")
    await pg.evaluate("void(()=>{refBank=null})()") if False else None
    print("title:",await pg.evaluate("document.querySelector('.ixb .pcsec').textContent"))
    await pg.evaluate("document.querySelector('[data-ix=side]')") 
    await pg.evaluate("ixS.groups[0].side='BUY'");await pg.evaluate("document.querySelector('[data-ix=save]').click()");await pg.wait_for_timeout(800)
    print("saved:",await pg.evaluate("(()=>{const o=orders[0];return o?[orders.length,o.side,o.qty,o.rate,o.utr,o.exId,o.cp,o.status]:null})()"),await pg.evaluate("ixS.groups[0].save"))
    await pg.screenshot(path="ix_oneTx.png",full_page=True)
    print("header:",await pg.evaluate("(document.querySelector('.ixhead .ah')||{}).textContent"),"errs",errs)
    await b.close()
asyncio.run(main())
