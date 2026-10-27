// ================= NIGHT ORDER ALARM (Android app) =================
// The phone app listens to KuCoin notifications only and rings a loud alarm for a new BUY or SELL order until you tap "Seen".
// Only the TYPE and TIME of a notification is kept. Names and chat messages are never read or saved.
const NA=()=>{try{return window.P2PNative&&typeof P2PNative.naGet==="function"?P2PNative:null}catch(e){return null}};
function naRead(){const n=NA();if(!n)return null;try{return JSON.parse(n.naGet())}catch(e){return null}}
function naLogRead(){const n=NA();if(!n)return[];try{const a=JSON.parse(n.naLog());return Array.isArray(a)?a:[]}catch(e){return[]}}
function naSet(o){const n=NA();if(n)try{n.naSet(JSON.stringify(o))}catch(e){}}
const naHM=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const naMin=s=>{const p=String(s||"").split(":");return Math.max(0,Math.min(1439,(+p[0]||0)*60+(+p[1]||0)))};
// summary of the notifications since a time, against the orders written in the app since then (a rough count, not an exact match)
function naSummary(log,ords,since){
  const L=(log||[]).filter(x=>x&&x.t>=since&&x.k!=="TEST");
  const c={BUY:0,SELL:0,DONE:0};L.forEach(x=>{if(c[x.k]!=null)c[x.k]++});
  const made=(ords||[]).filter(o=>(+o.time||0)>=since).length;
  const orderN=c.BUY+c.SELL;
  return{buy:c.BUY,sell:c.SELL,done:c.DONE,made,orderN,missing:Math.max(0,orderN-made)};
}
sheets.nalarm=function(){
  const n=NA(),s=naRead();
  if(!n||!s){openSheet(`<div class="insw"><h3>${tr("Night order alarm","Raat ka order alarm")}</h3><p class="note">${tr("This alarm works only in the Android app. Install the latest APK, then come back here.","Ye alarm sirf Android app me chalta hai. Latest APK install karo, phir yahan aao.")}</p><div class="cpexp"><button type="button" class="mini ghost" data-close>${tr("Close","Band karo")}</button></div></div>`);return}
  const tg=(k,t,d,on)=>`<div class="dqr fsr"><span><b>${esc(t)}</b><small>${esc(d)}</small></span><label class="tog"><input type="checkbox" data-na="${k}" ${on?"checked":""}><span></span></label></div>`;
  const opt=(arr,v,f)=>arr.map(x=>`<option value="${x}" ${x==v?"selected":""}>${f(x)}</option>`).join("");
  const since=Date.now()-12*3600000,sm=naSummary(naLogRead(),orders,since);
  const snz=s.snoozeUntil>Date.now();
  const step=(ok,t,d,id,b)=>`<div class="dqr fsr"><span><b>${ok?"✅":"⬜"} ${esc(t)}</b><small>${esc(d)}</small></span><button type="button" class="mini ghost" id="${id}">${b}</button></div>`;
  openSheet(`<div class="insw"><h3>${tr("Night order alarm","Raat ka order alarm")}</h3>
   <p class="note">${tr(`A loud alarm rings when a new KuCoin order arrives and keeps ringing until you tap "Seen". Only the type and time of a notification are kept. Names and chat messages are never read.`,`KuCoin ka naya order aate hi tez alarm bajega, jab tak "Dekh liya" na dabao. Sirf notification ka type aur time yaad rehta hai. Naam ya chat kabhi nahi padhi jaati.`)}</p>
   <div class="pcsec">${tr("Setup (one time)","Setup (ek baar)")}</div><div class="rml">
    ${step(s.access,tr("Notification access","Notification access"),tr("Let Pexai see KuCoin notifications","Pexai ko KuCoin ki notification dekhne do"),"na-acc",s.access?"Check":"Open")}
    ${step(false,tr("Battery: Unrestricted","Battery: Unrestricted"),tr("Otherwise the phone may stop the app at night","Warna phone raat me app band kar sakta hai"),"na-bat","Open")}
    ${step(false,tr("Do Not Disturb: Alarms allowed","Do Not Disturb: Alarms allowed"),tr("So the alarm rings in silent or DND mode","Taaki silent ya DND me bhi alarm bajey"),"na-dnd","Open")}
   </div>
   <div class="pcsec">${tr("Alarm","Alarm")}</div><div class="rml">
    ${tg("on",tr("Night order alarm ON","Night order alarm ON"),tr("Main switch","Main switch"),s.on)}
    ${tg("buy",tr("BUY order","BUY order"),tr("You must pay: loud alarm every time","Payment karna hai: har baar tez alarm"),s.buy)}
    ${tg("sell",tr("SELL order","SELL order"),tr("Buyer is paying: alarm","Buyer pay kar raha hai: alarm"),s.sell)}
    ${tg("loud",tr("Full volume","Full awaaz"),tr("Alarm volume goes to maximum","Alarm ki awaaz apne aap max ho jati hai"),s.loud)}
    ${tg("allday",tr("24 hours","24 ghante"),tr("Turn off to use only the time below","Band karo to sirf neeche ka time"),s.allday)}
   </div>
   <div class="tgf" id="na-win" ${s.allday?"hidden":""}><span class="note">${tr("Time:","Time:")}</span><input type="time" id="na-from" value="${naHM(s.from)}"><span class="note">${tr("to","se")}</span><input type="time" id="na-to" value="${naHM(s.to)}"></div>
   <div class="cpterms">
    <label class="note">${tr("BUY alarm every ","BUY alarm har ")}<select id="na-be">${opt([30,60,120,180],s.buyEvery,x=>x+" sec")}</select></label>
    <label class="note">${tr("SELL alarm every ","SELL alarm har ")}<select id="na-se">${opt([60,120,180,300],s.sellEvery,x=>x+" sec")}</select></label>
    <label class="note">${tr("Stop after ","Maximum ")}<select id="na-mx">${opt([10,20,30,60],s.maxMin,x=>x+" min")}</select></label></div>
   <div class="cpexp"><button type="button" class="primary" id="na-test">${tr("Test alarm","Test alarm")}</button><button type="button" class="mini ghost" id="na-ack">${tr("Seen (stop alarm)","Dekh liya (band karo)")}</button><button type="button" class="mini ghost" id="na-snz">${snz?tr("Cancel snooze","Snooze hatao"):tr("Snooze 1 hour","1 ghanta snooze")}</button></div>
   <p class="note" id="na-msg" style="margin:6px 0"></p>
   <div class="pcsec">${tr("Last 12 hours","Pichle 12 ghante")}</div>
   <p class="note">${tr(`Notifications: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. Orders added in the app: <b>${sm.made}</b>.`,`Notification: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. App me daale gaye order: <b>${sm.made}</b>.`)}${sm.missing?` <span class="warnline">${tr(`Maybe ${sm.missing} order(s) are not added in the app. Please check.`,`Shayad ${sm.missing} order app me nahi daale. Check karo.`)}</span>`:""}</p>
   <p class="note">${tr("This is only an estimate. The notification time can differ from the real order time.","Ye sirf andaza hai. Notification ka time order ke asli time se alag ho sakta hai.")}</p>
   <div class="cpexp"><button type="button" class="mini ghost" id="na-clr">${tr("Clear log","Log saaf karo")}</button><button type="button" class="mini ghost" data-close>${tr("Close","Band karo")}</button></div></div>`,el=>{
    const q=x=>el.querySelector(x),msg=t=>{q("#na-msg").textContent=t};
    el.querySelectorAll("[data-na]").forEach(c=>c.onchange=()=>{
      const k=c.dataset.na;if(k==="on"&&c.checked&&!naRead().access){c.checked=false;msg(tr("Give Notification access first (setup step 1).","Pehle Notification access do (setup ka step 1)."));return}
      naSet({[k]:c.checked});if(k==="allday")q("#na-win").hidden=c.checked;toast(c.checked?"ON":"OFF")});
    q("#na-from").onchange=q("#na-to").onchange=()=>naSet({from:naMin(q("#na-from").value),to:naMin(q("#na-to").value)});
    q("#na-be").onchange=()=>naSet({buyEvery:+q("#na-be").value});
    q("#na-se").onchange=()=>naSet({sellEvery:+q("#na-se").value});
    q("#na-mx").onchange=()=>naSet({maxMin:+q("#na-mx").value});
    q("#na-acc").onclick=()=>{if(naRead().access){msg(tr("Notification access is already given.","Notification access mil gaya hai."));return}n.naOpenAccess();msg(tr("Find Pexai in the list, turn it ON, then come back.","List me Pexai dhundo, ON karo, phir wapas aao."))};
    q("#na-bat").onclick=()=>{n.naOpenBattery();msg(tr("Choose Battery > Unrestricted.","Battery > Unrestricted chuno."))};
    q("#na-dnd").onclick=()=>{n.naOpenDnd();msg(tr("Keep Alarms allowed.","Alarms ko allow rakho."))};
    q("#na-test").onclick=()=>{const s2=naRead();if(!s2.access){msg(tr("Give Notification access first.","Pehle Notification access do."));return}
      if(!s2.on){naSet({on:true});q("[data-na=on]").checked=true}
      msg(n.naTest()?tr("Alarm is ringing. Tap 'Seen' to stop it.","Alarm baj raha hai. Band karne ko 'Dekh liya' dabao."):tr("The alarm service is not running yet. Turn access ON and reopen the app.","Alarm service abhi chalu nahi hai. Access ON karke app dobara kholo."))};
    q("#na-ack").onclick=()=>{n.naAck();msg(tr("Alarm stopped.","Alarm band."))};
    q("#na-snz").onclick=()=>{const on=naRead().snoozeUntil>Date.now();naSet({snoozeUntil:on?0:Date.now()+3600000});q("#na-snz").textContent=on?tr("Snooze 1 hour","1 ghanta snooze"):tr("Cancel snooze","Snooze hatao");msg(on?tr("Snooze cancelled.","Snooze hata diya."):tr("No alarm for 1 hour.","1 ghante tak alarm nahi bajega."))};
    q("#na-clr").onclick=()=>{n.naClearLog();msg(tr("Log cleared.","Log saaf."))}});
};

// compact card at the top of the menu: status and an ON/OFF switch, always one tap away
function nalCard(){
  if(!NA()||!feat("nightalarm"))return"";const s=naRead();if(!s)return"";
  const snz=s.snoozeUntil>Date.now();
  const sub=!s.access?tr("Setup pending: give Notification access","Setup baaki: Notification access do"):s.ringing?tr("Alarm is ringing","Alarm baj raha hai"):!s.on?tr("Off","Band hai"):snz?tr("Snoozed","Snooze me"):"ON · BUY"+(s.sell?" + SELL":"")+" · "+(s.allday?tr("24 hours","24 ghante"):naHM(s.from)+"–"+naHM(s.to));
  return`<div class="nalc ${s.on&&s.access?"on":""}"><button type="button" class="nalb" id="nalOpen"><span class="nali">🔔</span><span><b>${tr("Night order alarm","Raat ka order alarm")}</b><small>${esc(sub)}</small></span></button>${s.ringing?'<button type="button" class="mini primary" id="nalAck">${tr("Seen","Dekh liya")}</button>':`<label class="tog"><input type="checkbox" id="nalTog" ${s.on&&s.access?"checked":""}><span></span></label>`}</div>`}
function nalBind(close){
  const n=NA();if(!n)return;
  const o=document.querySelector("#nalOpen");if(o)o.onclick=()=>{close();sheets.nalarm()};
  const a=document.querySelector("#nalAck");if(a)a.onclick=()=>{n.naAck();openDrawer()};
  const t=document.querySelector("#nalTog");if(t)t.onchange=()=>{
    if(t.checked&&!naRead().access){t.checked=false;toast(tr("Give Notification access first","Pehle Notification access do"));close();sheets.nalarm();return}
    naSet({on:t.checked});toast(t.checked?tr("Night alarm ON","Night alarm ON"):tr("Night alarm OFF","Night alarm OFF"));openDrawer()}}
