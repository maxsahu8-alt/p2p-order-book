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
    chk("empty: big add box",await pg.evaluate("getComputedStyle(document.querySelector('#idrop')).display!=='none'&&document.querySelector('#idrop b').textContent==='Add screenshots'"))
    await pg.set_input_files("#i2-file",[{"name":"o.png","mimeType":"image/png","buffer":png(60,120,(200,60,60))},{"name":"p.png","mimeType":"image/png","buffer":png(60,120,(30,30,160))}])
    await pg.wait_for_timeout(2500)
    chk("after adding: big box hidden, + tile in the thumbnail row",await pg.evaluate("getComputedStyle(document.querySelector('#idrop')).display==='none'&&!!document.querySelector('#i2-prev .addtile')&&document.querySelector('#i2-prev').lastElementChild.classList.contains('addtile')"))
    async with pg.expect_file_chooser() as fc:
      await pg.click("#i2-prev .addtile")
    chk("+ tile opens the file picker",fc.value is not None)
    chk("two numbered thumbnails",await pg.evaluate("document.querySelectorAll('#i2-prev .pv').length===2&&[...document.querySelectorAll('#i2-prev .no')].map(x=>x.textContent).join()==='1,2'"))
    lab=await pg.evaluate("[...document.querySelectorAll('#i2-prev em')].map(x=>x.textContent)");print(lab)
    chk("labels say which is which",lab==["Exchange order","Payment"])
    await pg.evaluate("document.querySelector('#ix-rail').scrollIntoView()");await pg.wait_for_timeout(200);await pg.screenshot(path="/tmp/claude-0/intake_slim.png")
    await pg.evaluate("document.querySelector('#i2-prev img').scrollIntoView()")
    await pg.click("#i2-prev .pv:nth-child(2) img");await pg.wait_for_timeout(700)
    chk("tap opens preview of picture 2",await pg.evaluate("!!document.querySelector('.i2lb.on')&&/Screenshot 2 of 2 · Payment/.test(document.querySelector('.i2lb .top b').textContent)"))
    r=await pg.evaluate("(()=>{const c=document.querySelector('.i2lb .card').getBoundingClientRect();return [c.top,c.height,c.width,innerHeight,innerWidth]})()");print("card",r)
    chk("not full screen: a rounded card with margins",r[0]>60 and r[1]<=r[3]*0.82 and r[2]<r[4])
    await pg.screenshot(path="/tmp/claude-0/intake_lightbox.png")
    chk("3D lean on the slide that is not in front",await pg.evaluate("/rotateY\\(-?[1-9]/.test(document.querySelectorAll('.i2lb .slide img')[0].style.transform)&&/rotateY\\(0|rotateY\\(-0/.test(document.querySelectorAll('.i2lb .slide img')[1].style.transform)"))
    vb=await pg.evaluate("(()=>{const r=document.querySelector('.i2lb .view').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    # swipe right: back to picture 1, with an animation
    await pg.mouse.move(vb[0],vb[1]);await pg.mouse.down();await pg.mouse.move(vb[0]+60,vb[1],steps=4)
    mid=await pg.evaluate("document.querySelector('.i2lb .track').style.transform");print("mid-drag",mid)
    await pg.mouse.move(vb[0]+190,vb[1],steps=6);await pg.mouse.up();await pg.wait_for_timeout(120)
    chk("slide animates (transition on)",await pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.i2lb .track')).transitionDuration)>0.2"))
    await pg.wait_for_timeout(500)
    chk("swipe right shows picture 1",await pg.evaluate("/Screenshot 1 of 2 · Exchange order/.test(document.querySelector('.i2lb .top b').textContent)&&document.querySelectorAll('.i2lb .dots i.on').length===1"))
    # swipe left via arrow
    await pg.click(".i2lb [data-n]");await pg.wait_for_timeout(600)
    chk("next arrow shows picture 2",await pg.evaluate("/Screenshot 2 of 2/.test(document.querySelector('.i2lb .top b').textContent)&&document.querySelector('.i2lb [data-n]').hidden"))
    # tap zoom
    await pg.mouse.click(vb[0],vb[1]);await pg.wait_for_timeout(450)
    chk("tap zooms the picture",await pg.evaluate("/scale\\(2\\.4\\)/.test(document.querySelectorAll('.i2lb .slide img')[1].style.transform)"))
    await pg.mouse.click(vb[0],vb[1]);await pg.wait_for_timeout(450)
    chk("tap again zooms out",await pg.evaluate("!/scale\\(2\\.4\\)/.test(document.querySelectorAll('.i2lb .slide img')[1].style.transform)"))
    # short pull down snaps back
    await pg.mouse.move(vb[0],vb[1]);await pg.mouse.down();await pg.mouse.move(vb[0],vb[1]+35);await pg.wait_for_timeout(250);await pg.mouse.move(vb[0],vb[1]+70);await pg.wait_for_timeout(300)
    chk("card follows the finger down",await pg.evaluate("/translateY\\(([4-9]\\d|\\d{3,})/.test(document.querySelector('.i2lb .card').style.transform)"))
    await pg.mouse.up();await pg.wait_for_timeout(600)
    chk("short pull: card springs back",await pg.evaluate("!!document.querySelector('.i2lb.on')&&document.querySelector('.i2lb .card').style.transform===''"))
    # long pull closes
    await pg.mouse.move(vb[0],vb[1]);await pg.mouse.down();await pg.mouse.move(vb[0],vb[1]+240,steps=8);await pg.mouse.up();await pg.wait_for_timeout(900)
    chk("pull down far: preview closes and page scroll is back",await pg.evaluate("!document.querySelector('.i2lb')&&document.body.style.overflow===''"))
    # reopen, Close button, backdrop, remove
    await pg.click("#i2-prev .pv:nth-child(1) img");await pg.wait_for_timeout(600);await pg.click(".i2lb [data-x]");await pg.wait_for_timeout(700)
    chk("Close button closes",await pg.evaluate("!document.querySelector('.i2lb')"))
    await pg.click("#i2-prev .pv:nth-child(1) img");await pg.wait_for_timeout(600);await pg.mouse.click(8,8);await pg.wait_for_timeout(700)
    chk("tap on the dim background closes",await pg.evaluate("!document.querySelector('.i2lb')"))
    await pg.click("#i2-prev .pv:nth-child(1) img");await pg.wait_for_timeout(600);await pg.click(".i2lb [data-d]");await pg.wait_for_timeout(300)
    chk("remove from preview drops it",await pg.evaluate("i2Files.length===1&&document.querySelectorAll('#i2-prev .pv').length===1&&document.querySelectorAll('.i2lb .slide').length===1"))
    await pg.click(".i2lb [data-d]");await pg.wait_for_timeout(800)
    chk("last one removed: preview closes, big box back, no + tile",await pg.evaluate("!document.querySelector('.i2lb')&&getComputedStyle(document.querySelector('#idrop')).display!=='none'&&!document.querySelector('#i2-prev .addtile')&&document.querySelector('#idrop b').textContent==='Add screenshots'"))
    chk("no errors",not errs);print(errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
