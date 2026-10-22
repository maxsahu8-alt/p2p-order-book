// ===== Pro tools · batch B: day close, business insights, bank health =====
const p7Day=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const p7Ymd=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
// ---- 3. Day close
function dcChecks(){const out=[];const now=Date.now(),t0=p7Day(now);const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal");
 out.push({s:pend.length?"bad":"ok",t:pend.length?`${pend.length} open order${pend.length>1?"s":""}`:"No open orders",d:pend.length?"Close them or switch the ads off":""});
 const un=orders.filter(o=>o.status!=="Cancelled"&&!noBank(o)&&Math.abs(orderTotal(o)-allocated(o))>0.5).length;
 out.push({s:un?"warn":"ok",t:un?`${un} payment${un>1?"s":""} not matched to a bank`:"Every payment is linked to a bank",d:un?"Assign the bank on those orders":""});
 const neg=banks.filter(b=>balances().bal[b.id]<0).length;out.push({s:neg?"bad":"ok",t:neg?`${neg} bank balance is negative`:"No negative balance",d:neg?"An entry is missing or wrong":""});
 const kh=[];khAlerts(kh);out.push({s:kh.length?"warn":"ok",t:kh.length?`${kh.length} udhar due`:"No udhar due",d:kh[0]?kh[0].t:""});
 const rm=reminds.filter(r=>!r.done&&r.at&&r.at<=now).length;out.push({s:rm?"warn":"ok",t:rm?`${rm} reminder waiting`:"No reminders waiting",d:""});
 let rk=[];try{rk=bankRisk().filter(x=>x.lv==="bad")}catch(e){}out.push({s:rk.length?"warn":"ok",t:rk.length?`${rk.map(x=>x.b.name).join(", ")}: high freeze risk`:"No bank at high risk",d:rk.length?"Rest it tomorrow":""});
 return out}
function dcToday(){return recs.find(r=>r.kind==="dclose"&&r.id==="dc_"+p7Ymd(Date.now()))||null}
sheets.dayclose=function(){const t0=p7Day(Date.now());const ol=orders.filter(o=>o.time>=t0),st=stats(ol);const {bal}=balances();const stk=stockLeft();const prev=dcToday();
 const bk=banks.map(b=>({id:b.id,name:b.name,app:bal[b.id]||0,act:prev&&(prev.rec||[]).find(x=>x.id===b.id)?prev.rec.find(x=>x.id===b.id).actual:""}));
 const U=stk.USDT||0;const hist=recs.filter(r=>r.kind==="dclose").sort((a,b)=>b.time-a.time).slice(0,7);const CH=dcChecks();const bad=CH.filter(c=>c.s==="bad").length;
 openSheet(`<div class="insw"><div class="insh"><h3>Day close</h3><span class="note">${new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}</span></div>
  <div class="pvk"><div><span>Profit</span><b class="${st.profit>0?"pos":st.profit<0?"neg":""}">${inr(Math.round(st.profit))}</b></div><div><span>Orders</span><b>${ol.length}</b></div><div><span>USDT stock</span><b>${fmtQ(+U.toFixed(2))}</b></div></div>
  <div class="pcsec">Checklist</div>${CH.map(c=>`<div class="p7chk"><i class="${c.s}">${c.s==="ok"?"✓":c.s==="bad"?"!":"•"}</i><p>${esc(c.t)}${c.d?`<small>${esc(c.d)}</small>`:""}</p></div>`).join("")}
  <div class="pcsec">Match your real balances</div><p class="note">Type what your bank app or cash drawer really shows. Differences show instantly.</p>
  <div class="p7f">${bk.map(b=>`<label>${esc(b.name)} <span class="note">app: ${inr(Math.round(b.app))}</span><input type="number" inputmode="decimal" step="any" data-dc="${b.id}" data-app="${b.app}" value="${b.act}" placeholder="Actual balance"><small class="note dcd" data-dd="${b.id}"></small></label>`).join("")}
  <label>USDT in wallet <span class="note">app: ${fmtQ(+U.toFixed(2))}</span><input type="number" inputmode="decimal" step="any" id="dc-u" data-app="${U}" value="${prev&&prev.usdtAct!=null?prev.usdtAct:""}" placeholder="Actual USDT"><small class="note dcd" id="dc-ud"></small></label>
  <label>Note<input id="dc-n" value="${esc(prev?prev.note||"":"")}" placeholder="optional"></label></div>
  <div class="pvk"><div><span>Total difference</span><b id="dc-tot">—</b></div></div>
  <div class="p7b"><button type="button" class="mini" id="dc-s">${prev?"Update today's close":"Close the day"}</button><button type="button" class="mini ghost" id="dc-c">Copy summary</button></div>
  ${bad?`<p class="note p7neg">${bad} important thing${bad>1?"s":""} still open above.</p>`:""}
  ${hist.length?`<div class="pcsec">Last closes</div>${hist.map(h=>`<div class="dqr"><span>${new Date(h.time).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}<small>Profit ${inr(Math.round(h.profit))} · ${h.orders} orders${h.note?" · "+esc(h.note):""}</small></span><b class="${Math.abs(h.diff)<1?"p7pos":"p7neg"}">${Math.abs(h.diff)<1?"Matched":(h.diff>0?"+":"−")+inr(Math.round(Math.abs(h.diff)))}</b></div>`).join("")}`:""}</div>`,el=>{
  const read=()=>{let tot=0,n=0;const rec=[];el.querySelectorAll("[data-dc]").forEach(i=>{const v=i.value===""?null:+i.value,app=+i.dataset.app;const dd=el.querySelector(`[data-dd="${i.dataset.dc}"]`);if(v==null){dd.textContent="";return}const d=v-app;tot+=d;n++;dd.textContent=Math.abs(d)<1?"Matches":(d>0?"Extra ":"Short ")+inr(Math.round(Math.abs(d)));dd.style.color=Math.abs(d)<1?"var(--accent)":"var(--sell)";rec.push({id:i.dataset.dc,name:(banks.find(b=>b.id===i.dataset.dc)||{}).name,app,actual:v})});
   const u=el.querySelector("#dc-u"),ud=el.querySelector("#dc-ud");let uAct=null;if(u.value!==""){uAct=+u.value;const d=uAct-(+u.dataset.app);ud.textContent=Math.abs(d)<0.01?"Matches":(d>0?"Extra ":"Short ")+fmtQ(+Math.abs(d).toFixed(2))+" USDT";ud.style.color=Math.abs(d)<0.01?"var(--accent)":"var(--sell)"}else ud.textContent="";
   const T=el.querySelector("#dc-tot");T.textContent=n?(Math.abs(tot)<1?"Matched":(tot>0?"+":"−")+inr(Math.round(Math.abs(tot)))):"—";T.className=n&&Math.abs(tot)>=1?"neg":"";return{rec,tot,uAct}};
  el.addEventListener("input",read);read();
  const text=()=>{const r=read();return `Day close ${p7Ymd(Date.now())}\nProfit ${inr(Math.round(st.profit))} · ${ol.length} orders\nUSDT stock ${fmtQ(+U.toFixed(2))}\n`+bk.map(b=>`${b.name}: ${inr(Math.round(b.app))}`).join("\n")+(r.rec.length?`\nDifference ${Math.abs(r.tot)<1?"none":inr(Math.round(r.tot))}`:"")};
  el.querySelector("#dc-c").onclick=()=>copyText(text());
  el.querySelector("#dc-s").onclick=async()=>{const r=read();await putRec({id:"dc_"+p7Ymd(Date.now()),kind:"dclose",time:Date.now(),profit:st.profit,orders:ol.length,rec:r.rec,usdtApp:U,usdtAct:r.uAct,diff:r.tot,note:el.querySelector("#dc-n").value.trim().slice(0,100)});try{localStorage.setItem("p2p_repSeen",new Date().toDateString())}catch(e){}toast("Day closed");renderAlerts();sheets.dayclose()}})};

// ---- 7. Business insights
function insData(days){const from=days?Date.now()-days*DAY:0,P=ACC().sellP;const L=orders.filter(o=>o.status==="Completed"&&o.time>=from);const C={},M={},B={},Dw=Array(7).fill(0).map(()=>({n:0,p:0})),H=Array(24).fill(0).map(()=>({n:0,p:0}));
 L.forEach(o=>{const pr=o.side==="SELL"?(P[o.id]||0):0,k=o.cp?cpKey(o.cp):"",c=k?(C[k]=C[k]||{k,name:o.cp,n:0,p:0,v:0,last:0}):null;if(c){c.n++;c.p+=pr;c.v+=orderTotal(o);c.last=Math.max(c.last,o.time)}
  const m=methodOf(o.pay),mm=M[m]=M[m]||{n:0,p:0,v:0};mm.n++;mm.p+=pr;mm.v+=orderTotal(o);
  const tot=orderTotal(o);(o.splits||[]).forEach(x=>{const b=B[x.bank]=B[x.bank]||{n:0,p:0,v:0};b.n++;b.v+=+x.amt||0;b.p+=tot?pr*((+x.amt||0)/tot):0});
  const d=new Date(o.time),wd=(d.getDay()+6)%7;Dw[wd].n++;Dw[wd].p+=pr;H[d.getHours()].n++;H[d.getHours()].p+=pr});
 return{L,C,M,B,Dw,H}}
function insInactive(){const now=Date.now(),P=ACC().sellP,m={};orders.filter(o=>o.status==="Completed"&&o.cp).forEach(o=>{const k=cpKey(o.cp),c=m[k]=m[k]||{k,name:o.cp,n:0,p:0,last:0};c.n++;c.p+=o.side==="SELL"?(P[o.id]||0):0;c.last=Math.max(c.last,o.time)});
 return Object.values(m).filter(c=>c.n>=3&&now-c.last>14*DAY&&(cpTag(c.name)||{}).tag!=="block").sort((a,b)=>b.p-a.p).slice(0,25).map(c=>({...c,days:Math.floor((now-c.last)/DAY)}))}
sheets.insights=function(tab,per){tab=tab||"clients";per=per||"30";const D=insData(per==="all"?0:+per);const U=n=>Math.round(n);
 const bars=(arr,lab,key)=>{const mx=Math.max(1,...arr.map(x=>Math.abs(x[key])));return arr.map((x,i)=>`<div class="dqr"><span style="width:56px;flex:none">${lab(i)}</span><div style="flex:1"><div class="p7bar"><i style="width:${Math.abs(x[key])/mx*100}%;${x[key]<0?"background:var(--sell)":""}"></i></div></div><b style="width:78px;text-align:right">${key==="p"?inr(U(x.p)):x.n}</b></div>`).join("")};
 let body="";
 if(tab==="clients"){const L=Object.values(D.C).sort((a,b)=>b.p-a.p).slice(0,20);body=L.length?`<p class="note">Profit comes from your SELL orders. Top clients in this period.</p>`+L.map((c,i)=>`<div class="dqr"><span>${i+1}. ${esc(c.name)}${cpBadge(c.name)}<small>${c.n} orders · ${inr(U(c.v))} volume</small></span><b class="${c.p>0?"p7pos":""}">${inr(U(c.p))}</b></div>`).join(""):'<p class="note">No completed orders in this period.</p>'}
 else if(tab==="methods"){const M=Object.entries(D.M).sort((a,b)=>b[1].p-a[1].p),B=Object.entries(D.B).sort((a,b)=>b[1].p-a[1].p);body=`<div class="pcsec">Payment method</div>${M.map(([k,x])=>`<div class="dqr"><span>${esc(k)}<small>${x.n} orders · ${inr(U(x.v))} · ${x.n?inr(U(x.p/x.n)):"₹0"} per order</small></span><b class="${x.p>0?"p7pos":""}">${inr(U(x.p))}</b></div>`).join("")||'<p class="note">No data.</p>'}<div class="pcsec">Bank</div>${B.map(([k,x])=>`<div class="dqr"><span>${esc(bankName(k))}<small>${x.n} orders · ${inr(U(x.v))}</small></span><b class="${x.p>0?"p7pos":""}">${inr(U(x.p))}</b></div>`).join("")||'<p class="note">No data.</p>'}`}
 else if(tab==="time"){const DN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],hm=Math.max(1,...D.H.map(x=>x.n));const best=D.H.map((x,h)=>({h,...x})).sort((a,b)=>b.p-a.p)[0],bd=D.Dw.map((x,i)=>({i,...x})).sort((a,b)=>b.p-a.p)[0];
  const hl=h=>(h%12||12)+(h<12?"am":"pm");
  body=(best&&best.n?`<div class="pvk"><div><span>Best hour</span><b>${hl(best.h)}</b></div><div><span>Best day</span><b>${DN[bd.i]}</b></div></div>`:"")+`<div class="pcsec">Profit by day</div>${bars(D.Dw,i=>DN[i],"p")}<div class="pcsec">Orders by hour</div><div class="p7heat" style="grid-template-columns:repeat(8,1fr)">${D.H.map((x,h)=>`<span style="background:color-mix(in srgb,var(--accent) ${Math.round(x.n/hm*70)}%,var(--soft))" title="${x.n} orders">${hl(h)}</span>`).join("")}</div>`}
 else{const I=insInactive();body=I.length?`<p class="note">Regular clients who have not traded for over 2 weeks. A short message can bring them back.</p>`+I.map(c=>`<div class="dqr"><span>${esc(c.name)}<small>${c.n} orders · away ${c.days} days · earned ${inr(U(c.p))}</small></span><button type="button" class="mini ghost" data-wb="${esc(c.name)}">Copy hi</button></div>`).join(""):'<p class="note">Nobody has gone quiet. Good.</p>'}
 openSheet(`<div class="insw"><div class="insh"><h3>Business insights</h3></div>${insSeg("ib-t",[["clients","Clients"],["methods","Methods"],["time","Time"],["quiet","Quiet"]],tab)}
  ${tab!=="quiet"?insSeg("ib-p",[["30","30 days"],["90","90 days"],["all","All"]],per):""}<div style="margin-top:8px">${body}</div></div>`,el=>{
  bindSeg(el,"ib-t",k=>sheets.insights(k,per));bindSeg(el,"ib-p",k=>sheets.insights(tab,k));
  el.onclick=e=>{const w=e.target.closest("[data-wb]");if(w)copyText(`Hi ${w.dataset.wb}, long time! Rates are good today. Let me know if you want to trade.`)}})};

// ---- 8. Bank health + freeze log
function bhFreezes(id){return recs.filter(r=>r.kind==="freeze"&&(!id||r.bank===id)).sort((a,b)=>b.time-a.time)}
function bhState(id){const f=bhFreezes(id)[0];return f&&f.type!=="unfrozen"&&f.type!=="note"?f:null}
function bhCredits(id,from,to){return orders.filter(o=>o.side==="SELL"&&o.status!=="Cancelled"&&o.time>=from&&o.time<to&&(o.splits||[]).some(x=>x.bank===id)).length}
function bhData(){const use=limitUse(),now=Date.now(),t0=p7Day(now),risk={};try{bankRisk().forEach(x=>risk[x.b.id]=x)}catch(e){}
 return banks.filter(b=>b.type!=="Cash").map(b=>{const days=[...Array(30)].map((_,i)=>bhCredits(b.id,t0-(29-i)*DAY,t0-(28-i)*DAY));let streak=0;for(let i=29;i>=0;i--){if(days[i]>0)streak++;else if(i===29)continue;else break}
  let rest=0;for(let i=28;i>=0;i--){if(days[i]===0)break;rest++}const cr1=orders.filter(o=>o.side==="SELL"&&o.status!=="Cancelled"&&now-o.time<36e5&&(o.splits||[]).some(x=>x.bank===b.id)).length,cr24=risk[b.id]?risk[b.id].cr:bhCredits(b.id,now-DAY,now+1);
  const avg7=days.slice(22,29).reduce((t,v)=>t+v,0)/7;const frz=bhState(b.id);const lim=b.limits||{};
  const ms=["UPI","IMPS","NEFT","ALL"].filter(m=>+lim[m]).map(m=>({m,used:((use[b.id]||{})[m])||0,lim:+lim[m]}));const pctMax=Math.max(0,...ms.map(x=>x.used/x.lim));
  const score=Math.max(0,Math.round(100-(risk[b.id]?risk[b.id].score:0)*0.8-Math.max(0,streak-4)*5-pctMax*15));
  const adv=frz?"Frozen / restricted. Do not use.":streak>=6?"Rest tomorrow. Used "+streak+" days in a row.":cr24>=(bhLimitSafe()||99)?"Credits are above your usual safe level. Slow down.":risk[b.id]&&risk[b.id].lv==="bad"?"High freeze risk today. Switch buyers to another bank.":pctMax>=0.9?"Limit almost used.":"Fine to use.";
  return{b,days,streak,cr1,cr24,avg7,frz,ms,score,adv,lv:frz||score<40?"bad":score<70?"warn":"ok"}}).sort((a,b)=>a.score-b.score)}
function bhLimitSafe(){const F=bhFreezes().filter(f=>f.type==="frozen"&&+f.cr24>0);if(F.length<2)return 0;return Math.max(2,Math.floor(F.reduce((t,f)=>t+f.cr24,0)/F.length*0.7))}
sheets.bankhealth=function(){const H=bhData(),safe=bhLimitSafe();
 openSheet(`<div class="insw"><div class="insh"><h3>Bank health</h3><span class="note">${H.length} account${H.length===1?"":"s"}</span></div>
  ${safe?`<p class="note">Your accounts froze at around ${Math.round(safe/0.7)} credits a day before. Stay under ${safe} a day.</p>`:""}
  ${H.map(h=>`<div class="icard brk ${h.lv}"><div class="brh"><div><b>${esc(h.b.name)}</b><small>${h.cr1} in last hour · ${h.cr24} in 24h · avg ${h.avg7.toFixed(1)}/day</small></div><span class="pvs ${h.lv}">${h.frz?"FROZEN":h.score+"/100"}</span></div>
   <div class="brbar"><i style="width:${h.score}%;background:${lvlCol(h.lv)}"></i></div>
   <p class="brt" style="margin:6px 0">${esc(h.adv)}</p>
   ${h.ms.map(x=>`<div class="dqr"><span style="width:50px;flex:none">${x.m==="ALL"?"Total":x.m}</span><div style="flex:1"><div class="p7bar"><i style="width:${Math.min(100,x.used/x.lim*100)}%;${x.used/x.lim>=0.9?"background:var(--sell)":""}"></i></div></div><small style="width:88px;text-align:right">${inr(Math.round(x.lim-x.used>0?x.lim-x.used:0))} left</small></div>`).join("")}
   <div class="brw">${h.days.slice(-14).map((n,i,a)=>`<span title="${n}"><i style="height:${n?Math.max(14,n/Math.max(1,...a)*100):6}%;background:${n?"color-mix(in srgb,var(--accent) 45%,transparent)":"var(--soft)"}"></i></span>`).join("")}</div><small class="note" style="margin:0">Credits per day · 14 days · streak ${h.streak} day${h.streak===1?"":"s"}</small>
   <div class="p7b" style="margin-top:8px"><button type="button" class="mini ghost" data-bf="${h.b.id}">Log event</button>${h.frz?`<button type="button" class="mini" data-bu="${h.b.id}">Mark unfrozen</button>`:""}</div></div>`).join("")||'<p class="note">Add a bank first.</p>'}
  ${bhFreezes().length?`<div class="pcsec">Freeze log</div>${bhFreezes().slice(0,15).map(f=>`<div class="dqr"><span>${esc(bankName(f.bank))} · ${({frozen:"Frozen",lien:"Lien / hold",limit:"Limit cut",kyc:"KYC asked",unfrozen:"Unfrozen",note:"Note"})[f.type]||f.type}<small>${new Date(f.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}${f.cr24?" · "+f.cr24+" credits in 24h before":""}${f.note?" · "+esc(f.note):""}</small></span><button type="button" class="mini ghost" data-bx="${f.id}" aria-label="Delete">✕</button></div>`).join("")}`:""}
  <p class="note">Health uses today's risk, how many days in a row the account was used, and how much of each limit is used. It is a guide, not the bank's rule.</p></div>`,el=>{
  el.onclick=async e=>{const f=e.target.closest("[data-bf]");if(f)return bhForm(f.dataset.bf);const u=e.target.closest("[data-bu]");if(u){await putRec({id:newId("fz_"),kind:"freeze",bank:u.dataset.bu,type:"unfrozen",time:Date.now(),note:""});toast("Marked unfrozen");renderAlerts();return sheets.bankhealth()}const x=e.target.closest("[data-bx]");if(x){await delRec(x.dataset.bx);renderAlerts();sheets.bankhealth()}}})};
function bhForm(id){openSheet(`<div class="insw"><div class="insh"><h3>Log bank event</h3><span class="note">${esc(bankName(id))}</span></div><div class="p7f"><label>What happened<select id="bf-t"><option value="frozen">Account frozen</option><option value="lien">Lien / amount on hold</option><option value="limit">Limit reduced</option><option value="kyc">KYC / call from bank</option><option value="note">Just a note</option></select></label><label>Note<input id="bf-n" placeholder="optional"></label><button type="button" class="mini" id="bf-s">Save</button></div></div>`,el=>{
  el.querySelector("#bf-s").onclick=async()=>{const now=Date.now();await putRec({id:newId("fz_"),kind:"freeze",bank:id,type:el.querySelector("#bf-t").value,time:now,cr24:bhCredits(id,now-DAY,now+1),note:el.querySelector("#bf-n").value.trim().slice(0,100)});toast("Logged");renderAlerts();sheets.bankhealth()}})}
function bhAlerts(list){try{banks.forEach(b=>{const f=bhState(b.id);if(f)list.push({hi:true,t:`${b.name} is ${f.type==="frozen"?"frozen":f.type==="lien"?"on hold":f.type==="limit"?"limit cut":"under KYC"} since ${new Date(f.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`,sheet:"bankhealth"})});
  const t=p7Day(Date.now());bhData().forEach(h=>{if(!h.frz&&h.streak>=7)list.push({hi:false,t:`${h.b.name}: used ${h.streak} days in a row. Give it a rest day.`,sheet:"bankhealth"})})}catch(e){}}

