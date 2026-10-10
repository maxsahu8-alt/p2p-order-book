import asyncio, json, os, time
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
SET={"id":"s_main","kind":"setting","stock":{},"prefs":{"owner":"shiv"}}
B1={"id":"BA","kind":"bank","name":"Axis Main","bankName":"Axis Bank","accNo":"91000487410","type":"Bank","opening":100000,"time":int(time.time()*1000)-30*864e5}
B2={"id":"BB","kind":"bank","name":"Slice","bankName":"Slice","accNo":"5552394","type":"Bank","opening":5000,"time":int(time.time()*1000)-30*864e5}
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await (await b.new_context(viewport={"width":390,"height":900})).new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(f"if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',{json.dumps(json.dumps([SET,B1,B2]))})")
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    # reader starts but reads nothing; an AI key is set; the AI answers per picture
    await pg.evaluate("""void(()=>{aiCfg.prov='anthropic';aiCfg.key='k';
      ocrInit=async()=>({recognize:async()=>({data:{text:'',confidence:0}})});
      assetsApi={upload:async()=>({id:'a'+Math.random()})};
      window.__asked=[];
      verExtract=async(blobs)=>{const n=window.__asked.length;window.__asked.push(blobs.length);
        const empty={status:null,amount:null,currency:null,sender:null,receiver:null,utr:null,method:null,bank:null,date:null,time:null,acct:null,conf:0.9};
        const eo={id:null,status:null,buyer:null,seller:null,fiat:null,crypto:null,coin:null,price:null,method:null,when:null,acct:null,conf:0.9};
        if(n===0)return{X:{pay:empty,ord:{...eo,id:'6ac943cde50cd5000167e73e',status:'Completed',seller:'MOHAMMED ILIYAZ HUSSAIN BELLARY',fiat:31905.25,crypto:325,coin:'USDT',price:98.17,when:'2026-10-10 01:13'},flags:[]}};
        const amt=n===1?30000:1905,tm=n===1?'01:39':'01:40',ac=n===1?'••7410':'••2394';
        return{X:{pay:{...empty,status:'SUCCESS',amount:amt,currency:'INR',receiver:'Bellary Mohammed Iliyaz Hussain',utr:'T26'+n+'0000000'+n,method:'UPI',date:'2026-10-10',time:tm,acct:ac},ord:eo,flags:[]}}}})()""")
    await pg.evaluate("goPage('intake')");await pg.wait_for_timeout(300)
    mk=lambda n,k:{"name":n,"mimeType":"image/png","buffer":bytes([k]*40)}
    await pg.set_input_files("#i2-file",[mk("o.png",1),mk("a.png",2),mk("b.png",3)]);await pg.wait_for_timeout(5000)
    r=await pg.evaluate("({asked:window.__asked,g:ixS.groups.map(g=>({n:g.items.length,part:g.partSum,ord:!!g.order}))})");print(r)
    chk("AI was asked once per picture",r["asked"]==[1,1,1])
    chk("one transaction with the order and both parts",len(r["g"])==1 and r["g"][0]["n"]==3 and r["g"][0]["ord"])
    chk("no page errors",not errs);print(errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
