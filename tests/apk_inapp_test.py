import asyncio, json, sys, os
from playwright.async_api import async_playwright
APP=os.environ.get("APP","/home/claude/p2p-tracker.html")
INIT="""window.__c=[];window.__st={s:'idle',pct:0,err:''};
window.P2PNative={appReady(){},appInfo(){return JSON.stringify({apk:'0.0.0.00112',code:34,web:'',lastCheck:0,channel:''})},
apkInstall(u,h,c,n){window.__c.push(['dl',u,h,c,n]);if(!window.__keep)window.__st={s:'downloading',pct:40,err:''}},apkState(){return JSON.stringify(window.__st)},apkInstallAgain(){window.__c.push(['again'])},
openUrl(u){window.__c.push(['open',u])},naGet(){return '{}'},naLog(){return '[]'}};"""
async def main():
  ok=True
  def chk(n,c):
    nonlocal ok
    print(("PASS " if c else "FAIL ")+n);ok=ok and bool(c)
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={"width":390,"height":900});errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.route("**/*",lambda r:r.abort() if r.request.url.startswith("http") else r.continue_())
    await pg.add_init_script(INIT)
    await pg.goto("file://"+APP);await pg.wait_for_timeout(900)
    await pg.evaluate("P2PApkUpdate({name:'0.0.0.00113',code:35,sha256:'abc',url:'https://github.com/x/y/releases/latest/download/a.apk',notes:'n'})")
    await pg.click("#apk-dl");await pg.wait_for_timeout(900)
    chk("download started",await pg.evaluate("__c.some(c=>c[0]==='dl')"))
    chk("sha/code passed",await pg.evaluate("JSON.stringify(__c[0].slice(2))")=='["abc",35,"0.0.0.00113"]')
    await pg.evaluate("P2PApkDone('0.0.0.00113')");chk("updated toast","updated to" in (await pg.inner_text(".apkup")).lower())
    chk("progress shown","40%" in await pg.inner_text("#apk-dl"))
    await pg.evaluate("__st={s:'perm',pct:100,err:''}");await pg.wait_for_timeout(700)
    chk("permission hint","unknown apps" in (await pg.inner_text("#sheetBody")))
    await pg.click("#apk-dl");chk("install again called",await pg.evaluate("__c.some(c=>c[0]==='again')"))
    await pg.evaluate("closeSheet();__keep=1;__st={s:'error',pct:0,err:'boom'};window.P2PApkUpdate({name:'x',url:'https://github.com/a.apk'})")
    await pg.click("#apk-dl");await pg.wait_for_timeout(700)
    chk("error shows retry","Retry" in await pg.inner_text("#apk-dl"))
    # old APK without bridge method falls back to browser
    await pg.evaluate("closeSheet();delete window.P2PNative.apkInstall;window.__c=[]")
    await pg.evaluate("window.P2PApkUpdate({name:'x',url:'https://github.com/a.apk'})")
    await pg.click("#apk-dl");chk("old apk falls back to openUrl",await pg.evaluate("__c.some(c=>c[0]==='open')"))
    chk("no page errors",not errs)
    if errs:print(errs)
    await b.close()
  print("ALL OK" if ok else "FAILED");sys.exit(0 if ok else 1)
asyncio.run(main())
