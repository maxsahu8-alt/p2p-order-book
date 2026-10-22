// ================= ORDER IDS · RISK CHECKS · STATUS RULES · AUDIT LOG
const normRef=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const exIdOf=o=>o.exId||(String(o.id).startsWith("imp_")&&/^#(\w{6,})$/.test(o.note||"")?RegExp.$1:"");
function riskIdx(){if(riskCache)return riskCache;const u=new Map(),e=new Map(),sh=new Map();
  orders.forEach(o=>{const a=normRef(o.utr);if(a.length>=8&&o.status!=="Cancelled"){if(!u.has(a))u.set(a,[]);u.get(a).push(o)}
    const b=normRef(exIdOf(o));if(b.length>=8){if(!e.has(b))e.set(b,[]);e.get(b).push(o)}
    (o.shots||[]).forEach(h=>{if(!sh.has(h))sh.set(h,[]);sh.get(h).push(o)})});
  return riskCache={u,e,s:sh}}
function shotUsed(hs,exceptId){const I=riskIdx();for(const h of hs||[]){const m=(I.s.get(h)||[]).filter(x=>x.id!==exceptId);if(m.length)return m[0]}return null}
const pvOf=o=>o.pv||(o.src==="ai"?"ai":"");
const shortO=o=>`${o.side} ${fmtQ(o.qty)} ${o.coin}${o.cp?" · "+o.cp:""} · ${new Date(o.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`;
// same UTR / same exchange order ID found in another order
function dupFlags(o){const I=riskIdx(),out=[];const u=normRef(o.utr),e=normRef(exIdOf(o));
  if(u.length>=8){const m=(I.u.get(u)||[]).filter(x=>x.id!==o.id);if(m.length)out.push({k:"utr",o:m[0],n:m.length})}
  if(e.length>=8){const m=(I.e.get(e)||[]).filter(x=>x.id!==o.id);if(m.length)out.push({k:"ex",o:m[0],n:m.length})}
  {const m=shotUsed(o.shots,o.id);if(m)out.push({k:"shot",o:m,n:1})}
  return out}
// things to confirm before saving / completing an order
function orderWarn(o){const W=dupFlags(o).map(d=>({k:d.k,msg:d.k==="utr"?`This UTR was already used in another order: ${shortO(d.o)}.`:d.k==="shot"?`This payment screenshot was already used for another order: ${shortO(d.o)}.`:`This exchange order ID is already saved: ${shortO(d.o)}.`}));
  if(o.status!=="Cancelled"&&!noBank(o)&&o.via!=="ex"&&banks.length){const tot=orderTotal(o),al=allocated(o);
    if(al>0&&Math.abs(tot-al)>=1)W.push({k:"amt",msg:`Bank amounts add up to ${inr(Math.round(al))} but the order total is ${inr(Math.round(tot))} (difference ${inr(Math.round(Math.abs(tot-al)))}).`});
    if(o.status==="Completed"&&al===0)W.push({k:"nopay",msg:"Marked Completed but no bank payment is recorded."})}
  {const g=bigWarn(o);if(g)W.push(g)}
  return W}
// unusual transaction size: far above your usual order (3× the middle order, at least ₹10,000) or above the limit you set
function sizeRef(){riskIdx();if(riskCache.sz)return riskCache.sz;
  const t=orders.filter(o=>o.status==="Completed").map(orderTotal).filter(x=>x>0).sort((a,b)=>a-b);const med=t.length?t[t.length>>1]:0;
  const manual=+settings.bigTxn||0;const lim=manual>0?manual:(t.length>=10?Math.max(3*med,10000):Infinity);
  const sz={med,lim,manual,n:t.length};riskCache.sz=sz;return sz}
function bigWarn(o){if(o.status==="Cancelled")return null;const z=sizeRef(),tot=orderTotal(o);if(!(tot>z.lim))return null;
  return{k:"big",msg:z.manual?`Unusual size: ${inr(Math.round(tot))} is above your limit of ${inr(Math.round(z.manual))}.`:`Unusual size: ${inr(Math.round(tot))} is ${(tot/z.med).toFixed(1)}× your usual order (${inr(Math.round(z.med))}).`}}
function confirmRisk(W,title,okLabel){return new Promise(res=>{let done=false,obs=null;const fin=v=>{if(done)return;done=true;if(obs)obs.disconnect();res(v)};
  openSheet(`<div class="insw"><div class="insh"><h3>${esc(title)}</h3></div>
    <div class="rml">${W.map(w=>`<div class="dqr"><span>⚠️ ${esc(w.msg)}</span></div>`).join("")}</div>
    <label class="full" style="margin-top:12px">Why is this OK? <span class="opt">optional · saved in the activity log</span><input id="rk-why" type="text" placeholder="e.g. second part of the same payment" maxlength="120"></label>
    <div class="row2" style="margin-top:12px"><button type="button" class="primary" id="rk-back" style="background:var(--soft);color:var(--fg)">Go back</button><button type="button" class="primary" id="rk-go">${esc(okLabel||"Save anyway")}</button></div></div>`,el=>{
    el.querySelector("#rk-back").onclick=()=>{closeSheet();fin(null)};
    el.querySelector("#rk-go").onclick=()=>{const why=el.querySelector("#rk-why").value.trim();closeSheet();fin({why})}});
  obs=new MutationObserver(()=>{if($("#sheetBg").hidden)fin(null)});obs.observe($("#sheetBg"),{attributes:true,attributeFilter:["hidden"]})})}
// status rules: a cancelled order is reopened as Pending first; undoing a completed order asks first
function statusRule(from,to){if(from===to)return{ok:true};
  if(from==="Cancelled"&&to!=="Pending")return{ok:false,why:"A cancelled order has to be reopened as Pending first."};
  if(from==="Completed"&&to==="Pending")return{ok:true,confirm:"This takes the coins and profit of this order back out. Use it only if it was marked Completed by mistake."};
  if(from==="Completed"&&to==="Cancelled")return{ok:true,confirm:"This reverses a completed order: its coins and profit are removed."};
  return{ok:true}}
async function auditLog(order,act,d){try{await putRec({id:"au_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:"audit",order:(order&&order.id)||order,act,...(d||{}),time:Date.now()})}catch(e){}}
async function changeStatus(id,to,opt){opt=opt||{};const o=orders.find(x=>x.id===id);if(!o)throw new Error("Order not found");const from=o.status;if(from===to)return true;
  const r=statusRule(from,to);if(!r.ok)throw new Error(r.why);
  const W=[];if(r.confirm)W.push({k:"rev",msg:r.confirm});if(to==="Completed"&&!opt.ai)W.push(...orderWarn({...o,status:to}));
  let why="",ovr=false;
  if(W.length&&!opt.ai){const c=await confirmRisk(W,`Change ${from} → ${to}?`,"Yes, change");if(!c)return false;why=c.why;ovr=true}
  await patchRec(id,{status:to,doneAt:to==="Completed"?(from==="Completed"?o.doneAt:Date.now()):null,...(ovr&&W.some(w=>w.k!=="rev")?{ovr:true}:{})});
  const oo=orders.find(x=>x.id===id);if(oo&&oo.party)await syncDirectLink({...oo,status:to});
  await auditLog(o,"status",{from,to,why,warn:ovr?W.map(w=>w.msg):[],by:opt.ai?"ai":"you"});return true}
const auTxt=a=>(a.act==="create"?"Created"+(a.by==="ai"?" by AI":""):a.act==="status"?`Status ${a.from} → ${a.to}${a.by==="ai"?" (AI)":""}`:a.act==="edit"?"Edited · "+(a.chg||""):a.act==="override"?"Saved despite warning":a.act==="proof"?`Payment proof checked by you${a.amt?" · ₹"+a.amt:""}${a.utr?" · UTR "+a.utr:""}`:a.act==="delete"?"Deleted"+(a.sum?" · "+a.sum:""):a.act)+(a.why?` · “${a.why}”`:"");
const idTag=o=>{const x=exIdOf(o);const D=dupFlags(o);if(D.length)return`<span class="mtag risk" data-detail="${o.id}" style="cursor:pointer">⚠ ${D.some(d=>d.k==="utr")?"Dup UTR":D.some(d=>d.k==="shot")?"Dup shot":"Dup ID"}</span>`;
  const pv=pvOf(o);const t=[x?"ID …"+String(x).slice(-4):"",o.utr?"UTR":"",pv==="verified"?"✓ verified":pv==="ai"?"AI-read":""].filter(Boolean).join(" · ");return t?`<span class="mtag" data-detail="${o.id}" style="cursor:pointer">${esc(t)}</span>`:""};
const fdt=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
function sheetOrderDetail(id){const o=orders.find(x=>x.id===id);if(!o)return;const A=ACC();
  const gross=o.side==="SELL"&&o.status==="Completed"?(A.sellP[o.id]||0):null,fee=+o.fee||0;const W=orderWarn(o);
  const R=(k,v)=>v?`<div class="dqr"><span>${k}</span><b>${v}</b></div>`:"";const H=audits.filter(a=>a.order===id).sort((a,b)=>b.time-a.time).slice(0,40);
  openSheet(`<div class="insw"><div class="insh"><h3>${o.side} ${fmtQ(o.qty)} ${esc(o.coin)} @ ₹${fmtR(o.rate)}</h3></div>
    <div class="rml">${R("Status",esc(o.status))}${R("Exchange",esc(o.platform||modeOf(o)))}${R("Exchange order ID",esc(exIdOf(o)))}${R("UTR",esc(o.utr||""))}${R("Client / party",esc(o.cp||""))}${R("Total",inr(Math.round(orderTotal(o))))}${R("Recorded in banks",allocated(o)?inr(Math.round(allocated(o))):"")}
    ${R("Payment check",({verified:"Verified by you",ai:"AI extracted · not checked by you",received:"Received"})[pvOf(o)]||"Not checked")}${o.payAt?R("Payment time",fdt(o.payAt)):""}${R("Created",fdt(o.time))}${o.status==="Completed"&&o.doneAt?R("Completed",fdt(o.doneAt)):""}
    ${gross!=null?R("Gross profit",sgn(gross)):""}${fee?R("Fee","−"+inr(fee)):""}${+o.tds>0?R("TDS deducted",inr(Math.round(+o.tds*100)/100)+(o.tdsQ>0?" · "+fmtQ(o.tdsQ)+" USDT":"")+(o.tdsSrc==="ledger"?" · confirmed in wallet history":o.tdsSrc==="order"?" · from order page, not confirmed yet":"")):""}${gross!=null&&fee?R("Net profit",sgn(gross-fee)):""}${R("Note",esc(o.note||""))}</div>
    <div class="pcsec">Risk</div><div class="rml">${W.length?W.map(w=>`<div class="dqr"><span>⚠️ ${esc(w.msg)}</span></div>`).join(""):'<div class="dqr"><span>No problems found</span><b class="pos">Clear</b></div>'}${o.ovr?'<div class="dqr"><span>You saved this despite a warning</span></div>':""}</div>
    <div class="pcsec">Activity</div><div class="rml">${H.length?H.map(a=>`<div class="dqr"><span>${esc(auTxt(a))}${a.warn&&a.warn.length?`<br><small class="note" style="margin:0">${esc(a.warn.join(" "))}</small>`:""}</span><b style="font-weight:500;color:var(--muted);white-space:nowrap">${fdt(a.time)}</b></div>`).join(""):'<div class="dqr"><span class="note" style="margin:0">No history yet. Changes from now on are recorded here.</span></div>'}</div></div>`)}
const RISK_L={utr:"Duplicate UTR",ex:"Duplicate exchange order ID",shot:"Duplicate screenshot",amt:"Amount mismatch",big:"Unusual size",nopay:"Completed, no payment"};
function riskReport(){const out=[],cnt={utr:0,ex:0,shot:0,amt:0,big:0,nopay:0};let reviewed=0;
  orders.forEach(o=>{if(o.status==="Cancelled")return;const W=orderWarn(o);if(!W.length)return;
    const open=W.filter(w=>!(o.rk||[]).includes(w.k));if(!W.length)return;
    if(o.ovr||!open.length){reviewed++;return}
    open.forEach(w=>cnt[w.k]=(cnt[w.k]||0)+1);out.push({o,W:open})});
  out.sort((a,b)=>b.o.time-a.o.time);return{out,cnt,reviewed}}
function sheetRisk(all){const R=riskReport(),z=sizeRef();const list=all?R.out:R.out.slice(0,25);const tot=R.out.length;
  openSheet(`<div class="insw"><div class="insh"><h3>Risk checks</h3></div>
    <div class="rsug"><div><span>Need a look</span><b class="${tot?"neg":"pos"}">${tot}</b></div><div><span>Checked</span><b>${R.reviewed}</b></div><div><span>Usual order</span><b>${z.med?inr(Math.round(z.med)):"—"}</b></div></div>
    <div class="bstats" style="margin-top:10px">${Object.keys(RISK_L).map(k=>`<div><span>${RISK_L[k]}</span><b class="${R.cnt[k]?"neg":""}">${R.cnt[k]||0}</b></div>`).join("")}</div>
    <div class="pcsec">Orders to check</div>
    <div class="rml">${list.length?list.map(({o,W})=>`<div class="dqr" style="display:block;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(shortO(o))}</b><span>${inr(Math.round(orderTotal(o)))}</span></div>${W.map(w=>`<div class="note" style="margin:3px 0">⚠️ ${esc(w.msg)}</div>`).join("")}<div class="row2" style="margin-top:6px"><button class="mini ghost" type="button" data-rd="${o.id}">Open</button><button class="mini" type="button" data-rk="${o.id}">Mark checked</button></div></div>`).join("")+(!all&&tot>25?`<button type="button" class="link" id="rk-all" style="padding:10px;width:100%">Show all ${tot} ›</button>`:""):'<p class="note">Nothing needs checking. Every order passes the duplicate, amount and size checks.</p>'}</div>
    <div class="pcsec">Unusual size limit</div>
    <label>Warn above (₹)<input id="rk-lim" type="number" inputmode="decimal" step="any" value="${z.manual||""}" placeholder="${z.lim<Infinity?"Auto: "+Math.round(z.lim):"Auto (needs 10 completed orders)"}"></label>
    <p class="note">Left empty, the app warns when an order is more than 3× your usual order (and at least ₹10,000). "Mark checked" removes an order from this list; the Activity log keeps the record.</p>
    <button class="primary" type="button" id="rk-save" style="width:100%">Save limit</button></div>`,el=>{
    el.querySelectorAll("[data-rd]").forEach(b=>b.onclick=()=>sheetOrderDetail(b.dataset.rd));
    el.querySelectorAll("[data-rk]").forEach(b=>b.onclick=async()=>{const x=R.out.find(r=>r.o.id===b.dataset.rk);if(!x)return;try{await patchRec(x.o.id,{rk:[...new Set([...(x.o.rk||[]),...x.W.map(w=>w.k)])]});auditLog(x.o,"risk_checked",{warn:x.W.map(w=>w.msg)});sheetRisk(all)}catch(e){toast("Couldn't save")}});
    const ra=el.querySelector("#rk-all");if(ra)ra.onclick=()=>sheetRisk(true);
    el.querySelector("#rk-save").onclick=async()=>{try{await putRec({...settings,id:"s_main",kind:"setting",bigTxn:Math.max(0,+el.querySelector("#rk-lim").value||0)});toast("Saved");sheetRisk(all)}catch(e){toast("Couldn't save")}}})};
