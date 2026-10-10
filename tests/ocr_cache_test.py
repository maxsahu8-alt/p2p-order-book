import asyncio, os, subprocess, time
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
D=os.path.dirname(APP)
PORT=8765
SCRIPT="window.Tesseract={createWorker:async(l,o,opts)=>{window.__calls.push(opts.workerPath+'|'+opts.corePath);if(window.__fail&&/^blob:/.test(opts.workerPath))throw new Error('bad saved copy');return{recognize:async()=>({data:{text:'ok',confidence:90}})}}};"
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  srv=subprocess.Popen(["python3","-m","http.server",str(PORT),"--bind","127.0.0.1"],cwd=D,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
  try:
   async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    state={"cdn":True}
    async def h(r):
      u=r.request.url
      if u.startswith("http://127.0.0.1"):
        if "eng-traineddata" in u: return await r.fulfill(status=200,body=b"x"*100)
        return await r.continue_()
      if not state["cdn"]: return await r.abort()
      if "tesseract.min.js" in u: return await r.fulfill(status=200,body=SCRIPT,content_type="text/javascript")
      return await r.fulfill(status=200,body="//x",content_type="text/javascript")
    await pg.route("**/*",h)
    await pg.goto(f"http://127.0.0.1:{PORT}/p2p-tracker.html");await pg.wait_for_timeout(1200)
    await pg.evaluate("window.__calls=[]")
    await pg.evaluate("ocrInit()");await pg.wait_for_timeout(1500)
    c=await pg.evaluate("window.__calls")
    chk("first start uses the CDN",len(c)==1 and c[0].startswith("https://"))
    chk("engine files saved on the phone",await pg.evaluate("ocrCacheGet().then(x=>!!x)"))
    # second start with the network gone
    state["cdn"]=False
    await pg.evaluate("ocrWorker=null;ocrPromise=null;window.__calls=[]");await pg.evaluate("ocrInit()");await pg.wait_for_timeout(800)
    c=await pg.evaluate("window.__calls")
    chk("second start works offline from the saved copy",len(c)==1 and c[0].startswith("blob:") and "#tesseract-core.js" in c[0])
    # saved copy that will not start -> falls back to the download and forgets the copy
    state["cdn"]=True
    await pg.evaluate("ocrWorker=null;ocrPromise=null;window.__calls=[];window.__fail=true");await pg.evaluate("ocrInit()");await pg.wait_for_timeout(1500)
    c=await pg.evaluate("window.__calls")
    chk("bad saved copy: falls back to CDN",len(c)==2 and c[1].startswith("https://"))
    chk("reader ready after fallback",await pg.evaluate("!!ocrWorker"))
    chk("no page errors",not errs);print(errs)
    await b.close()
  finally: srv.terminate()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
