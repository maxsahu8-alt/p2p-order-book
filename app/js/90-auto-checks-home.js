// ---------- automatic checks: runs by itself on every change, no AI cost ----------
let lastAlerts=[],alertsOpen=false;
const aAttr=a=>a.sheet?`data-sheet="${a.sheet}"`:`data-go="${a.go}"`;
function renderAlerts(){
  const now=Date.now(),list=[];
  if(alertOn("pending"))orders.filter(o=>(o.status==="Pending"||o.status==="Appeal")&&now-o.time>pref("pmin")*60e3).sort((a,b)=>a.time-b.time).slice(0,3).forEach(o=>list.push({hi:o.status==="Appeal",t:`${o.status} for ${Math.round((now-o.time)/6e4)>120?Math.round((now-o.time)/36e5)+" h":Math.round((now-o.time)/6e4)+" min"}: ${o.side} ${fmtQ(o.qty)} ${o.coin}${o.cp?" · "+o.cp:""}`,go:"orders"}));
  const {bal}=balances();const use=limitUse();
  if(alertOn("limits"))banks.forEach(b=>{if(bal[b.id]<0)list.push({hi:true,t:`${b.name} balance is negative (${inr(bal[b.id])}). Check entries.`,go:"wallet"});
    ["UPI","IMPS","NEFT","ALL"].forEach(m=>{const L=+(b.limits||{})[m];if(!L)return;const u=((use[b.id]||{})[m])||0;if(u/L>=pref("lpct")/100)list.push({hi:u>=L,t:`${b.name} ${m==="ALL"?"total":m} limit ${u>=L?"used up":"almost used"} (${inr(Math.max(0,L-u))} left)`,go:"wallet"})})});
  const today=(new Date().getDay()+6)%7;
  if(alertOn("direct"))parties.forEach(p=>{const wk=+p.weekly||0,lf=wk-partyPaidWeek(p.id);if(!wk||lf<=0.5||p.dueDay===""||p.dueDay==null)return;const d=+p.dueDay;if(d<today)list.push({hi:true,t:`${p.name}: ${inr(lf)} overdue (pay day ${DAYS[d]})`,go:"direct"});else if(d===today)list.push({hi:false,t:`${p.name}: ${inr(lf)} due today`,go:"direct"})});
  const un=orders.filter(o=>o.status!=="Cancelled"&&!noBank(o)&&Math.abs(orderTotal(o)-allocated(o))>0.5).length;if(un&&alertOn("unassigned"))list.push({hi:false,t:`${un} order payment${un>1?"s":""} not assigned to a bank`,go:"wallet"});
  const st=stockLeft();if(alertOn("stock"))Object.entries(st).forEach(([c,q])=>{if(q<-1e-6)list.push({hi:true,t:`${c} stock is below zero (${fmtQ(+q.toFixed(4))}). Add opening stock or check orders.`,go:"wallet"})});
  const nowR=Date.now();reminds.filter(r=>!r.done&&r.at&&r.at<=nowR).sort((a,b)=>a.at-b.at).forEach(r=>list.push({hi:true,t:"Reminder: "+r.text,sheet:"notes"}));
  try{const nd=new Date();parties.forEach(p=>{const lf=accLefts(p);(p.accounts||[]).forEach(a=>{if(!+a.target||!a.due||lf[a.id]<=0.5)return;const dl=daysTo(a.due);if(dl<=1)list.push({hi:dl<0,t:`${p.name} → ${a.holder||a.bankName||a.upi}: ${inr(Math.round(lf[a.id]))} ${dl<0?"overdue":dl===0?"due today":"due tomorrow"}`,sheet:"partyView:"+p.id})})})}catch(e){}
  try{evalRules().forEach(x=>list.push({hi:true,t:"🔔 "+x.t,sheet:"rules"}))}catch(e){}
  try{const cf=cashFlow(pref("cfProfit")!==false);if(cf.short)list.push({hi:true,t:`Money may run short on ${new Date(cf.short.t).toLocaleDateString("en-IN",{weekday:"long"})} by ${inr(Math.round(-cf.short.bal))}`,sheet:"cashflow"})}catch(e){}
  try{bankRisk().filter(x=>x.lv==="bad").forEach(x=>list.push({hi:true,t:`${x.b.name}: high freeze risk today (${x.cr} credits). Rest this account.`,sheet:"bankrisk"}))}catch(e){}
  try{liteBanks().forEach(b=>{const au=b.lite.auto;if((+b.lite.bal||0)<100&&!(au&&au.on))list.push({hi:false,t:`UPI Lite on ${b.name} has only ${inr(Math.round(+b.lite.bal||0))}. Tap to load more.`,sheet:"lite:"+b.id})})}catch(e){}
  khAlerts(list);bhAlerts(list);
  try{if(repDue())list.push({hi:false,t:"🌙 Day report is ready. Tap to see and share.",sheet:"nightrep"})}catch(e){}
  if(typeof backupDue==="function"&&backupDue())list.push({hi:false,t:"Backup due. Tap to download a backup of all your data.",go:"settings"});
  try{widgetPush(list)}catch(e){}
  const bc=$("#bellCount");bc.hidden=!list.length;bc.textContent=list.length>99?"99+":list.length;
  list.sort((a,b)=>(b.hi?1:0)-(a.hi?1:0));lastAlerts=list;const el=$("#alerts");if(!list.length){el.hidden=true;el.innerHTML="";return}
  const hi=list.filter(a=>a.hi).length;el.hidden=false;el.classList.toggle("hi",hi>0);
  const ico=`<span class="aic"><svg viewBox="0 0 24 24"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/></svg></span>`;
  el.innerHTML=`<button type="button" class="abar" id="aTog" aria-expanded="${alertsOpen}">${ico}<span class="atx"><b>${list.length} need${list.length>1?"":"s"} attention${hi?` · <em>${hi} urgent</em>`:""}</b><small>${esc(list[0].t)}</small></span><span class="achv ${alertsOpen?"up":""}"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span></button>`
    +(alertsOpen?`<div class="alist">${list.slice(0,8).map(a=>`<button type="button" class="alert ${a.hi?"hi":""}" ${aAttr(a)}><span class="dot"></span><span>${esc(a.t)}</span></button>`).join("")}${list.length>8?`<button type="button" class="alert" data-ai="home"><span class="dot"></span><span>+${list.length-8} more · ask AI for a full check</span></button>`:""}</div>`:"");
  $("#aTog").onclick=e=>{e.stopPropagation();alertsOpen=!alertsOpen;renderAlerts()};
}
setInterval(()=>{try{renderAlerts();renderWallet();renderJobs()}catch(e){}},60000);
setTimeout(()=>{try{mkStart()}catch(e){}},1200);
$("#askForm").onsubmit=e=>{e.preventDefault();ask($("#askIn").value)};
document.querySelectorAll("#p-ai .chip").forEach(b=>b.onclick=()=>ask(b.dataset.q));

// ideas
let reqCol=null, reqs=[];
function renderReqs(){
  try{if(!$("#sheetBg").hidden&&document.querySelector("#sheetBody #fb-l"))sheets.feedback("mine")}catch(e){}
  const el=$("#reqList");
  if(!reqCol){el.innerHTML='<div class="empty"><strong>Requests unavailable here</strong>Open the app in Claude to send feature requests.</div>';return}
  if(!reqs.length){el.innerHTML='<div class="empty"><strong>No requests yet</strong>Write your first idea above.</div>';return}
  const lbl={new:"Waiting",proposed:"Preview ready",done:"Added",skipped:"Skipped"};
  el.innerHTML=[...reqs].sort((a,b)=>b.time-a.time).map(q=>`<div class="req"><div>${esc(q.text)}</div><span class="rs ${esc(q.status)}">${lbl[q.status]||esc(q.status)}</span><div class="o-meta">${new Date(q.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}${q.reply?" · "+esc(q.reply):""}</div></div>`).join("");
}
$("#ideaForm").onsubmit=async e=>{
  e.preventDefault();const t=$("#ideaIn").value.trim();
  if(!t){toast("Write your idea first");return}
  if(!reqCol){toast("Requests need the app opened in Claude");return}
  $("#ideaBtn").disabled=true;
  try{await reqCol.doc("r"+Date.now().toString(36)).set({text:t.slice(0,1000),status:"new",time:Date.now()});$("#ideaIn").value="";toast("Request sent")}
  catch(err){toast("Couldn't send. Try again.")}
  $("#ideaBtn").disabled=false;
};
renderReqs();
let mcp=null;
const TRIG="trig_017ii1ZVV6A5shPrXx2mxzXM";
$("#nowBtn").onclick=async()=>{
  const b=$("#nowBtn");
  if(!reqs.some(q=>q.status==="new")){toast("Send a request first");return}
  b.disabled=true;b.textContent="Starting…";
  try{
    await mcp.callTool("Claude Code Remote","fire_trigger",{trigger_id:TRIG,text:"Instant run requested from the app's Update now button."},{cache:false});
    b.textContent="Started";toast("Update started. Preview link coming in a few minutes.");
    setTimeout(()=>{b.disabled=false;b.textContent="Update now"},60000);
  }catch(err){
    b.disabled=false;b.textContent="Update now";
    toast(err&&err.code==="not_granted"?"Allow the Claude Code Remote permission and try again":"Couldn't start the update. Try again.");
  }
};

$("#todayLbl").textContent=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"});
document.addEventListener("click",e=>{const g=e.target.closest("[data-go]");if(!g)return;
  const t=g.dataset.go;if(t==="import"){$("#t-add").click();setTimeout(()=>$("#imp").scrollIntoView({behavior:"smooth",block:"start"}),50);return}
  const tb=document.querySelector(`.tabs button[data-tab="${t}"]`);
  if(tb)tb.click();else if(!$("#p-"+t)){if(typeof sheets[t]==="function")sheets[t]();else $("#t-home").click();return}else{document.querySelectorAll(".tabs button").forEach(x=>x.setAttribute("aria-selected","false"));["home","orders","add","coins","wallet","direct","ai","ideas","settings","intake"].forEach(n=>$("#p-"+n).hidden=n!==t)}
  window.scrollTo({top:0});});
// home interactions
$("#htabs").onclick=e=>{const b=e.target.closest("[data-h]");if(!b)return;homeTab=b.dataset.h;document.querySelectorAll("#htabs [data-h]").forEach(x=>x.classList.toggle("on",x===b));renderHome()};
$("#hTotal").onclick=()=>{if(!hideAmt)sheetNetWorth()};
$("#eyeBtn").onclick=()=>{hideAmt=!hideAmt;try{localStorage.setItem("p2p_hide",hideAmt?"1":"0")}catch(e){}renderHero()};
$("#wEye").onclick=$("#eyeBtn").onclick;
(function(){const L=document.getElementById("bankList"),F=document.getElementById("bankFilter");let t=null,sx=0,sy=0,fired=false;
  F.addEventListener("click",e=>{const c=e.target.closest("[data-bf]");if(!c)return;window.__bkF=c.dataset.bf;renderWallet()});
  const cancel=()=>{clearTimeout(t);t=null};
  L.addEventListener("pointerdown",e=>{const r=e.target.closest(".bank");if(!r||e.target.closest("[data-rec],[data-why]"))return;fired=false;sx=e.clientX;sy=e.clientY;cancel();t=setTimeout(()=>{fired=true;t=null;try{navigator.vibrate&&navigator.vibrate(12)}catch(x){}bankQuick(r.dataset.sheet.split(":")[1])},520)});
  L.addEventListener("pointermove",e=>{if(t&&(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8))cancel()});
  ["pointerup","pointercancel","pointerleave"].forEach(n=>L.addEventListener(n,cancel));
  L.addEventListener("click",e=>{if(fired){e.stopPropagation();e.preventDefault();fired=false}},true);
  L.addEventListener("contextmenu",e=>{if(e.target.closest(".bank"))e.preventDefault()})})();
function bankQuick(id){const b=banks.find(x=>x.id===id);if(!b)return;const lite=b.lite&&b.lite.on;
  openSheet(`<h3>${esc(b.name)}</h3><div class="qa">
    <button type="button" class="qab" data-q="edit">Edit bank</button>
    ${b.type!=="Cash"?`<button type="button" class="qab" data-q="rec">Check balance</button><button type="button" class="qab" data-q="${b.status==="paused"?"resume":"pause"}">${b.status==="paused"?"Resume this bank":"Pause this bank"}</button>`:""}
    ${lite?`<button type="button" class="qab" data-q="lite">UPI Lite: load / withdraw</button>`:""}
    <button type="button" class="qab" data-q="led">Open history</button></div>`,el=>{
    el.onclick=async e=>{const q=(e.target.closest("[data-q]")||{}).dataset;if(!q)return;const k=q.q;
      if(k==="edit")sheets.bank(id);else if(k==="rec")sheets.bankrec(id);else if(k==="lite")sheets.lite(id);else if(k==="led")sheets.ledger(id);
      else if(k==="pause"||k==="resume"){try{await patchRec(id,{status:k==="pause"?"paused":""});toast(k==="pause"?"Paused":"Resumed");closeSheet()}catch(err){toast("Couldn't save")}}}})}
let sqT;$("#hq").addEventListener("input",e=>{clearTimeout(sqT);sqT=setTimeout(()=>{searchQ=e.target.value.trim();renderList()},250)});
$("#searchBtn").onclick=()=>openUS();
// page title in the header + active top-menu pill
(function(){if(!document.getElementById("gtcss")){const s=document.createElement("style");s.id="gtcss";s.textContent=`.xhead.gr .htitle b{display:flex;flex-direction:column;gap:1px;white-space:normal;overflow:visible}.gt-l{display:flex;align-items:center;gap:6px;font:600 .7rem var(--body);color:var(--muted);letter-spacing:.01em;animation:gtUp .6s cubic-bezier(.2,.8,.2,1) both}.gt-i{width:15px;height:15px;stroke:var(--accent);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}.gt-i .rays{transform-origin:12px 12px;animation:gtSpin 18s linear infinite}.gt-i.n{animation:gtFloat 4s ease-in-out infinite}.gt-i.e{animation:gtFloat 4.5s ease-in-out infinite}.gt-n{font:800 1.18rem/1.15 var(--display);letter-spacing:-.015em;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-bottom:1px;background:linear-gradient(100deg,var(--fg) 38%,var(--accent) 50%,var(--fg) 62%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:gtUp .7s .12s cubic-bezier(.2,.8,.2,1) both,gtSh 1.7s .35s ease-in-out both}@keyframes gtUp{from{opacity:0;transform:translateY(9px);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}@keyframes gtSh{from{background-position:0% 0}to{background-position:100% 0}}@keyframes gtSpin{to{transform:rotate(360deg)}}@keyframes gtFloat{50%{transform:translateY(-1.5px)}}.xhead.gr .sub.ok{display:none}.xhead.gr[data-gs=sync] .gt-i{stroke:#e8a317;animation:gtPulse 1.2s ease-in-out infinite}.xhead.gr[data-gs=bad] .gt-i{stroke:#e5484d;animation:gtPulse 1.6s ease-in-out infinite}@keyframes gtPulse{50%{opacity:.35;transform:scale(.88)}}.gt-i{transition:stroke .4s}.xhead.gt-q .gt-l,.xhead.gt-q .gt-n{animation:none!important}@media(prefers-reduced-motion:reduce){.gt-l,.gt-n,.gt-i,.gt-i .rays{animation:none!important}.gt-n{background:none;-webkit-text-fill-color:currentColor}}`;document.head.appendChild(s)}})();
(function(){function gs(){const n=document.getElementById("syncNote"),h=document.querySelector(".xhead");if(!n||!h)return;const t=n.textContent||"";h.dataset.gs=n.classList.contains("ok")?"ok":/offline|fail|error|denied/i.test(t)?"bad":"sync"}
function go(){const n=document.getElementById("syncNote");if(!n){return setTimeout(go,300)}new MutationObserver(gs).observe(n,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["class"]});gs()}go()})();
function gtLabel(h){h=h==null?new Date().getHours():h;return h>=5&&h<12?["Good morning","m"]:h>=12&&h<17?["Good afternoon","a"]:h>=17&&h<21?["Good evening","e"]:["Good night","n"]}
function gtName(){const o=String(pref("owner")||"").trim().split(/\s+/)[0]||"";return o?o.charAt(0).toUpperCase()+o.slice(1).toLowerCase():String(pref("biz")||"").trim()}
const GT_ICON={m:'<g class="rays"><path d="M12 3v2M4.2 7.2l1.4 1.4M19.8 7.2l-1.4 1.4M2 15h2M20 15h2"/></g><path d="M7 18a5 5 0 0 1 10 0M3 18h18"/>',a:'<circle cx="12" cy="12" r="4"/><g class="rays"><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>',e:'<path d="M7 16a5 5 0 0 1 10 0M3 16h18M6 20h12M12 6v2M5.5 9.5l1.4 1.4M18.5 9.5l-1.4 1.4"/>',n:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 4v3M15.5 5.5h3"/>'};
var gtKey="";
function homeTitle(anim){const b=document.getElementById("pageTitle"),h=document.querySelector("header.xhead");if(!b||!h)return;const[l,k]=gtLabel(),n=gtName()||APP_NAME;const key=l+"|"+n;if(!anim&&key===gtKey&&b.querySelector(".gt-n"))return;gtKey=key;
 h.classList.add("gr");h.classList.toggle("gt-q",!anim);b.innerHTML=`<span class="gt-l"><svg class="gt-i ${k}" viewBox="0 0 24 24" aria-hidden="true">${GT_ICON[k]}</svg>${l}</span><span class="gt-n">${n===APP_NAME&&!gtName()?pxWord():esc(n)}</span>`;const ht=b.parentElement;ht.setAttribute("role","button");ht.tabIndex=0;ht.setAttribute("aria-label","Today's targets");ht.setAttribute("aria-haspopup","dialog")}
setInterval(()=>{try{const h=document.querySelector("header.xhead");if(h&&h.classList.contains("gr"))homeTitle(false)}catch(e){}},60000);
// ===== Greeting accordion: today's targets =====
(function(){if(!document.getElementById("tgcss")){const s=document.createElement("style");s.id="tgcss";s.textContent=`.gt-c{width:12px;height:12px;stroke:var(--muted);fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .4s cubic-bezier(.2,.8,.2,1);flex:none}.xhead.gro .gt-c{transform:rotate(180deg)}.xhead.gr .htitle{cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .15s}.xhead.gr .htitle:active{opacity:.6}
.gtp{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .5s cubic-bezier(.2,.8,.2,1),opacity .35s;pointer-events:none}.gtp.open{grid-template-rows:1fr;opacity:1;pointer-events:auto}.gtp-in{overflow:hidden;min-height:0}
.gtp-c{margin:4px 0 12px;padding:14px 14px 12px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:0 8px 24px -14px rgba(0,0,0,.35)}
.gtp-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.gtp-h b{font:700 .82rem var(--body)}.gtp-h span{font:700 .72rem var(--body);color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);padding:3px 9px;border-radius:99px}
.gtr{padding:7px 0}.gtr+.gtr{border-top:1px solid var(--line)}.gtr-t{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font:600 .74rem var(--body);color:var(--muted)}.gtr-t em{font-style:normal;color:var(--fg);font-weight:800;font-size:.9rem}.gtr-t small{font-size:.68rem;color:var(--muted);font-weight:500}
.gtr-b{height:6px;border-radius:6px;background:color-mix(in srgb,var(--muted) 18%,transparent);margin-top:6px;overflow:hidden}.gtr-b i{display:block;height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#fff));transition:width 1s cubic-bezier(.2,.8,.2,1)}.gtr.done .gtr-b i{box-shadow:0 0 10px var(--accent)}.gtr.none .gtr-b{background:none;border-top:1px dashed var(--line);border-radius:0;height:0;margin-top:9px}
.gtp-f{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.gtp-f button{font:600 .72rem var(--body);border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:99px;padding:6px 11px;cursor:pointer}.gtp-f button.pri{background:var(--accent);border-color:var(--accent);color:#fff}
.gtp-e{display:grid;gap:8px}.gtp-e label{display:grid;gap:3px;font:600 .72rem var(--body);color:var(--muted)}.gtp-e input{font:600 .95rem var(--body);padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);width:100%;box-sizing:border-box}
@media(prefers-reduced-motion:reduce){.gtp,.gtr-b i,.gt-c{transition:none!important}}`;document.head.appendChild(s)}})();
var tgOpen=false,tgEdit=false,tgT=null;
function tgData(){const ol=orders.filter(o=>isToday(o.time)&&o.status!=="Cancelled"),st=stats(ol),sg=v=>(v<0?"−":"")+inr(Math.abs(Math.round(v)));
 return[{k:"tg_profit",l:"Profit",v:st.profit,f:sg,ph:"e.g. 1000"},{k:"tg_orders",l:"Completed orders",v:ol.filter(o=>o.status==="Completed").length,f:v=>String(Math.round(v)),ph:"e.g. 20"},{k:"tg_vol",l:"Volume",v:st.b.v+st.s.v,f:v=>inr(Math.round(v)),ph:"e.g. 100000"}]}
function tgNum(k){const v=parseFloat(pref(k));return v>0?v:0}
function tgEl(){return document.getElementById("gtBody")}
function tgCount(el,to,f,ms){const t0=performance.now();if(matchMedia("(prefers-reduced-motion:reduce)").matches){el.textContent=f(to);return}(function s(t){const k=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-k,3);el.textContent=f(to*e);if(k<1)requestAnimationFrame(s);else el.textContent=f(to)})(t0)}
function tgRender(anim){const B=tgEl();if(!B)return;const d=tgData();
 if(tgEdit){B.innerHTML=`<div class="gtp-h"><b>Set daily targets</b></div><div class="gtp-e">${d.map(r=>`<label>${r.l}<input inputmode="decimal" data-k="${r.k}" placeholder="${r.ph}" value="${tgNum(r.k)||""}"></label>`).join("")}</div><div class="gtp-f"><button class="pri" data-tg="save">Save</button><button data-tg="cancel">Cancel</button></div>`;return}
 const set=d.filter(r=>tgNum(r.k)>0),pc=set.length?Math.round(set.reduce((a,r)=>a+Math.max(0,Math.min(1,r.v/tgNum(r.k))),0)/set.length*100):null;
 const al=(typeof lastAlerts!=="undefined"&&lastAlerts||[]).length,pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;
 B.innerHTML=`<div class="gtp-h"><b>Today's targets</b>${pc!=null?`<span>${pc}% of goal</span>`:""}</div>`+d.map((r,i)=>{const t=tgNum(r.k),f=t?Math.max(0,Math.min(1,r.v/t)):0;return`<div class="gtr ${t?f>=1?"done":"":"none"}"><div class="gtr-t"><span>${r.l}</span><span><em data-n="${i}">${r.f(r.v)}</em> <small>${t?"of "+r.f(t)+(f>=1?" ✓":""):"no target"}</small></span></div><div class="gtr-b"><i data-w="${Math.round(f*100)}"></i></div></div>`}).join("")+
 `<div class="gtp-f"><button data-tg="edit">${set.length?"Edit targets":"Set targets"}</button><button data-tg="glance">${pend} open${al?" · "+al+" alert"+(al>1?"s":""):""}</button></div>`;
 const run=()=>{B.querySelectorAll("[data-w]").forEach(i=>i.style.width=i.dataset.w+"%");if(anim)B.querySelectorAll("[data-n]").forEach(e=>{const r=d[+e.dataset.n];tgCount(e,r.v,r.f,900)})};
 if(anim){B.querySelectorAll("[data-n]").forEach(e=>{e.textContent=d[+e.dataset.n].f(0)});setTimeout(()=>requestAnimationFrame(run),180)}else run()}
function tgClick(e){const b=e.target.closest&&e.target.closest("[data-tg]");if(!b)return;const a=b.dataset.tg;
 if(a==="edit"){tgEdit=true;tgRender()}else if(a==="cancel"){tgEdit=false;tgRender(true)}
 else if(a==="save"){document.querySelectorAll("#gtBody [data-k]").forEach(i=>{const v=parseFloat(String(i.value).replace(/,/g,""));setPref(i.dataset.k,v>0?String(v):"")});tgEdit=false;tgRender(true)}
 else if(a==="glance"){try{sheets.glance()}catch(x){}}}
function tgSheet(){const h=document.querySelector("header.xhead");if(!h||!h.classList.contains("gr"))return;clearInterval(tgT);tgEdit=false;
 openSheet('<div class="insw" id="gtBody"></div>',el=>{el.addEventListener("click",tgClick);el.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("input"))tgClick({target:el.querySelector("[data-tg=save]")})});tgRender(true);tgT=setInterval(()=>{if(!tgEl()){clearInterval(tgT);return}if(!tgEdit)tgRender(false)},30000)})}
(function(){let last=0;const go=()=>{const t=document.querySelector(".htitle");if(!t)return setTimeout(go,300);t.addEventListener("click",()=>{const n=Date.now();if(n-last<380){last=0;tgSheet()}else last=n});t.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tgSheet()}})};go()})();
const PAGE_NAMES={intake:"Smart intake",settings:"Settings",home:APP_NAME,orders:"Orders",add:"New order",coins:"Coins",wallet:"Wallet",direct:"Direct payments",ai:"AI Agent",ideas:"Ideas"};
function updateChrome(){
  const cur=Object.keys(PAGE_NAMES).find(k=>{const el=$("#p-"+k);return el&&!el.hidden})||"home";
  if(cur==="intake"&&!cloudReady()&&!ocrWorker&&!ocrPromise&&!(aiCfg.prov!=="builtin"||i2Max>0))setTimeout(()=>ocrInit().catch(()=>{}),300);
  if(cur==="home"){const first=!window.__gtDone;window.__gtDone=true;homeTitle(first)}else{const hh=document.querySelector("header.xhead");if(hh){hh.classList.remove("gr","gro");const ht=hh.querySelector(".htitle");if(ht){ht.removeAttribute("role");ht.removeAttribute("tabindex");ht.removeAttribute("aria-haspopup")}}tgOpen=false;{const q=document.getElementById("gtPanel");if(q)q.classList.remove("open")}clearInterval(tgT);$("#pageTitle").textContent=cur==="add"&&typeof editingId!=="undefined"&&editingId?"Edit order":PAGE_NAMES[cur]}
  document.querySelectorAll("#topmenu [data-go]").forEach(b=>b.classList.toggle("on",b.dataset.go===cur));
  document.title=cur==="home"?APP_NAME:PAGE_NAMES[cur]+" · "+APP_NAME;
}
// menu drawer
function openDrawer(){
  const own=pref("owner"),biz=pref("biz"),n=own||biz||"My account";
  const ini=n.split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase()||"P2";
  const t0=new Date();t0.setHours(0,0,0,0);const td=orders.filter(o=>o.time>=t0.getTime());
  const st=stats(td.filter(o=>o.status==="Completed"));const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;
  const nw=ACC().netWorth;const H=v=>hideAmt?"₹ •••••":v;
  const sync=$("#syncNote").textContent||"";const cloud=/cloud/i.test(sync);
  const A=lastAlerts||[],hi=A.filter(a=>a.hi).length;
  const pinOn=pinHas();
  const dayP=i=>{const d0=new Date();d0.setHours(0,0,0,0);const f=d0.getTime()-i*864e5,t=f+864e5;try{return stats(orders.filter(o=>o.time>=f&&o.time<t&&o.status==="Completed")).profit||0}catch(e){return 0}};
  const wk=[6,5,4,3,2,1,0].map(dayP),dd=wk.some(v=>v)?wk[6]-wk[5]:null;
  const usdt=(()=>{try{return stockLeft().USDT||0}catch(e){return 0}})();
  const spark=(()=>{const mx=Math.max(1,...wk.map(Math.abs));return wk.some(v=>v)&&!hideAmt?`<div class="dspk" title="Last 7 days">${wk.map((v,i)=>`<i class="${v<0?"n":""}${i===6?" t":""}" style="height:${Math.max(8,Math.round(Math.abs(v)/mx*100))}%"></i>`).join("")}</div>`:""})();
  const qa=[["add","t-green",'<path d="M7 7h11l-3-3M17 17H6l3 3"/>',"New order"],["intake","t-blue",'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',"Intake"],["pay","t-violet",'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M17 8h5M19.5 5.5 22 8l-2.5 2.5"/>',"Pay party"],["ai","t-amber",'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>',"Ask AI"]];
  $("#dTop").innerHTML=`
    <div class="dpc">
      <div class="dpch"><span class="dava" style="--c:${pref("avColor")||"#8b5cf6"}">${pref("avatar")?`<img src="/_blob/${encodeURIComponent(pref("avatar"))}" alt="">`:esc(ini)}</span><div class="dpn"><b>${esc(n)}</b><small>${esc([own&&biz&&biz.toLowerCase()!==own.toLowerCase()?biz:"",pref("role")||"P2P merchant",pref("city")].filter(Boolean).join(" · "))}</small></div><button type="button" class="dedit2" id="dEdit" aria-label="Edit profile"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button></div>
      <div class="dpills"><span class="dpl ${cloud?"ok":""}"><i></i>${esc(sync||"Offline")}</span>${pinOn?'<span class="dpl"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>PIN on</span>':""}<span class="dpl">${esc(pref("plat")||"Binance")}</span></div>
      <div class="dnw"><div class="dnwl"><span>Net worth</span><b data-dpc="nw">${H(inr(Math.round(nw)))}</b></div><button type="button" class="dedit2 dpeye${hideAmt?" off":""}" id="dEye" aria-label="${hideAmt?"Show amounts":"Hide amounts"}"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${hideAmt?'<path d="M4 4l16 16"/>':""}</svg></button></div>
      <div class="dtp" data-dpc="profit"><div><span>Today profit</span><b class="${st.profit>0?"pos":st.profit<0?"neg":""}">${H((st.profit<0?"−":st.profit>0?"+":"")+inr(Math.abs(Math.round(st.profit))))}</b>${dd!==null?`<em class="${dd>=0?"pos":"neg"}">${dd>=0?"▲":"▼"} ${H(inr(Math.abs(Math.round(dd))))} vs yesterday</em>`:""}</div>${spark}</div>
      <div class="dkp3"><button type="button" data-dpc="orders"><span>Orders today</span><b>${td.length}</b></button><button type="button" data-dpc="open" class="${pend?"warn":""}"><span>Open now</span><b>${pend}</b></button><button type="button" data-dpc="stock" class="${usdt<0?"bad":""}"><span>USDT stock</span><b>${hideAmt?"•••••":usdt.toLocaleString("en-IN",{maximumFractionDigits:2})}</b></button></div>
    </div>
    <button type="button" class="dsearch" id="dSearch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><span>Search orders, parties, banks…</span></button>
    <div class="dqa dqac">${qa.map(([k,t,svg,l])=>`<button type="button" class="dq" data-dq="${k}"><span class="qri ${t}"><svg viewBox="0 0 24 24">${svg}</svg></span><small>${l}</small></button>`).join("")}</div>
    ${typeof nalCard==="function"?nalCard():""}
    ${A.length?`<div class="dat ${hi?"hi":""}"><div class="dath"><b>Needs attention</b><span>${A.length}${hi?` · <em>${hi} urgent</em>`:""}</span></div>${A.slice(0,4).map(a=>`<button type="button" class="dal ${a.hi?"hi":""}" ${aAttr(a)}><span class="dot"></span><span>${esc(a.t)}</span></button>`).join("")}${A.length>4?`<button type="button" class="dall" id="dAll">View all ${A.length}</button>`:""}</div>`:`<div class="dok"><span class="dot"></span><b>All clear</b><small>Nothing needs attention</small></div>`}`;
  // live info on each menu row
  const jobs=recs.filter(r=>r.kind==="intakejob"&&(r.status==="new"||r.status==="working")).length;
  const exT=exps.filter(x=>x.time>=t0.getTime()).reduce((t,x)=>t+(+x.amt||0),0);
  const coinsN=new Set(orders.map(o=>o.coin)).size;const blk=recs.filter(r=>r.kind==="cptag"&&r.tag==="block").length;
  const best=(()=>{try{return banks.filter(b=>b.type!=="Cash").sort((a,b)=>bal[b.id]-bal[a.id])[0]}catch(e){return null}})();
  const M={intake:jobs?jobs+" in queue":"Auto save",ai:isBrain()?(aiOnline()?(aiCfg.prov==="braingemini"?"Brain + Gemini":"Brain + Claude"):"P2P Brain"):aiCfg.prov==="builtin"?(sampleFn?"Built-in":"Offline mode"):(PROV[aiCfg.prov]||{n:"Own"}).n,coins:coinsN?coinsN+" coin"+(coinsN>1?"s":""):"",import:"",expense:exT?H(inr(Math.round(exT)))+" today":"",which:best?best.name:"",report:"",cps:blk?blk+" blocked":"",ideas:"",settings:pinOn?"":"Set PIN",upiqr:"",coach:(()=>{const c=coachRecs.find(x=>x.week===weekStart());return c?"Ready":"New week"})(),cashflow:(()=>{try{const f=cashFlow(pref("cfProfit")!==false);return f.short?"Short "+new Date(f.short.t).toLocaleDateString("en-IN",{weekday:"short"}):f.totOut?"OK 7 days":""}catch(e){return""}})(),bankrisk:(()=>{try{const r=bankRisk();const h=r.filter(x=>x.lv==="bad").length,m=r.filter(x=>x.lv==="warn").length;return h?h+" high":m?m+" medium":r.length?"Low":""}catch(e){return""}})(),loss:(()=>{try{const d=lossData("30");return d.tot?"−"+inr(Math.round(d.tot)):""}catch(e){return""}})(),rules:(()=>{const n=arules.filter(r=>r.on!==false).length,h=evalRules().length;return h?h+" firing":n?n+" on":"Add"})(),besttime:(()=>{try{return bestTimeTop("30")}catch(e){return""}})(),bestrate:(()=>{const g=rateSuggest(pref("coin")||"USDT");return g.sell?"Sell ₹"+g.sell.toFixed(2):""})(),target:(()=>{const t=targetInfo();return t.T?Math.round(t.pct)+"%":"Set"})(),mscore:(()=>{const d=scoreData("30");return d.closed?d.score+" · "+grade(d.score)[0]:""})(),nightrep:pref("repAuto")===false?"Off":(()=>{const [h,m]=(pref("repAt")||"23:00").split(":").map(Number);return (h%12||12)+(m?":"+String(m).padStart(2,"0"):"")+(h<12?" AM":" PM")})(),conv:(()=>{const r=convRate();return r?"₹"+fmtR(r):""})(),gallery:(()=>{const n=allProofs().length;return n?n+" photo"+(n>1?"s":""):""})(),notes:(()=>{const d=reminds.filter(r=>!r.done&&r.at&&r.at<=Date.now()).length,u=reminds.filter(r=>!r.done).length;return d?d+" due":u?u+" open":""})()};
  M.wa=waApiOn()?"API on":"App";M.dbphone=typeof dbsCfg!=="undefined"&&dbsCfg.on?(dbsCfg.err?"Offline":"On"):"Off";{const FL=fbList();const pv=FL.filter(x=>x.status==="proposed").length,w=FL.filter(x=>x.status==="new").length;M.feedback=w?w+" waiting":"";M.about=pv?"Update ready":"v"+APP_VER}
  document.querySelectorAll("#drawer .dmeta").forEach(e=>{const v=M[e.dataset.m]||"";e.textContent=v;e.hidden=!v;e.classList.toggle("warn",e.dataset.m==="settings"||(e.dataset.m==="intake"&&jobs>0)||(e.dataset.m==="notes"&&/due/.test(v))||/Short|high|firing|Update ready/.test(v))});
  const cur=Object.keys(PAGE_NAMES).find(k=>{const el=$("#p-"+k);return el&&!el.hidden});
  document.querySelectorAll("#drawer .dri").forEach(b=>b.classList.toggle("on",b.dataset.go===cur));
  const th=devGet("p2p_theme","dark"),lb=+devGet("p2p_lastbk","0");
  $("#dBot").innerHTML=`<div class="dsec">Quick settings</div><div class="dlist dqs">
      <div class="dqr"><span>Theme</span><div class="dth">${[["light","Light"],["dark","Dark"],["system","Auto"]].map(([k,l])=>`<button type="button" data-th="${k}" class="${th===k?"on":""}">${l}</button>`).join("")}</div></div>
      <div class="dqr"><span>Hide amounts</span><label class="tog"><input type="checkbox" id="dHide" ${hideAmt?"checked":""}><span></span></label></div>
      <div class="dqr"><span>Backup<small>${lb?"Last "+new Date(lb).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Never on this device"}</small></span><button type="button" class="mini ghost" id="dBk">Back up now</button></div>
      ${pinOn?`<div class="dqr"><span>App lock</span><button type="button" class="mini ghost" id="dLock">Lock now</button></div>`:""}
    </div><p class="dfoot"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Your data · ${recs.length} records · ${cloud?"cloud synced":"on this device"}</p>`;
  document.querySelectorAll("#drawer .dcm").forEach(e=>{const g=document.querySelector(`#drawer .dgrp[data-g="${e.dataset.cm}"]`);const n=g.querySelectorAll(".dri").length,w=g.querySelectorAll(".dmeta.warn:not([hidden])").length;e.hidden=false;e.textContent=w?w+" alert"+(w>1?"s":""):String(n);e.classList.toggle("warn",w>0)});
  buildFolders();showDrawerMain();$("#drawer").hidden=false;
  const close=()=>{$("#drawer").hidden=true};
  $("#dSearch").onclick=()=>{close();openUS()};
  $("#dEdit").onclick=()=>{close();sheets.profile()};
  $("#dEye").onclick=()=>{hideAmt=!hideAmt;try{localStorage.setItem("p2p_hide",hideAmt?"1":"0")}catch(err){}renderHero();openDrawer()};
  document.querySelectorAll("#drawer [data-dpc]").forEach(e=>e.onclick=()=>{const k=e.dataset.dpc;if(k==="nw"){if(hideAmt)return;close();sheetNetWorth()}else{close();if(k==="stock")goTo("wallet");else if(k==="profit")sheets.report();else goPage("orders")}});
  document.querySelectorAll("#drawer [data-dq]").forEach(b=>b.onclick=()=>{const k=b.dataset.dq;close();if(k==="pay")pickParty(id=>sheets.pay(id));else document.querySelector(`[data-go="${k}"]`)?goTo(k):0});
  const dAll=$("#dAll");if(dAll)dAll.onclick=()=>{close();$("#t-home").click();alertsOpen=true;renderAlerts();setTimeout(()=>$("#alerts").scrollIntoView({behavior:"smooth",block:"center"}),80)};
  document.querySelectorAll("#drawer [data-th]").forEach(b=>b.onclick=()=>{devSet("p2p_theme",b.dataset.th);applyTheme();const sel=$("#st-theme");if(sel)sel.value=b.dataset.th;document.querySelectorAll("#drawer [data-th]").forEach(x=>x.classList.toggle("on",x===b))});
  $("#dHide").onchange=e=>{hideAmt=e.target.checked;try{localStorage.setItem("p2p_hide",hideAmt?"1":"0")}catch(err){}renderHero();openDrawer()};
  $("#dBk").onclick=()=>{close();$("#bkExport").click()};
  try{if(typeof nalBind==="function")nalBind(close)}catch(err){}
  const dl=$("#dLock");if(dl)dl.onclick=()=>{close();showLock("unlock")};
}
function renderMenuAva(){}
function buildFolders(){try{p7Drawer()}catch(e){}const G=[...document.querySelectorAll("#dAll .dgrp")];let warnT=0;
  $("#dFolders").innerHTML=G.map(g=>{const k=g.dataset.g,name=g.querySelector(".dgh b").textContent,items=[...g.querySelectorAll(".dri")];const tint=(g.querySelector(".dgh .qri").className.match(/t-\w+/)||["t-gray"])[0];
    const w=g.querySelectorAll(".dmeta.warn:not([hidden])").length;warnT+=w;
    const mini=items.slice(0,4).map(it=>{const q=it.querySelector(".qri");return`<span class="dfm ${(q.className.match(/t-\w+/)||[""])[0]}">${q.innerHTML}</span>`}).join("");
    return`<button type="button" class="dft" data-fold="${k}"><span class="dfi ${tint}">${mini}${w?`<em class="dfb">${w}</em>`:""}</span><b>${esc(name)}</b><small>${items.length} apps</small></button>`}).join("");
  $("#dFn").textContent=G.length+" folders"+(warnT?` · ${warnT} need attention`:"")}
function openFolder(k,tile){const g=document.querySelector(`#dAll .dgrp[data-g="${k}"]`);if(!g)return;
  $("#dFt").textContent=g.querySelector(".dgh b").textContent;const items=[...g.querySelectorAll(".dri")];$("#dFs").textContent=items.length+" apps";
  $("#dFg").innerHTML=items.map(it=>{const m=it.querySelector(".dmeta");const mt=m&&!m.hidden&&m.textContent?`<em class="dfmt ${m.classList.contains("warn")?"warn":""}">${esc(m.textContent)}</em>`:"";const c=it.cloneNode(true);c.querySelectorAll(".dmeta,.dch,.qrt small").forEach(x=>x.remove());c.classList.remove("dri");c.classList.add("dfa");c.insertAdjacentHTML("beforeend",mt);return c.outerHTML}).join("");
  const p=$("#dFp"),o=$("#dFold");o.hidden=false;if(tile){const r=tile.getBoundingClientRect();p.style.transformOrigin=`${r.left+r.width/2-p.getBoundingClientRect().left}px ${r.top+r.height/2-p.getBoundingClientRect().top}px`}
  o.classList.remove("open");void o.offsetWidth;o.classList.add("open")}
function closeFolder(){const o=$("#dFold");if(o.hidden)return;o.classList.remove("open");o.classList.add("closing");setTimeout(()=>{o.hidden=true;o.classList.remove("closing")},160)}
document.addEventListener("click",e=>{const t=e.target.closest("#dFolders [data-fold]");if(t){openFolder(t.dataset.fold,t);return}
  if(e.target.id==="dFold"||e.target.closest("#dFx")){closeFolder();return}
  if(e.target.closest("#dFg [data-go],#dFg [data-sheet]")){$("#dFold").hidden=true;$("#dFold").classList.remove("open");$("#drawer").hidden=true}});
function showDrawerMain(){$("#dMain").hidden=false;const o=$("#dFold");if(o){o.hidden=true;o.classList.remove("open")}}
function showDrawerGroup(k){}
document.addEventListener("click",e=>{const c=e.target.closest("#drawer [data-cat]");if(c){showDrawerGroup(c.dataset.cat);return}if(e.target.closest("#drawer [data-back]"))showDrawerMain()});
function goTo(k){const b=document.createElement("button");b.dataset.go=k;b.hidden=true;document.body.appendChild(b);b.click();b.remove()}
$("#menuBtn").onclick=openDrawer;
// swipe left to close the menu
(function(){const bg=$("#drawer"),d=bg.querySelector(".drw");let x0=0,y0=0,dx=0,drag=false,lock=null;
  const end=()=>{if(!drag)return;drag=false;d.style.transition="transform .2s ease";bg.style.transition="background .2s";
    if(dx<-70){d.style.transform="translateX(-105%)";bg.style.background="rgba(0,0,0,0)";setTimeout(()=>{bg.hidden=true;d.style.transform="";d.style.transition="";bg.style.background="";bg.style.transition=""},200)}
    else{d.style.transform="";bg.style.background="";setTimeout(()=>{d.style.transition="";bg.style.transition=""},200)}dx=0};
  bg.addEventListener("touchstart",e=>{if(!$("#dFold").hidden)return;const t=e.touches[0];x0=t.clientX;y0=t.clientY;dx=0;drag=true;lock=null;d.style.transition="none"},{passive:true});
  bg.addEventListener("touchmove",e=>{if(!drag)return;const t=e.touches[0],mx=t.clientX-x0,my=t.clientY-y0;
    if(lock===null&&(Math.abs(mx)>8||Math.abs(my)>8))lock=Math.abs(mx)>Math.abs(my)*1.2&&mx<0?"x":"y";
    if(lock!=="x")return;dx=Math.min(0,mx);d.style.transform=`translateX(${dx}px)`;bg.style.background=`rgba(0,0,0,${Math.max(0,.45*(1+dx/d.offsetWidth))})`},{passive:true});
  bg.addEventListener("touchend",()=>{if(lock==="x")end();else{drag=false;d.style.transition=""}});bg.addEventListener("touchcancel",end);
})();

$("#drawer").addEventListener("click",e=>{if(e.target.id==="drawer"||e.target.closest("#dClose,[data-go],[data-sheet]"))$("#drawer").hidden=true});
document.addEventListener("click",()=>setTimeout(updateChrome,0));
