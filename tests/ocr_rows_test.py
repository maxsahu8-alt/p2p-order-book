import asyncio, json, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
# lines as ML Kit gives them for a column-wise read of the KuCoin order page: all labels, then all values, each with its box [text,l,t,r,b]
LAB=["Total Amount","USDT Price","Amount","Tax","Counterparty","Order Number","Created At"]
VAL=["19,000 INR","108.98 INR","174.343916 USDT","1.743439USDT(1%)","Nishita(nis***@gmail.com)","6acb27a9e50cd50001686c70","10/11/2026 11:37:37"]
lines=[["Sell USDT",60,500,300,540],["Transaction Complete",60,100,500,160]]
for i,(a,b) in enumerate(zip(LAB,VAL)):
  y=600+i*70
  lines.append([a,60,y,300,y+40]);lines.append([b,420,y+3,680,y+43])
lines.append(["Having problems with this order?",60,1200,600,1240])
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.goto("file://"+APP,wait_until="commit");await pg.wait_for_timeout(1500)
    t=await pg.evaluate("ixRowsText(%s)"%json.dumps(lines))
    print(t)
    rows=t.split("\n")
    chk("labels and values on the same row are joined",any(r.startswith("Total Amount") and "19,000 INR" in r for r in rows))
    chk("each of the 7 pairs is one row",sum(1 for a,v in zip(LAB,VAL) if any(r.startswith(a) and v in r for r in rows))==7)
    chk("reading order top to bottom",rows[0]=="Transaction Complete" and rows[-1].startswith("Having"))
    o=await pg.evaluate("(t=>{const o=ixOrdFrom(t,0.9);return{fiat:o.fiat,crypto:o.crypto,price:o.price,cp:o.cp}})(%s)"%json.dumps(t))
    chk("order read from the joined rows",o["fiat"]==19000 and abs(o["crypto"]-174.343916)<1e-6 and o["price"]==108.98 and o["cp"]=="Nishita")
    chk("a single line gives no rows text (falls back to plain text)",await pg.evaluate("ixRowsText([['a',0,0,10,10]])")=="")
    chk("garbage input never throws",await pg.evaluate("ixRowsText(null)+ixRowsText([[1,2]])")=="")
    chk("no page errors",not errs)
    await b.close()
  print("ALL OK" if ok else "SOME FAILED")
asyncio.run(main())
