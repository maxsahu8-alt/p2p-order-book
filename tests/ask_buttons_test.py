import asyncio,json,os
from playwright.async_api import async_playwright
exec(open(os.path.dirname(os.path.abspath(__file__))+"/ask_plus_test.py").read().split("async def run")[0])
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":844});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("VOICE.listen=async()=>{await new Promise(r=>setTimeout(r,60000));return ''}")
    await pg.evaluate("openAiPop()");await pg.wait_for_timeout(400)
    chk("headphone always visible",await pg.evaluate("!document.getElementById('apVoice').hidden"))
    chk("headphone is labelled Support",await pg.evaluate("document.getElementById('apVoice').getAttribute('aria-label')")=="Support")
    chk("empty box shows the voice (wave) button",await pg.evaluate("document.getElementById('apSend').classList.contains('vmode')"))
    await pg.fill("#apIn","aaj ka profit")
    chk("with text it turns into send",await pg.evaluate("!document.getElementById('apSend').classList.contains('vmode')"))
    await pg.fill("#apIn","")
    await pg.click("#apSend");await pg.wait_for_timeout(500)
    chk("wave button opens the voice assistant",await pg.evaluate("!!document.getElementById('vaBox')"))
    await pg.evaluate("VOICE.stop()");await pg.wait_for_timeout(400)
    await pg.evaluate("openAiPop()");await pg.wait_for_timeout(300)
    await pg.click("#apVoice");await pg.wait_for_timeout(700)
    chk("headphone opens support, not voice",await pg.evaluate("!document.getElementById('vaBox')&&!document.getElementById('sheetBg').hidden&&document.getElementById('sheetBody').textContent.includes('Support')"))
    await pg.evaluate("closeSheet();openAiPop()");await pg.wait_for_timeout(300)
    await pg.fill("#apIn","aaj ka profit");await pg.press("#apIn","Enter");await pg.wait_for_timeout(800)
    chk("sending clears the box and returns to the wave button",await pg.evaluate("document.getElementById('apIn').value===''&&document.getElementById('apSend').classList.contains('vmode')"))
    chk("no page errors",not errs);print(errs)
    print("ALL OK" if ok else "SOME FAILED")
    await pg.evaluate("closeSheet();openAiPop()");await pg.wait_for_timeout(300);await pg.screenshot(path="/tmp/claude-0/ab.png")
    await b.close()
asyncio.run(main())
