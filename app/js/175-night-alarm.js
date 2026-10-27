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
  if(!n||!s){openSheet(`<div class="insw"><h3>Night order alarm</h3><p class="note">This alarm works only in the Android app. Install the latest APK, then come back here.</p><div class="cpexp"><button type="button" class="mini ghost" data-close>Close</button></div></div>`);return}
  const tg=(k,t,d,on)=>`<div class="dqr fsr"><span><b>${esc(t)}</b><small>${esc(d)}</small></span><label class="tog"><input type="checkbox" data-na="${k}" ${on?"checked":""}><span></span></label></div>`;
  const opt=(arr,v,f)=>arr.map(x=>`<option value="${x}" ${x==v?"selected":""}>${f(x)}</option>`).join("");
  const since=Date.now()-12*3600000,sm=naSummary(naLogRead(),orders,since);
  const snz=s.snoozeUntil>Date.now();
  const step=(ok,t,d,id,b)=>`<div class="dqr fsr"><span><b>${ok?"✅":"⬜"} ${esc(t)}</b><small>${esc(d)}</small></span><button type="button" class="mini ghost" id="${id}">${b}</button></div>`;
  openSheet(`<div class="insw"><h3>Night order alarm</h3>
   <p class="note">A loud alarm rings when a new KuCoin order arrives and keeps ringing until you tap "Seen". Only the type and time of a notification are kept. Names and chat messages are never read.</p>
   <div class="pcsec">Setup (one time)</div><div class="rml">
    ${step(s.access,"Notification access","Let Pexai see KuCoin notifications","na-acc",s.access?"Check":"Open")}
    ${step(false,"Battery: Unrestricted","Otherwise the phone may stop the app at night","na-bat","Open")}
    ${step(false,"Do Not Disturb: Alarms allowed","So the alarm rings in silent or DND mode","na-dnd","Open")}
   </div>
   <div class="pcsec">Alarm</div><div class="rml">
    ${tg("on","Night order alarm ON","Main switch",s.on)}
    ${tg("buy","BUY order","You must pay: loud alarm every time",s.buy)}
    ${tg("sell","SELL order","Buyer is paying: alarm",s.sell)}
    ${tg("loud","Full volume","Alarm volume goes to maximum",s.loud)}
    ${tg("allday","24 hours","Turn off to use only the time below",s.allday)}
   </div>
   <div class="tgf" id="na-win" ${s.allday?"hidden":""}><span class="note">Time:</span><input type="time" id="na-from" value="${naHM(s.from)}"><span class="note">to</span><input type="time" id="na-to" value="${naHM(s.to)}"></div>
   <div class="cpterms">
    <label class="note">BUY alarm every <select id="na-be">${opt([30,60,120,180],s.buyEvery,x=>x+" sec")}</select></label>
    <label class="note">SELL alarm every <select id="na-se">${opt([60,120,180,300],s.sellEvery,x=>x+" sec")}</select></label>
    <label class="note">Stop after <select id="na-mx">${opt([10,20,30,60],s.maxMin,x=>x+" min")}</select></label></div>
   <div class="cpexp"><button type="button" class="primary" id="na-test">Test alarm</button><button type="button" class="mini ghost" id="na-ack">Seen (stop alarm)</button><button type="button" class="mini ghost" id="na-snz">${snz?"Cancel snooze":"Snooze 1 hour"}</button></div>
   <p class="note" id="na-msg" style="margin:6px 0"></p>
   <div class="pcsec">Last 12 hours</div>
   <p class="note">Notifications: <b>${sm.buy}</b> BUY, <b>${sm.sell}</b> SELL, <b>${sm.done}</b> complete. Orders added in the app: <b>${sm.made}</b>.${sm.missing?` <span class="warnline">Maybe ${sm.missing} order(s) are not added in the app. Please check.</span>`:""}</p>
   <p class="note">This is only an estimate. The notification time can differ from the real order time.</p>
   <div class="cpexp"><button type="button" class="mini ghost" id="na-clr">Clear log</button><button type="button" class="mini ghost" data-close>Close</button></div></div>`,el=>{
    const q=x=>el.querySelector(x),msg=t=>{q("#na-msg").textContent=t};
    el.querySelectorAll("[data-na]").forEach(c=>c.onchange=()=>{
      const k=c.dataset.na;if(k==="on"&&c.checked&&!naRead().access){c.checked=false;msg("Give Notification access first (setup step 1).");return}
      naSet({[k]:c.checked});if(k==="allday")q("#na-win").hidden=c.checked;toast(c.checked?"ON":"OFF")});
    q("#na-from").onchange=q("#na-to").onchange=()=>naSet({from:naMin(q("#na-from").value),to:naMin(q("#na-to").value)});
    q("#na-be").onchange=()=>naSet({buyEvery:+q("#na-be").value});
    q("#na-se").onchange=()=>naSet({sellEvery:+q("#na-se").value});
    q("#na-mx").onchange=()=>naSet({maxMin:+q("#na-mx").value});
    q("#na-acc").onclick=()=>{if(naRead().access){msg("Notification access is already given.");return}n.naOpenAccess();msg("Find Pexai in the list, turn it ON, then come back.")};
    q("#na-bat").onclick=()=>{n.naOpenBattery();msg("Choose Battery > Unrestricted.")};
    q("#na-dnd").onclick=()=>{n.naOpenDnd();msg("Keep Alarms allowed.")};
    q("#na-test").onclick=()=>{const s2=naRead();if(!s2.access){msg("Give Notification access first.");return}
      if(!s2.on){naSet({on:true});q("[data-na=on]").checked=true}
      msg(n.naTest()?"Alarm is ringing. Tap 'Seen' to stop it.":"The alarm service is not running yet. Turn access ON and reopen the app.")};
    q("#na-ack").onclick=()=>{n.naAck();msg("Alarm stopped.")};
    q("#na-snz").onclick=()=>{const on=naRead().snoozeUntil>Date.now();naSet({snoozeUntil:on?0:Date.now()+3600000});q("#na-snz").textContent=on?"Snooze 1 hour":"Cancel snooze";msg(on?"Snooze cancelled.":"No alarm for 1 hour.")};
    q("#na-clr").onclick=()=>{n.naClearLog();msg("Log cleared.")}});
};

// compact card at the top of the menu: status and an ON/OFF switch, always one tap away
function nalCard(){
  if(!NA()||!feat("nightalarm"))return"";const s=naRead();if(!s)return"";
  const snz=s.snoozeUntil>Date.now();
  const sub=!s.access?"Setup pending: give Notification access":s.ringing?"Alarm is ringing":!s.on?"Off":snz?"Snoozed":"ON · BUY"+(s.sell?" + SELL":"")+" · "+(s.allday?"24 hours":naHM(s.from)+"–"+naHM(s.to));
  return`<div class="nalc ${s.on&&s.access?"on":""}"><button type="button" class="nalb" id="nalOpen"><span class="nali">🔔</span><span><b>Night order alarm</b><small>${esc(sub)}</small></span></button>${s.ringing?'<button type="button" class="mini primary" id="nalAck">Seen</button>':`<label class="tog"><input type="checkbox" id="nalTog" ${s.on&&s.access?"checked":""}><span></span></label>`}</div>`}
function nalBind(close){
  const n=NA();if(!n)return;
  const o=document.querySelector("#nalOpen");if(o)o.onclick=()=>{close();sheets.nalarm()};
  const a=document.querySelector("#nalAck");if(a)a.onclick=()=>{n.naAck();openDrawer()};
  const t=document.querySelector("#nalTog");if(t)t.onchange=()=>{
    if(t.checked&&!naRead().access){t.checked=false;toast("Give Notification access first");close();sheets.nalarm();return}
    naSet({on:t.checked});toast(t.checked?"Night alarm ON":"Night alarm OFF");openDrawer()}}
