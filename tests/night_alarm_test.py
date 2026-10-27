from playwright.sync_api import sync_playwright
import json,os,time
APP=os.environ.get("APP_FILE","/home/claude/p2p-tracker.html")
f=0
def chk(n,c):
    global f
    print(("PASS " if c else "FAIL ")+n); f+=0 if c else 1
now=int(time.time()*1000)
MOCK="""
window.__na={ver:"0.0.0.00109",on:false,buy:true,sell:true,allday:true,from:1380,to:480,buyEvery:60,sellEvery:120,maxMin:30,loud:true,snoozeUntil:0,access:false,ringing:false,listening:true,battery:false,seenAt:0,seenKind:"",seenPkg:"",lang:"en"};
window.__calls=[];
window.__log=[{t:%d,k:"BUY",r:1},{t:%d,k:"SELL",r:1},{t:%d,k:"DONE",r:0},{t:%d,k:"TEST",r:1},{t:%d,k:"BUY",r:1}];
window.P2PNative={appReady(){},naGet(){return JSON.stringify(window.__na)},naSet(j){window.__calls.push(['set',j]);Object.assign(window.__na,JSON.parse(j))},
 naLog(){return JSON.stringify(window.__log)},naClearLog(){window.__log=[]},naAck(){window.__calls.push(['ack'])},naTest(){window.__calls.push(['test']);return true},
 naRebind(){window.__calls.push(["rb"])},naOpenAccess(){window.__calls.push(['acc'])},naOpenBattery(){window.__calls.push(['bat'])},naOpenDnd(){window.__calls.push(['dnd'])}};
"""%(now-3600000,now-7200000,now-1800000,now-60000,now-20*3600000)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    # no native bridge: a friendly message
    pg.goto('file://'+APP);pg.wait_for_timeout(900)
    pg.evaluate("sheets.nalarm()");pg.wait_for_timeout(200)
    chk("browser: Android-only message",pg.evaluate("document.querySelector('#sheetBody').innerText.includes('Android app')"))
    chk("summary counts",pg.evaluate("(()=>{const s=naSummary([{t:5,k:'BUY'},{t:6,k:'SELL'},{t:7,k:'DONE'},{t:8,k:'TEST'},{t:1,k:'BUY'}],[{time:6}],5);return s.buy==1&&s.sell==1&&s.done==1&&s.orderN==2&&s.made==1&&s.missing==1})()"))
    pg.close()
    pg=b.new_page(viewport={'width':390,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(MOCK)
    pg.goto('file://'+APP);pg.wait_for_timeout(900)
    pg.evaluate("sheets.nalarm()");pg.wait_for_timeout(200)
    t=pg.evaluate("document.querySelector('#sheetBody').innerText")
    chk("sheet opens with steps",'Notification access' in t and 'Battery' in t)
    chk("last 12h ignores old and TEST",pg.evaluate("document.querySelector('#sheetBody').innerText.includes('1 BUY, 1 SELL, 1 complete')"))
    chk("master ON refused without access",True)
    pg.evaluate("(()=>{const c=document.querySelector('[data-na=on]');c.checked=true;c.dispatchEvent(new Event('change'))})()")
    chk("ON blocked until access",pg.evaluate("window.__na.on")==False and pg.evaluate("document.querySelector('[data-na=on]').checked")==False)
    pg.evaluate("window.__na.access=true")
    pg.evaluate("(()=>{const c=document.querySelector('[data-na=on]');c.checked=true;c.dispatchEvent(new Event('change'))})()")
    chk("ON saved with access",pg.evaluate("window.__na.on")==True)
    pg.evaluate("(()=>{const c=document.querySelector('[data-na=allday]');c.checked=false;c.dispatchEvent(new Event('change'))})()")
    chk("window shown when not 24h",pg.evaluate("!document.querySelector('#na-win').hidden"))
    pg.evaluate("(()=>{const i=document.querySelector('#na-from');i.value='22:30';i.dispatchEvent(new Event('change'))})()")
    chk("from time saved as minutes",pg.evaluate("window.__na.from")==1350)
    pg.click('#na-test');chk("test rings",pg.evaluate("window.__calls.some(c=>c[0]==='test')"))
    pg.click('#na-ack');chk("ack",pg.evaluate("window.__calls.some(c=>c[0]==='ack')"))
    pg.click('#na-snz');chk("snooze set",pg.evaluate("window.__na.snoozeUntil")>now)
    pg.click('#na-bat');pg.click('#na-dnd');chk("settings buttons",pg.evaluate("window.__calls.some(c=>c[0]==='bat')&&window.__calls.some(c=>c[0]==='dnd')"))
    pg.select_option('#na-be','120');chk("interval saved",pg.evaluate("window.__na.buyEvery")==120)
    chk("feature listed",pg.evaluate("FEAT_BY.nightalarm&&FEAT_BY.nightalarm.sheets[0]==='nalarm'"))
    pg.evaluate("openDrawer()");pg.wait_for_timeout(300)
    chk("menu card shows",pg.evaluate("!!document.querySelector('#dTop .nalc')"))
    pg.evaluate("window.__na.on=false");pg.evaluate("openDrawer()");pg.wait_for_timeout(200)
    pg.evaluate("(()=>{const c=document.querySelector('#nalTog');c.checked=true;c.dispatchEvent(new Event('change'))})()")
    chk("menu switch turns alarm ON",pg.evaluate("window.__na.on")==True)
    pg.evaluate("window.__na.ringing=true");pg.evaluate("openDrawer()");pg.wait_for_timeout(200)
    chk("Seen shown while ringing",pg.evaluate("!!document.querySelector('#nalAck')"))
    pg.evaluate("localStorage.setItem('p2p_lang','hi')");pg.evaluate("sheets.nalarm()");pg.wait_for_timeout(200)
    chk("Hinglish text",pg.evaluate("document.querySelector('#sheetBody').textContent.includes('Raat ka order alarm')&&document.querySelector('#sheetBody').textContent.includes('Pichle 12 ghante')"))
    pg.evaluate("localStorage.setItem('p2p_lang','en')");pg.evaluate("sheets.nalarm()");pg.wait_for_timeout(200)
    chk("English text",pg.evaluate("document.querySelector('#sheetBody').textContent.includes('Last 12 hours')"))
    chk("language select in settings",pg.evaluate("!!document.querySelector('#st-lang')&&LANG()==='en'"))
    pg.evaluate("window.__na.listening=false;window.__na.on=true;sheets.nalarm()");pg.wait_for_timeout(200)
    chk("not connected shows Reconnect",pg.evaluate("!!document.querySelector('#na-rb')"))
    pg.evaluate("document.querySelector('#na-rb').click()");chk("reconnect calls native",pg.evaluate("window.__calls.some(c=>c[0]==='rb')"))
    pg.evaluate("window.__na.listening=true;window.__na.ringing=false;window.__na.snoozeUntil=0;window.__na.seenAt=Date.now()-120000;window.__na.seenKind='BUY';window.__na.seenPkg='com.kubi.kucoin';sheets.nalarm()");pg.wait_for_timeout(200)
    chk("shows KuCoin heard",pg.evaluate("document.querySelector('.nap-heard').textContent.includes('com.kubi.kucoin')"))
    chk("status banner ready",pg.evaluate("document.querySelector('.nap-hero').classList.contains('ok')"))
    chk("no page errors",not errs)
    if errs:print(errs)
    b.close()
print("FAILED",f);raise SystemExit(1 if f else 0)
