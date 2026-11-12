# AI use stats, case files, targeted AI (only the needed screenshot) and remembered screen types
import asyncio, json, time, os, re
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
FX=os.path.dirname(os.path.abspath(__file__))+"/fixtures/"
ORD=open(FX+"order_kucoin_buy_10731.txt").read();PAY=open(FX+"pay_gpay_to_header_10731.txt").read()
ORD_NOID=ORD.replace("6ae1e5d5500dc8000194e","#####").replace("d34","")
AI={"payment":{"status":"SUCCESS","amount":10731.19,"sender_name":"DEEPAK SAHU","receiver_name":"Mahnder Thakur","utr":"666701045260","confidence":0.9},
 "order":{"order_id":"6ae1e5d5500dc8000194ed34","order_status":"Completed","buyer_name":"Shiv Sahu","seller_name":"mahnder Thakur","fiat_amount":10731.19,"crypto_amount":108.912962,"crypto_symbol":"USDT","price":98.53,"confidence":0.9},"risk_flags":[]}
now=int(time.time()*1000)
RECS=[{"id":"B1","kind":"bank","name":"Axis","bankName":"Axis Bank","accNo":"917020037417410","type":"Bank","opening":100000,"time":now-30*864e5}]
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');localStorage.setItem('p2p_orders_v1',%s)}"%json.dumps(json.dumps(RECS)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("setPref('owner','Shiv Sahu')")
    await pg.evaluate("window.__imgs=[];void(()=>{aiCfg.prov='gemini';aiCall=async(t,o,im)=>{window.__imgs.push((im||[]).length);return JSON.stringify(%s)}})()"%json.dumps(AI))
    await pg.evaluate("void(()=>{ixOcr=async(it)=>({text:window.__T[it.file.name]||'',conf:92,engine:'ML Kit',status:'ok'});assetsApi={upload:async()=>({id:'a'+Math.random()})}})()")
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    async def run(T,files):
      await pg.evaluate("window.__T=%s"%json.dumps(T));await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
      await pg.set_input_files("#i2-file",files);await pg.wait_for_timeout(3500)
    # A: clean read, no AI
    await run({"o.png":ORD,"p.png":PAY},[mk("o.png",1),mk("p.png",2)])
    S=await pg.evaluate("JSON.parse(localStorage.getItem('p2p_ix_stats')||'null')")
    chk("clean deal counted, no AI",S and S["groups"]==1 and S["ai"]==0)
    chk("apps are named",S and any(k in S["byApp"] for k in ("Google Pay","KuCoin")))
    # B: the order ID could not be read -> the AI gets only the order screenshot
    await pg.evaluate("localStorage.removeItem('p2p_ix_stats')")
    await pg.evaluate("(async()=>{const g=ixS.groups[0];g.reasonsAI=['result needs review','order ID or amount missing'];g.ai=null;g.statDone=false;ixStatNote(g,true);await ixDeep(g)})()");await pg.wait_for_timeout(800)
    S=await pg.evaluate("JSON.parse(localStorage.getItem('p2p_ix_stats')||'null')")
    imgs=await pg.evaluate("window.__imgs")
    chk("AI was used and counted",S and S["ai"]==1)
    chk("reason recorded",S and any("order ID" in r for r in S["byReason"]))
    chk("only the order screenshot was sent",imgs and imgs[-1]==1 and S.get("targeted")==1)
    C=await pg.evaluate("JSON.parse(localStorage.getItem('p2p_ix_cases')||'[]')")
    chk("case file kept with screenshot text",len(C)==1 and len(C[0]["shots"])==2 and "Counterparty" in "".join(s["text"] for s in C[0]["shots"]))
    await pg.evaluate("(async()=>{const g=ixS.groups[0];g.reasonsAI=['payment/order link uncertain'];await ixDeep(g)})()");await pg.wait_for_timeout(800)
    imgs=await pg.evaluate("window.__imgs");chk("other reasons still send everything",imgs[-1]==2)
    # C: screen type memory
    r=await pg.evaluate("""(()=>{const t='Some Bank App\\nAccount Statement\\nMonthly summary\\nNothing else here\\nmore text lines';ixTypeLearn({ocr:{text:t},app:'X'},'PAY_RECEIPT');return ixTypeOf(t)+'|'+ixTypeOf('Unrelated\\nText here\\nWith other lines\\nAnd more')})()""")
    chk("taught screen type is remembered, others are not",r=="PAY_RECEIPT|")
    # sheet shows the sections
    await pg.evaluate("sheets.ixmem()");await pg.wait_for_timeout(300)
    h=await pg.evaluate("(document.querySelector('#ixlearn')||{}).textContent||''")
    chk("memory sheet shows AI use and cases",("AI use" in h) and ("Cases to turn into rules" in h))
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");raise SystemExit(0 if ok else 1)
asyncio.run(main())
