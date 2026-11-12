# "Check these numbers": UTR and order ID shown big with last 4 digits, and what the app could confirm
import asyncio, json, time, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
T={"o.png":open(FX+"order_kucoin_buy_10731.txt").read(),"p.png":open(FX+"pay_gpay_to_header_10731.txt").read()}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":now-30*864e5}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900},device_scale_factor=2);errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(RECS)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv Sahu')")
    await pg.evaluate("window.__T=%s;window.__clip=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__clip.push(t)}},configurable:true})"%json.dumps(T))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'ML Kit',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("o.png",1),mk("p.png",2)]);await pg.wait_for_timeout(3500)
    chk("input controls fold away once the result is ready",await pg.evaluate("document.getElementById('p-intake').classList.contains('ixdone')") and not await pg.is_visible(".ixalt") and (await pg.inner_text("#i2-clear"))=="Start over")
    t=await pg.inner_text(".ixnum")
    chk("block is shown",t.startswith("Check these numbers"))
    chk("UTR last 4 highlighted",await pg.evaluate("[...document.querySelectorAll('.ixnv b')].map(x=>x.textContent).join()")=="5260,ed34")
    chk("UTR format and not-used chips","12 digits, UPI format" in t and "Not used on a saved order" in t)
    chk("order ID format chip","Exchange ID format" in t and "Not saved before" in t)
    chk("phone reader only when AI not needed","Read by the phone reader" in t)
    await pg.evaluate("(()=>{const g=ixS.groups[0];g.ai='ok';g.aiPay={utr:'666701045999'};g.aiOrd={id:'6ae1e5d5500dc8000194ed34'};ixDraw()})()");await pg.wait_for_timeout(300)
    t=await pg.inner_text(".ixnum")
    chk("AI agrees on the order ID","AI read it the same" in t)
    chk("AI disagrees on the UTR is flagged","AI read it differently" in t)
    await pg.click('[data-ix="copy:utr"]');await pg.wait_for_timeout(200)
    chk("copy puts the full UTR on the clipboard",await pg.evaluate("window.__clip[0]")=="666701045260")
    await pg.screenshot(path="/tmp/ocrx/num.png",clip=None)
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");raise SystemExit(0 if ok else 1)
asyncio.run(main())
