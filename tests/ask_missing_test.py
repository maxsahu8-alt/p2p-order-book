import asyncio,json,os
from playwright.async_api import async_playwright
exec(open(os.path.dirname(os.path.abspath(__file__))+"/ask_plus_test.py").read().split("async def run")[0])
recs.append({"id":"P1","kind":"party","name":"Ravi","time":now-20*D})
async def run(pg,q):
  return await pg.evaluate("""(q)=>{const o=document.createElement('div');document.body.appendChild(o);const n0=document.querySelectorAll('.acard').length;let ok=false,err='';try{ok=laAnswer(q,o)}catch(e){err=String(e)}
    const cards=[...document.querySelectorAll('.acard')].slice(n0).map(c=>c.textContent);o.remove();return {ok,t:o.textContent,cards,err,pend:!!LA.pend}}""",q)
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script("if(!localStorage.getItem('p2p_orders_v1'))localStorage.setItem('p2p_orders_v1',%s)"%json.dumps(json.dumps(recs)))
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    r=await run(pg,"Ravi ko pay kiya");chk("asks how much",r["pend"] and "kitna diya" in r["t"])
    r=await run(pg,"paanch hazaar");chk("finishes with the answer (number words)",r["cards"] and "5000" in r["cards"][0].replace(",","") and "Ravi" in r["cards"][0])
    r=await run(pg,"Axis se transfer karo");chk("transfer asks for amount and bank",r["pend"])
    r=await run(pg,"aaj ka profit");chk("an unrelated question is not swallowed",("profit" in r["t"].lower()) and not r["cards"])
    r=await run(pg,"Axis se transfer karo");r=await run(pg,"sbi me 4000");chk("transfer completed",r["cards"] and "4000" in r["cards"][0].replace(",","") and r["cards"][0].index("Axis")<r["cards"][0].index("Sbi"))
    r=await run(pg,"kharcha kiya");r=await run(pg,"200");chk("expense completed",r["cards"] and "200" in r["cards"][0])
    r=await run(pg,"usdt kharida 93 pe");chk("asks quantity",r["pend"] and "Kitne USDT" in r["t"])
    r=await run(pg,"500");chk("buy order completed",r["cards"] and "500" in r["cards"][0] and "93" in r["cards"][0])
    r=await run(pg,"Ravi ko diya");r=await run(pg,"nahi");chk("saying no drops it",not r["cards"] and "chhod" in r["t"])
    for i in range(4):
      r=await run(pg,"kharcha kiya");r=await run(pg,"%d"%(100+i))
    chk("many rounds in a row still work",r["cards"] and "103" in r["cards"][0])
    r=await run(pg,"Ravi ko kitna dena hai");chk("a plain question is not treated as missing detail",not r["pend"])
    chk("no page errors",not errs);print(errs)
    print("ALL OK" if ok else "SOME FAILED")
    await b.close()
asyncio.run(main())
