const APP_NAME="Pexai";const PX_LOGO='<svg width="40" height="40" viewBox="22 14 64 76" aria-hidden="true"><defs><linearGradient id="pxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3DDCA6"/><stop offset="1" stop-color="#12A077"/></linearGradient></defs><path d="M37 82V28h19a16.5 16.5 0 0 1 0 33H37" fill="none" stroke="url(#pxg)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 24l2.2 5.3 5.3 2.2-5.3 2.2L78 39l-2.2-5.3-5.3-2.2 5.3-2.2z" fill="#F2B441"/></svg>';
(function(){if(!document.getElementById("pxcss")){const s=document.createElement("style");s.id="pxcss";s.textContent=`.pxw{font-weight:800;letter-spacing:-.02em}.pxw i{font-style:normal;position:relative;display:inline-block;background:linear-gradient(100deg,#1FB887 18%,#B6FBE3 50%,#1FB887 82%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:pxSh 2.8s ease-in-out infinite}.pxw i::after{content:"";position:absolute;right:-5px;top:-1px;width:5px;height:5px;background:#F2B441;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);-webkit-text-fill-color:initial;animation:pxTw 2.8s ease-in-out infinite}@keyframes pxSh{0%{background-position:100% 0}60%,100%{background-position:0% 0}}@keyframes pxTw{0%,40%{opacity:0;transform:scale(.3) rotate(0)}60%{opacity:1;transform:scale(1.15) rotate(45deg)}80%,100%{opacity:0;transform:scale(.3) rotate(90deg)}}
@media(prefers-reduced-motion:reduce){.pxw i,.pxw i::after{animation:none!important}.pxw i{background:none;-webkit-text-fill-color:#1FB887}.pxw i::after{display:none}}`;document.head.appendChild(s)}})();
function pxWord(){return'<span class="pxw">Pex<i>ai</i></span>'}

(function(){if(!document.getElementById("bootcss")){const s=document.createElement("style");s.id="bootcss";s.textContent=`html.boot #p-home>*:not(.ih):not(.kpis){animation:bIn .8s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0)*80ms + 140ms)}html.boot .kpis .kpi{animation:bIn .75s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--k,0)*70ms + 520ms)}html.boot nav.tabs{animation:bNav .8s .55s cubic-bezier(.22,1,.36,1) both}html.boot .aifab{animation:bPop .7s 1.05s cubic-bezier(.34,1.56,.64,1) both}html.boot .hero2 .bbar{transform-origin:left;animation:bBar 1.1s .55s cubic-bezier(.22,1,.36,1) both}@keyframes bIn{from{opacity:0;transform:translateY(20px) scale(.985)}to{opacity:1;transform:none}}@keyframes bNav{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}@keyframes bPop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}@keyframes bBar{from{transform:scaleX(0);opacity:.2}to{transform:none;opacity:1}}@media(prefers-reduced-motion:reduce){html.boot *{animation:none!important}}`;document.head.appendChild(s)}
 try{if(!matchMedia("(prefers-reduced-motion:reduce)").matches){const H=document.documentElement;document.querySelectorAll("#p-home>*").forEach((e,i)=>e.style.setProperty("--i",Math.min(i,7)));document.querySelectorAll("#p-home .kpis .kpi").forEach((e,i)=>e.style.setProperty("--k",i));H.classList.add("boot");setTimeout(()=>{try{if(window.P2PNative&&typeof P2PNative.appReady==="function")P2PNative.appReady()}catch(e){}},80);setTimeout(()=>H.classList.remove("boot"),2400);
 setTimeout(()=>{const el=document.getElementById("hTotal");if(!el)return;const t0=el.textContent||"";const m=t0.match(/[\d,]+(\.\d+)?/);if(!m)return;const to=parseFloat(m[0].replace(/,/g,""));if(!(to>0))return;const dec=(m[1]||"").length?m[1].length-1:0;const f=v=>t0.replace(m[0],v.toLocaleString("en-IN",{minimumFractionDigits:dec,maximumFractionDigits:dec}));const st=performance.now();let last=null;(function step(t){if(el.textContent!==t0&&last!==null&&el.textContent!==last)return;const k=Math.min(1,(t-st)/1100),e=1-Math.pow(1-k,3);last=f(to*e);el.textContent=last;if(k<1)requestAnimationFrame(step);else el.textContent=t0})(st)},380)}}catch(e){}setTimeout(()=>{try{if(window.P2PNative&&typeof P2PNative.appReady==="function")P2PNative.appReady()}catch(e){}},120)})();

document.querySelectorAll(".ih").forEach(e=>{e.hidden=true;e.classList.remove("ih")});

const $=s=>document.querySelector(s);
let orders=[], col=null, filter="all", side="BUY", sampleFn=null, aiHistory=[];
const LS="p2p_orders_v1";
const inr=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const isToday=t=>new Date(t).toDateString()===new Date().toDateString();
function toast(t){const e=$("#toast");e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,1800)}

const modeOf=o=>o.mode||"P2P";
const pairOf=o=>o&&o.link?orders.find(x=>x.link===o.link&&x.id!==o.id):null;
const noBank=o=>modeOf(o)==="Direct"&&o.via!=="ex";
const inMode=(o,m)=>m==="Pair"?(o.via==="ex"||!!pairOf(o)):modeOf(o)===m&&o.via!=="ex";
function pairSum(L){return L.filter(o=>o.status==="Completed").reduce((t,o)=>t+(o.via==="ex"?pairProfit(o):pairOf(o)&&o.side==="SELL"&&pairOf(o).status==="Completed"?pairProfit(o):0),0)}
function pairCount(L){return L.filter(o=>o.via==="ex").length+L.filter(o=>pairOf(o)&&o.side==="SELL").length}
function pairProfit(o){if(o.via==="ex"&&+o.exRate)return(o.side==="SELL"?o.rate-o.exRate:o.exRate-o.rate)*o.qty;const p=pairOf(o);if(!p)return 0;const b=o.side==="BUY"?o:p,s=o.side==="SELL"?o:p;return(s.rate-b.rate)*Math.min(+b.qty,+s.qty)}
let modeF="all", coinP="today", coinM="all", formMode="P2P";
function stats(list){
  const done=list.filter(o=>o.status==="Completed");
  const agg=s=>{const a=done.filter(o=>o.side===s);const q=a.reduce((x,o)=>x+o.qty,0);const v=a.reduce((x,o)=>x+o.qty*o.rate,0);return{q,v,avg:q?v/q:0}};
  const b=agg("BUY"),s=agg("SELL");
  const matched=Math.min(b.q,s.q);
  return{b,s,profit:listProfit(list),spreadProfit:matched&&b.avg&&s.avg?(s.avg-b.avg)*matched:0,count:list.length,pend:list.filter(o=>o.status==="Pending"||o.status==="Appeal").length};
}
function renderSummary(){
  const st=stats(orders.filter(o=>isToday(o.time)));
  $("#sProfit").textContent=inr(st.profit);
  $("#sBuy").textContent=st.b.avg?"₹"+st.b.avg.toFixed(2):"—";
  $("#sSell").textContent=st.s.avg?"₹"+st.s.avg.toFixed(2):"—";
  $("#sCount").textContent=st.count;
  $("#sPend").textContent=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;
}
let listCap=150;
function renderList(){
  let l=[...orders].sort((a,b)=>b.time-a.time);
  if(modeF!=="all")l=l.filter(o=>inMode(o,modeF));
  if(searchQ){const q=searchQ.toLowerCase();l=l.filter(o=>[o.cp,o.note,o.coin,o.platform,o.pay,o.side,o.status,String(o.qty),String(o.rate),modeOf(o),exIdOf(o),o.utr].some(v=>String(v||"").toLowerCase().includes(q)))}
  if(filter==="today")l=l.filter(o=>isToday(o.time));
  else if(filter==="BUY"||filter==="SELL")l=l.filter(o=>o.side===filter);
  else if(filter!=="all")l=l.filter(o=>o.status===filter);
  const el=$("#list");
  if(!l.length){$("#listCount").innerHTML=searchQ?`<button type="button" class="chip" id="clrQ" aria-pressed="true">“${esc(searchQ)}” ✕</button>`:"";if(searchQ)$("#clrQ").onclick=()=>{searchQ="";$("#hq").value="";renderList()};el.innerHTML=`<div class="empty"><strong>${orders.length?"No orders match this filter":"No orders yet"}</strong>${orders.length?"Try another filter.":"Tap “New” below to add your first order."}</div>`;return}
  $("#listCount").innerHTML=(searchQ?`<button type="button" class="chip" id="clrQ" aria-pressed="true">“${esc(searchQ)}” ✕</button> `:"")+l.length+(l.length===1?" order":" orders");
  if(searchQ)$("#clrQ").onclick=()=>{searchQ="";$("#hq").value="";renderList()};
  const ARROW={BUY:'<path d="M17 7L7 17M7 9v8h8"/>',SELL:'<path d="M7 17L17 7M9 7h8v8"/>'};
  const capN=listCap||l.length;el.innerHTML=l.slice(0,capN).map(o=>{const d=new Date(o.time);return `<div class="order">
    <span class="ico ${o.side}" aria-label="${o.side}"><svg viewBox="0 0 24 24">${ARROW[o.side]||""}</svg></span>
    <div class="o-main"><div class="o-title"><span class="side ${o.side}">${o.side}</span>${fmtQ(o.qty)} ${esc(o.coin)} <span class="rate">@ ₹${fmtR(o.rate)}</span></div></div>
    <div class="o-amt">${inr(o.qty*o.rate)}</div>
    <div class="o-meta" style="grid-column:2/-1"><span class="mtag">${esc(modeOf(o))}</span>${(()=>{if(o.via==="ex"){const pf=pairProfit(o);return`<span class="mtag pairtag">⇄ vs exchange avg ₹${(+o.exRate).toFixed(2)} · ${pf<0?"−":"+"}${inr(Math.abs(Math.round(pf)))}</span>`}const pp=pairOf(o);if(!pp)return"";const pf=pairProfit(o);return`<span class="mtag pairtag">⇄ ${pp.side==="SELL"?"Sold":"Bought"} ${esc(modeOf(pp))} @ ₹${fmtR(pp.rate)} · ${pf<0?"−":"+"}${inr(Math.abs(Math.round(pf)))}</span>`})()}${(o.proofs||[]).length?`<span class="mtag" data-proof="${esc(o.proofs[0])}" style="cursor:pointer">Proof</span>`:""}${idTag(o)}${d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}, ${d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} · ${modeOf(o)==="P2P"?esc(o.platform)+" · ":""}${esc(o.pay)}${o.cp?" · "+esc(o.cp)+cpBadge(o.cp):""}${o.note?" · "+esc(o.note):""}</div>
    <div class="o-foot"><select class="status ${o.status}" data-id="${o.id}" aria-label="Status">${["Completed","Pending","Appeal","Cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select>
    <div class="o-actions" data-id="${o.id}"><button class="link" data-act="edit">Edit</button><button class="link" data-act="pair">${o.link&&pairOf(o)?"Pair ⇄":"Pair"}</button><button class="link" data-act="repeat">Repeat</button><button class="link del" data-act="del">Delete</button></div></div></div>`}).join("")+(l.length>capN&&listCap>6?`<button type="button" class="mini ghost morebtn" id="listMore">Show more · ${l.length-capN} left</button>`:"");
  const mb=$("#listMore");if(mb&&el.contains(mb))mb.onclick=()=>{listCap+=200;renderList()};
}
function inPeriod(t,p){const d=new Date(t),n=new Date();
  if(p==="today")return d.toDateString()===n.toDateString();
  if(p==="week")return n-d<=7*864e5;
  if(p==="month")return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
  return true}
const fmtR=n=>(+(+n).toFixed(4)).toString();
function fmtQ(n){return Number(n).toLocaleString("en-IN",{maximumFractionDigits:4})}
function renderCoins(){
  const per=orders.filter(o=>inPeriod(o.time,coinP));
  $("#modeCards").innerHTML=["P2P","Direct","Cash","Pair"].map(m=>{const L=per.filter(o=>inMode(o,m));if(m==="Pair"&&!L.length)return"";const pv=m==="Pair"?pairSum(L):stats(L).profit;
    return `<div class="mcard"><div class="lbl">${m==="Pair"?"P2P ⇄ Direct":m}</div><div class="val">${inr(Math.round(pv))}</div><div class="sm">${m==="Pair"?pairCount(L)+" deals vs exchange":L.length+" orders"}</div></div>`}).join("");
  const list=per.filter(o=>coinM==="all"||inMode(o,coinM));
  const coins=[...new Set(list.map(o=>o.coin))].sort();
  if(!coins.length){$("#coinBody").innerHTML=`<tr><td colspan="8" style="text-align:center;font-family:var(--body);color:var(--muted);padding:24px">No orders in this period</td></tr>`;return}
  $("#coinBody").innerHTML=coins.map(c=>{const st=stats(list.filter(o=>o.coin===c));const sp=st.b.avg&&st.s.avg?st.s.avg-st.b.avg:null;
    return `<tr><td><b>${esc(c)}</b></td><td>${fmtQ(st.b.q)}</td><td>${st.b.avg?"₹"+st.b.avg.toFixed(2):"—"}</td><td>${fmtQ(st.s.q)}</td><td>${st.s.avg?"₹"+st.s.avg.toFixed(2):"—"}</td><td class="${sp>0?"pos":sp<0?"neg":""}">${sp===null?"—":(sp>0?"+":"")+sp.toFixed(2)}</td><td class="${st.profit>0?"pos":st.profit<0?"neg":""}">${inr(st.profit)}</td><td>${fmtQ(st.b.q-st.s.q)}</td></tr>`}).join("");
}
let homeTab="all",searchQ="",hideAmt=false;
try{hideAmt=localStorage.getItem("p2p_hide")==="1"}catch(e){}
function renderHero(){
  $("#hTotal").textContent=inr(Math.round(ACC().netWorth));
  const st=stats(orders.filter(o=>isToday(o.time)));const pe=$("#sProfit");pe.textContent=(st.profit>=0?"+":"")+inr(+st.profit.toFixed(2));pe.classList.toggle("neg",st.profit<0);
  const u=stockLeft().USDT||0;$("#hUsdt").textContent=fmtQ(+u.toFixed(2))+" USDT left";
  const days=[...Array(14)].map((_,i)=>{const k=new Date(Date.now()-(13-i)*DAY).toLocaleDateString("en-CA");return stats(orders.filter(o=>o.status==="Completed"&&new Date(o.time).toLocaleDateString("en-CA")===k)).profit});
  const sum=days.reduce((a,b)=>a+b,0);$("#h14").textContent=(sum>=0?"+":"")+inr(Math.round(sum));$("#h14").style.color=sum>=0?"var(--accent)":"var(--sell)";
  let acc=0;const cum=days.map(v=>acc+=v);const mn=Math.min(0,...cum),mx=Math.max(0,...cum),rg=mx-mn||1;
  const pts=cum.map((v,i)=>[i*(140/13),42-(v-mn)/rg*38]);const col=sum>=0?"var(--accent)":"var(--sell)";
  $("#hSpark").innerHTML=`<defs><linearGradient id="spg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${sum>=0?"#23c58f":"#f0596b"}" stop-opacity=".35"/><stop offset="1" stop-color="${sum>=0?"#23c58f":"#f0596b"}" stop-opacity="0"/></linearGradient></defs><path d="M${pts.map(p=>p.join(",")).join("L")}L140,46L0,46Z" fill="url(#spg)"/><path d="M${pts.map(p=>p.join(",")).join("L")}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  const left=parties.reduce((t,p)=>t+Math.max(0,partyOwed(p.id)-partyPaid(p.id)),0);$("#hDirect").textContent=parties.length?inr(Math.round(left)):"Add ›";
  const wk=parties.reduce((t,p)=>t+Math.max(0,(+p.weekly||0)-partyPaidWeek(p.id)),0);$("#hDirectWk").textContent=parties.length?(wk?"Weekly due "+inr(Math.round(wk))+" · ":"")+parties.length+(parties.length===1?" party":" parties")+" · left to pay":"Track weekly payments to parties";
  document.body.classList.toggle("hide-amt",hideAmt);$("#eyeBtn").classList.toggle("off",hideAmt);try{$("#wEye").classList.toggle("off",hideAmt)}catch(e){}
}
let dashP=(()=>{try{return localStorage.getItem("p2p_dashP")||"today"}catch(e){return "today"}})();
function dashDays(){return dashP==="30"?30:dashP==="7"?7:14}
function dashRange(p){const n=new Date(),d0=new Date(n);d0.setHours(0,0,0,0);const now=Date.now()+1;
  if(p==="today")return{a:d0.getTime(),b:now,pa:d0.getTime()-DAY,pb:d0.getTime(),lbl:"vs yesterday"};
  if(p==="7"||p==="30"){const k=+p;return{a:now-k*DAY,b:now,pa:now-2*k*DAY,pb:now-k*DAY,lbl:`vs previous ${k} days`}}
  return{a:0,b:now,pa:0,pb:0,lbl:""}}
function renderDash(){
  document.querySelectorAll("#dashP button").forEach(b=>b.classList.toggle("on",b.dataset.p===dashP));
  const R=dashRange(dashP);const inR=(t,a,b)=>t>=a&&t<b;
  const ol=orders.filter(o=>inR(o.time,R.a,R.b)),st=stats(ol),prev=stats(orders.filter(o=>inR(o.time,R.pa,R.pb)));
  const done=ol.filter(o=>o.status==="Completed"),canc=ol.filter(o=>o.status==="Cancelled").length;
  const pe=$("#sProfit");pe.textContent=(st.profit>0?"+":st.profit<0?"−":"")+inr(Math.abs(+st.profit.toFixed(2)));pe.className=st.profit>0?"pos":st.profit<0?"neg":"";
  const kd=$("#kProfitD");if(dashP==="all"||!prev.profit&&!st.profit){kd.textContent=dashP==="all"?"All time":"No trades yet in this period";kd.className="kd flat"}
  else{const diff=st.profit-prev.profit;const pct=prev.profit?Math.round(diff/Math.abs(prev.profit)*100):null;kd.textContent=`${diff>=0?"▲":"▼"} ${inr(Math.abs(Math.round(diff)))}${pct!==null?` (${Math.abs(pct)}%)`:""} ${R.lbl}`;kd.className="kd "+(diff>0?"up":diff<0?"down":"flat")}
  const vol=done.reduce((t,o)=>t+orderTotal(o),0);$("#kVol").textContent=inr(Math.round(vol));$("#kVolS").textContent=`Buy ${inr(Math.round(st.b.v))} · Sell ${inr(Math.round(st.s.v))}`;
  $("#sCount").textContent=ol.length;const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal").length;
  $("#kOrdS").textContent=`${done.length} done · ${canc} cancel${pend?` · ${pend} open`:""}`;
  $("#sBuy").textContent=st.b.avg?"₹"+st.b.avg.toFixed(2):"—";$("#sSell").textContent=st.s.avg?"₹"+st.s.avg.toFixed(2):"—";
  const sp=st.b.avg&&st.s.avg?st.s.avg-st.b.avg:null;const ke=$("#kSpread");ke.textContent=sp===null?"—":(sp>=0?"+":"")+"₹"+sp.toFixed(2);ke.className=sp>0?"pos":sp<0?"neg":"";
  const ex=exps.filter(x=>inR(x.time,R.a,R.b)).reduce((t,x)=>t+(+x.amt||0),0);const net=st.profit-ex;
  const kn=$("#kNet");kn.textContent=(net<0?"−":"")+inr(Math.abs(Math.round(net)));kn.className=net>0?"pos":net<0?"neg":"";$("#kNetS").textContent=`Expenses ${inr(Math.round(ex))}`;
  // sparkline of daily profit inside the profit card
  const ND=dashP==="today"?7:dashDays();const dk=t=>new Date(t).toLocaleDateString("en-CA");
  const dp=[...Array(ND)].map((_,i)=>{const k=dk(Date.now()-(ND-1-i)*DAY);return stats(orders.filter(o=>o.status==="Completed"&&dk(o.time)===k)).profit});
  const mn=Math.min(0,...dp),mx=Math.max(0,...dp),rg=mx-mn||1;const pts=dp.map((v,i)=>[(i*(120/(ND-1))).toFixed(1),(32-(v-mn)/rg*30).toFixed(1)]);
  const col=dp.reduce((a,b)=>a+b,0)>=0?"var(--accent)":"var(--sell)";
  $("#kSpark").innerHTML=dp.some(v=>v)?`<path d="M${pts.map(p=>p.join(",")).join("L")}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="2.6" fill="${col}"/>`:"";
  // hero: net worth
  const A=ACC();const {bal}=A;const bankTot=A.money;const u=A.stock.USDT||0;const px=A.avgCost.USDT||0;
  const stockV=A.stockVal.USDT||0;
  $("#hTotal").textContent=inr(Math.round(A.netWorth));$("#hBanks").textContent=inr(Math.round(bankTot));
  $("#hUsdt").textContent=fmtQ(+u.toFixed(2))+" USDT";$("#hStock").textContent=px?"≈ "+inr(Math.round(stockV)):"";
  const ch=$("#hNetChg");ch.textContent=st.profit?`${st.profit>=0?"+":"−"}${inr(Math.abs(Math.round(st.profit)))} ${dashP==="today"?"today":dashP==="all"?"all time":dashP+"D"}`:"";ch.className="h2chg"+(st.profit<0?" neg":"");
  const C=["var(--c1)","var(--c2)","var(--c4)","var(--c5)","var(--muted)"];const pos=banks.map(b=>({n:b.name,v:Math.max(0,bal[b.id])})).sort((a,b)=>b.v-a.v);
  const shown=pos.slice(0,4);const rest=pos.slice(4).reduce((t,x)=>t+x.v,0);if(rest)shown.push({n:"Others",v:rest});
  const segs=[...shown.map((x,i)=>({n:x.n,v:x.v,c:C[i]})),...(stockV?[{n:"USDT",v:stockV,c:"var(--c3)"}]:[])];const tot=segs.reduce((t,x)=>t+x.v,0)||1;
  $("#hBar").innerHTML=segs.filter(x=>x.v>0).map(x=>`<i style="width:${(x.v/tot*100).toFixed(2)}%;background:${x.c}" title="${esc(x.n)}"></i>`).join("");
  $("#hBarLeg").innerHTML=segs.filter(x=>x.v>0).map(x=>`<span><i class="lgd" style="background:${x.c}"></i>${esc(x.n)} <b>${Math.round(x.v/tot*100)}%</b></span>`).join("");
  // deal type mix
  const M=[["P2P","var(--c1)"],["Direct","var(--c2)"],["Cash","var(--c4)"],["Pair","var(--c5)"]].map(([m,c])=>{const l=done.filter(o=>m==="Pair"?o.via==="ex":inMode(o,m));return{m,c,v:l.reduce((t,o)=>t+orderTotal(o),0),n:l.length,p:stats(l).profit}});
  const mt=M.reduce((t,x)=>t+x.v,0);$("#mixCard").hidden=!mt;
  $("#mixBar").innerHTML=M.filter(x=>x.v).map(x=>`<i style="width:${(x.v/mt*100).toFixed(2)}%;background:${x.c}"></i>`).join("");
  $("#mixSub").textContent=inr(Math.round(mt));
  const PLa=done.filter(o=>inMode(o,"Pair"));const PL={length:0};const pP=pairSum(PLa);
  $("#mixLeg").innerHTML=M.filter(x=>x.m!=="Pair"||x.n).map(x=>`<div><span><i class="lgd" style="background:${x.c}"></i>${x.m==="Pair"?"P2P ⇄ Direct":x.m} · ${mt?Math.round(x.v/mt*100):0}%</span><b>${inr(Math.round(x.v))}</b><span>${x.n} orders · ${inr(Math.round(x.p))}</span></div>`).join("")+(PL.length?`<div class="mixpair"><span>⇄ P2P ⇄ Direct pairs</span><b>${PL.length}</b><span>profit ${pP<0?"−":""}${inr(Math.abs(Math.round(pP)))} · counted once in total</span></div>`:"");
  // top counterparties
  const cp={};done.forEach(o=>{const n=(o.cp||"").trim();if(!n)return;const x=cp[n]=cp[n]||{n,v:0,c:0};x.v+=orderTotal(o);x.c++});
  const top=Object.values(cp).sort((a,b)=>b.v-a.v).slice(0,3);const tmax=top[0]?top[0].v:1;$("#topCpCard").hidden=!top.length;
  $("#topCp").innerHTML=top.map(x=>`<div class="tcp"><span class="av">${esc(x.n.slice(0,2).toUpperCase())}</span><b>${esc(x.n)}${cpBadge(x.n)}</b><span class="v">${inr(Math.round(x.v))}</span><span class="tb"><i style="width:${(x.v/tmax*100).toFixed(1)}%"></i></span><span class="o-meta">${x.c} orders</span></div>`).join("");
}
function renderHome(){
  const t=orders.filter(o=>isToday(o.time));
  $("#homeModes").innerHTML=["P2P","Direct","Cash"].map(m=>{const l=t.filter(o=>modeOf(o)===m);const st=stats(l);
    return `<div class="mcard"><div class="lbl">${m} today</div><div class="val">${inr(st.profit)}</div><div class="sm">${l.length} orders</div></div>`}).join("");
  const keep=$("#list").innerHTML, keepF=filter, keepM=modeF, cnt=$("#listCount").textContent;
  filter=homeTab;modeF="all";const kq=searchQ,kc=listCap;searchQ="";listCap=6;renderList();searchQ=kq;listCap=kc;
  const rows=[...$("#list").children].filter(n=>n.classList.contains("order")).slice(0,6);
  $("#recent").innerHTML="";rows.forEach(n=>$("#recent").appendChild(n));
  if(!rows.length)$("#recent").innerHTML=orders.length?'<div class="empty">Nothing here right now.</div>':'<div class="empty"><strong>No orders yet</strong>Tap “New order” to add your first order.</div>';
  renderHero();renderDash();
  filter=keepF;modeF=keepM;$("#list").innerHTML=keep;$("#listCount").textContent=cnt;const mb=$("#listMore");if(mb)mb.onclick=()=>{listCap+=200;renderList()};
}
function render(){try{renderJobs();renderNight();cpDatalist()}catch(e){}renderSummary();renderList();renderCoins();renderWallet();renderDirect();renderHome();renderAlerts();try{renderCharts()}catch(e){console.error(e)}if(window.formSplit)formSplit.refresh()}

// storage: one record list — orders (no kind), banks, expenses, transfers, settings
let recs=[], banks=[], exps=[], moves=[], parties=[], ppays=[], pdues=[], assetsApi=null, settings={id:"s_main",kind:"setting",stock:{}};let allBanks=[],accCache=null,audits=[],riskCache=null;
function splitRecs(){
  mvCache=null;cbCache=null;csCache=null;identMap=null;accCache=null;riskCache=null;
  orders=recs.filter(r=>!r.kind);
  allBanks=recs.filter(r=>r.kind==="bank").sort((a,b)=>(a.pinned?0:1)-(b.pinned?0:1)||(a.pos!=null?a.pos:a.time||0)-(b.pos!=null?b.pos:b.time||0));banks=allBanks.filter(b=>!b.archived);
  audits=recs.filter(r=>r.kind==="audit");exps=recs.filter(r=>r.kind==="expense");moves=recs.filter(r=>r.kind==="move");
  parties=recs.filter(r=>r.kind==="party").sort((a,b)=>(a.time||0)-(b.time||0));ppays=recs.filter(r=>r.kind==="ppay");pdues=recs.filter(r=>r.kind==="pdue");notes=recs.filter(r=>r.kind==="note");reminds=recs.filter(r=>r.kind==="remind");cpTagMap=new Map(recs.filter(r=>r.kind==="cptag").map(r=>[r.id,r]));arules=recs.filter(r=>r.kind==="arule").sort((a,b)=>a.time-b.time);coachRecs=recs.filter(r=>r.kind==="coach");
  settings=recs.find(r=>r.kind==="setting"&&r.id==="s_main")||{id:"s_main",kind:"setting",stock:{}};
}
function lsLoad(){try{recs=JSON.parse(localStorage.getItem(LS)||"[]")}catch(e){recs=[]}splitRecs()}
function lsSave(){try{localStorage.setItem(LS,JSON.stringify(recs))}catch(e){}}
let __track=null;const __snap=id=>{const r=recs.find(k=>k.id===id);return r?JSON.parse(JSON.stringify(r)):null};
async function putRec(x){
  if(!x.kind&&x.status==="Completed"&&!x.doneAt){const o=orders.find(k=>k.id===x.id);if(o&&o.status!=="Completed")x={...x,doneAt:Date.now()}}
  if(__track&&!__track.some(t=>t.id===x.id))__track.push({id:x.id,prev:__snap(x.id)});
  if(col){await col.doc(x.id).set(x)}else{const i=recs.findIndex(r=>r.id===x.id);if(i>=0)recs[i]=x;else recs.push(x);lsSave();splitRecs();render()}
}
async function patchRec(id,patch){
  if(patch&&patch.status==="Completed"){const o=orders.find(k=>k.id===id);if(o&&o.status!=="Completed"&&!o.doneAt)patch={...patch,doneAt:Date.now()}}
  if(__track&&!__track.some(t=>t.id===id))__track.push({id,prev:__snap(id)});
  if(col){await col.doc(id).update(patch)}else{const x=recs.find(r=>r.id===id);if(x)Object.assign(x,patch);lsSave();splitRecs();render()}
}
async function delRec(id){
  if(col){await col.doc(id).delete()}else{recs=recs.filter(r=>r.id!==id);lsSave();splitRecs();render()}
}
const saveOrder=putRec, patchOrder=patchRec, delOrder=delRec;
const newId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// tabs
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.setAttribute("aria-selected",x===b));
  ["home","orders","add","coins","wallet","direct","ai","ideas","settings","intake"].forEach(t=>$("#p-"+t).hidden=t!==b.dataset.tab);
  window.scrollTo({top:0});
});
const chipGroup=(sel,attr,fn)=>$(sel).onclick=e=>{const b=e.target.closest(".chip");if(!b)return;document.querySelectorAll(sel+" .chip").forEach(x=>x.setAttribute("aria-pressed",x===b));fn(b.dataset[attr])};
chipGroup("#coinPeriod","p",v=>{coinP=v;renderCoins()});
$("#coinModeSel").onchange=e=>{coinM=e.target.value;renderCoins()};
$("#modeSeg").onclick=e=>{const b=e.target.closest("button");if(!b)return;formMode=b.dataset.m;document.querySelectorAll("#modeSeg button").forEach(x=>x.classList.toggle("on",x===b));
  const pr=formMode==="Pair";$("#pairBox").hidden=!pr;$("#pairNote").hidden=!pr;if(pr){pbManual=false;pairUpd()}
  dirUpd();
  $("#platWrap").hidden=formMode!=="P2P";$("#payWrap").hidden=formMode==="Cash"||(pr&&pairMode==="Cash");
  $("#f-cp").placeholder=formMode==="P2P"?"Name or order number":"Person's name or phone"};
$("#filters").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;if(b.dataset.m){modeF=b.dataset.m;filter="all"}else{filter=b.dataset.f;modeF="all"}document.querySelectorAll("#filters .chip").forEach(x=>x.setAttribute("aria-pressed",x===b));renderList()};
["#list","#recent"].forEach(sel=>$(sel).addEventListener("change",async e=>{if(e.target.matches(".status")){const sel2=e.target;try{const ok=await changeStatus(sel2.dataset.id,sel2.value);if(ok)toast("Status updated");else render()}catch(err){toast(err.message||"Couldn't update. Try again.");render()}}}));
["#list","#recent"].forEach(sel=>$(sel).addEventListener("click",e=>{const row=e.target.closest(".order");if(!row||e.target.closest("select,button,[data-proof],[data-detail]"))return;const was=row.classList.contains("open");document.querySelectorAll(".order.open").forEach(x=>x.classList.remove("open"));if(!was)row.classList.add("open")}));
["#list","#recent"].forEach(sel=>$(sel).addEventListener("click",async e=>{
  const dt=e.target.closest("[data-detail]");if(dt){sheetOrderDetail(dt.dataset.detail);return}
  const pa=e.target.closest("[data-act=pair]");if(pa){sheets.pair(pa.parentElement.dataset.id);return}
  const ed=e.target.closest("[data-act=edit],[data-act=repeat]");if(ed){const o=orders.find(x=>x.id===ed.parentElement.dataset.id);if(o)fillForm(o,ed.dataset.act==="edit");return}
  const b=e.target.closest("[data-act=del]");if(!b)return;
  if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Sure? Tap again";setTimeout(()=>{b.dataset.confirm="";b.textContent="Delete"},3000);return}
  try{const did=b.parentElement.dataset.id;const od=orders.find(x=>x.id===did);await auditLog(did,"delete",{sum:od?shortO(od)+" · "+inr(Math.round(orderTotal(od))):""});await delOrder(did);for(const r of recs.filter(r=>r.order===did&&(r.kind==="pdue"||r.kind==="ppay")))await delRec(r.id);toast("Order deleted")}catch(err){toast("Couldn't delete. Try again.")}
}));

// form
$("#sideSeg").onclick=e=>{const b=e.target.closest("button");if(!b)return;side=b.dataset.v;document.querySelectorAll("#sideSeg button").forEach(x=>x.classList.toggle("on",x===b));$("#f-dir").textContent=side==="BUY"?"· paid from":"· received in";if(window.formSplit)formSplit.refresh();pairUpd();if(isDirect())dirUpd()};
const upd=()=>{$("#f-total").textContent=inr((+$("#f-qty").value||0)*(+$("#f-rate").value||0));if(window.formSplit)formSplit.refresh()};
function clientUpd(){const show=(formMode==="Direct"||formMode==="Pair")&&parties.length;$("#cpParty").hidden=!show;if(!show)return;
  const sup=formMode==="Direct"?$("#dir-party").value:"";const cur=$("#f-cp").value.trim().toLowerCase();
  $("#cpChips").innerHTML=parties.filter(p=>p.id!==sup).map(p=>`<button type="button" data-cl="${p.id}" class="${p.name.toLowerCase()===cur?"on":""}">${esc(p.name)}</button>`).join("")+'<button type="button" data-cl="__new" class="add">+ New</button>'}
function clientId(){const n=$("#f-cp").value.trim().toLowerCase();const p=n&&parties.find(x=>x.name.toLowerCase()===n);return p?p.id:""}
function isDirect(){return formMode==="Direct"}
function dirUpd(){try{clientUpd()}catch(e){}const d=isDirect();$("#dirBox").hidden=!d;$("#bankLbl").hidden=d;$("#splitWrap").hidden=d;$("#payWrap").hidden=d||formMode==="Cash"||(formMode==="Pair"&&pairMode==="Cash");if(!d)return;
  const sel=$("#dir-party"),cur=sel.value;sel.innerHTML='<option value="">No party (just record the trade)</option>'+parties.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")+'<option value="__new">+ New party…</option>';if([...sel.options].some(o=>o.value===cur))sel.value=cur;
  const pid=sel.value,p=parties.find(x=>x.id===pid);$("#dirDueL").hidden=!p;
  const showAcc=!!p&&side==="SELL"&&$("#dir-due").checked&&(p.accounts||[]).length;$("#dirAccL").hidden=!showAcc;
  if(showAcc){const ac=$("#dir-acc"),cv=ac.value;const lefts=accLefts(p,editingId);ac.innerHTML=`<option value="auto">Auto · earliest pay-by first</option>`+(p.accounts||[]).map(a=>`<option value="${a.id}">${esc(a.holder||a.bankName||a.upi)}${+a.target?` · left ${inr(Math.round(lefts[a.id]))}${a.due?" · by "+new Date(a.due).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):""}`:""}</option>`).join("")+`<option value="">Not decided yet</option>`;if(ac.dataset.u==="1"&&[...ac.options].some(o=>o.value===cv))ac.value=cv;else ac.value="auto"}
  $("#dir-due-t").textContent=side==="BUY"?"Add to amount I have to pay this party":"Buyer pays this party directly (counts as payment to them)";
  const q=+$("#f-qty").value||0,r=+$("#f-rate").value||0,amt=q*r;
  $("#dir-hint").innerHTML=p&&amt?(side==="BUY"?`${esc(p.name)} sends ${fmtQ(q)} ${esc($("#f-coin").value)} · you owe ${inr(Math.round(amt))}. Pay later from Direct.`:`${esc($("#f-cp").value.trim()||"Buyer")} pays ${inr(Math.round(amt))} to ${esc(p.name)} · their balance goes down.`)+(()=>{const l=partyOwed(p.id)-partyPaid(p.id);return` Now left to pay: <b>${inr(Math.round(l))}</b>.`})():"No bank entries are made for Direct deals."}
let pbManual=false,pbBasis="today";
function exAvg(exSide,coin,basis){const d0=new Date();d0.setHours(0,0,0,0);let L=orders.filter(o=>modeOf(o)==="P2P"&&o.side===exSide&&o.coin===coin&&o.status==="Completed"&&+o.rate>0).sort((a,b)=>b.time-a.time);
  if(basis==="today")L=L.filter(o=>o.time>=d0.getTime());else if(basis==="7")L=L.filter(o=>o.time>=Date.now()-7*DAY);else if(basis==="last10")L=L.slice(0,10);
  const q=L.reduce((t,o)=>t+(+o.qty),0);return{rate:q?L.reduce((t,o)=>t+o.qty*o.rate,0)/q:0,qty:q,n:L.length,from:L.length?L[L.length-1].time:0}}
const pairUpd=()=>{if(formMode!=="Pair")return;const coin=$("#f-coin").value,exSide=side==="SELL"?"BUY":"SELL";$("#pb-side").textContent=exSide==="BUY"?"buy":"sell";
  const A=exAvg(exSide,coin,pbBasis);const BL={today:"today",7:"in 7 days",last10:"in your last 10",all:"in total"}[pbBasis];
  $("#pb-info").textContent=A.n?`${A.n} exchange ${exSide==="BUY"?"buy":"sell"} order${A.n>1?"s":""} ${BL} · ${fmtQ(+A.qty.toFixed(2))} ${coin}`:`No exchange ${exSide==="BUY"?"buys":"sells"} ${BL}. Type the price or pick another period.`;
  if(!pbManual)$("#pb-rate").value=A.rate?+A.rate.toFixed(2):"";
  // stock moved outside vs exchange qty (same period)
  const d0=new Date();d0.setHours(0,0,0,0);const since=pbBasis==="today"?d0.getTime():pbBasis==="7"?Date.now()-7*DAY:pbBasis==="last10"?A.from:0;
  const moved=orders.filter(o=>o.via==="ex"&&o.coin===coin&&o.side===side&&o.status!=="Cancelled"&&o.time>=since&&o.id!==editingId).reduce((t,o)=>t+(+o.qty),0);const q=+$("#f-qty").value||0;
  $("#pb-stock").innerHTML=A.qty?`<span>Exchange ${exSide==="BUY"?"bought":"sold"} <b>${fmtQ(+A.qty.toFixed(2))}</b></span><span>Already ${side==="SELL"?"sold":"bought"} outside <b>${fmtQ(+moved.toFixed(2))}</b></span><span>Left <b class="${A.qty-moved-q<-1e-6?"neg":""}">${fmtQ(+(A.qty-moved-q).toFixed(2))}</b> after this</span>`:"";
  const r1=+$("#f-rate").value||0,r2=+$("#pb-rate").value||0;const pf=q&&r1&&r2?(side==="SELL"?(r1-r2):(r2-r1))*q:0;const e=$("#pb-profit");e.textContent=(pf<0?"−":pf>0?"+":"")+inr(Math.abs(Math.round(pf*100)/100));e.className=pf>0?"pos":pf<0?"neg":""};
$("#f-qty").oninput=()=>{upd();pairUpd();dirUpd()};$("#f-rate").oninput=()=>{upd();pairUpd();dirUpd()};
$("#dir-due").onchange=()=>dirUpd();$("#dir-acc").onchange=e=>{e.target.dataset.u="1";dirUpd()};
$("#dir-party").onchange=e=>{if(e.target.value==="__new"){e.target.value="";sheets.party();return}dirUpd()};$("#f-cp").addEventListener("input",()=>{if(isDirect())dirUpd();else clientUpd()});
$("#cpChips").onclick=e=>{const b=e.target.closest("[data-cl]");if(!b)return;if(b.dataset.cl==="__new"){sheets.party();return}const p=parties.find(x=>x.id===b.dataset.cl);if(!p)return;$("#f-cp").value=p.name;cpCheck&&cpCheck();dirUpd()};$("#pb-rate").oninput=()=>{pbManual=true;pairUpd()};$("#f-coin").addEventListener("change",pairUpd);
$("#pb-basis").onclick=e=>{const b=e.target.closest("[data-b]");if(!b)return;pbBasis=b.dataset.b;pbManual=false;document.querySelectorAll("#pb-basis button").forEach(x=>x.classList.toggle("on",x===b));pairUpd()};
let pairMode="Direct";$("#pb-mode").onclick=e=>{const b=e.target.closest("[data-pm]");if(!b)return;pairMode=b.dataset.pm;document.querySelectorAll("#pb-mode button").forEach(x=>x.classList.toggle("on",x===b));$("#payWrap").hidden=pairMode==="Cash";dirUpd()};
$("#form").onsubmit=async e=>{
  e.preventDefault();
  const qty=+$("#f-qty").value,rate=+$("#f-rate").value;
  if(!(qty>0&&rate>0)){toast("Enter quantity and rate");return}
  const old=editingId?orders.find(x=>x.id===editingId):null;
  if(formMode==="Pair"&&!(+$("#pb-rate").value>0)){toast("Enter the exchange average price");$("#pb-rate").focus();return}
  const o={...(old||{}),id:old?old.id:"o"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),side,coin:$("#f-coin").value,qty,rate,status:$("#f-status").value,mode:formMode==="Pair"?pairMode:formMode,pay:(formMode==="Cash"||(formMode==="Pair"&&pairMode==="Cash"))?"Cash":$("#f-pay").value,platform:formMode==="P2P"?$("#f-plat").value:"",cp:$("#f-cp").value.trim(),note:$("#f-note").value.trim(),time:old?old.time:Date.now()};
  {const ci=(formMode==="Direct"||formMode==="Pair")?clientId():"";if(ci)o.client=ci;else delete o.client}
  if(formMode==="Pair"){o.via="ex";o.exRate=+$("#pb-rate").value;o.exBasis=pbBasis}else if(o.via){delete o.via;delete o.exRate;delete o.exBasis}
  const sp=formSplit.get();
  if(sp.sum>qty*rate+0.5){toast("Bank amounts are more than the order total");return}
  o.splits=isDirect()?[]:sp.splits;
  if(isDirect()){o.party=$("#dir-party").value||"";o.dueLink=!!o.party&&$("#dir-due").checked;o.payAcc=o.side==="SELL"&&!$("#dirAccL").hidden?$("#dir-acc").value:""}else{delete o.party;delete o.dueLink}
  {const ex=$("#f-exid").value.trim(),ut=$("#f-utr").value.trim(),fe=+$("#f-fee").value||0,pv=$("#f-pv").value,td=side==="SELL"?(+$("#f-tds").value||0):0;
   if(ex)o.exId=ex;else delete o.exId;if(ut)o.utr=ut;else delete o.utr;if(fe>0)o.fee=fe;else delete o.fee;if(td>0)o.tds=td;else{delete o.tds;delete o.tdsQ}if(!(td>0)||(old&&+old.tds!==td)){delete o.tdsSrc;delete o.tdsQ}if(pv)o.pv=pv;else delete o.pv}
  const rule=old?statusRule(old.status,o.status):{ok:true};if(formProof&&!old){o.shots=[...(o.shots||[]),...formProof.hashes]}if(!rule.ok){toast(rule.why);return}
  const WR=[...(rule.confirm?[{k:"rev",msg:rule.confirm}]:[]),...orderWarn(o)];let ovrWhy="";
  if(WR.length){const c=await confirmRisk(WR,"Check this order","Save anyway");if(!c)return;ovrWhy=c.why;if(WR.some(w=>w.k!=="rev"))o.ovr=true}else delete o.ovr;
  if(old&&old.status==="Completed"&&o.status!=="Completed")o.doneAt=null;
  if(formProof&&!old){o.proofs=[...(o.proofs||[]),...formProof.ids];o.shots=[...(o.shots||[]),...formProof.hashes];if(formProof.time)o.payAt=formProof.time;if(o.pv!=="verified")o.pv="verified"}
  $("#saveBtn").disabled=true;
  try{await saveOrder(o);
    {const T=[["status","status"],["qty","qty"],["rate","rate"],["cp","name"],["exId","order ID"],["utr","UTR"],["fee","fee"],["tds","TDS"],["pv","payment check"],["platform","platform"],["mode","mode"]];
     if(!old)await auditLog(o,"create",{});
     else{const chg=T.filter(([k])=>String(old[k]??"")!==String(o[k]??"")).map(([k,n])=>`${n} ${old[k]??"–"} → ${o[k]??"–"}`);if(Math.round(allocated(old))!==Math.round(allocated(o)))chg.push(`banks ${Math.round(allocated(old))} → ${Math.round(allocated(o))}`);if(chg.length)await auditLog(o,"edit",{chg:chg.join(", ").slice(0,300)})}
     if(WR.some(w=>w.k!=="rev"))await auditLog(o,"override",{why:ovrWhy,warn:WR.filter(w=>w.k!=="rev").map(w=>w.msg)})}
    await syncDirectLink(o);const gap=isDirect()?0:r2(orderTotal(o)-allocated(o));toast(gap>=1&&o.status!=="Cancelled"?`${old?"Updated":"Saved"} · ${inr(Math.round(gap))} not yet in a bank`:old?"Order updated":(o.dueLink?(o.side==="BUY"?"Saved · added to dues of "+((parties.find(p=>p.id===o.party)||{}).name||"party"):"Saved · counted as payment to "+((parties.find(p=>p.id===o.party)||{}).name||"party")):"Order saved"));endEdit(true);$("#t-orders").click()}
  catch(err){toast("Couldn't save. Try again.")}
  $("#saveBtn").disabled=false;
};

// wallet
const CATS=["Food","Travel","Rent","Bills","Family","Shopping","Health","Other"];
const orderTotal=o=>(+o.qty||0)*(+o.rate||0);
const METHODS=["UPI","IMPS","NEFT","Cash"];
const methodOf=pay=>pay==="IMPS"?"IMPS":pay==="Bank Transfer"?"IMPS":pay==="Cash"?"Cash":"UPI";
// UPI limit is a rolling 24 hours (each payment frees up 24h after it was sent); IMPS, NEFT and total reset at midnight
const DAY=864e5;
function limitUse(){const use={},now=Date.now();movements().forEach(x=>{if(!(x.amt<0&&x.method&&x.kind!=="EXP"))return;const u=use[x.bank]=use[x.bank]||{};const a=-x.amt;
  if(x.method==="UPI"&&pref("upi")!=="midnight"){if(now-x.time<DAY&&x.time<=now){u.UPI=(u.UPI||0)+a;(u.upiLog=u.upiLog||[]).push({t:x.time,a})}}
  else if(isToday(x.time))u[x.method]=(u[x.method]||0)+a;
  if(x.method!=="Cash"&&isToday(x.time))u.ALL=(u.ALL||0)+a});return use}
function upiNextFree(b,use){const log=((use[b.id]||{}).upiLog||[]).sort((p,q)=>p.t-q.t);if(!log.length)return"";const f=log[0];
  return ` · +${inr(f.a)} at ${new Date(f.t+DAY).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}`}
function limitLeft(b,m,use){if(m==="Cash")return Infinity;use=use||limitUse();const L=b.limits||{},u=use[b.id]||{};
  const one=+L[m]?L[m]-(u[m]||0):Infinity, all=+L.ALL?L.ALL-(u.ALL||0):Infinity;return Math.min(one,all)}
const allocated=o=>(o.splits||[]).reduce((t,x)=>t+(+x.amt||0),0);
const bankName=id=>(allBanks.find(b=>b.id===id)||{}).name||"Deleted bank";
let mvCache=null;
function movements(){if(mvCache)return mvCache;return mvCache=movementsRaw()}
function movementsRaw(){
  const m=[];
  orders.forEach(o=>{if(o.status==="Cancelled"||noBank(o))return;(o.splits||[]).forEach(x=>m.push({bank:x.bank,amt:x.lite?0:(o.side==="SELL"?1:-1)*(+x.amt||0),cp:o.cp||"",time:o.time,label:`${o.side} ${fmtQ(o.qty)} ${o.coin}${o.cp?" · "+o.cp:""} · ${x.lite?"UPI Lite":x.method||methodOf(o.pay)}`,kind:o.side,method:x.method||methodOf(o.pay),pend:o.status==="Pending"||o.status==="Appeal"}))});
  exps.forEach(x=>{if(!x.bank)return;const c=x.cat==="Bank charges";m.push({bank:x.bank,amt:-(+x.amt||0),time:x.time,label:(c?"Bank charge · "+(x.chg||"Other"):"Expense · "+x.cat)+(x.note?" · "+x.note:""),kind:c?"CHG":"EXP",id:x.id})});
  ppays.forEach(x=>{const pn=(parties.find(p=>p.id===x.party)||{}).name||"party";(x.splits||[]).forEach(sp=>m.push({bank:sp.bank,amt:-(+sp.amt||0),time:x.time,label:"Paid "+pn+" · "+(sp.method||"IMPS"),kind:"PP",method:sp.method||"IMPS"}))});
  recs.forEach(x=>{if(x.kind==="litemove"&&x.bank&&+x.amt>0&&x.dir!=="spend")m.push(x.dir==="out"?{bank:x.bank,amt:+x.amt,time:x.time,label:"Withdrawn from UPI Lite",kind:"TR"}:{bank:x.bank,amt:-(+x.amt),time:x.time,label:"Loaded to UPI Lite",kind:"TR",method:"UPI"})});
  moves.forEach(x=>{m.push({bank:x.from,amt:-((+x.amt||0)+(+x.cost||0)),time:x.time,label:"Transfer to "+bankName(x.to)+" · "+(x.method||"IMPS")+(+x.cost?" · charges ₹"+x.cost:""),kind:"TR",method:x.method||"IMPS"});m.push({bank:x.to,amt:+x.amt||0,time:x.time,label:"Transfer from "+bankName(x.from),kind:"TR"})});
  return m;
}
function balances(){const mv=movements();const out={};allBanks.forEach(b=>out[b.id]=+b.opening||0);mv.forEach(x=>{if(x.bank in out)out[x.bank]+=x.amt});return{bal:out,mv}}
