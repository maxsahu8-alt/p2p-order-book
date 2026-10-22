// ---------- charts: small hand-built SVG, one axis, tap/hover tooltips ----------
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const short=n=>{const a=Math.abs(n);return(n<0?"−":"")+(a>=1e7?(a/1e7).toFixed(1).replace(/\.0$/,"")+"Cr":a>=1e5?(a/1e5).toFixed(1).replace(/\.0$/,"")+"L":a>=1e3?(a/1e3).toFixed(1).replace(/\.0$/,"")+"k":(+a.toFixed(2))+"")};
function niceTicks(min,max,n=4){if(min===max){max=min+1}const span=max-min,step0=span/n,mag=Math.pow(10,Math.floor(Math.log10(step0))),f=step0/mag,step=(f<=1?1:f<=2?2:f<=5?5:10)*mag;
  const lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step;const t=[];for(let v=lo;v<=hi+step/2;v+=step)t.push(+v.toFixed(6));return t}
function showTip(html,x,y){const t=$("#tip");t.innerHTML=html;t.hidden=false;const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+"px";t.style.top=Math.max(8,y-h-14)+"px"}
const hideTip=()=>{$("#tip").hidden=true};
document.addEventListener("scroll",hideTip,true);document.addEventListener("touchstart",e=>{if(!e.target.closest(".chart"))hideTip()},{passive:true});
function hitWire(el,svg,n,x0,step,tipFor){
  svg.querySelectorAll(".hit").forEach((h,i)=>{const on=e=>{const r=h.getBoundingClientRect();svg.querySelectorAll(".hl").forEach(k=>k.style.opacity=k.dataset.i==i?1:0);showTip(tipFor(i),r.left+r.width/2,r.top+8)};
    h.addEventListener("pointerenter",on);h.addEventListener("pointerdown",on);h.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"){hideTip();svg.querySelectorAll(".hl").forEach(k=>k.style.opacity=0)}})});
}
// vertical bars, one or two stacked series; values may be negative (single series only)
function barChart(el,{labels,series,fmt=short,tipTitle=i=>labels[i],every=1}){
  const W=360,H=170,L=36,R=6,T=10,B=24,n=labels.length;if(!n){el.innerHTML='<div class="empty-ch">No data yet</div>';return}
  const tot=labels.map((_,i)=>series.reduce((t,sr)=>t+(sr.values[i]||0),0));
  const mn=Math.min(0,...series.length===1?series[0].values:tot),mx=Math.max(0,...tot);
  if(mn===0&&mx===0){el.innerHTML='<div class="empty-ch">No data in this period yet</div>';return}
  const ticks=niceTicks(mn,mx),y0=ticks[0],y1=ticks[ticks.length-1],sy=v=>T+(H-T-B)*(1-(v-y0)/(y1-y0));
  const step=(W-L-R)/n,bw=Math.max(3,Math.min(26,step*0.62));
  let g=ticks.map(t=>`<line x1="${L}" x2="${W-R}" y1="${sy(t)}" y2="${sy(t)}" stroke="var(--grid)" stroke-width="${t===0?1.2:1}" ${t===0?'':'stroke-dasharray="2 3"'}/><text x="${L-6}" y="${sy(t)+3}" text-anchor="end">${fmt(t)}</text>`).join("");
  let bars="",hits="",hl="";
  labels.forEach((lab,i)=>{const cx=L+step*i+step/2;let acc=0;
    series.forEach((sr,k)=>{const v=sr.values[i]||0;if(!v)return;const a=acc,b=acc+v;acc=b;const ya=sy(Math.max(a,b)),yb=sy(Math.min(a,b));const h=Math.max(1,yb-ya-(series.length>1&&k<series.length-1?0:0));
      const top=k===series.length-1||series.slice(k+1).every(x=>!(x.values[i]))?(v>=0?"top":"bottom"):"none";
      bars+=roundBar(cx-bw/2,ya,bw,h,top,sr.color)+(series.length>1&&k<series.length-1?`<rect x="${cx-bw/2}" y="${ya-1}" width="${bw}" height="2" fill="var(--surface)"/>`:"")});
    hl+=`<rect class="hl" data-i="${i}" x="${L+step*i+1}" y="${T}" width="${step-2}" height="${H-T-B}" rx="4" fill="var(--soft)" style="opacity:0"/>`;
    hits+=`<rect class="hit" x="${L+step*i}" y="0" width="${step}" height="${H}" fill="transparent"/>`;
    if(i%every===0||i===n-1)bars+=`<text x="${cx}" y="${H-8}" text-anchor="middle">${esc(lab)}</text>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${hl}${g}${bars}${hits}</svg>`;
  hitWire(el,el.querySelector("svg"),n,L,step,i=>`<b>${esc(tipTitle(i))}</b>${series.map(sr=>`<div class="r"><span>${series.length>1?`<i style="background:${sr.color}"></i>`:""}${esc(sr.name)}</span><span>${sr.tipFmt?sr.tipFmt(sr.values[i]||0):fmt(sr.values[i]||0)}</span></div>`).join("")}`);
}
function roundBar(x,y,w,h,end,color){const r=Math.min(4,w/2,h);if(end==="none"||h<2)return`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
  if(end==="top")return`<path d="M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z" fill="${color}"/>`;
  return`<path d="M${x},${y}V${y+h-r}Q${x},${y+h} ${x+r},${y+h}H${x+w-r}Q${x+w},${y+h} ${x+w},${y+h-r}V${y}Z" fill="${color}"/>`}
function lineChart(el,{labels,series,fmt=v=>"₹"+(+v).toFixed(2),every=1}){
  const W=360,H=170,L=40,R=8,T=10,B=24,n=labels.length;const all=series.flatMap(sr=>sr.values.filter(v=>v!=null));
  if(!all.length){el.innerHTML='<div class="empty-ch">Not enough completed buys and sells yet</div>';return}
  let mn=Math.min(...all),mx=Math.max(...all);const pad=(mx-mn)*0.15||0.5;const ticks=niceTicks(mn-pad,mx+pad);const y0=ticks[0],y1=ticks[ticks.length-1];
  const sy=v=>T+(H-T-B)*(1-(v-y0)/(y1-y0)),step=(W-L-R)/n,sx=i=>L+step*i+step/2;
  let g=ticks.map(t=>`<line x1="${L}" x2="${W-R}" y1="${sy(t)}" y2="${sy(t)}" stroke="var(--grid)" stroke-dasharray="2 3"/><text x="${L-6}" y="${sy(t)+3}" text-anchor="end">${(+t).toFixed(t%1?1:0)}</text>`).join("");
  let lines="",xl="",hits="",hl="";
  series.forEach(sr=>{let d="",pen=false;sr.values.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?"L":"M")+sx(i)+","+sy(v);pen=true});
    lines+=`<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    sr.values.forEach((v,i)=>{if(v!=null)lines+=`<circle cx="${sx(i)}" cy="${sy(v)}" r="${i===n-1?4:2.5}" fill="${sr.color}" stroke="var(--surface)" stroke-width="1.5"/>`})});
  labels.forEach((lab,i)=>{if(i%every===0||i===n-1)xl+=`<text x="${sx(i)}" y="${H-8}" text-anchor="middle">${esc(lab)}</text>`;
    hl+=`<line class="hl" data-i="${i}" x1="${sx(i)}" x2="${sx(i)}" y1="${T}" y2="${H-B}" stroke="var(--axis)" stroke-width="1" style="opacity:0"/>`;
    hits+=`<rect class="hit" x="${L+step*i}" y="0" width="${step}" height="${H}" fill="transparent"/>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">${g}${hl}${lines}${xl}${hits}</svg>`;
  hitWire(el,el.querySelector("svg"),n,L,step,i=>`<b>${esc(labels[i])}</b>${series.map(sr=>`<div class="r"><span><i style="background:${sr.color}"></i>${esc(sr.name)}</span><span>${sr.values[i]==null?"—":fmt(sr.values[i])}</span></div>`).join("")}${series.length===2&&series[0].values[i]!=null&&series[1].values[i]!=null?`<div class="r"><span>Spread</span><span>${(series[1].values[i]-series[0].values[i]).toFixed(2)}</span></div>`:""}`);
}
// horizontal bars with direct value labels
function hbarChart(el,rows,color){
  if(!rows.length){el.innerHTML='<div class="empty-ch">No data yet</div>';return}
  const W=360,rowH=30,L=96,R=58,H=rows.length*rowH+4;const mx=Math.max(...rows.map(r=>Math.abs(r.value)),1);
  const sx=v=>(W-L-R)*Math.abs(v)/mx;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${rows.map((r,i)=>{const y=i*rowH+6,w=Math.max(2,sx(r.value));const c=r.value<0?cssv("--sell"):color;
    return`<text x="${L-8}" y="${y+13}" text-anchor="end" style="font-size:11px;fill:var(--fg)">${esc(r.label.length>14?r.label.slice(0,13)+"…":r.label)}</text><path d="M${L},${y}H${L+w-4}Q${L+w},${y} ${L+w},${y+4}V${y+14}Q${L+w},${y+18} ${L+w-4},${y+18}H${L}Z" fill="${c}"/><text x="${L+w+6}" y="${y+13}" style="font-family:var(--mono);font-size:10.5px;fill:var(--fg)">${r.value<0?"−":""}₹${short(Math.abs(r.value))}</text>`}).join("")}</svg>`;
}
const legend=(id,items)=>{$("#"+id+"-leg").innerHTML=items.map(([n,c])=>`<span><i style="background:${c}"></i>${esc(n)}</span>`).join("")};
function renderCharts(){
  const s1=cssv("--s1")||"#2a78d6",s2=cssv("--s2")||"#eb6834";
  const now=Date.now(),dayKey=t=>new Date(t).toLocaleDateString("en-CA");
  const ND=dashDays();const days=[...Array(ND)].map((_,i)=>{const t=now-(ND-1-i)*DAY;return{k:dayKey(t),lab:new Date(t).getDate()+"",full:new Date(t).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}});
  const done=orders.filter(o=>o.status==="Completed");
  // profit per day
  const prof=days.map(d=>+stats(done.filter(o=>dayKey(o.time)===d.k)).profit.toFixed(2));
  const total=prof.reduce((a,b)=>a+b,0);$("#chProfit-sub").textContent="Total "+inr(total);
  barChart($("#chProfit"),{labels:days.map(d=>d.lab),series:[{name:"Spread profit",values:prof,color:s1,tipFmt:v=>inr(v)}],tipTitle:i=>days[i].full,every:ND>20?5:ND>10?2:1});$("#chProfitT").textContent=`Profit · last ${ND} days`;
  // hours
  const hc=[...Array(24)].map(()=>0),hx=[...Array(24)].map(()=>0);
  orders.forEach(o=>{const h=new Date(o.time).getHours();if(o.status==="Cancelled")hx[h]++;else hc[h]++});
  legend("chHours",[["Completed / other",s1],["Cancelled",s2]]);
  const hl=h=>(h%12||12)+(h<12?"a":"p");
  barChart($("#chHours"),{labels:[...Array(24)].map((_,h)=>hl(h)),series:[{name:"Completed / other",values:hc,color:s1,tipFmt:v=>v+" orders"},{name:"Cancelled",values:hx,color:s2,tipFmt:v=>v+" orders"}],tipTitle:i=>`${hl(i)}m – ${hl((i+1)%24)}m`,every:3,fmt:v=>+v.toFixed(0)+""});
  // rates
  const coin="USDT";
  const rate=(side)=>days.map(d=>{const l=done.filter(o=>o.coin===coin&&o.side===side&&dayKey(o.time)===d.k);const q=l.reduce((t,o)=>t+(+o.qty),0);return q?+(l.reduce((t,o)=>t+o.qty*o.rate,0)/q).toFixed(2):null});
  legend("chRates",[["Avg buy",s1],["Avg sell",s2]]);
  lineChart($("#chRates"),{labels:days.map(d=>d.lab),series:[{name:"Avg buy",values:rate("BUY"),color:s1},{name:"Avg sell",values:rate("SELL"),color:s2}],every:2});
  // banks
  const {bal}=balances();
  hbarChart($("#chBanks"),banks.map(b=>({label:b.name,value:Math.round(bal[b.id])})).sort((a,b)=>b.value-a.value),s1);
  // expenses
  const n=new Date();const ec={};exps.filter(x=>{const d=new Date(x.time);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).forEach(x=>ec[x.cat]=(ec[x.cat]||0)+(+x.amt||0));
  hbarChart($("#chExp"),Object.entries(ec).map(([k,v])=>({label:k,value:Math.round(v)})).sort((a,b)=>b.value-a.value),s1);
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>renderCharts());

// AI analysis for every section: numbers are computed here, the AI explains them
function facts(){
  const now=Date.now(),done=orders.filter(o=>o.status==="Completed");
  const dayKey=t=>new Date(t).toLocaleDateString("en-CA");
  const days={};for(let i=13;i>=0;i--){const d=dayKey(now-i*DAY);days[d]={orders:0,buyQty:0,sellQty:0,profit:0,cancelled:0}}
  orders.forEach(o=>{const k=dayKey(o.time);if(!days[k])return;days[k].orders++;if(o.status==="Cancelled")days[k].cancelled++});
  Object.keys(days).forEach(k=>{const l=done.filter(o=>dayKey(o.time)===k);const st=stats(l);days[k].buyQty=+st.b.q.toFixed(4);days[k].sellQty=+st.s.q.toFixed(4);days[k].profit=+st.profit.toFixed(2);days[k].avgBuy=+st.b.avg.toFixed(2);days[k].avgSell=+st.s.avg.toFixed(2)});
  const group=(key)=>{const g={};orders.forEach(o=>{const k=key(o)||"—";const x=g[k]=g[k]||{orders:0,completed:0,cancelled:0,appeal:0,volumeINR:0};x.orders++;if(o.status==="Completed"){x.completed++;x.volumeINR+=orderTotal(o)}if(o.status==="Cancelled")x.cancelled++;if(o.status==="Appeal")x.appeal++});Object.values(g).forEach(x=>x.volumeINR=Math.round(x.volumeINR));return g};
  const hours={};orders.forEach(o=>{const h=new Date(o.time).getHours();const x=hours[h]=hours[h]||{orders:0,cancelled:0};x.orders++;if(o.status==="Cancelled")x.cancelled++});
  const cps=group(o=>o.cp);const topCp=Object.entries(cps).filter(([k])=>k!=="—").sort((a,b)=>b[1].orders-a[1].orders).slice(0,15);
  const coinStats={};[...new Set(orders.map(o=>o.coin))].forEach(c=>{const st=stats(done.filter(o=>o.coin===c));coinStats[c]={bought:+st.b.q.toFixed(4),avgBuy:+st.b.avg.toFixed(2),sold:+st.s.q.toFixed(4),avgSell:+st.s.avg.toFixed(2),spreadProfit:+st.profit.toFixed(2)}});
  const {bal}=balances();const use=limitUse();
  const n=new Date();const monExp=exps.filter(x=>{const d=new Date(x.time);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()});
  const expCat={};monExp.forEach(x=>expCat[x.cat]=(expCat[x.cat]||0)+(+x.amt||0));
  const lim=b=>Object.fromEntries(["UPI","IMPS","NEFT"].map(m=>{const v=limitLeft(b,m,use);return[m,v===Infinity?"no limit":Math.round(v)]}));
  return{
    now:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),
    totals:{orders:orders.length,completed:done.length,pending:orders.filter(o=>o.status==="Pending").length,appeal:orders.filter(o=>o.status==="Appeal").length,cancelled:orders.filter(o=>o.status==="Cancelled").length},
    today:(()=>{const st=stats(orders.filter(o=>isToday(o.time)));return{orders:st.count,avgBuy:+st.b.avg.toFixed(2),avgSell:+st.s.avg.toFixed(2),spreadProfit:+st.profit.toFixed(2)}})(),
    last14Days:days,byMode:group(o=>modeOf(o)),byPlatform:group(o=>o.platform),byPayment:group(o=>o.pay),byHourOfDay:hours,topCounterparties:Object.fromEntries(topCp),coins:coinStats,cryptoLeft:stockLeft(),
    banks:banks.map(b=>({name:b.name,type:b.type,balance:Math.round(bal[b.id]),limitLeft:lim(b),upiLiteBalance:b.lite&&b.lite.on?Math.round(b.lite.bal||0):undefined})),moneyLeftTotal:Math.round(banks.reduce((t,b)=>t+bal[b.id],0)),
    unassignedPayments:{count:orders.filter(o=>o.status!=="Cancelled"&&!noBank(o)&&Math.abs(orderTotal(o)-allocated(o))>0.5).length,amount:Math.round(orders.filter(o=>o.status!=="Cancelled").reduce((t,o)=>t+Math.max(0,orderTotal(o)-allocated(o)),0))},
    expensesThisMonth:{total:Math.round(monExp.reduce((t,x)=>t+(+x.amt||0),0)),byCategory:expCat},
    direct:parties.map(p=>({party:p.name,toPay:partyOwed(p.id),paid:partyPaid(p.id),left:partyOwed(p.id)-partyPaid(p.id),weekly:+p.weekly||0,paidThisWeek:partyPaidWeek(p.id),payDay:p.dueDay!==""&&p.dueDay!=null?DAYS[+p.dueDay]:"any",paidBy:[...new Set(ppays.filter(x=>x.party===p.id).map(payerName))]}))
  };
}
const AN={
  home:{t:"AI business check",f:"Give a quick health check of the business today: profit vs recent days, pending/appeal orders needing attention, money and USDT left, payments due. Keep it short."},
  orders:{t:"AI order analysis",f:"Analyse orders: cancellation rate and which hours of the day have most cancellations (night hours matter), best and worst hours, platform and payment method performance, repeat and risky counterparties (many cancels/appeals), pending and appeal orders."},
  coins:{t:"AI coin analysis",f:"Analyse each coin: spread, profit, volume, stock left, trend of avg buy and sell rate over the last 14 days, which coin earns most per rupee, and whether stock is building up or running low."},
  wallet:{t:"AI money analysis",f:"Analyse banks and money: balances, which banks are near UPI/IMPS/NEFT limits, idle money, uneven distribution, unassigned order payments, personal expenses this month by category and whether spending is high compared to profit."},
  direct:{t:"AI direct analysis",f:"Analyse direct parties: total left to pay, who is overdue or due soon by pay day, suggest an order to pay them this week using available bank balances and limits, and note who paid on the user's behalf."},
  full:{t:"Full business report",f:"Write a complete business report covering orders, profit trend, coins, banks and limits, direct party payments, expenses, and risks. Then give a clear prioritised action plan for today and this week."}
};
const anCache={};
async function runAnalysis(k,force){
  const a=AN[k];if(!a)return;
  const draw=(body)=>openSheet(`<h3>${a.t}</h3>${body}`,el=>{const b=el.querySelector("#an-re");if(b)b.onclick=()=>runAnalysis(k,true)});
  if(anCache[k]&&!force){draw(anCache[k]);return}
  draw(`<div class="an"><div class="skel" style="width:90%"></div><div class="skel" style="width:75%"></div><div class="skel" style="width:82%"></div><p class="note">Reading your data and thinking… this can take up to a minute.</p></div>`);
  try{
    const res=await aiJson(`You are a senior business analyst for an Indian P2P crypto merchant (exchange P2P, direct deals and cash deals). ${aiStyle()} Amounts in ₹ with Indian formatting. Keep the JSON keys in English.
Respect the user's MEMORY rules. Use ONLY the facts below; never invent numbers. If data is too little to judge, say what to record. Do not give firm investment advice; give practical, specific observations and actions.
FOCUS: ${a.f}
Return JSON: {"summary":"2-3 sentences","numbers":[{"label":"short","value":"short"}],"insights":["..."],"warnings":["..."],"actions":["..."]}. 4-6 numbers, 3-6 insights, 0-4 warnings, 3-5 actions.
MEMORY: ${JSON.stringify(aiMemory())}
FACTS: ${JSON.stringify(facts())}`);
    const li=arr=>(arr||[]).map(x=>`<li>${esc(x)}</li>`).join("");
    const html=`<div class="an"><p class="sum">${esc(res.summary||"")}</p>
      ${(res.numbers||[]).length?`<div class="nums">${res.numbers.slice(0,8).map(n=>`<div><span>${esc(n.label)}</span><b>${esc(n.value)}</b></div>`).join("")}</div>`:""}
      ${(res.insights||[]).length?`<div><h4>Insights</h4><ul>${li(res.insights)}</ul></div>`:""}
      ${(res.warnings||[]).length?`<div class="warn"><h4>Watch out</h4><ul>${li(res.warnings)}</ul></div>`:""}
      ${(res.actions||[]).length?`<div class="act"><h4>What to do</h4><ul>${li(res.actions)}</ul></div>`:""}
      <p class="note">Generated ${new Date().toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})} from your saved data. Check important numbers yourself.</p>
      <div class="row2"><button class="mini" type="button" id="an-re">Refresh</button><button class="mini ghost" type="button" data-close>Close</button></div></div>`;
    anCache[k]=html;if(!$("#sheetBg").hidden)draw(html);
  }catch(err){
    draw(`<div class="an"><p class="sum">${esc((err&&err.text)||(err&&err.code==="not_granted"?"AI permission was not granted. Allow it and try again.":"Couldn't finish the analysis. Try again."))}</p><div class="row2"><button class="mini" type="button" id="an-re">Try again</button><button class="mini ghost" type="button" data-close>Close</button></div></div>`);
  }
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-ai]");if(b)runAnalysis(b.dataset.ai)});

// AI
const curMsgs=()=>{const p=$("#aiPop");return p&&!p.hidden?$("#apMsgs"):$("#msgs")};
function addMsg(cls,t){const d=document.createElement("div");d.className="msg "+cls;if(cls==="a"){try{d.dataset.who=(localStorage.getItem("p2p_botname")||"").trim()||"Pexai"}catch(e){d.dataset.who="Pexai"}}d.dataset.t=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});d.textContent=t;curMsgs().appendChild(d);d.scrollIntoView({block:"end",behavior:"smooth"});return d}
// ---------- AI agent: understands plain language, answers, and prepares actions you confirm ----------
const norm=t=>String(t||"").toLowerCase().replace(/[^a-z0-9@]/g,"");
function findBank(n){if(!n)return null;const k=norm(n);return banks.find(b=>norm(b.name)===k)||banks.find(b=>norm(b.name).includes(k)||k.includes(norm(b.name)))||banks.find(b=>norm(b.bankName)&&(norm(b.bankName).includes(k)||k.includes(norm(b.bankName))))||null}
function findParty(n){if(!n)return null;const k=norm(n);return parties.find(p=>norm(p.name)===k)||parties.find(p=>norm(p.name).includes(k)||k.includes(norm(p.name)))||null}
function findAcc(p,n){const accs=p.accounts||[];if(!n)return accs[0]||null;const k=norm(n);return accs.find(a=>[a.bankName,a.upi,a.accNo,a.holder].some(v=>v&&(norm(v).includes(k)||k.includes(norm(v)))))||accs[0]||null}
function toSplits(list,defMethod){const out=[],bad=[];(list||[]).forEach(x=>{const b=findBank(x.bank);if(!b||!(+x.amount>0)){bad.push(x.bank||"?");return}out.push({bank:b.id,amt:+(+x.amount).toFixed(2),method:METHODS.includes(String(x.method||"").toUpperCase())?String(x.method).toUpperCase():(x.method==="Cash"?"Cash":defMethod)})});return{out,bad}}
const ACT={
  add_order:{d:a=>`${a.side} ${a.qty} ${a.coin||"USDT"} @ ₹${a.rate}${a.counterparty?" · "+a.counterparty:""} · ${a.mode||"P2P"}${(a.banks||[]).length?" · "+a.banks.map(x=>x.bank+" ₹"+x.amount+(x.method?" "+x.method:"")).join(", "):""}`,
    run:async a=>{const side=String(a.side||"").toUpperCase();if(!["BUY","SELL"].includes(side)||!(+a.qty>0)||!(+a.rate>0))throw new Error("needs buy/sell, quantity and rate");
      const mode=["P2P","Direct","Cash"].includes(a.mode)?a.mode:"P2P";const pay=a.payment||(mode==="Cash"?"Cash":"UPI");
      const sp=toSplits(a.banks,mode==="Cash"?"Cash":methodOf(pay));if(sp.bad.length)throw new Error("unknown bank: "+sp.bad.join(", "));
      const no={id:newId("o"),side,coin:String(a.coin||"USDT").toUpperCase(),qty:+a.qty,rate:+a.rate,status:["Completed","Pending","Appeal","Cancelled"].includes(a.status)?a.status:"Completed",mode,pay,platform:mode==="P2P"?(a.platform||"Binance"):"",cp:a.counterparty||"",note:a.note||"",splits:sp.out,proofs:a.__proofs||[],time:Date.now(),src:"ai"};
      if(a.__hashes&&a.__hashes.length)no.shots=a.__hashes;if(a.__proofs&&a.__proofs.length)no.pv="ai";
      if(a.exchange_order_id)no.exId=String(a.exchange_order_id).trim().slice(0,40);if(a.utr)no.utr=String(a.utr).trim().slice(0,40);
      const dp=dupFlags(no);if(dp.length)throw new Error("Not added. "+(dp[0].k==="utr"?"This UTR was already used in ":dp[0].k==="shot"?"This screenshot was already used for ":"This order ID is already saved in ")+shortO(dp[0].o));
      await putRec(no);await auditLog(no,"create",{by:"ai"})}},
  set_order_status:{d:a=>{const o=orders.find(x=>x.id===a.order_id);return`Mark ${o?o.side+" "+o.qty+" "+o.coin+(o.cp?" ("+o.cp+")":""):"order"} as ${a.status}`},
    run:async a=>{if(!orders.find(x=>x.id===a.order_id))throw new Error("order not found");if(!["Completed","Pending","Appeal","Cancelled"].includes(a.status))throw new Error("bad status");await changeStatus(a.order_id,a.status,{ai:true})}},
  assign_banks:{d:a=>{const o=orders.find(x=>x.id===a.order_id);return`Assign ${o?o.side+" "+o.qty+" "+o.coin:"order"} to ${(a.banks||[]).map(x=>x.bank+" ₹"+x.amount).join(", ")}`},
    run:async a=>{const o=orders.find(x=>x.id===a.order_id);if(!o)throw new Error("order not found");const sp=toSplits(a.banks,methodOf(o.pay));if(sp.bad.length)throw new Error("unknown bank: "+sp.bad.join(", "));if(a.__hashes&&a.__hashes.length){if(a.__hashes.some(h=>(o.shots||[]).includes(h)))throw new Error("This screenshot is already attached to this order");const u=shotUsed(a.__hashes,o.id);if(u)throw new Error("This screenshot was already used for "+shortO(u))}
      const patch={splits:[...(o.splits||[]),...sp.out]};if(a.__hashes&&a.__hashes.length){patch.shots=[...(o.shots||[]),...a.__hashes];if(!o.pv)patch.pv="ai"}if(a.__proofs&&a.__proofs.length)patch.proofs=[...(o.proofs||[]),...a.__proofs];if(["Completed","Pending","Appeal","Cancelled"].includes(a.status))patch.status=a.status;await patchRec(o.id,patch)}},
  add_expense:{d:a=>`Expense ₹${a.amount} · ${a.category||"Other"}${a.bank?" from "+a.bank:""}${a.note?" · "+a.note:""}`,
    run:async a=>{if(!(+a.amount>0))throw new Error("needs amount");const b=a.bank?findBank(a.bank):null;if(a.bank&&!b)throw new Error("unknown bank "+a.bank);await putRec({id:newId("x_"),kind:"expense",amt:+a.amount,cat:CATS.includes(a.category)?a.category:"Other",bank:b?b.id:"",note:a.note||"",proofs:a.__proofs||[],time:Date.now()})}},
  transfer:{d:a=>`Transfer ₹${a.amount} from ${a.from} to ${a.to}${a.method?" by "+a.method:""}`,
    run:async a=>{const f=findBank(a.from),t=findBank(a.to);if(!f||!t)throw new Error("unknown bank");if(!(+a.amount>0))throw new Error("needs amount");await putRec({id:newId("m_"),kind:"move",from:f.id,to:t.id,amt:+a.amount,method:["UPI","IMPS","NEFT","Cash"].includes(a.method)?a.method:"IMPS",note:a.note||"",time:Date.now()})}},
  lite_load:{d:a=>`UPI Lite: load ₹${a.amount} from ${a.bank}`,run:async a=>{const b=findBank(a.bank);if(!b||!(b.lite&&b.lite.on))throw new Error("UPI Lite is not on for "+a.bank);if(!(+a.amount>0))throw new Error("needs amount");if(+a.amount>5000-(+b.lite.bal||0)+0.5)throw new Error("Lite can take only ₹"+Math.round(5000-(+b.lite.bal||0))+" more");await liteApply(b,"in",+a.amount,"bot")}},
  lite_out:{d:a=>`UPI Lite: withdraw ₹${a.amount} to ${a.bank}`,run:async a=>{const b=findBank(a.bank);if(!b||!(b.lite&&b.lite.on))throw new Error("UPI Lite is not on for "+a.bank);if(!(+a.amount>0))throw new Error("needs amount");if(+a.amount>(+b.lite.bal||0)+0.5)throw new Error("Lite has only ₹"+Math.round(+b.lite.bal||0));await liteApply(b,"out",+a.amount,"bot")}},
  lite_spend:{d:a=>`UPI Lite: spent ₹${a.amount} (${a.bank})`,run:async a=>{const b=findBank(a.bank);if(!b||!(b.lite&&b.lite.on))throw new Error("UPI Lite is not on for "+a.bank);if(!(+a.amount>0&&+a.amount<=1000))throw new Error("one Lite payment is ₹1 to ₹1,000");if(+a.amount>(+b.lite.bal||0)+0.5)throw new Error("Lite has only ₹"+Math.round(+b.lite.bal||0));await liteApply(b,"spend",+a.amount,"bot")}},
  add_party_due:{d:a=>`Add ₹${a.amount} to pay ${a.party}${a.note?" · "+a.note:""}`,
    run:async a=>{const p=findParty(a.party);if(!p)throw new Error("party not found: "+a.party);if(!(+a.amount>0))throw new Error("needs amount");await putRec({id:newId("pd_"),kind:"pdue",party:p.id,amt:+a.amount,note:a.note||"",time:Date.now()})}},
  pay_party:{d:a=>`Pay ${a.party} ₹${a.amount}${a.to_account?" → "+a.to_account:""} · by ${a.paid_by&&a.paid_by!=="me"?a.paid_by:"me"}${(a.banks||[]).length?" from "+a.banks.map(x=>x.bank+" ₹"+x.amount).join(", "):""}`,
    run:async a=>{const p=findParty(a.party);if(!p)throw new Error("party not found: "+a.party);if(!(+a.amount>0))throw new Error("needs amount");
      const me=!a.paid_by||String(a.paid_by).toLowerCase()==="me";const sp=me?toSplits(a.banks,"IMPS"):{out:[],bad:[]};if(sp.bad.length)throw new Error("unknown bank: "+sp.bad.join(", "));
      await putRec({id:newId("pp_"),kind:"ppay",party:p.id,account:(findAcc(p,a.to_account)||{}).id||"",amt:+a.amount,paidBy:me?"me":String(a.paid_by).slice(0,40),splits:sp.out,proofs:a.__proofs||[],note:a.note||"",time:Date.now()})}}
};
function agentContext(){
  const {bal}=balances();const use=limitUse();
  return{now:new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}),
    banks:banks.map(b=>({name:b.name,bank:b.bankName||"",type:b.type,balance:Math.round(bal[b.id]),...Object.fromEntries(["UPI","IMPS","NEFT"].map(m=>{const v=limitLeft(b,m,use);return[m+"_left",v===Infinity?"no limit":Math.round(v)]}))})),
    parties:parties.map(p=>({name:p.name,left_to_pay:partyOwed(p.id)-partyPaid(p.id),weekly:+p.weekly||0,paid_this_week:partyPaidWeek(p.id),accounts:(p.accounts||[]).map(a=>[a.bankName,a.upi].filter(Boolean).join(" / ")+(a.accNo?" ••"+a.accNo.slice(-4):""))})),
    counterparty_tags:recs.filter(x=>x.kind==="cptag").map(x=>({name:x.name,tag:x.tag==="block"?"blocked":"trusted",note:x.note})),
    recent_orders:orders.slice().sort((a,b)=>b.time-a.time).slice(0,40).map(o=>({id:o.id,time:new Date(o.time).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),side:o.side,coin:o.coin,qty:o.qty,rate:o.rate,status:o.status,mode:modeOf(o),cp:o.cp,unassigned:Math.round(orderTotal(o)-allocated(o))})),
    summary:facts()};
}
function actionCard(actions,host,files){host=host||curMsgs();files=files||[];let proofIds=null;
  const card=document.createElement("div");card.className="acard";
  card.innerHTML=`<div class="ah">Ready to record · check before applying</div>${actions.map((a,i)=>`<div class="ai" data-i="${i}"><span class="st">To do</span><span>${esc(ACT[a.type]?ACT[a.type].d(a):"Unknown action")}</span></div>`).join("")}<div class="row2"><button class="mini" type="button" data-apply>Apply all</button><button class="mini ghost" type="button" data-skip>Cancel</button></div>`;
  card.querySelector("[data-skip]").onclick=()=>{card.querySelector(".row2").remove();card.querySelector(".ah").textContent="Cancelled · nothing was recorded"};
  card.querySelector("[data-apply]").onclick=async()=>{const row=card.querySelector(".row2");row.remove();let ok=0;
    if(files.length&&assetsApi&&actions.some(a=>["pay_party","add_order","add_expense","assign_banks"].includes(a.type))){card.querySelector(".ah").textContent="Saving screenshot…";try{proofIds=await uploadProofs(files)}catch(e){proofIds=[];toast("Screenshot not saved, records will still be added")}}
    {const hashes=await Promise.all(files.map(fileHash));actions.forEach(a=>{if(proofIds&&proofIds.length&&a.attach_proof!==false){a.__proofs=proofIds;a.__hashes=hashes}})}
    for(let i=0;i<actions.length;i++){const a=actions[i],el=card.querySelector(`.ai[data-i="${i}"] .st`);
      try{if(!ACT[a.type])throw new Error("unknown action");await ACT[a.type].run(a);el.textContent="Done";el.className="st ok";ok++}
      catch(err){el.textContent="Failed";el.className="st err";el.title=err.message;el.parentElement.insertAdjacentHTML("beforeend",`<span class="note" style="display:block">${esc(err.message||"Couldn't save")}</span>`)}}
    card.querySelector(".ah").textContent=ok===actions.length?"Recorded ✓":`Recorded ${ok} of ${actions.length}`;toast(ok?"Saved by AI agent":"Nothing saved")};
  host.appendChild(card);card.scrollIntoView({block:"end",behavior:"smooth"});return card;
}
