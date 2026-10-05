import asyncio, json
from playwright.async_api import async_playwright
ORD_BAD="""KuCoin P2P Order Completed
Order No. 1851234567890123456
Buyer Shiv Sahu
Seller Ravi Kumar
Total Price ₹2,030.26
Price ₹88.5
Quantity 28.59 USDT
"""
PAY="""Payment Successful
₹2,530.26
Paid to RAVI KUMAR
Oct 5, 2026 at 09:41 PM
UTR 628151234567
Federal Bank
"""
AI={"payment":{"status":"SUCCESS","amount":2530.26,"sender_name":"Shiv Sahu","receiver_name":"Ravi Kumar","utr":"628151234567","payment_method":"UPI","bank_or_upi":"Federal Bank","transaction_date":"2026-10-05","transaction_time":"21:41","confidence":0.97},
 "order":{"order_id":"1851234567890123456","order_status":"Completed","buyer_name":"Shiv Sahu","seller_name":"Ravi Kumar","fiat_amount":2530.26,"crypto_amount":28.59,"crypto_symbol":"USDT","price":88.5,"payment_method":"UPI","order_datetime":"2026-10-05 21:30","confidence":0.96},"risk_flags":[]}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*", lambda r: r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("localStorage.setItem('p2p_orders_v1','[]')")
    await pg.goto("file:///home/claude/p2p-tracker.html");await pg.wait_for_timeout(900)
    # ocrPrep on a dark image must come out light-background
    lum=await pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=600;c.height=900;const g=c.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,600,900);g.fillStyle='#eee';g.font='40px sans-serif';g.fillText('Payment ₹2,530.26',30,100);
      const b=await new Promise(ok=>c.toBlob(ok,'image/png'));const o=await ocrPrep(b);const im=await createImageBitmap(o);const d=document.createElement('canvas');d.width=im.width;d.height=im.height;const x=d.getContext('2d');x.drawImage(im,0,0);const px=x.getImageData(0,0,d.width,d.height).data;let s=0;for(let i=0;i<px.length;i+=4*50)s+=px[i];return [Math.round(s/(px.length/200)),im.width,im.height]}""")
    print("prep mean brightness (high = inverted ok):",lum)
    await pg.evaluate("window.__T=%s"%json.dumps({"o.png":ORD_BAD,"p.png":PAY}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:78,engine:'Tesseract',status:'ok'});aiCfg.prov='gemini';aiCall=async()=>JSON.stringify(%s)})()"%json.dumps(AI))
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("o.png",1),mk("p.png",2)]);await pg.wait_for_timeout(3000)
    print("after auto AI:",await pg.evaluate("ixS.groups.map(g=>[g.ai,g.cmp.overall,g.risk.level,g.conf,[...(g.aiFilled||[])].join(','),g.conflicts])"))
    print("why:",await pg.evaluate("[...document.querySelectorAll('.ixwhy li')].map(l=>l.textContent)"))
    print("status line:",await pg.evaluate("document.querySelector('.ixai').textContent"))
    await pg.evaluate("document.querySelector('.ixwhy').scrollIntoView()");await pg.screenshot(path="ix_ai.png")
    # AI down → clear message, still ONE transaction
    await pg.evaluate("document.querySelector('#i2-clear').click()")
    await pg.evaluate("void(()=>{aiCall=async()=>{throw aiErr('busy','x')}})()")
    await pg.set_input_files("#i2-file",[mk("o.png",5),mk("p.png",6)]);await pg.wait_for_timeout(3000)
    print("AI down:",await pg.evaluate("ixS.groups.map(g=>[g.ai,g.cmp.overall,g.items.length])"),await pg.evaluate("document.querySelector('.ixai').textContent"))
    print("errs",errs)
    await b.close()
asyncio.run(main())
