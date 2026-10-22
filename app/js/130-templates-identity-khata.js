// ===== Pro tools · batch A: chat templates, client identity, udhar khata =====
var identMap=null;
function identGet(){if(identMap)return identMap;const m=new Map();recs.filter(r=>r.kind==="ident").forEach(r=>{if(r.from&&r.to&&r.from!==r.to)m.set(r.from,r.to)});return identMap=m}
function identRes(k){const M=identGet();let t=k,i=0;while(M.has(t)&&i++<6)t=M.get(t);return t}
const P7fmt=n=>Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
function p7Dri(g,sheet,tint,svg,title,sub){try{const L=document.querySelector(`#dAll .dgrp[data-g="${g}"] .dlist`);if(!L||L.querySelector(`[data-sheet="${sheet}"]`))return;L.insertAdjacentHTML("afterbegin",`<button type="button" class="dri" data-sheet="${sheet}"><span class="qri ${tint}"><svg viewBox="0 0 24 24">${svg}</svg></span><span class="qrt"><b>${title}</b><small>${sub}</small></span><em class="dmeta" data-m="${sheet}"></em><span class="dch"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>`)}catch(e){}}
const P7css=`.p7f{display:grid;gap:8px;margin:8px 0}.p7f label{display:grid;gap:4px;font:600 .74rem var(--body);color:var(--muted)}.p7f input,.p7f select,.p7f textarea{min-height:40px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--fg,inherit);padding:8px 10px;font:500 .9rem var(--body);width:100%;box-sizing:border-box}.p7f textarea{min-height:84px;resize:vertical}.p7r{display:grid;grid-template-columns:1fr 1fr;gap:8px}.p7c{border:1px solid var(--line);border-radius:14px;padding:11px 12px;margin:8px 0;background:var(--surface)}.p7c pre{white-space:pre-wrap;word-break:break-word;font:500 .82rem/1.45 var(--body);margin:6px 0 8px}.p7c h4{margin:0;font:700 .86rem var(--body)}.p7b{display:flex;gap:8px;flex-wrap:wrap}.p7p{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--line);cursor:pointer;background:none;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;color:inherit;font:inherit}.p7p small{display:block;color:var(--muted);font:500 .72rem var(--body)}.p7pos{color:var(--accent)}.p7neg{color:var(--sell)}.p7tag{font:700 .64rem var(--body);padding:2px 7px;border-radius:99px;background:var(--soft);margin-left:6px}.p7tag.bad{background:color-mix(in srgb,var(--sell) 18%,transparent);color:var(--sell)}.p7chk{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)}.p7chk i{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:800 .7rem var(--body);font-style:normal;background:var(--soft)}.p7chk i.ok{background:var(--accent);color:#fff}.p7chk i.bad{background:var(--sell);color:#fff}.p7chk i.warn{background:var(--warn);color:#fff}.p7chk p{margin:0;font:500 .84rem/1.35 var(--body)}.p7chk small{display:block;color:var(--muted);font:500 .72rem var(--body)}.p7bar{height:8px;border-radius:9px;background:var(--soft);overflow:hidden;margin-top:5px}.p7bar i{display:block;height:100%;background:var(--accent)}.p7heat{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;margin:8px 0}.p7heat span{aspect-ratio:1;border-radius:5px;background:var(--soft);display:grid;place-items:center;font:600 .58rem var(--body);color:var(--muted)}`;
(function(){if(!document.getElementById("p7css")){const s=document.createElement("style");s.id="p7css";s.textContent=P7css;document.head.appendChild(s)}})();

// ---- 1. Chat reply templates
const TPL_BUILT=[
 {id:"b1",name:"Payment details (SELL: ask buyer to pay)",text:"Hello {name}, please pay ₹{amount} to:\nName: {holder}\nBank: {bankName}\nA/C: {accNo}\nIFSC: {ifsc}\nUPI: {upi}\nPay from your own account only. Share UTR / screenshot after payment."},
 {id:"b2",name:"Payment received, releasing",text:"Payment of ₹{amount} received. Releasing {qty} {coin} now. Thank you!"},
 {id:"b3",name:"Please pay now",text:"Hello {name}, the order of ₹{amount} is waiting. Please complete the payment soon."},
 {id:"b4",name:"Own account only",text:"Please pay only from your own bank account in the name of {name}. Third-party payments will be refunded."},
 {id:"b5",name:"Share UTR",text:"Please share the UTR / transaction ID and a screenshot of the ₹{amount} payment."},
 {id:"b6",name:"I am paying now (BUY)",text:"Hi, I am paying ₹{amount} now from my own account {me}. Please release {qty} {coin} after you receive it."},
 {id:"b7",name:"Paid, please release (BUY)",text:"Paid ₹{amount}. UTR: {utr}. Please check and release {qty} {coin}."},
 {id:"b8",name:"Please wait",text:"Please wait {mins} minutes, the bank is slow. I will update you."},
 {id:"b9",name:"Wrong amount",text:"The order is ₹{amount}. Please send the exact amount, or I will cancel and refund."},
 {id:"b10",name:"Thanks / feedback",text:"Thank you {name}! Please leave a positive feedback. Happy to trade again."}
];
function tplCustom(){return recs.filter(r=>r.kind==="tpl").sort((a,b)=>(a.time||0)-(b.time||0))}
function tplFill(text,V){return text.split("\n").map(l=>{let bad=false;const r=l.replace(/\{(\w+)\}/g,(m,k)=>{const v=V[k];if(v==null||v===""){bad=true;return m}return v});return bad&&!/\{(?:name|amount|qty|coin|utr|mins|me)\}/.test(r)?null:r}).filter(l=>l!==null).join("\n").replace(/\{(\w+)\}/g,m=>m)}
function tplVars(o,b,x){const V={mins:x.mins||"5",utr:x.utr||"",me:pref("owner")||""};if(o){V.name=o.cp||"";V.amount=P7fmt(orderTotal(o));V.qty=fmtQ(o.qty);V.coin=o.coin||"USDT";V.rate=P7fmt(o.rate);V.orderid=o.exId||o.orderNo||""}
 if(x.amt&&!o)V.amount=P7fmt(x.amt);if(b){V.holder=b.holder||"";V.bankName=b.bankName||b.name||"";V.accNo=b.accNo||"";V.ifsc=(b.ifsc||"").toUpperCase();V.upi=b.upi||"";V.phone=b.phone||""}return V}
sheets.tpl=function(st){const S=st||{oid:"",bid:"",utr:"",mins:"5",amt:"",q:""};
 const cand=orders.filter(o=>o.status!=="Cancelled").sort((a,b)=>((b.status==="Pending"||b.status==="Appeal")-(a.status==="Pending"||a.status==="Appeal"))||b.time-a.time).slice(0,12);
 if(!S.oid&&cand[0])S.oid=cand[0].id;
 const o=orders.find(k=>k.id===S.oid)||null;const cb=banks.filter(k=>k.type!=="Cash");
 if(!S.bid&&cb.length){const use=limitUse();const best=o&&(o.splits||[]).map(x=>cb.find(k=>k.id===x.bank)).filter(Boolean)[0]||cb.slice().sort((a,b)=>{const l=k=>{const L=+(k.limits||{}).ALL||+(k.limits||{}).UPI||0;return L?L-(((use[k.id]||{}).ALL)||((use[k.id]||{}).UPI)||0):1e12};return l(b)-l(a)})[0];S.bid=best.id}
 const bk=banks.find(k=>k.id===S.bid)||null;const V=tplVars(o,bk,S);
 const all=[...TPL_BUILT.map(t=>({...t,built:1})),...tplCustom().map(t=>({id:t.id,name:t.name,text:t.text}))].filter(t=>!S.q||(t.name+t.text).toLowerCase().includes(S.q.toLowerCase()));
 openSheet(`<div class="insw"><div class="insh"><h3>Chat replies</h3><span class="note">tap to copy</span></div>
  <div class="p7f"><label>Order<select id="tp-o"><option value="">No order (type amount)</option>${cand.map(c=>`<option value="${c.id}" ${c.id===S.oid?"selected":""}>${c.side} ${fmtQ(c.qty)} ${esc(c.coin||"")} · ${esc(c.cp||"?")} · ₹${P7fmt(orderTotal(c))}</option>`).join("")}</select></label>
  ${o?"":`<label>Amount (₹)<input id="tp-a" type="number" inputmode="decimal" value="${esc(S.amt)}"></label>`}
  <div class="p7r"><label>Your bank<select id="tp-b"><option value="">None</option>${cb.map(k=>`<option value="${k.id}" ${k.id===S.bid?"selected":""}>${esc(k.name)}</option>`).join("")}</select></label><label>UTR (optional)<input id="tp-u" value="${esc(S.utr)}"></label></div>
  <input id="tp-q" type="search" placeholder="Search replies" value="${esc(S.q)}"></div>
  ${all.map(t=>`<div class="p7c"><h4>${esc(t.name)}</h4><pre>${esc(tplFill(t.text,V))}</pre><div class="p7b"><button type="button" class="mini" data-tc="${t.id}">Copy</button><button type="button" class="mini ghost" data-tw="${t.id}">Share</button>${t.built?"":`<button type="button" class="mini ghost" data-te="${t.id}">Edit</button>`}</div></div>`).join("")||'<p class="note">No reply found.</p>'}
  <button type="button" class="mini" id="tp-add" style="width:100%;margin-top:6px">+ New reply</button>
  <p class="note">Words in {braces} fill in by themselves: {name} {amount} {qty} {coin} {rate} {holder} {bankName} {accNo} {ifsc} {upi} {utr} {me}. Lines with missing details are dropped.</p></div>`,el=>{
  const re=()=>sheets.tpl(S);
  el.querySelector("#tp-o").onchange=e=>{S.oid=e.target.value;re()};
  const a=el.querySelector("#tp-a");if(a)a.onchange=e=>{S.amt=e.target.value;re()};
  el.querySelector("#tp-b").onchange=e=>{S.bid=e.target.value;re()};
  el.querySelector("#tp-u").onchange=e=>{S.utr=e.target.value;re()};
  el.querySelector("#tp-q").onchange=e=>{S.q=e.target.value;re()};
  const get=id=>{const t=all.find(k=>k.id===id);return t?tplFill(t.text,V):""};
  el.onclick=e=>{const c=e.target.closest("[data-tc]");if(c){copyText(get(c.dataset.tc));return}const w=e.target.closest("[data-tw]");if(w){const tx=get(w.dataset.tw);if(navigator.share)navigator.share({text:tx}).catch(()=>{});else window.open("https://wa.me/?text="+encodeURIComponent(tx),"_blank");return}const ed=e.target.closest("[data-te]");if(ed)return tplEdit(ed.dataset.te,S)};
  el.querySelector("#tp-add").onclick=()=>tplEdit("",S)})};
function tplEdit(id,S){const t=recs.find(r=>r.id===id)||{name:"",text:""};
 openSheet(`<div class="insw"><div class="insh"><h3>${id?"Edit":"New"} reply</h3></div><div class="p7f"><label>Name<input id="te-n" value="${esc(t.name)}" placeholder="e.g. Bank is slow"></label><label>Message<textarea id="te-t" placeholder="Hello {name}, pay ₹{amount} to {holder}...">${esc(t.text)}</textarea></label></div>
  <div class="p7b"><button type="button" class="mini" id="te-s">Save</button>${id?'<button type="button" class="mini ghost" id="te-d">Delete</button>':""}<button type="button" class="mini ghost" id="te-x">Back</button></div></div>`,el=>{
  el.querySelector("#te-x").onclick=()=>sheets.tpl(S);
  el.querySelector("#te-s").onclick=async()=>{const n=el.querySelector("#te-n").value.trim().slice(0,60),x=el.querySelector("#te-t").value.trim().slice(0,800);if(!n||!x)return toast("Add a name and a message");await putRec({id:id||newId("tpl_"),kind:"tpl",name:n,text:x,time:t.time||Date.now()});toast("Saved");sheets.tpl(S)};
  const d=el.querySelector("#te-d");if(d)d.onclick=async()=>{await delRec(id);toast("Deleted");sheets.tpl(S)}})}

// ---- 5. One client, many names
function p7Lev(a,b){if(Math.abs(a.length-b.length)>1)return 9;const m=a.length,n=b.length;let p=[...Array(n+1).keys()];for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function identSuggest(){const S=cpStats();const E=Object.entries(S).sort((a,b)=>b[1].last-a[1].last).slice(0,1200).map(([k,x])=>({k,name:x.name,n:x.n,tok:x.name.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(Boolean)}));const out=[];
 for(let i=0;i<E.length&&out.length<40;i++)for(let j=i+1;j<E.length&&out.length<40;j++){const a=E[i],b=E[j];if(a.k===b.k)continue;const[s,l]=a.tok.length<=b.tok.length?[a,b]:[b,a];let why="";
  if(s.tok.length&&s.tok.every(t=>l.tok.some(u=>u===t||(t.length>=4&&u.length>=4&&(u.startsWith(t)||t.startsWith(u)))))&&(s.tok.length>=2||s.tok[0].length>=5))why="Same words";
  else if(a.k.length>=9&&p7Lev(a.k,b.k)<=1)why="1 letter different";
  else if(typeof ixlAlias==="function"&&ixlAlias(a.name,b.name))why="Learned by Intake";
  if(why)out.push({a,b,why})}return out}
async function identMerge(fromK,toK,names,realName){if(!fromK||!toK||fromK===toK)return false;if(identRes(toK)===fromK)return false;const to=identRes(toK);
 try{const tg=cpTagMap&&cpTagMap.get(fromK);if(tg&&!cpTagMap.get(to)){await putRec({...tg,id:to})}}catch(e){}
 await putRec({id:"idn_"+fromK,kind:"ident",from:fromK,to,names:names||[],realName:realName||"",time:Date.now()});return true}
sheets.ident=function(){const sug=identSuggest();const S=cpStats();const names=Object.values(S).map(x=>x.name).sort();const mer=recs.filter(r=>r.kind==="ident").sort((a,b)=>b.time-a.time);
 openSheet(`<div class="insw"><div class="insh"><h3>One client, many names</h3><span class="note">${sug.length} to check</span></div>
  <p class="note">Same person with two names? Merge them so orders, trust, limits and khata count as one client. You can undo any time.</p>
  ${sug.length?`<div class="pcsec">Looks like the same person</div>${sug.map((s,i)=>`<div class="p7c"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${esc(s.a.name)}</b><small class="note" style="display:block;margin:0">${s.a.n} orders</small></div><div style="text-align:right"><b>${esc(s.b.name)}</b><small class="note" style="display:block;margin:0">${s.b.n} orders</small></div></div><div class="p7b" style="margin-top:8px;align-items:center"><span class="p7tag">${s.why}</span><button type="button" class="mini" data-im="${i}" style="margin-left:auto">Same person</button></div></div>`).join("")}`:'<p class="note">No similar names found.</p>'}
  <div class="pcsec">Merge by hand</div><div class="p7f"><div class="p7r"><label>Name 1<input id="im-a" list="im-l" autocomplete="off"></label><label>Name 2<input id="im-b" list="im-l" autocomplete="off"></label></div><datalist id="im-l">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist><button type="button" class="mini" id="im-go">Merge</button></div>
  ${mer.length?`<div class="pcsec">Merged</div>${mer.map(r=>`<div class="dqr"><span>${esc((S[r.to]||{}).name||r.to.replace(/^cp_/,""))}<small>${esc((r.names||[]).join(" + ")||r.from.replace(/^cp_/,""))}</small></span><button type="button" class="mini ghost" data-iu="${r.id}">Undo</button></div>`).join("")}`:""}</div>`,el=>{
  el.onclick=async e=>{const m=e.target.closest("[data-im]");if(m){const s=sug[+m.dataset.im];const[f,t]=s.a.n>s.b.n?[s.b,s.a]:[s.a,s.b];await identMerge(f.k,t.k,[f.name,t.name]);toast("Merged");return sheets.ident()}const u=e.target.closest("[data-iu]");if(u){await delRec(u.dataset.iu);toast("Un-merged");sheets.ident()}};
  el.querySelector("#im-go").onclick=async()=>{const a=el.querySelector("#im-a").value.trim(),b=el.querySelector("#im-b").value.trim();if(!a||!b||cpKey(a)===cpKey(b))return toast("Pick two different names");const ka=cpKey(a),kb=cpKey(b);const na=(S[ka]||{n:0}).n,nb=(S[kb]||{n:0}).n;const[f,t,fn,tn]=na>nb?[kb,ka,b,a]:[ka,kb,a,b];await identMerge(f,t,[fn,tn]);toast("Merged");sheets.ident()}})};

// ---- 6. Udhar khata
function khRecs(){return recs.filter(r=>r.kind==="khata")}
function khBook(){const m={};khRecs().forEach(r=>{const k=identRes(r.key),p=m[k]=m[k]||{key:k,name:r.name,bal:{},last:0,due:0,ent:[]};p.ent.push(r);p.bal[r.cur]=(p.bal[r.cur]||0)+(+r.amt||0);p.last=Math.max(p.last,r.time||0);if(r.name&&(r.time||0)>=p.last)p.name=r.name});
 Object.values(m).forEach(p=>{p.ent.sort((a,b)=>(b.time||0)-(a.time||0));const open=Object.values(p.bal).some(v=>Math.abs(v)>0.005);p.open=open;const dues=p.ent.filter(e=>e.due&&(e.t==="gave"||e.t==="took")).map(e=>e.due);p.due=open&&dues.length?Math.min(...dues):0});return m}
const khAmt=(v,c)=>c==="USDT"?fmtQ(+Math.abs(v).toFixed(4))+" USDT":inr(Math.abs(Math.round(v*100)/100));
function khLine(p){return Object.entries(p.bal).filter(([,v])=>Math.abs(v)>0.005).map(([c,v])=>`<span class="${v>0?"p7pos":"p7neg"}">${v>0?"+":"−"}${khAmt(v,c)}</span>`).join(" · ")||'<span class="note">Settled</span>'}
function khRemind(p){const L=Object.entries(p.bal).filter(([,v])=>Math.abs(v)>0.005);if(!L.length)return"";const get=L.filter(([,v])=>v>0).map(([c,v])=>khAmt(v,c)).join(" + "),give=L.filter(([,v])=>v<0).map(([c,v])=>khAmt(v,c)).join(" + ");const d=p.due?new Date(p.due).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"";
 return get?`Hi ${p.name}, ${get} baaki hai ${d?"(due "+d+") ":""}— please clear kar dena. Thanks!`:`Hi ${p.name}, main aapko ${give} dene wala hoon${d?" ("+d+" tak)":""}. Jaldi bhej dunga.`}
sheets.khata=function(open){const B=khBook();const L=Object.values(B).sort((a,b)=>(b.open-a.open)||(Math.abs((b.bal.INR||0))+Math.abs((b.bal.USDT||0))*90)-(Math.abs((a.bal.INR||0))+Math.abs((a.bal.USDT||0))*90));
 if(typeof open==="string"&&B[open])return khPerson(B[open]);
 const tot={INR:[0,0],USDT:[0,0]};L.forEach(p=>Object.entries(p.bal).forEach(([c,v])=>{if(tot[c])tot[c][v>0?0:1]+=Math.abs(v)}));const today=new Date().setHours(23,59,59,999);
 openSheet(`<div class="insw"><div class="insh"><h3>Udhar khata</h3><span class="note">${L.filter(p=>p.open).length} open</span></div>
  <div class="pvk"><div><span>Milna hai</span><b class="p7pos">${inr(Math.round(tot.INR[0]))}</b>${tot.USDT[0]?`<small>${fmtQ(+tot.USDT[0].toFixed(2))} USDT</small>`:""}</div><div><span>Dena hai</span><b class="p7neg">${inr(Math.round(tot.INR[1]))}</b>${tot.USDT[1]?`<small>${fmtQ(+tot.USDT[1].toFixed(2))} USDT</small>`:""}</div></div>
  <button type="button" class="mini" id="kh-new" style="width:100%;margin:8px 0">+ New entry</button>
  ${L.length?L.map(p=>`<button type="button" class="p7p" data-kp="${p.key}"><span><b>${esc(p.name)}</b>${p.due&&p.due<today?`<span class="p7tag bad">${p.due<Date.now()-864e5?"overdue":"due today"}</span>`:p.due?`<span class="p7tag">due ${new Date(p.due).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>`:""}<small>${p.ent.length} entr${p.ent.length>1?"ies":"y"} · last ${new Date(p.last).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</small></span><span style="text-align:right">${khLine(p)}</span></button>`).join(""):'<p class="note">No udhar yet. Add the first entry.</p>'}
  <p class="note">Green = they owe you. Red = you owe them. Same person with many names is joined by One client, many names.</p></div>`,el=>{
  el.querySelector("#kh-new").onclick=()=>khForm("");el.onclick=e=>{const b=e.target.closest("[data-kp]");if(b)khPerson(B[b.dataset.kp])}})};
function khForm(key){const B=khBook();const names=[...new Set([...Object.values(cpStats()).map(x=>x.name),...parties.map(p=>p.name)])].sort();const cur=B[key];
 openSheet(`<div class="insw"><div class="insh"><h3>Udhar entry</h3></div><div class="p7f"><label>Person<input id="kf-n" list="kf-l" value="${esc(cur?cur.name:"")}" autocomplete="off" placeholder="Name"></label><datalist id="kf-l">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
  ${insSeg("kf-t",[["gave","Udhar diya"],["took","Udhar liya"]],"gave")}
  <div class="p7r"><label>Amount<input id="kf-a" type="number" inputmode="decimal" step="any"></label><label>Currency<select id="kf-c"><option>INR</option><option>USDT</option></select></label></div>
  <div class="p7r"><label>Due date<input id="kf-d" type="date"></label><label>Note<input id="kf-o" placeholder="optional"></label></div>
  <button type="button" class="mini" id="kf-s">Save</button></div></div>`,el=>{let t="gave";bindSeg(el,"kf-t",k=>{t=k;el.querySelectorAll("#kf-t button").forEach(b=>b.classList.toggle("on",b.dataset.k===k))});
  el.querySelector("#kf-s").onclick=async()=>{const n=el.querySelector("#kf-n").value.trim(),a=+el.querySelector("#kf-a").value;if(!n||!(a>0))return toast("Add name and amount");const d=el.querySelector("#kf-d").value;
   await putRec({id:newId("kh_"),kind:"khata",key:cpKey(n),name:n.slice(0,60),t,cur:el.querySelector("#kf-c").value,amt:t==="gave"?a:-a,note:el.querySelector("#kf-o").value.trim().slice(0,100),time:Date.now(),due:d?new Date(d+"T23:59:59").getTime():0});toast("Saved");renderAlerts();sheets.khata(identRes(cpKey(n)))}})}
function khPerson(p){const B=khBook();p=B[p.key]||p;
 openSheet(`<div class="insw"><div class="insh"><h3>${esc(p.name)}</h3><span class="note">${khLine(p)}</span></div>
  ${p.open?`<div class="p7f"><label>Settle part (amount)<input id="kp-a" type="number" inputmode="decimal" step="any" placeholder="Leave empty = full"></label><div class="p7r"><label>Currency<select id="kp-c">${Object.keys(p.bal).filter(c=>Math.abs(p.bal[c])>0.005).map(c=>`<option>${c}</option>`).join("")}</select></label><label>&nbsp;<button type="button" class="mini" id="kp-s" style="height:40px">Settle</button></label></div></div>`:""}
  <div class="p7b"><button type="button" class="mini" id="kp-n">+ Entry</button>${p.open?'<button type="button" class="mini ghost" id="kp-c2">Copy reminder</button><button type="button" class="mini ghost" id="kp-w">WhatsApp</button>':""}<button type="button" class="mini ghost" id="kp-b">Back</button></div>
  <div class="pcsec">History</div>${p.ent.map(e=>`<div class="dqr"><span>${e.t==="gave"?"Udhar diya":e.t==="took"?"Udhar liya":e.t==="back"?"Wapas mila":"Wapas diya"} · ${new Date(e.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}<small>${esc(e.note||"")}${e.due?" due "+new Date(e.due).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):""}</small></span><span class="${e.amt>0?"p7pos":"p7neg"}">${e.amt>0?"+":"−"}${khAmt(e.amt,e.cur)} <button type="button" class="mini ghost" data-kd="${e.id}" aria-label="Delete">✕</button></span></div>`).join("")}</div>`,el=>{
  el.querySelector("#kp-b").onclick=()=>sheets.khata();el.querySelector("#kp-n").onclick=()=>khForm(p.key);
  const s=el.querySelector("#kp-s");if(s)s.onclick=async()=>{const c=el.querySelector("#kp-c").value,bal=p.bal[c]||0;let a=+el.querySelector("#kp-a").value||Math.abs(bal);a=Math.min(a,Math.abs(bal)*1.0001);if(!(a>0))return;await putRec({id:newId("kh_"),kind:"khata",key:p.key,name:p.name,t:bal>0?"back":"repaid",cur:c,amt:bal>0?-a:a,note:"",time:Date.now(),due:0});toast("Settled");renderAlerts();sheets.khata(p.key)};
  const c2=el.querySelector("#kp-c2");if(c2){c2.onclick=()=>copyText(khRemind(p));el.querySelector("#kp-w").onclick=()=>window.open("https://wa.me/?text="+encodeURIComponent(khRemind(p)),"_blank")}
  el.onclick=async e=>{const d=e.target.closest("[data-kd]");if(d){await delRec(d.dataset.kd);toast("Deleted");renderAlerts();sheets.khata(p.key)}}})}
function khAlerts(list){try{const end=new Date().setHours(23,59,59,999),now=Date.now();Object.values(khBook()).forEach(p=>{if(!p.open||!p.due||p.due>end)return;const L=Object.entries(p.bal).filter(([,v])=>Math.abs(v)>0.005)[0];list.push({hi:p.due<now-864e5,t:`${p.name}: ${khAmt(L[1],L[0])} ${L[1]>0?"to collect":"to pay"} (${p.due<now-864e5?"overdue":"due today"})`,sheet:"khata"})})}catch(e){}}
function p7Drawer(){
 p7Dri("insights","market","t-green",'<path d="M4 17l5-5 4 4 7-8"/><path d="M15 8h5v5"/>',"Live market","USDT/INR, P2P ads and coin prices");
 p7Dri("tools","tpl","t-blue",'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',"Chat replies","Ready messages with amount and bank filled in");
 p7Dri("tools","ident","t-amber",'<circle cx="9" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 19c.5-3 3-4.5 5.5-4.5s5 1.500 5.500 4.500M15 14.500c2.500 0 4.500 1.200 5 3.500"/>',"One client, many names","Join the same person under different names");
 p7Dri("money","khata","t-green",'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h4"/>',"Udhar khata","Who owes you and who you owe");
 p7Dri("money","dayclose","t-blue",'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',"Day close","Checklist and match your real balances");
 p7Dri("insights","insights","t-amber",'<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>',"Business insights","Best clients, methods, hours, quiet clients");
 p7Dri("control","bankhealth","t-red",'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12h6M12 9v6"/>',"Bank health","Streaks, limits, rest days, freeze log");
 p7Dri("tools","glance","t-green",'<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 13l2.5-3 2.5 2 3-4"/>',"At a glance","Today's profit, open orders, widget");
}

