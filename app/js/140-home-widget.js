// ===== Pro tools · batch C: home-screen widget + at a glance =====
function glanceData(list){const t0=p7Day(Date.now()),ol=orders.filter(o=>o.time>=t0),st=stats(ol),pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;const al=list||lastAlerts||[];
 const p=Math.round(st.profit);return{profit:(p<0?"−":"")+inr(Math.abs(p)),neg:p<0,line:`${pend} open · ${ol.length} order${ol.length===1?"":"s"} today`,alert:al.length?`${al.length} need attention`:"All clear",pend,orders:ol.length,alerts:al.length,t:Date.now()}}
var __wLast="";
function widgetPush(list){const g=glanceData(list);const j=JSON.stringify({profit:g.profit,neg:g.neg,line:g.line,alert:g.alert});if(j===__wLast)return;__wLast=j;try{if(window.P2PNative&&typeof P2PNative.setWidget==="function")P2PNative.setWidget(j)}catch(e){}}
sheets.glance=function(){const g=glanceData();const nat=!!(window.P2PNative&&typeof P2PNative.setWidget==="function");
 openSheet(`<div class="insw"><div class="insh"><h3>At a glance</h3><span class="note">${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
  <div class="pvk"><div><span>Today's profit</span><b class="${g.neg?"neg":"pos"}">${esc(g.profit)}</b></div><div><span>Open orders</span><b>${g.pend}</b></div><div><span>Orders today</span><b>${g.orders}</b></div></div>
  ${(lastAlerts||[]).slice(0,5).map(a=>`<div class="p7chk"><i class="${a.hi?"bad":"warn"}">${a.hi?"!":"•"}</i><p>${esc(a.t)}</p></div>`).join("")||'<p class="note">All clear. Nothing needs attention.</p>'}
  <div class="pcsec">Home-screen widget</div>
  <p class="note">${nat?"Long-press your phone's home screen, tap Widgets, find "+APP_NAME+" and place it. It shows today's profit, open orders and alerts, and opens the app when tapped. It refreshes every time you use the app.":"The home-screen widget works in the Android app. Install the latest APK, then long-press the home screen and add the "+APP_NAME+" widget."}</p></div>`)};

