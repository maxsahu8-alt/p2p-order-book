// ================= SMART TOOLS =================
const ring=(v,max,color,big,small)=>{const R=52,C=2*Math.PI*R;return`<svg viewBox="0 0 130 130" class="tgr"><circle cx="65" cy="65" r="${R}" fill="none" stroke="var(--soft)" stroke-width="12"/><circle cx="65" cy="65" r="${R}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C*Math.max(0,Math.min(1,v/max))} ${C}" transform="rotate(-90 65 65)"/><text x="65" y="66" text-anchor="middle" style="font:800 28px var(--body);fill:var(--fg)">${big}</text><text x="65" y="84" text-anchor="middle" style="font:600 10px var(--body);fill:var(--muted)">${small}</text></svg>`};
const lvlCol=l=>l==="ok"?"var(--accent)":l==="warn"?"var(--warn)":"var(--sell)";
const dfmt=t=>new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const tfmt=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});

// ---- 2. Cash flow forecast
function cashFlow(withProfit){const d0=new Date();d0.setHours(0,0,0,0);const today=(new Date().getDay()+6)%7;
  const days=[...Array(7)].map((_,i)=>({t:d0.getTime()+i*DAY,out:0,items:[]}));
  parties.forEach(p=>{const wk=+p.weekly||0;if(!wk||p.dueDay===""||p.dueDay==null)return;const d=+p.dueDay;const left=wk-partyPaidWeek(p.id);
    if(left>0.5){const off=d<today?0:d-today;days[off].out+=left;days[off].items.push([p.name,left,d<today?"overdue":""])}
    const nx=d-today+7;if(nx<7){days[nx].out+=wk;days[nx].items.push([p.name,wk,"next week"])}});
  const {bal}=balances();const money=banks.reduce((t,b)=>t+bal[b.id],0);
  const st=stats(orders.filter(o=>o.time>=Date.now()-14*DAY));const pDay=withProfit?Math.max(0,st.profit/14):0;
  const exDay=exps.filter(x=>x.time>=Date.now()-30*DAY).reduce((t,x)=>t+(+x.amt||0),0)/30;
  let run=money;days.forEach((d,i)=>{run+=-d.out-exDay+(i?pDay:0);d.bal=run});
  const coin=pref("coin")||"USDT",stk=Math.max(0,(stockLeft()[coin]||0)),rate=convRate(coin)||0;
  parties.forEach(p=>{const lf=accLefts(p);(p.accounts||[]).forEach(a=>{if(!+a.target||lf[a.id]<=0.5||!a.due)return;const off=Math.max(0,Math.floor((new Date(a.due+"T00:00")-d0)/DAY));if(off<7){days[off].out+=lf[a.id];days[off].items.push([p.name+" → "+(a.holder||a.upi||"account"),lf[a.id],new Date(a.due+"T23:59")<new Date()?"overdue":""])}})});const noDate=parties.filter(p=>!(+p.weekly)&&!(p.accounts||[]).some(a=>+a.target&&a.due)).map(p=>[p.name,partyOwed(p.id)-partyPaid(p.id)]).filter(x=>x[1]>0.5);
  const short=days.find(d=>d.bal<0);const totOut=days.reduce((t,d)=>t+d.out,0);
  return{days,money,pDay,exDay,stk,coin,rate,noDate,short,totOut}}
// ---- Verify screen: two uploads → analyse → result. State lives here so the sheet can redraw.
let verS={pay:null,ord:null,busy:false,res:null,tick:null,msg:""};
function verPick(slot){const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;
  if(!(/^image\//.test(f.type)||/\.(png|jpe?g|webp|heic|heif|bmp|gif)$/i.test(f.name||""))){toast("That file isn't a picture. Choose a screenshot.");return}
  if(f.size>15e6){toast("That image is too large (max 15 MB)");return}verS[slot]=f;verS.res=null;verS.msg="";sheetVerify()};i.click()}
function verItems(R){return R.cmp.fields.map(f=>`<div class="vrow ${f.res}"><div class="vk">${esc(f.label)}</div><div class="vv"><span>${esc(f.pay)}</span><span>${esc(f.ord)}</span></div><div class="vr">${VER_ICO[f.res]} ${VER_LBL[f.res]}</div>${f.note?`<div class="vn">${esc(f.note)}</div>`:""}</div>`).join("")}
function verSide(X){const L=(k,v)=>`<div class="dqr"><span>${k}</span><b style="font-weight:600;text-align:right;word-break:break-word">${v==null||v===""?"—":esc(String(v))}</b></div>`,P=X.pay,O=X.ord;
  return`<div class="vcols"><div><div class="pcsec">Payment</div><div class="rml">${L("Status",P.status)}${L("Amount",P.amount!=null?"₹"+P.amount.toLocaleString("en-IN"):null)}${L("Sender",P.sender)}${L("Receiver",P.receiver)}${L("UTR",P.utr)}${L("Method",P.method)}${L("Bank / UPI",P.bank)}${L("Date",P.date?P.date+(P.time?" "+P.time:""):null)}${L("Account",P.acct)}${L("Confidence",P.conf!=null?Math.round(P.conf*100)+"%":null)}</div></div>
  <div><div class="pcsec">Order</div><div class="rml">${L("Order ID",O.id)}${L("Status",O.status)}${L("Buyer",O.buyer)}${L("Seller",O.seller)}${L("Amount",O.fiat!=null?"₹"+O.fiat.toLocaleString("en-IN"):null)}${L("Crypto",O.crypto!=null?O.crypto+" "+(O.coin||""):null)}${L("Price",O.price!=null?"₹"+O.price:null)}${L("Method",O.method)}${L("Time",O.when)}${L("Account",O.acct)}${L("Confidence",O.conf!=null?Math.round(O.conf*100)+"%":null)}</div></div></div>`}
function sheetVerify(){const S=verS,R=S.res,cfg=verCfg();
  const slot=(k,label)=>{const f=S[k];return`<div class="vslot">${f?`<img src="${URL.createObjectURL(f)}" alt="">`:`<div class="vph">${label}</div>`}<b>${label}</b><div class="row2"><button class="mini ${f?"ghost":""}" type="button" data-vp="${k}">${f?"Replace":"Choose"}</button>${f?`<button class="mini ghost" type="button" data-vx="${k}">Remove</button>`:""}</div></div>`};
  const hist=recs.filter(r=>r.kind==="verif").sort((a,b)=>b.time-a.time).slice(0,6);
  let resHtml="";
  if(S.busy)resHtml=`<div class="ires">${esc(S.msg||"Analysing…")}</div>`;
  else if(S.msg&&!R)resHtml=`<div class="ires">${esc(S.msg)}</div>`;
  if(R){const T=VER_TXT[R.cmp.overall];
    resHtml+=`<div class="vres ${R.cmp.overall}"><div class="vh"><span class="vchip">${T[0]} ${T[1]}</span><b>${R.cmp.confidence?Math.round(R.cmp.confidence*100)+"%":"0%"} confidence</b></div><div class="vt">${T[2]}</div>${R.note?`<p class="note" style="margin:6px 0 0">${esc(R.note)}</p>`:""}</div>
    ${R.cmp.local.length||R.cmp.flags.length?`<div class="pcsec">Warnings</div><div class="rml">${R.cmp.local.map(w=>`<div class="dqr"><span>🚩 ${esc(w)}</span></div>`).join("")}${R.cmp.flags.map(x=>`<div class="dqr"><span>⚠️ Potential issue: ${esc(VER_RISK[x])}</span></div>`).join("")}</div>`:""}
    <div class="pcsec">Field by field <small style="text-transform:none;color:var(--muted)">(payment · order)</small></div><div class="vtab">${verItems(R)}</div>
    <div class="pcsec">What was read</div>${verSide(R.X)}
    <p class="note">This only compares what is visible in the two screenshots. It cannot prove a payment is genuine. Always confirm in your bank app or SMS before releasing coins.</p>
    <details class="note"><summary style="cursor:pointer">Raw AI data</summary><pre style="white-space:pre-wrap;font:500 .72rem var(--mono);margin:6px 0 0">${esc(JSON.stringify({payment:R.X.pay,order:R.X.ord,risk_flags:R.X.flags,comparison:{overall:R.cmp.overall,fields:R.cmp.fields.map(f=>({field:f.k,result:f.res}))},confidence:R.cmp.confidence},null,1))}</pre></details>
    <div class="row2" style="margin-top:10px"><button class="mini" type="button" id="v-att">Attach to an order</button><button class="mini ghost" type="button" id="v-re">Re-analyze</button></div>`}
  openSheet(`<div class="insw"><div class="insh"><h3>Verify screenshots</h3></div>
    <p class="note" style="margin:-4px 0 10px">Add the payment screenshot and the order screenshot. The app reads both and compares them field by field.</p>
    <div class="vslots">${slot("pay","Payment screenshot")}${slot("ord","Order screenshot")}</div>
    <button class="primary" type="button" id="v-go" style="width:100%;margin-top:10px" ${S.busy||!(S.pay&&S.ord)?"disabled":""}>${S.busy?"Analysing…":R?"Analyze again":"Analyze"}</button>
    ${!(S.pay&&S.ord)?`<p class="note" style="margin:6px 0 0">${!S.pay&&!S.ord?"Add both screenshots to start.":!S.pay?"Payment screenshot is missing.":"Order screenshot is missing."}</p>`:""}
    <div id="v-out" style="margin-top:12px">${resHtml}</div>
    ${hist.length?`<div class="pcsec">Earlier checks</div><div class="rml">${hist.map(h=>`<div class="dqr"><span>${VER_TXT[h.overall]?VER_TXT[h.overall][0]:"•"} ${h.payment&&h.payment.amount!=null?inr(h.payment.amount):"—"} · ${esc((h.order&&h.order.id)||"no order ID")}<small style="display:block;color:var(--muted)">${new Date(h.time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}${h.orderId?" · attached":""}</small></span><b>${VER_TXT[h.overall]?VER_TXT[h.overall][1]:""}</b></div>`).join("")}</div>`:""}
    <details class="note" style="margin-top:12px" ${cfg.url?"open":""}><summary style="cursor:pointer">Verify server (optional)</summary><p style="margin:6px 0">Leave empty to use the AI you connected in Settings. Add your own Verify server so no AI key is needed on this phone.</p>
    <label>Server URL<input id="v-url" value="${esc(cfg.url||"")}" placeholder="https://your-worker.workers.dev" autocomplete="off"></label><label>App token<input id="v-tok" type="password" value="${esc(cfg.token||"")}" autocomplete="off"></label><button class="mini" type="button" id="v-cfg" style="margin-top:6px">Save server</button></details></div>`,el=>{
    el.querySelectorAll("[data-vp]").forEach(b=>b.onclick=()=>verPick(b.dataset.vp));
    el.querySelectorAll("[data-vx]").forEach(b=>b.onclick=()=>{verS[b.dataset.vx]=null;verS.res=null;verS.msg="";sheetVerify()});
    const go=el.querySelector("#v-go");if(go)go.onclick=verRun;const re=el.querySelector("#v-re");if(re)re.onclick=verRun;
    const at=el.querySelector("#v-att");if(at)at.onclick=verAttach;
    el.querySelector("#v-cfg").onclick=()=>{try{const u=el.querySelector("#v-url").value.trim();if(u&&!/^https:\/\//i.test(u)){toast("The server URL must start with https://");return}localStorage.setItem("p2p_verify",JSON.stringify({url:u,token:el.querySelector("#v-tok").value.trim()}));toast(u?"Verify server saved":"Using your AI connection")}catch(e){toast("Couldn't save")}}})}
async function verRun(){const S=verS;if(S.busy)return;if(!S.pay||!S.ord){toast("Add both screenshots first");return}
  S.busy=true;S.res=null;const t0=Date.now();S.msg="Reading both screenshots…";sheetVerify();
  const upd=()=>{const el=document.getElementById("v-out");if(el&&S.busy)el.innerHTML=`<div class="ires">${esc(S.msg)} ${Math.round((Date.now()-t0)/1000)}s</div>`};S.tick=setInterval(upd,1000);
  try{
    const blobs=await Promise.all([S.pay,S.ord].map(f=>shrinkImage(f)));const hashes=await Promise.all([S.pay,S.ord].map(fileHash));
    let out,note="";
    try{out=await verExtract(blobs)}
    catch(e){if(e&&["no_key","unavailable","brain","no_model","no_url"].includes(e.code)){S.msg="AI isn't connected. Reading the payment on your phone instead…";upd();out=await verFallback(S.pay);note="AI is not connected, so only the payment was read (on your phone). The order side is empty. Add an AI key in Settings → AI connection, or set a Verify server, for the full check."}else throw e}
    const cmp=verCompare(out.X,{hashes});
    const rec={id:newId("vf_"),kind:"verif",orderId:cmp.linked,payHash:hashes[0],ordHash:hashes[1],payment:out.X.pay,order:out.X.ord,comparison:cmp.fields.map(f=>({field:f.k,result:f.res})),overall:cmp.overall,flags:[...cmp.flags,...cmp.local],confidence:cmp.confidence,time:Date.now()};
    try{await putRec(rec)}catch(e){}
    S.res={X:out.X,cmp,rec,hashes,note};S.msg="";
  }catch(e){S.msg=e&&e.code==="bad_key"?"The key or token was rejected. Check it in Settings → AI connection.":e&&e.code==="rate_limited"?"The AI has no free requests left right now. Try again in a minute.":e&&e.code==="busy"?"The AI is busy or too slow right now. Try again in a minute.":e&&e.code==="network"?"Can't reach the AI. Check your internet.":e&&e.code==="bad_json"?e.text:e&&e.code==="images_unavailable"?"Images can't be read in this view. Use the Android app.":e&&e.code==="image_rejected"?"One of the images couldn't be read. Try a different screenshot.":(e&&e.message==="timeout")?"Reading took too long. Try again with clearer screenshots.":"Couldn't analyse these screenshots. Try again."}
  finally{S.busy=false;clearInterval(S.tick);sheetVerify()}}
function verAttach(){const R=verS.res;if(!R)return;const P=R.X.pay,O=R.X.ord;const amt=O.fiat!=null?O.fiat:P.amount;
  const cand=orders.filter(o=>o.status!=="Cancelled").map(o=>{let sc=0;if(O.id&&normRef(exIdOf(o))===normRef(O.id))sc+=10;if(amt!=null&&Math.abs(orderTotal(o)-amt)<=1)sc+=4;if(Date.now()-o.time<3*DAY)sc+=1;return{o,sc}}).filter(x=>x.sc>=4).sort((a,b)=>b.sc-a.sc||b.o.time-a.o.time).slice(0,6);
  openSheet(`<div class="insw"><div class="insh"><h3>Attach to an order</h3></div>${cand.length?`<p class="note">Pick the order these screenshots belong to. Its UTR and order ID are filled in only if empty.</p><div class="rml">${cand.map(({o,sc})=>`<div class="dqr" style="display:block;padding:10px 0"><div style="display:flex;justify-content:space-between"><b>${esc(shortO(o))}</b><span>${inr(Math.round(orderTotal(o)))}</span></div><div class="note" style="margin:3px 0">${sc>=10?"Same order ID":"Same amount"} · ${esc(o.status)}</div><button class="mini" type="button" data-at="${o.id}">Attach here</button></div>`).join("")}</div>`:'<p class="note">No saved order matches this amount or order ID. Save the order first (Smart intake or New), then verify again.</p>'}
    <button class="mini ghost" type="button" id="at-back" style="margin-top:10px">Back</button></div>`,el=>{
    el.querySelector("#at-back").onclick=()=>sheetVerify();
    el.querySelectorAll("[data-at]").forEach(b=>b.onclick=async()=>{const o=orders.find(x=>x.id===b.dataset.at);if(!o)return;
      const next={...o,shots:[...new Set([...(o.shots||[]),...R.hashes])]};if(!o.utr&&P.utr)next.utr=P.utr;if(!exIdOf(o)&&O.id)next.exId=O.id;
      const W=orderWarn(next).filter(w=>["utr","ex","shot"].includes(w.k));if(W.length){const c=await confirmRisk(W,"Check before attaching","Attach anyway");if(!c)return}
      try{await patchRec(o.id,{shots:next.shots,utr:next.utr,exId:next.exId,pv:R.cmp.overall==="VERIFIED"?"verified":"ai"});await patchRec(R.rec.id,{orderId:o.id});auditLog(o,"verify_attach",{result:R.cmp.overall,conf:R.cmp.confidence});toast("Attached to the order");sheetVerify()}catch(e){toast("Couldn't save")}})})}

sheets.auditlog=sheetAuditLog;sheets.verify=sheetVerify;sheets.risk=sheetRisk;
