import asyncio, json, os, struct, zlib
os.environ.setdefault("APP","/home/claude/p2p-tracker.html")
src=open(os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py").read().split("async def main")[0]
ns={"__file__":os.path.dirname(os.path.abspath(__file__))+"/intake_smart2_test.py"};exec(compile(src,"s2","exec"),ns)
scen=ns["scen"];SET=ns["SET"];FX=ns["FX"];now=ns["now"]
from playwright.async_api import async_playwright
def png(w,h,rgb):
  raw=b"".join(b"\x00"+bytes(rgb)*w for _ in range(h))
  def ch(t,d):
    c=struct.pack(">I",len(d))+t+d;return c+struct.pack(">I",zlib.crc32(t+d)&0xffffffff)
  return b"\x89PNG\r\n\x1a\n"+ch(b"IHDR",struct.pack(">IIBBBBB",w,h,8,2,0,0,0))+ch(b"IDAT",zlib.compress(raw))+ch(b"IEND",b"")
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  PAY=open(FX+"pay_slice_deepak.txt").read();ORD=open(FX+"order_kucoin_tax.txt").read()
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={"width":390,"height":844});pg=await ctx.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps([SET]))})")
    await pg.goto("file://"+os.environ["APP"]);await pg.wait_for_timeout(900)
    await pg.evaluate("window.__T=%s"%json.dumps({"p.png":PAY,"o.png":ORD}))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'Tesseract',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    chk("empty: big add box",await pg.evaluate("!document.querySelector('#idrop').classList.contains('has')&&document.querySelector('#idrop b').textContent==='Add screenshots'"))
    await pg.set_input_files("#i2-file",[{"name":"o.png","mimeType":"image/png","buffer":png(60,120,(200,60,60))},{"name":"p.png","mimeType":"image/png","buffer":png(60,120,(30,30,160))}])
    await pg.wait_for_timeout(2500)
    chk("after adding: slim 'Add more' bar",await pg.evaluate("document.querySelector('#idrop').classList.contains('has')&&/Add more/.test(document.querySelector('#idrop b').textContent)"))
    chk("two numbered thumbnails",await pg.evaluate("document.querySelectorAll('#i2-prev .pv').length===2&&[...document.querySelectorAll('#i2-prev .no')].map(x=>x.textContent).join()==='1,2'"))
    lab=await pg.evaluate("[...document.querySelectorAll('#i2-prev em')].map(x=>x.textContent)");print(lab)
    chk("labels say which is which",lab==["Exchange order","Payment"])
    h=await pg.evaluate("document.querySelector('#idrop').getBoundingClientRect().height");print("dz height",h)
    chk("add bar is slim",h<90)
    await pg.evaluate("document.querySelector('#ix-rail').scrollIntoView()");await pg.wait_for_timeout(200);await pg.screenshot(path="/tmp/claude-0/intake_slim.png")
    await pg.evaluate("document.querySelector('#i2-prev img').scrollIntoView()")
    await pg.click("#i2-prev .pv:nth-child(2) img");await pg.wait_for_timeout(300)
    chk("tap opens preview of picture 2",await pg.evaluate("!!document.querySelector('.i2lb')&&/Screenshot 2 of 2 · Payment/.test(document.querySelector('.i2lb .top b').textContent)"))
    await pg.screenshot(path="/tmp/claude-0/intake_lightbox.png")
    await pg.click(".i2lb [data-p]");await pg.wait_for_timeout(200)
    chk("previous shows picture 1",await pg.evaluate("/Screenshot 1 of 2 · Exchange order/.test(document.querySelector('.i2lb .top b').textContent)"))
    await pg.click(".i2lb .stage");await pg.wait_for_timeout(100)
    chk("tap zooms",await pg.evaluate("document.querySelector('.i2lb .stage').classList.contains('z')"))
    await pg.click(".i2lb [data-x]");await pg.wait_for_timeout(200)
    chk("close works",await pg.evaluate("!document.querySelector('.i2lb')&&document.body.style.overflow===''"))
    await pg.click("#i2-prev .pv:nth-child(1) img");await pg.wait_for_timeout(200);await pg.click(".i2lb [data-d]");await pg.wait_for_timeout(300)
    chk("remove from preview drops it",await pg.evaluate("i2Files.length===1&&document.querySelectorAll('#i2-prev .pv').length===1"))
    await pg.click(".i2lb [data-d]");await pg.wait_for_timeout(300)
    chk("last one removed: preview closes, big box back",await pg.evaluate("!document.querySelector('.i2lb')&&!document.querySelector('#idrop').classList.contains('has')&&document.querySelector('#idrop b').textContent==='Add screenshots'"))
    chk("no errors",not errs);print(errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
