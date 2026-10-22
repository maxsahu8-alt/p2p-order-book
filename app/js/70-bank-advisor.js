function flowChart(el,{labels,vin,vout,full,c1,c2,every}){
  const W=360,H=170,L=40,R=6,T=10,B=24,n=labels.length;const mx=Math.max(1,...vin),mn=Math.min(-1,...vout);
  if(!vin.some(v=>v)&&!vout.some(v=>v)){el.innerHTML='<div class="empty-ch">No money moved in this period yet</div>';return}
  const ticks=niceTicks(mn,mx,4),y0=ticks[0],y1=ticks[ticks.length-1],sy=v=>T+(H-T-B)*(1-(v-y0)/(y1-y0));const step=(W-L-R)/n,bw=Math.max(3,Math.min(18,step*0.55));
  let g=ticks.map(t=>`<line x1="${L}" x2="${W-R}" y1="${sy(t)}" y2="${sy(t)}" stroke="var(--grid)" ${t===0?'stroke-width="1.2"':'stroke-dasharray="2 3"'}/><text x="${L-6}" y="${sy(t)+3}" text-anchor="end">${short(t)}</text>`).join("");
  let bars="",hits="",hl="";
  labels.forEach((lab,i)=>{const cx=L+step*i+step/2;
    if(vin[i])bars+=roundBar(cx-bw/2,sy(vin[i]),bw,Math.max(1,sy(0)-sy(vin[i])-1),"top",c1);
    if(vout[i])bars+=roundBar(cx-bw/2,sy(0)+1,bw,Math.max(1,sy(vout[i])-sy(0)-1),"bottom",c2);
    hl+=`<rect class="hl" data-i="${i}" x="${L+step*i+1}" y="${T}" width="${step-2}" height="${H-T-B}" rx="4" fill="var(--soft)" style="opacity:0"/>`;
    hits+=`<rect class="hit" x="${L+step*i}" y="0" width="${step}" height="${H}" fill="transparent"/>`;
    if(i%every===0||i===n-1)bars+=`<text x="${cx}" y="${H-8}" text-anchor="middle">${esc(lab)}</text>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cash flow chart">${hl}${g}${bars}${hits}</svg>`;
  hitWire(el,el.querySelector("svg"),n,L,step,i=>`<b>${esc(full[i])}</b><div class="r"><span><i style="background:${c1}"></i>In</span><span>${inr(vin[i])}</span></div><div class="r"><span><i style="background:${c2}"></i>Out</span><span>${inr(-vout[i])}</span></div><div class="r"><span>Net</span><span>${inr(vin[i]+vout[i])}</span></div>`);
}
function limBar(b,use){const L=b.limits||{};const ms=["UPI","IMPS","NEFT","ALL"].filter(m=>+L[m]);if(!ms.length)return"";
  return `<span class="lims">${ms.map(m=>{const u=((use[b.id]||{})[m])||0,p=Math.min(100,u/L[m]*100);return `<span class="lim"><span class="lt"><b>${m==="ALL"?"Total":m}</b> ${inr(Math.max(0,L[m]-u))} left${m==="UPI"?upiNextFree(b,use):""}</span><span class="lb"><i style="width:${p}%;${p>=90?"background:var(--sell)":p>=70?"background:var(--warn)":""}"></i></span></span>`}).join("")}</span>`}
// ---- bank advisor: limits, receive-risk estimate, 7-day line, health
// thresholds start at 30 / 60 and tune themselves: every time you mark a bank as frozen the app keeps the risk points it had just before, and later warns earlier than that
function riskThr(){const f=allBanks.filter(b=>b.frozenPts>=15).map(b=>b.frozenPts);if(!f.length)return{md:30,hi:60,n:0};const hi=Math.max(25,Math.min(60,Math.round(Math.min(...f)*0.85)));return{md:Math.round(hi*0.5),hi,n:f.length}}
function bankInsight(b,mv,bal,use,at){const now=Date.now(),T=at||now,mine=mv.filter(x=>x.bank===b.id);
  const inn=mine.filter(x=>x.amt>0&&x.kind==="SELL"&&x.time<=T&&T-x.time<DAY).sort((p,q)=>p.time-q.time);
  const ppl=new Set(inn.map((x,i)=>(x.cp||"").trim().toLowerCase()||("#"+i))).size,flow=inn.reduce((t,x)=>t+x.amt,0);
  let burst=0;for(let i=0;i<inn.length;i++){let n=0;for(let j=i;j<inn.length&&inn[j].time-inn[i].time<=36e5;j++)n++;burst=Math.max(burst,n)}
  const cap=+b.rcvCap||0,capLeft=cap?Math.max(0,cap-flow):Infinity,cpct=cap?flow/cap*100:0;
  let pts=Math.min(45,ppl*9)+Math.min(25,flow/200000*25)+(burst>=5?20:burst>=3?10:0)+(cap?Math.min(15,cpct/100*10):0);const why=[];if(cap&&cpct>=80)why.push("receive cap "+Math.round(cpct)+"% used");
  if(ppl>=3)why.push(ppl+" different people paid in the last 24 hours");if(flow>=50000)why.push(inr(Math.round(flow))+" received in the last 24 hours");if(burst>=3)why.push(burst+" payments within one hour");
  if(b.status==="frozen"&&!at)pts=100;const TH=riskThr(),level=pts>=TH.hi?"High":pts>=TH.md?"Medium":"Low";
  const L=b.limits||{},u=(use[b.id]||{});let lp=0,lm="";["UPI","IMPS","NEFT","ALL"].forEach(m=>{if(+L[m]){const q=(u[m]||0)/L[m]*100;if(q>lp){lp=q;lm=m}}});
  const st=new Date();st.setHours(0,0,0,0);const line=[];for(let i=6;i>=0;i--){const end=i===0?now:st.getTime()-(i-1)*DAY;let v=bal;mine.forEach(x=>{if(x.time>end)v-=x.amt});line.push(v)}
  const last=mine.reduce((m,x)=>Math.max(m,x.time||0,0),0);const chk=recs.filter(r=>r.kind==="bankrec"&&r.bank===b.id).sort((a,c)=>c.time-a.time)[0];
  return{pts:Math.round(pts),level,why,ppl,flow,lp,lm,line,last,chk,n:mine.length,cap,capLeft,cpct}}
function bankSpark(v){const w=64,h=20,mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;const pts=v.map((y,i)=>(i/(v.length-1)*(w-4)+2).toFixed(1)+","+(h-3-(y-mn)/r*(h-6)).toFixed(1)).join(" ");const up=v[v.length-1]>=v[0];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-label="7 day balance"><polyline points="${pts}" fill="none" stroke="${up?"var(--buy)":"var(--sell)"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function bankChips(b,I){const c=[];const rc=I.level==="High"?"r":I.level==="Medium"?"a":"g";
  if(b.type!=="Cash"&&I.n)c.push(`<span class="bchip ${rc}" data-why="${esc("Freeze risk "+I.level+" ("+I.pts+" points): "+(I.why.join("; ")||"few payments in, looks calm"))}"><i></i>Freeze risk ${I.level}</span>`);
  if(I.cap&&I.cpct>=60)c.push(`<span class="bchip ${I.cpct>=100?"r":I.cpct>=80?"a":""}">Receive cap ${Math.round(I.cpct)}% used</span>`);
  if(I.lp>=90)c.push(`<span class="bchip r">${I.lm==="ALL"?"Total":I.lm} limit almost full</span>`);else if(I.lp>=70)c.push(`<span class="bchip a">${I.lm==="ALL"?"Total":I.lm} limit ${Math.round(I.lp)}% used</span>`);
  if(b.type!=="Cash"&&I.n){const d=I.chk?Math.floor((Date.now()-I.chk.time)/DAY):null;c.push(`<span class="bchip ${d==null||d>=7?"a":""}" data-rec="${esc(b.id)}" style="cursor:pointer">${d==null?"Never checked":d===0?"Checked today":"Checked "+d+"d ago"}</span>`)}
  return c.join("")}
function renderBankAdvisor(mv,bal,use){const el=$("#bankAdvisor");if(!el)return;
  const live=banks.filter(b=>b.type!=="Cash"&&b.status!=="frozen"&&b.status!=="paused");if(!live.length){el.innerHTML="";return}
  const I={};live.forEach(b=>I[b.id]=bankInsight(b,mv,bal[b.id]||0,use));
  const pay=live.map(b=>({b,v:Math.min(bal[b.id]||0,limitLeft(b,"UPI",use))})).filter(x=>x.v>0).sort((a,c)=>c.v-a.v)[0];
  const rec=[...live].sort((a,c)=>I[a.id].pts-I[c.id].pts||I[a.id].flow-I[c.id].flow)[0];
  const warn=banks.filter(b=>b.status==="frozen").map(b=>`<span class="bchip r">${esc(b.name)} frozen</span>`).concat(live.filter(b=>I[b.id].level==="High").map(b=>`<span class="bchip r">${esc(b.name)}: freeze risk high</span>`),live.filter(b=>I[b.id].lp>=90).map(b=>`<span class="bchip r">${esc(b.name)}: limit almost full</span>`));
  const rows=[];if(pay)rows.push(`<div class="bt"><span class="bl">Pay next from</span><b>${esc(pay.b.name)}</b><span class="bm">can send ${inr(Math.round(pay.v))} now</span></div>`);
  if(rec&&live.length>1)rows.push(`<div class="bt"><span class="bl">Receive next in</span><b>${esc(rec.name)}</b><span class="bm">risk ${I[rec.id].level.toLowerCase()} · ${inr(Math.round(I[rec.id].flow))} in 24h${I[rec.id].cap?" · "+inr(Math.round(I[rec.id].capLeft))+" cap left":""}</span></div>`);
  if(!rows.length&&!warn.length){el.innerHTML="";return}
  el.innerHTML=`<div class="badv"><div class="bts${rows.length===1?" one":""}">${rows.join("")}</div>${warn.length?`<div class="bw">${warn.join("")}</div>`:""}<details class="bnote"><summary>How freeze risk is estimated</summary><p>Freeze risk is the app's own estimate from how many people paid, how much came in and how fast. It is not a bank rule.${riskThr().n?" Levels are tuned from "+riskThr().n+" frozen bank"+(riskThr().n>1?"s":"")+" you recorded.":" Mark a bank as frozen when it happens and the app learns your own limit."} “Pay next from” already considers balance and the UPI limit.</p></details></div>`}
// bank badge: brand-coloured tile picked automatically from the bank's name, UPI handle or IFSC (no internet, no image files)
const BANK_BRAND=[[/\bsbi\b|state bank|sbin|@sbi|@oksbi|ybl.*sbi/i,"#2d7fd3","#fff","SBI"],[/hdfc|@hdfcbank|@okhdfc|hdfc0/i,"#17458f","#fff","HDFC","#ed232a"],[/icici|@icici|@ibl|eazypay|icic0/i,"#f47a20","#fff","ICICI","#b02a30"],[/axis|@axisbank|@okaxis|@axl|utib/i,"#97144d","#fff","AXIS"],[/kotak|@kotak|kkbk/i,"#ed1c24","#fff","KOTAK","#003874"],[/yes\s*bank|@yesbank|@ybl|yesb/i,"#00518f","#fff","YES"],[/punjab national|\bpnb\b|@pnb|punb/i,"#a6192e","#fff","PNB","#fdb913"],[/baroda|\bbob\b|@barodampay|barb/i,"#f15a22","#fff","BOB"],[/canara|@cnrb|cnrb/i,"#00a0e3","#fff","CNRB","#fdb913"],[/union bank|@unionbank|ubin/i,"#d51f2b","#fff","UBI","#1a4a9b"],[/idfc|@idfcbank|idfb/i,"#9c1d26","#fff","IDFC"],[/indusind|@indus|indb/i,"#8c1c34","#fff","IND"],[/federal|@fbl|fdrl/i,"#f8b712","#14304d","FED"],[/paytm|@paytm|pytm/i,"#00b9f1","#002e6e","PAYTM"],[/airtel/i,"#e40000","#fff","AIRTEL"],[/jio/i,"#0a2885","#fff","JIO"],[/india post|ippb/i,"#e1251b","#fff","IPPB"],[/central bank|cbin/i,"#e31e24","#fff","CBI"],[/bank of india|boi|bkid/i,"#f58220","#0a3a7a","BOI"],[/indian bank|idib/i,"#14418a","#fff","IND"],[/uco/i,"#0f4c93","#fff","UCO"],[/idbi/i,"#00836c","#fff","IDBI","#f58220"],[/rbl|ratn/i,"#21409a","#fff","RBL"],[/\bau\b|aubl|small finance/i,"#6a2c91","#fff","AU"],[/bandhan|bdbl/i,"#e4202b","#fff","BAND"],[/slice/i,"#6b4bff","#fff","SLICE"],[/cash/i,"#2f9e5b","#fff","₹"]];
function bankBadge(b){const key=[b.name,b.bankName,b.upi,b.ifsc].filter(Boolean).join(" ");const h=BANK_BRAND.find(r=>r[0].test(key));
  if(!h){const t=(b.name||"?").replace(/[^A-Za-z0-9]/g,"").slice(0,2).toUpperCase()||"₹";return `<span class="bico">${esc(t)}</span>`}
  const lab=h[3],fs=lab.length<=2?".95rem":lab.length===3?".8rem":lab.length===4?".66rem":".56rem";
  return `<span class="bico bbrand" style="background:${h[1]};color:${h[2]};font-size:${fs}${h[4]?`;box-shadow:inset 0 -4px 0 ${h[4]}`:""}">${esc(lab)}</span>`}
function renderWallet(){
  const {bal,mv}=balances();
  const total=banks.reduce((t,b)=>t+bal[b.id],0);
  $("#wTotal").textContent=(total<0?"−":"")+inr(Math.abs(Math.round(total)));
  try{renderWalletPlus(bal,mv,total)}catch(e){console.error(e)}
  $("#walletDate").textContent=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  $("#bankCount").textContent=banks.length?banks.length+" accounts":"";
  const use=limitUse();
  try{renderBankAdvisor(mv,bal,use)}catch(e){console.error(e)}
  const hidN=banks.filter(b=>b.hidden).length;let shown=banks.filter(b=>!b.hidden||window.__showHid);
  {const F={all:"All",active:"Active",issue:"Frozen / paused",cash:"Cash"},isAct=b=>b.type!=="Cash"&&!b.status,isIss=b=>b.status==="frozen"||b.status==="paused",isC=b=>b.type==="Cash";
    const cnt={all:shown.length,active:shown.filter(isAct).length,issue:shown.filter(isIss).length,cash:shown.filter(isC).length};const cur=window.__bkF&&cnt[window.__bkF]?window.__bkF:"all";window.__bkF=cur;
    $("#bankFilter").innerHTML=shown.length>=3?Object.keys(F).filter(k=>k==="all"||cnt[k]).map(k=>`<button class="chip" type="button" aria-pressed="${cur===k}" data-bf="${k}">${F[k]} ${cnt[k]}</button>`).join("")+'<span class="note" style="margin:0 0 0 auto;align-self:center;font-size:.66rem">Hold a bank for quick actions</span>':"";
    if(cur==="active")shown=shown.filter(isAct);else if(cur==="issue")shown=shown.filter(isIss);else if(cur==="cash")shown=shown.filter(isC)}
  setTimeout(()=>{document.querySelectorAll("#bankList [data-why]").forEach(c=>c.onclick=e=>{e.stopPropagation();toast(c.dataset.why)});document.querySelectorAll("#bankList [data-rec]").forEach(c=>c.onclick=e=>{e.stopPropagation();sheets.bankrec(c.dataset.rec)})},0);
  $("#bankHidTog").innerHTML=hidN?`<button type="button" class="link" id="bkHid" style="padding:10px 4px">${window.__showHid?"Hide":"Show"} ${hidN} hidden bank${hidN>1?"s":""} ›</button>`:"";const bh=$("#bkHid");if(bh)bh.onclick=()=>{window.__showHid=!window.__showHid;renderWallet()};
  $("#bankList").innerHTML=shown.length?shown.map(b=>{const t=mv.filter(x=>x.bank===b.id&&isToday(x.time));const i=t.filter(x=>x.amt>0).reduce((s,x)=>s+x.amt,0),o=-t.filter(x=>x.amt<0).reduce((s,x)=>s+x.amt,0);
    return `<button class="bank" type="button" data-sheet="ledger:${b.id}">${bankBadge(b)}<span class="bname">${esc(b.name)}${b.type==="Cash"?(/^cash$/i.test((b.name||"").trim())?"":' <span class="mtag">Cash</span>'):bankTag(b,mv)}${b.lite&&b.lite.on?` <span class="mtag litetag" title="UPI Lite balance">Lite ${inr(b.lite.bal||0)}</span>`:""}</span><span class="bbal ${bal[b.id]<0?"neg":""}">${inr(bal[b.id])}</span>${limBar(b,use)}<span class="bsub">${b.accNo||b.upi?`<span class="bacc">${b.accNo?"A/c ••"+esc(b.accNo.slice(-4)):""}${b.accNo&&b.upi?" · ":""}${b.upi?esc(b.upi):""}</span>`:""}<span class="btod">Today <span class="in">+${inr(i)}</span> · <span class="out">−${inr(o)}</span>${(()=>{const q=t.length;const pe=mv.filter(x=>x.bank===b.id&&x.pend).length;return (q?" · "+q+" txn":"")+(pe?" · "+pe+" pending":"")})()}</span></span>${(()=>{try{if(b.type==="Cash")return"";const I=bankInsight(b,mv,bal[b.id]||0,use);return `<span class="binf">${bankSpark(I.line)}${bankChips(b,I)}</span>`}catch(e){return""}})()}</button>`}).join("")
    :'<div class="empty"><strong>No banks yet</strong>Tap “Add bank” to add each account with its current balance. Add one with type Cash for cash in hand.</div>';
  const st=stockLeft();
  $("#stockCards").innerHTML=Object.entries(st).filter(([c,q])=>c==="USDT"||Math.abs(q)>1e-9).map(([c,q])=>`<div class="mcard${q<0?" shortc":""}" data-sheet="coinledger:${esc(c)}" style="cursor:pointer"><div class="lbl">${esc(c)} left</div><div class="val" style="${q<0?"color:var(--sell)":""}">${fmtQ(+q.toFixed(6))}</div><div class="sm">${q<0?`<b style="color:var(--sell)">Short by ${fmtQ(+Math.abs(q).toFixed(4))}</b> · <button type="button" class="link" data-sheet="stock" style="color:var(--primary)">Fix opening stock</button>`:(Math.abs(q)<1e-9&&!((settings.stock||{})[c])?`<button type="button" class="link" data-sheet="stock" style="color:var(--primary)">Set opening stock ›</button>`:"Wallet history ›")}</div></div>`).join("");
  const un=orders.filter(o=>o.status!=="Cancelled"&&!noBank(o)&&Math.abs(orderTotal(o)-allocated(o))>0.5).sort((a,b)=>b.time-a.time);
  $("#unCount").textContent=un.length?inr(un.reduce((t,o)=>t+orderTotal(o)-allocated(o),0))+" · "+un.length:"";
  const unN=window.__unAll?40:5;
  $("#unList").innerHTML=un.length?un.slice(0,unN).map(o=>`<div class="un"><div><b class="side ${o.side}">${o.side}</b> <b>${fmtQ(o.qty)} ${esc(o.coin)}</b> · ${inr(orderTotal(o))}</div><button class="mini" type="button" data-sheet="assign:${o.id}">Assign</button><div class="o-meta">${new Date(o.time).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · left ${inr(orderTotal(o)-allocated(o))}${allocated(o)?" · part paid":""}</div></div>`).join("")+(un.length>unN?`<button type="button" class="link" style="padding:12px;color:var(--fg);width:100%" onclick="window.__unAll=true;renderWallet()">Show all ${un.length} ›</button>`:"")
    :'<div class="empty" style="padding:18px">All order payments are assigned to banks ✓</div>';
  const n=new Date();const mon=exps.filter(x=>{const d=new Date(x.time);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()});
  $("#expMonth").textContent="This month "+inr(mon.reduce((t,x)=>t+(+x.amt||0),0));
  const cats=CATS.filter(c=>mon.some(x=>x.cat===c));
  $("#expCats").innerHTML=`<button class="chip" aria-pressed="${expCat==="all"}" data-cat="all">All</button>`+cats.map(c=>`<button class="chip" aria-pressed="${expCat===c}" data-cat="${c}">${c} ${inr(mon.filter(x=>x.cat===c).reduce((t,x)=>t+(+x.amt||0),0))}</button>`).join("");
  const el=[...exps].filter(x=>expCat==="all"||x.cat===expCat).sort((a,b)=>b.time-a.time).slice(0,30);
  $("#expList").innerHTML=el.length?el.map(x=>`<div class="exp" data-sheet="expense:${x.id}" style="cursor:pointer"><span><b>${esc(x.cat)}</b>${x.note?" · "+esc(x.note):""}${(x.proofs||[]).length?` <span class="mtag" data-proof="${esc(x.proofs[0])}" style="cursor:pointer">Proof</span>`:""}</span><span class="amt">−${inr(x.amt)}</span><div class="o-meta"><span>${new Date(x.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span><span>${x.bank?esc(bankName(x.bank)):"Not from a bank"}</span></div></div>`).join("")
    :'<div class="empty" style="padding:18px">No personal expenses yet. Tap “Expense” to add one.</div>';
  // home strip
  const usdt=st.USDT||0;
  $("#homeWallet").innerHTML=`<div class="mcard" data-go="wallet" style="cursor:pointer"><div class="lbl">Money left</div><div class="val">${inr(total)}</div><div class="sm">${banks.length} banks</div></div><div class="mcard" data-go="wallet" style="cursor:pointer"><div class="lbl">USDT left</div><div class="val">${fmtQ(+usdt.toFixed(4))}</div><div class="sm">after orders</div></div><div class="mcard" data-go="wallet" style="cursor:pointer"><div class="lbl">To assign</div><div class="val">${un.length}</div><div class="sm">payments</div></div>`;
}
$("#expCats").onclick=e=>{const b=e.target.closest("[data-cat]");if(!b)return;expCat=b.dataset.cat;renderWallet()};

