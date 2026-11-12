import asyncio, json, os, sys
HERE=os.path.dirname(os.path.abspath(__file__))
src=open(HERE+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":HERE+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
SET=ns["SET"];FX=ns["FX"];now=ns["now"];APP=ns["APP"]
from playwright.async_api import async_playwright
def pay(i):
    return "Transaction Successful\n01:%02d am on 10 Oct 2026\nPaid to\nUM Udhayakumar M\n₹%d\nudhayakumardae46\n-3@okhdfcbank\nTransfer Details\nPhonePe Transaction ID\nT26101001405459606319%02d\nDebited from\nXXXXXX2594\nUTR: 6100000000%02d"%(i%60,500+i*7,i,i)
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  bank={"id":"B1","kind":"bank","name":"SBI","bankName":"SBI","accNo":"2594","type":"Bank","opening":100000,"time":now-30*864e5}
  noB=[{"id":"o%d"%i,"side":"BUY","coin":"USDT","qty":10,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"R","note":"Bank not matched · assign it later","splits":[],"time":now-i*1000} for i in range(3)]
  hist=[{"id":"h%d"%i,"side":"BUY","coin":"USDT","qty":10,"rate":90,"status":"Completed","mode":"P2P","pay":"UPI","platform":"KuCoin","cp":"R","splits":[{"bank":"B1","amt":900,"method":"UPI"}],"time":now-(i+5)*86400000} for i in range(6)]
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={"width":390,"height":900});pg=await ctx.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps([SET,bank]+noB+hist))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    N=12
    await pg.evaluate("window.__T=%s;window.__d=250"%json.dumps({"n":N}))
    await pg.evaluate("""void(()=>{const P=%s;ixOcr=async(it)=>{await new Promise(r=>setTimeout(r,window.__d));const i=parseInt(it.file.name.replace(/\\D/g,''),10)||0;return{text:P[i%%P.length],alt:'',big:'',conf:92,engine:'ML Kit',status:'ok'}};assetsApi={upload:async()=>({id:'a'+Math.random()})}})()"""%json.dumps([pay(i) for i in range(60)]))
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k%250+1]*40+[k//250])}
    # cap at 50
    await pg.set_input_files("#i2-file",[mk("s%d.png"%i,i) for i in range(55)])
    await pg.wait_for_timeout(200)
    chk("up to 50 screenshots accepted",await pg.evaluate("i2Files.length")==50)
    await pg.evaluate("i2Files=[];i2Draw();ixS.run++;ixS.busy=false;clearTimeout(i2Auto)");await pg.wait_for_timeout(500)
    # stop halfway
    await pg.set_input_files("#i2-file",[mk("s%d.png"%i,i) for i in range(N)])
    await pg.wait_for_selector("[data-ixstop]",timeout=15000)
    chk("progress bar shown",await pg.evaluate("!!document.querySelector('.ixpb')"))
    await pg.wait_for_timeout(900)
    await pg.click("[data-ixstop]")
    for _ in range(80):
        if await pg.evaluate("!ixS.busy"):break
        await pg.wait_for_timeout(250)
    st=await pg.evaluate("ixS.stopped")
    chk("stop keeps what was read, skips the rest",0<st<N)
    chk("some transactions are shown",await pg.evaluate("ixS.groups.length")>0)
    chk("batch report shown",await pg.evaluate("!!document.querySelector('.ixrep')"))
    chk("report says it stopped early","Stopped early" in await pg.inner_text(".ixrep"))
    chk("bank hint for orders saved without a bank","no bank yet" in await pg.inner_text(".ixrep"))
    chk("bank hint names the usual bank","SBI" in await pg.inner_text(".ixrep"))
    # full run
    await pg.evaluate("window.__d=5;i2Files=[];i2Draw();ixS.groups=[]");await pg.wait_for_timeout(500)
    await pg.set_input_files("#i2-file",[mk("s%d.png"%(i+100),i+100) for i in range(N)])
    for _ in range(120):
        if await pg.evaluate("!ixS.busy&&ixS.groups.length>0&&!!document.querySelector('.ixrep')"):break
        await pg.wait_for_timeout(250)
    chk("full run: report counts all screenshots",f">{N}<" in await pg.inner_html(".ixrep") )
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
