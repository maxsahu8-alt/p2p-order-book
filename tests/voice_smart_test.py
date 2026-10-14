import asyncio,json,time,os
from playwright.async_api import async_playwright
src=open(os.path.dirname(os.path.abspath(__file__))+"/ask_plus_test.py").read().split("async def run")[0]
exec(src)
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
    r=await pg.evaluate("[voiceNorm('s b i ka limit'),voiceNorm('h d f c balance'),voiceNorm('aksis se sbi me paanch hazaar'),voiceNorm('dedh lakh')]")
    print(r)
    chk("letters collapsed",r[0].startswith("sbi") and r[1].startswith("hdfc"))
    chk("bank mishearing + number words",r[2]=="axis se sbi me 5000" and r[3]=="150000")
    chk("money is spoken in lakh/hazaar",await pg.evaluate("VOICE.clean('Balance ₹2,13,875 aur −₹1,500',true)")=="Balance 2 lakh 13 hazaar 875 rupees aur minus 1 hazaar 500 rupees")
    chk("display keeps the rupee sign",await pg.evaluate("VOICE.clean('Balance ₹2,13,875')")=="Balance ₹2,13,875")
    long=await pg.evaluate("VOICE.short('x. '.repeat(400))");chk("spoken answer is short",len(long)<=360 and "screen par" in long)
    chips=await pg.evaluate("voiceChips()");print(chips)
    chk("chips: real data, no greetings, max 5",0<len(chips)<=5 and "hello" not in chips and any("Raju" in c or "bank" in c.lower() or "profit" in c for c in chips))
    chk("stock-minus alert is never a voice button","usdt kitna bacha" not in chips)
    h=await pg.evaluate("document.querySelector('.vacard')");
    await pg.evaluate("brSnooze('freeze risk kisme zyada hai',12)")
    chk("a snoozed alert is gone",await pg.evaluate("!brInsights().some(x=>x.q==='freeze risk kisme zyada hai')"))
    await pg.evaluate("localStorage.removeItem('p2p_insnz')")
    # full voice round with a spoken yes
    await pg.evaluate("""window.__U=['axis se sbi me tees hazaar transfer karo','haan'];window.__S=[];
      VOICE.listen=async()=>{const q=window.__U.shift();if(q===undefined)throw new Error('end');return q};
      VOICE.speak=async t=>{window.__S.push(VOICE.short(t))};
      openAiPop();voiceMode()""")
    await pg.wait_for_timeout(4500)
    said=await pg.evaluate("window.__S");print(said)
    mv=await pg.evaluate("recs.filter(r=>r.kind==='move').map(m=>({a:m.amt,f:m.from,t:m.to}))")
    print(mv)
    chk("voice sheet is compact (under a third of the screen)",await pg.evaluate("(()=>{const c=document.querySelector('.vacard');return !c||c.getBoundingClientRect().height<330})()"))
    chk("spoken yes saved the transfer",len(mv)==1 and mv[0]["a"]==30000 and mv[0]["f"]=="B2" and mv[0]["t"]=="B3")
    chk("it asked before saving",any("Haan ya nahi" in x for x in said))
    chk("it confirmed after saving",any("record kar diya" in x for x in said))
    # a spoken no changes nothing
    await pg.evaluate("VOICE.stop()");await pg.wait_for_timeout(400)
    await pg.evaluate("""window.__U=['sbi se axis me paanch hazaar transfer karo','nahi'];window.__S=[];openAiPop();voiceMode()""")
    await pg.wait_for_timeout(4500)
    mv=await pg.evaluate("recs.filter(r=>r.kind==='move').length");chk("spoken no saves nothing",mv==1)
    chk("no page errors",not [e for e in errs if "end" not in e])
    print(errs)
    print("ALL OK" if ok else "SOME FAILED")
    await b.close()
asyncio.run(main())
