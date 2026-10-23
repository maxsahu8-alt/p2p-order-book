// ================= INSIGHTS =================
const INS_FROM=k=>k==="all"?0:Date.now()-(+k)*DAY;
const hLab=h=>{h=((h%24)+24)%24;return (h%12||12)+(h<12?" AM":" PM")};
const DN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const dIdx=t=>(new Date(t).getDay()+6)%7;
function avgBuyRate(list,coin){let q=0,v=0;list.forEach(o=>{if(o.side==="BUY"&&o.status==="Completed"&&o.coin===coin){q+=+o.qty;v+=o.qty*o.rate}});return q?v/q:0}
function sellProfit(o,ab){return o.side==="SELL"&&o.status==="Completed"&&ab?(o.rate-ab)*o.qty:0}
function insSeg(id,opts,cur){return`<div class="seg iseg" id="${id}" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map(([k,l])=>`<button type="button" data-k="${k}" class="${k===cur?"on":""}">${l}</button>`).join("")}</div>`}
function insList(items){return`<div class="inl">${items.filter(Boolean).map(([t,x])=>`<div class="ini ${t}"><span class="inb"></span><p>${x}</p></div>`).join("")||'<p class="note">Not enough data yet.</p>'}</div>`}
const bindSeg=(el,id,fn)=>{const g=el.querySelector("#"+id);if(g)g.onclick=e=>{const b=e.target.closest("[data-k]");if(b)fn(b.dataset.k)}};

// 1. Best time to trade
function bestTimeData(per){const from=INS_FROM(per);const L=orders.filter(o=>o.time>=from);const coin=pref("coin")||"USDT";const ab=avgBuyRate(L,coin)||avgBuyRate(orders,coin);
  const G=[...Array(7)].map(()=>[...Array(12)].map(()=>({n:0,c:0,p:0,v:0})));const H=[...Array(24)].map(()=>({n:0,c:0}));
  L.forEach(o=>{const d=new Date(o.time),h=d.getHours(),c=G[dIdx(o.time)][h>>1];if(o.status==="Cancelled"){c.c++;H[h].c++}else{c.n++;H[h].n++;c.v+=orderTotal(o);c.p+=sellProfit(o,ab)}});
  return{L,G,H}}
function bestTimeTop(per){const {G}=bestTimeData(per);let best=null;G.forEach((r,d)=>r.forEach((c,h)=>{if(c.n&&(!best||c.n>best.n))best={...c,d,h}}));
  const byB=[...Array(12)].map((_,h)=>G.reduce((t,r)=>t+r[h].n,0));const bi=byB.indexOf(Math.max(...byB));return Math.max(...byB)?hLab(bi*2)+"–"+hLab(bi*2+2):""}
sheets.besttime=function(per,met){per=per||"90";met=met||"n";const {L,G,H}=bestTimeData(per);
  const val=c=>met==="n"?c.n:met==="p"?c.p:c.c;let mx=0;G.forEach(r=>r.forEach(c=>mx=Math.max(mx,val(c))));
  const W=360,LX=34,TY=20,cw=(W-LX-4)/12,ch=26;
  const col=met==="c"?"var(--sell)":met==="p"?"var(--c2,#2a78d6)":"var(--accent)";
  const cells=G.map((r,d)=>r.map((c,h)=>{const v=val(c),a=mx>0&&v>0?0.14+0.86*(v/mx):0;return`<rect class="hmc" data-c="${d},${h}" x="${LX+h*cw+1.5}" y="${TY+d*ch+1.5}" width="${cw-3}" height="${ch-3}" rx="5" fill="${a?col:"var(--soft)"}" fill-opacity="${a||1}"/>`}).join("")).join("");
  const svg=`<svg viewBox="0 0 ${W} ${TY+7*ch+4}">${[0,2,4,6,8,10].map(b=>`<text x="${LX+b*cw*2/2*1+0}" y="12" style="font-size:9.5px">${["12a","4a","8a","12p","4p","8p"][b/2]}</text>`).join("")}${DN.map((n,d)=>`<text x="0" y="${TY+d*ch+17}" style="font-size:10px">${n}</text>`).join("")}${cells}</svg>`;
  // insights
  const byB=[...Array(12)].map((_,h)=>G.reduce((t,r)=>({n:t.n+r[h].n,c:t.c+r[h].c,p:t.p+r[h].p}),{n:0,c:0,p:0}));
  const byD=G.map(r=>r.reduce((t,c)=>({n:t.n+c.n,c:t.c+c.c,p:t.p+c.p}),{n:0,c:0,p:0}));
  const tot=byB.reduce((t,x)=>t+x.n,0),totC=byB.reduce((t,x)=>t+x.c,0);
  const bB=byB.reduce((a,x,i)=>x.n>byB[a].n?i:a,0),bP=byB.reduce((a,x,i)=>x.p>byB[a].p?i:a,0),bD=byD.reduce((a,x,i)=>x.n>byD[a].n?i:a,0),cB=byB.reduce((a,x,i)=>x.c>byB[a].c?i:a,0);
  const night=[0,1,2].reduce((t,i)=>({n:t.n+byB[i].n,c:t.c+byB[i].c}),{n:0,c:0});const nightCR=night.n+night.c?night.c/(night.n+night.c):0,allCR=tot+totC?totC/(tot+totC):0;
  const quiet=byB.map((x,i)=>[x.n,i]).filter(x=>x[1]>=4&&x[1]<=11).sort((a,b)=>a[0]-b[0])[0];
  const win=i=>hLab(i*2)+"–"+hLab(i*2+2);
  const ins=tot?[
    ["ok",`<b>Busiest time: ${win(bB)}</b> · ${Math.round(byB[bB].n/tot*100)}% of your orders come in this window.`],
    byB[bP].p>0?["ok",`<b>Most profit: ${win(bP)}</b> · ${inr(Math.round(byB[bP].p))} spread profit in this window.`]:null,
    ["ok",`<b>Best day: ${DN[bD]}</b> · ${byD[bD].n} orders${byD[bD].p>0?`, ${inr(Math.round(byD[bD].p))} profit`:""}.`],
    totC?["bad",`<b>Most cancels: ${win(cB)}</b> · ${byB[cB].c} of ${totC} cancelled orders.`]:null,
    night.n+night.c&&nightCR>allCR*1.3&&nightCR>0.15?["bad",`<b>Night risk:</b> ${Math.round(nightCR*100)}% of orders between 12–6 AM get cancelled (overall ${Math.round(allCR*100)}%). Switch off ads before sleeping.`]:null,
    quiet&&quiet[0]<byB[bB].n*0.25?["warn",`<b>Quiet time: ${win(quiet[1])}</b> · few orders. Good time for transfers, backups and party payments.`]:null]:[];
  openSheet(`<div class="insw"><div class="insh"><h3>Best time to trade</h3><span class="note">${L.length} orders</span></div>
    ${insSeg("bt-per",[["30","30 days"],["90","90 days"],["all","All time"]],per)}
    ${insSeg("bt-met",[["n","Orders"],["p","Profit"],["c","Cancels"]],met)}
    <div class="icard"><div class="ich"><b>Week × time of day</b><span>Darker = more</span></div><div class="chart hm">${svg}</div><div class="hmd" id="bt-d">Tap a box to see details</div></div>
    <div class="icard"><div class="ich"><b>Orders by hour</b><span><i class="lgd" style="background:var(--accent)"></i>Done <i class="lgd" style="background:var(--sell);margin-left:8px"></i>Cancelled</span></div><div class="chart" id="bt-h"></div></div>
    <div class="pcsec">What this means</div>${insList(ins)}</div>`,el=>{
    bindSeg(el,"bt-per",k=>sheets.besttime(k,met));bindSeg(el,"bt-met",k=>sheets.besttime(per,k));
    barChart(el.querySelector("#bt-h"),{labels:H.map((_,h)=>h%12||12),series:[{name:"Done",values:H.map(x=>x.n),color:cssv("--accent")||"#10b981"},{name:"Cancelled",values:H.map(x=>x.c),color:cssv("--sell")||"#ef4444"}],fmt:v=>Math.round(v),tipTitle:i=>hLab(i)+"–"+hLab(i+1),every:3});
    el.querySelectorAll(".hmc").forEach(r=>r.addEventListener("click",()=>{const [d,h]=r.dataset.c.split(",").map(Number),c=G[d][h];el.querySelectorAll(".hmc").forEach(x=>x.classList.toggle("sel",x===r));
      el.querySelector("#bt-d").innerHTML=`<b>${DN[d]} ${win(h)}</b> · ${c.n} order${c.n===1?"":"s"}${c.c?` · ${c.c} cancelled`:""}${c.v?` · ${inr(Math.round(c.v))} volume`:""}${c.p>0?` · ${inr(Math.round(c.p))} profit`:""}`}));
  })};

// 2. Best rate finder
function rateBuckets(list){if(!list.length)return{rows:[],step:0.1};const rs=list.map(o=>+o.rate);const lo=Math.min(...rs),hi=Math.max(...rs),rg=hi-lo;const step=rg<=1.5?0.1:rg<=4?0.25:rg<=10?0.5:Math.pow(10,Math.floor(Math.log10(rg/8)));
  const m=new Map();list.forEach(o=>{const k=+(Math.floor(o.rate/step+1e-9)*step).toFixed(4);const x=m.get(k)||{r:k,n:0,c:0,q:0};if(o.status==="Cancelled")x.c++;else{x.n++;if(o.status==="Completed")x.q+=+o.qty}m.set(k,x)});
  return{rows:[...m.values()].sort((a,b)=>b.r-a.r),step}}
function wMedian(list){const a=list.filter(o=>o.status==="Completed").map(o=>[+o.rate,+o.qty]).sort((x,y)=>x[0]-y[0]);const t=a.reduce((s,x)=>s+x[1],0);let c=0;for(const [r,q] of a){c+=q;if(c>=t/2)return r}return 0}
function rateSuggest(coin){const L=orders.filter(o=>o.coin===coin&&o.time>=Date.now()-7*DAY);const L2=L.length>=4?L:orders.filter(o=>o.coin===coin&&o.time>=Date.now()-30*DAY);
  return{sell:wMedian(L2.filter(o=>o.side==="SELL")),buy:wMedian(L2.filter(o=>o.side==="BUY"))}}
sheets.bestrate=function(side,per){side=side||"SELL";per=per||"30";const coin=pref("coin")||"USDT";const from=INS_FROM(per);
  const L=orders.filter(o=>o.coin===coin&&o.side===side&&o.time>=from&&+o.rate>0);const {rows,step}=rateBuckets(L);const mxq=Math.max(1,...rows.map(r=>r.q));
  const sweet=rows.reduce((a,r)=>!a||r.q>a.q?r:a,null);const totQ=rows.reduce((t,r)=>t+r.q,0);
  const sg=rateSuggest(coin);const fr=v=>"₹"+(+v).toFixed(2);
  const dec=step<0.1?3:2;const rl=r=>"₹"+r.r.toFixed(dec)+(step>=0.25?"–"+(r.r+step).toFixed(dec):"");
  const table=rows.length?rows.slice(0,14).map(r=>{const cr=r.n+r.c?r.c/(r.n+r.c):0;return`<div class="rbr ${sweet&&r===sweet?"top":""}"><span class="rbl">${rl(r)}</span><span class="rbb"><i style="width:${Math.max(2,r.q/mxq*100)}%"></i></span><span class="rbv">${r.n}${r.c?`<em> · ${r.c}✕</em>`:""}</span></div>`}).join(""):'<p class="note">No orders in this period.</p>';
  // trend: last 14 days avg buy/sell
  const days=[...Array(14)].map((_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-13+i);return d.getTime()});
  const avgOn=(sd,t)=>{const a=orders.filter(o=>o.coin===coin&&o.side===sd&&o.status==="Completed"&&o.time>=t&&o.time<t+DAY);const q=a.reduce((s,o)=>s+(+o.qty),0);return q?a.reduce((s,o)=>s+o.qty*o.rate,0)/q:null};
  const hi=rows.filter(r=>sweet&&r.r>sweet.r+step*2),hiN=hi.reduce((t,r)=>t+r.n,0),hiC=hi.reduce((t,r)=>t+r.c,0);
  const r7=wMedian(orders.filter(o=>o.coin===coin&&o.side===side&&o.time>=Date.now()-7*DAY)),r30=wMedian(orders.filter(o=>o.coin===coin&&o.side===side&&o.time>=Date.now()-30*DAY&&o.time<Date.now()-7*DAY));
  const ins=sweet?[
    ["ok",`<b>Sweet spot: ${rl(sweet)}</b> · ${totQ?Math.round(sweet.q/totQ*100):0}% of your ${side==="SELL"?"sold":"bought"} ${coin} filled here.`],
    hi.length&&side==="SELL"?["warn",`Above ₹${(sweet.r+step*2).toFixed(dec)}: only ${hiN} order${hiN===1?"":"s"}${hiC?`, ${hiC} cancelled`:""}. Higher ads wait longer.`]:null,
    r7&&r30?[r7>=r30?"ok":"warn",`Your ${side==="SELL"?"sell":"buy"} rate this week ${fr(r7)} vs before ${fr(r30)} (${r7>=r30?"+":""}${(r7-r30).toFixed(2)}).`]:null]:[];
  const spread=sg.sell&&sg.buy?sg.sell-sg.buy:0;
  openSheet(`<div class="insw"><div class="insh"><h3>Best rate finder</h3><span class="note">${coin}</span></div>
    <div class="rsug"><div><span>Suggested sell ad</span><b>${sg.sell?fr(sg.sell):"—"}</b></div><div><span>Suggested buy ad</span><b>${sg.buy?fr(sg.buy):"—"}</b></div><div><span>Spread / ${coin}</span><b class="${spread>0?"pos":spread<0?"neg":""}">${spread?(spread>0?"+":"")+spread.toFixed(2):"—"}</b><small>${spread>0?inr(Math.round(spread*100000/(sg.buy||1)))+" per ₹1L":""}</small></div></div>
    <p class="note" style="margin:-4px 0 10px">Based on where your orders actually filled in the last 7 days.</p>
    ${insSeg("br-side",[["SELL","Sell"],["BUY","Buy"]],side)}
    ${insSeg("br-per",[["7","7 days"],["30","30 days"],["90","90 days"]],per)}
    <div class="icard"><div class="ich"><b>Where your ${side==="SELL"?"sells":"buys"} filled</b><span>orders · ✕ cancelled</span></div><div class="rbt">${table}</div></div>
    <div class="icard"><div class="ich"><b>Your rate · last 14 days</b><span><i class="lgd" style="background:var(--s1,#2a78d6)"></i>Buy <i class="lgd" style="background:var(--s2,#eb6834);margin-left:8px"></i>Sell</span></div><div class="chart" id="br-tr"></div></div>
    <div class="pcsec">What this means</div>${insList(ins)}</div>`,el=>{
    bindSeg(el,"br-side",k=>sheets.bestrate(k,per));bindSeg(el,"br-per",k=>sheets.bestrate(side,k));
    lineChart(el.querySelector("#br-tr"),{labels:days.map(t=>new Date(t).getDate()+""),series:[{name:"Buy",values:days.map(t=>avgOn("BUY",t)),color:cssv("--s1")||"#2a78d6"},{name:"Sell",values:days.map(t=>avgOn("SELL",t)),color:cssv("--s2")||"#eb6834"}],every:2});
  })};

// 3. Monthly target
function monthProfit(y,m,net){const a=new Date(y,m,1).getTime(),b=new Date(y,m+1,1).getTime();const st=stats(orders.filter(o=>o.time>=a&&o.time<b));const ex=net?exps.filter(x=>x.time>=a&&x.time<b).reduce((t,x)=>t+(+x.amt||0),0):0;return st.profit-ex}
function targetInfo(){const T=+pref("target")||0,net=!!pref("targetNet");const n=new Date(),y=n.getFullYear(),m=n.getMonth(),dim=new Date(y,m+1,0).getDate(),day=n.getDate();
  const earned=monthProfit(y,m,net);const proj=earned/day*dim;return{T,net,y,m,dim,day,earned,proj,left:Math.max(0,T-earned),perDay:T>earned?(T-earned)/Math.max(1,dim-day+1):0,pct:T?Math.min(100,earned/T*100):0}}
sheets.target=function(){const I=targetInfo();const {T,y,m,dim,day,earned,proj,net}=I;
  const status=!T?["Set a target","mute"]:earned>=T?["Target hit 🎉","ok"]:proj>=T?["On track","ok"]:["Behind by "+inr(Math.round(T-proj)),"bad"];
  const mA=new Date(y,m,1).getTime(),mB=new Date(y,m+1,1).getTime(),coinT=pref("coin")||"USDT",abM=avgBuyRate(orders.filter(o=>o.time>=mA&&o.time<mB),coinT)||avgBuyRate(orders,coinT);
  const dayProfit=[...Array(dim)].map((_,i)=>{const a=new Date(y,m,i+1).getTime();if(i+1>day)return 0;const st={profit:orders.filter(o=>o.time>=a&&o.time<a+DAY).reduce((t,o)=>t+sellProfit(o,abM),0)};const ex=net?exps.filter(x=>x.time>=a&&x.time<a+DAY).reduce((t,x)=>t+(+x.amt||0),0):0;return st.profit-ex});
  const bestI=dayProfit.reduce((a,v,i)=>v>dayProfit[a]?i:a,0);const avg=day?earned/day:0;
  const hist=[...Array(6)].map((_,i)=>{const d=new Date(y,m-5+i,1);return{l:d.toLocaleDateString("en-IN",{month:"short"}),v:monthProfit(d.getFullYear(),d.getMonth(),net)}});
  const R=52,C=2*Math.PI*R,pc=I.pct/100;
  openSheet(`<div class="insw"><div class="insh"><h3>Monthly target</h3><span class="note">${new Date(y,m,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</span></div>
    <div class="tgh"><svg viewBox="0 0 130 130" class="tgr"><circle cx="65" cy="65" r="${R}" fill="none" stroke="var(--soft)" stroke-width="12"/><circle cx="65" cy="65" r="${R}" fill="none" stroke="${earned>=T&&T?"var(--accent)":status[1]==="bad"?"var(--warn)":"var(--accent)"}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C*pc} ${C}" transform="rotate(-90 65 65)"/><text x="65" y="63" text-anchor="middle" style="font:800 22px var(--body);fill:var(--fg)">${T?Math.round(I.pct)+"%":"—"}</text><text x="65" y="82" text-anchor="middle" style="font:600 10px var(--body);fill:var(--muted)">of target</text></svg>
      <div class="tgk"><span class="pvs ${status[1]}">${status[0]}</span><div><span>Earned</span><b class="${earned>0?"pos":earned<0?"neg":""}">${inr(Math.round(earned))}</b></div><div><span>Target</span><b>${T?inr(T):"—"}</b></div></div></div>
    <div class="pvk"><div><span>Need / day</span><b>${T?inr(Math.round(I.perDay)):"—"}</b></div><div><span>Avg / day</span><b>${inr(Math.round(avg))}</b></div><div><span>Month end</span><b class="${T&&proj>=T?"pos":T?"neg":""}">${inr(Math.round(proj))}</b></div></div>
    <form id="tg-f" class="tgf" onsubmit="return false"><input id="tg-v" type="number" inputmode="numeric" placeholder="Monthly profit target (₹)" value="${T||""}"><button type="submit" class="mini psdl">${T?"Update":"Set target"}</button></form>
    <div class="tgn"><span>Count profit after personal expenses</span><label class="tog"><input type="checkbox" id="tg-net" ${net?"checked":""}><span></span></label></div>
    <div class="icard"><div class="ich"><b>Daily profit</b><span>${T&&I.perDay?"Target pace "+inr(Math.round(T/dim))+"/day":""}</span></div><div class="chart" id="tg-d"></div></div>
    <div class="icard"><div class="ich"><b>Last 6 months</b><span>${T?"✓ = target hit":""}</span></div><div class="chart" id="tg-m"></div></div>
    <div class="pcsec">What this means</div>${insList([
      T&&earned<T?["warn",`Make <b>${inr(Math.round(I.perDay))}</b> a day for the next ${dim-day+1} day${dim-day?"s":""} to hit ${inr(T)}.`]:null,
      T&&earned>=T?["ok",`You hit the target with ${dim-day} day${dim-day===1?"":"s"} to spare. Raise it?`]:null,
      dayProfit[bestI]>0?["ok",`Best day so far: <b>${new Date(y,m,bestI+1).toLocaleDateString("en-IN",{weekday:"short",day:"numeric"})}</b> · ${inr(Math.round(dayProfit[bestI]))}.`]:null,
      hist[4].v?[hist[5].v*dim/day>=hist[4].v?"ok":"warn",`Last month: ${inr(Math.round(hist[4].v))}. At this pace this month ends ${proj>=hist[4].v?"higher":"lower"}.`]:null,
      !T?["warn","Set a target above to track your progress."]:null])}</div>`,el=>{
    el.querySelector("#tg-f").onsubmit=e=>{e.preventDefault();const v=Math.round(+el.querySelector("#tg-v").value);if(!(v>0)){toast("Enter a target amount");return}setPref("target",v);toast("Target saved");setTimeout(()=>sheets.target(),50)};
    el.querySelector("#tg-net").onchange=e=>{setPref("targetNet",e.target.checked);setTimeout(()=>sheets.target(),50)};
    barChart(el.querySelector("#tg-d"),{labels:dayProfit.map((_,i)=>i+1+""),series:[{name:"Profit",values:dayProfit,color:cssv("--accent")||"#10b981"}],fmt:short,tipTitle:i=>new Date(y,m,i+1).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"}),every:5});
    barChart(el.querySelector("#tg-m"),{labels:hist.map(h=>h.l+(T&&h.v>=T?" ✓":"")),series:[{name:"Profit",values:hist.map(h=>h.v),color:cssv("--s1")||"#2a78d6"}],fmt:short});
  })};

// 4. Merchant score
function scoreData(per){const from=INS_FROM(per),days=per==="all"?Math.max(1,(Date.now()-Math.min(...orders.map(o=>o.time),Date.now()))/DAY):+per;
  const L=orders.filter(o=>o.time>=from);const done=L.filter(o=>o.status==="Completed").length,canc=L.filter(o=>o.status==="Cancelled").length,app=L.filter(o=>o.status==="Appeal").length,pend=L.filter(o=>o.status==="Pending").length;
  const closed=done+canc+app;const comp=closed?done/closed:0,cr=closed?canc/closed:0,ar=closed?app/closed:0;
  const tm=L.filter(o=>o.doneAt&&o.doneAt>o.time).map(o=>(o.doneAt-o.time)/6e4);const avgT=tm.length?tm.reduce((a,b)=>a+b,0)/tm.length:null;
  const act=new Set(L.map(o=>new Date(o.time).toDateString())).size;const cps={};L.forEach(o=>{if(o.cp){const k=o.cp.trim().toLowerCase();cps[k]=(cps[k]||0)+1}});const cpN=Object.keys(cps).length,rep=Object.values(cps).filter(n=>n>1).length;
  const vol=L.filter(o=>o.status==="Completed").reduce((t,o)=>t+orderTotal(o),0);
  const cons=Math.min(1,act/Math.min(days,30));
  const score=closed?Math.round(comp*60+(1-Math.min(1,ar*10))*20+cons*20):0;
  return{L,done,canc,app,pend,closed,comp,cr,ar,avgT,tmN:tm.length,act,days,cpN,rep,vol,score}}
const grade=s=>s>=90?["A+","ok"]:s>=80?["A","ok"]:s>=70?["B","warn"]:s>=55?["C","warn"]:["D","bad"];
sheets.mscore=function(per){per=per||"30";const D=scoreData(per);const [g,gc]=grade(D.score);const pctf=v=>Math.round(v*100)+"%";
  const weeks=[...Array(8)].map((_,i)=>{const b=weekStart()-(7-i)*7*DAY+7*DAY,a=b-7*DAY;const L=orders.filter(o=>o.time>=a&&o.time<b);const d=L.filter(o=>o.status==="Completed").length,c=L.filter(o=>o.status==="Cancelled"||o.status==="Appeal").length;return{l:new Date(a).toLocaleDateString("en-IN",{day:"numeric",month:"short"}),v:d+c?d/(d+c)*100:null}});
  const R=52,C=2*Math.PI*R;
  const tips=D.closed?[
    D.comp>=0.95?["ok",`Great completion rate (${pctf(D.comp)}). Buyers trust merchants above 95%.`]:["bad",`Completion ${pctf(D.comp)}. ${D.canc} cancelled. Check <b>Best time to trade</b> to see when cancels happen.`],
    D.app?["bad",`${D.app} order${D.app>1?"s":""} in appeal. Appeals hurt your exchange rating most. Clear them fast.`]:["ok","No appeals in this period."],
    D.avgT!=null?[D.avgT<=10?"ok":"warn",`Average time to complete: <b>${D.avgT<1?"<1":Math.round(D.avgT)} min</b> (${D.tmN} orders). ${D.avgT>15?"Faster release brings more repeat buyers.":""}`]:["warn","Order completion time is tracked from now on, when you mark a pending order as Completed."],
    D.cpN?[D.rep/D.cpN>=0.3?"ok":"warn",`${D.rep} of ${D.cpN} traders came back for another order (${pctf(D.rep/D.cpN)} repeat).`]:null,
    D.pend?["warn",`${D.pend} order${D.pend>1?"s":""} still pending.`]:null]:[];
  openSheet(`<div class="insw"><div class="insh"><h3>Merchant score</h3><span class="note">${D.L.length} orders</span></div>
    ${insSeg("ms-per",[["7","7 days"],["30","30 days"],["90","90 days"],["all","All"]],per)}
    <div class="tgh"><svg viewBox="0 0 130 130" class="tgr"><circle cx="65" cy="65" r="${R}" fill="none" stroke="var(--soft)" stroke-width="12"/><circle cx="65" cy="65" r="${R}" fill="none" stroke="var(--${gc==="ok"?"accent":gc==="warn"?"warn":"sell"})" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C*D.score/100} ${C}" transform="rotate(-90 65 65)"/><text x="65" y="66" text-anchor="middle" style="font:800 30px var(--body);fill:var(--fg)">${D.closed?D.score:"—"}</text><text x="65" y="84" text-anchor="middle" style="font:600 10px var(--body);fill:var(--muted)">out of 100</text></svg>
      <div class="tgk"><span class="pvs ${gc}">Grade ${D.closed?g:"—"}</span><div><span>Completion</span><b>${D.closed?pctf(D.comp):"—"}</b></div><div><span>Volume</span><b>${inr(Math.round(D.vol))}</b></div></div></div>
    <div class="msgr">${[["Cancel rate",D.closed?pctf(D.cr):"—",D.cr>0.1?"neg":""],["Appeals",D.app,D.app?"neg":""],["Avg time",D.avgT!=null?(D.avgT<1?"<1":Math.round(D.avgT))+" min":"—",""],["Orders / day",(D.L.length/Math.max(1,Math.min(D.days,D.act?D.days:1))).toFixed(1),""],["Active days",D.act,""],["Repeat traders",D.cpN?pctf(D.rep/D.cpN):"—",""]].map(([l,v,c])=>`<div><span>${l}</span><b class="${c}">${v}</b></div>`).join("")}</div>
    <div class="icard"><div class="ich"><b>Completion rate · 8 weeks</b><span>%</span></div><div class="chart" id="ms-w"></div></div>
    <p class="note">Score = completion 60% · no appeals 20% · trading consistency 20%.</p>
    <div class="pcsec">How to improve</div>${insList(tips)}</div>`,el=>{
    bindSeg(el,"ms-per",k=>sheets.mscore(k));
    lineChart(el.querySelector("#ms-w"),{labels:weeks.map(w=>w.l),series:[{name:"Completion",values:weeks.map(w=>w.v),color:cssv("--accent")||"#10b981"}],fmt:v=>Math.round(v)+"%",every:2});
  })};

const sgn=v=>(v<0?"−":"")+inr(Math.abs(Math.round(v)));
// 5. Night auto report
function nightReport(dayOff){const d0=new Date();d0.setHours(0,0,0,0);const a=d0.getTime()-dayOff*DAY,b=a+DAY;const inR=t=>t>=a&&t<b;
  const ol=orders.filter(o=>inR(o.time)),st=stats(ol),done=ol.filter(o=>o.status==="Completed");const canc=ol.filter(o=>o.status==="Cancelled").length;
  const pend=orders.filter(o=>o.status==="Pending"||o.status==="Appeal");const ex=exps.filter(x=>inR(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
  const {bal}=balances();const use=limitUse();const money=banks.reduce((t,k)=>t+bal[k.id],0);const stk=stockLeft();
  const bk=banks.map(k=>{const lim=k.limits||{};const left=["UPI","IMPS"].filter(m=>+lim[m]).map(m=>[m,Math.max(0,+lim[m]-(((use[k.id]||{})[m])||0)),+lim[m]]);return{n:k.name,bal:bal[k.id],left}});
  const dpaid=ppays.filter(x=>inR(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
  const today=(new Date().getDay()+6)%7,tmr=(today+1)%7;
  const dues=parties.map(p=>{const wk=+p.weekly||0,lf=wk-partyPaidWeek(p.id);if(!wk||lf<=0.5||p.dueDay===""||p.dueDay==null)return null;const d=+p.dueDay;return d<today?[p.name,lf,"overdue"]:d===today?[p.name,lf,"today"]:d===tmr?[p.name,lf,"tomorrow"]:null}).filter(Boolean);
  const rem=reminds.filter(r=>!r.done&&r.at&&r.at<b+DAY).sort((x,y)=>x.at-y.at);
  const T=+pref("target")||0,ti=targetInfo();
  const dl=new Date(a).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
  const L=[`🌙 Day report · ${dl}`,pref("biz")?pref("biz"):"","",
    `💰 Profit: ${sgn(st.profit)}${ex?` · after expenses ${sgn(st.profit-ex)}`:""}`,
    `📦 Orders: ${ol.length} (done ${done.length}, cancelled ${canc})`,
    st.b.q?`🟢 Bought ${fmtQ(+st.b.q.toFixed(2))} @ ₹${st.b.avg.toFixed(2)} = ${inr(Math.round(st.b.v))}`:"",
    st.s.q?`🔴 Sold ${fmtQ(+st.s.q.toFixed(2))} @ ₹${st.s.avg.toFixed(2)} = ${inr(Math.round(st.s.v))}`:"",
    T?`🎯 Month: ${inr(Math.round(ti.earned))} of ${inr(T)} (${Math.round(ti.pct)}%)`:"",
    "",`🏦 Money: ${inr(Math.round(money))} · ${Object.entries(stk).filter(([c,q])=>Math.abs(q)>1e-6).map(([c,q])=>fmtQ(+q.toFixed(2))+" "+c).join(", ")||"no coins"}`,
    ...bk.map(k=>`   · ${k.n}: ${inr(Math.round(k.bal))}${k.left.length?" | "+k.left.map(([m,l,L2])=>`${m} left ${inr(Math.round(l))}${l<=0?" ⛔":l<L2*0.1?" ⚠":""}`).join(", "):""}`),
    pend.length?"":"",pend.length?`⏳ Open orders: ${pend.length}`:"",...pend.slice(0,6).map(o=>`   · ${o.status} ${o.side} ${fmtQ(o.qty)} ${o.coin}${o.cp?" · "+o.cp:""}`),
    dpaid||dues.length?"":"",dpaid?`🤝 Direct paid: ${inr(Math.round(dpaid))}`:"",dues.length?"🤝 Party dues:":"",...dues.map(([n,v,w])=>`   · ${n}: ${inr(Math.round(v))} ${w}`),
    ex?`🧾 Expenses: ${inr(Math.round(ex))}`:"",
    rem.length?"":"",rem.length?"⏰ Reminders:":"",...rem.slice(0,5).map(r=>`   · ${r.text}`)].filter((x,i,arr)=>x!==""||(arr[i-1]!==""&&i<arr.length-1));
  return{text:L.join("\n").replace(/\n{3,}/g,"\n\n").trim(),st,ol,done,canc,pend,ex,money,bk,dues,rem,dl,dpaid}}
sheets.nightrep=function(off){off=off||0;const R=nightReport(off);try{localStorage.setItem("p2p_repSeen",new Date().toDateString())}catch(e){}renderAlerts();
  const on=pref("repAuto")!==false,at=pref("repAt")||"23:00";
  openSheet(`<div class="insw"><div class="insh"><h3>Day report</h3><span class="note">${esc(R.dl)}</span></div>
    ${insSeg("nr-d",[["0","Today"],["1","Yesterday"]],String(off))}
    <div class="pvk"><div><span>Profit</span><b class="${R.st.profit>0?"pos":R.st.profit<0?"neg":""}">${inr(Math.round(R.st.profit))}</b></div><div><span>Orders</span><b>${R.ol.length}<small style="font-size:.66rem;color:var(--muted)"> · ${R.canc}✕</small></b></div><div><span>Money now</span><b>${inr(Math.round(R.money))}</b></div></div>
    ${R.pend.length||R.dues.length||R.bk.some(k=>k.left.some(x=>x[1]<=0))?`<div class="pcsec">Before you sleep</div>${insList([R.pend.length?["bad",`<b>${R.pend.length} open order${R.pend.length>1?"s":""}</b>. Close or switch off ads.`]:null,...R.dues.map(([n,v,w])=>[w==="overdue"?"bad":"warn",`<b>${esc(n)}</b> · ${inr(Math.round(v))} ${w}`]),...R.bk.filter(k=>k.left.some(x=>x[1]<=0)).map(k=>["warn",`<b>${esc(k.n)}</b> limit used up: ${k.left.filter(x=>x[1]<=0).map(x=>x[0]).join(", ")}`])])}`:""}
    <div class="pcsec">Report to share</div><pre class="nrt" id="nr-t">${esc(R.text)}</pre>
    <div class="pcact"><button type="button" class="mini ghost" id="nr-c">Copy</button><a class="mini ghost" id="nr-w" href="https://wa.me/?text=${encodeURIComponent(R.text)}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">WhatsApp</a><button type="button" class="mini psdl" id="nr-r">Full report</button></div>
    <div class="pcsec">Auto report</div>
    <div class="rml"><div class="dqr"><span>Remind me every night<small>An alert says the report is ready</small></span><label class="tog"><input type="checkbox" id="nr-on" ${on?"checked":""}><span></span></label></div><div class="dqr"><span>Time</span><input type="time" id="nr-at" value="${at}" class="nrtime"></div></div></div>`,el=>{
    bindSeg(el,"nr-d",k=>sheets.nightrep(+k));
    el.querySelector("#nr-c").onclick=()=>copyText(R.text,el.querySelector("#nr-t"));
    el.querySelector("#nr-r").onclick=()=>sheets.report();
    el.querySelector("#nr-on").onchange=e=>{setPref("repAuto",e.target.checked);toast(e.target.checked?"Night report on":"Night report off")};
    el.querySelector("#nr-at").onchange=e=>{setPref("repAt",e.target.value||"23:00");toast("Report time "+e.target.value)};
  })};
function repDue(){if(pref("repAuto")===false)return false;const [h,mi]=(pref("repAt")||"23:00").split(":").map(Number);const n=new Date(),t=new Date();t.setHours(h,mi||0,0,0);let seen="";try{seen=localStorage.getItem("p2p_repSeen")||""}catch(e){}return n>=t&&seen!==n.toDateString()&&orders.length>0}
let repToasted="";setInterval(()=>{try{if(repDue()&&repToasted!==new Date().toDateString()){repToasted=new Date().toDateString();toast("🌙 Your day report is ready");renderAlerts()}}catch(e){}},30000);
function buildReport(p){
  const [a,b]=periodRange(p);const inR=t=>t>=a&&t<b;const L={today:"Today",yesterday:"Yesterday",week:"This week",month:"This month",lastmonth:"Last month",all:"All time"}[p];
  const ol=orders.filter(o=>inR(o.time));const st=stats(ol);const done=ol.filter(o=>o.status==="Completed");
  const byMode=["P2P","Direct","Cash","Pair"].map(m=>{const L=ol.filter(o=>inMode(o,m));return[m==="Pair"?"P2P ⇄ Direct (vs exchange avg)":m,m==="Pair"?pairCount(L):L.length,m==="Pair"?pairSum(L):stats(L).profit]}).filter(x=>x[1]);
  const ex=exps.filter(x=>inR(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
  const dp=ppays.filter(x=>inR(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
  const {bal}=balances();const money=banks.reduce((t,k)=>t+bal[k.id],0);const usdt=stockLeft().USDT||0;
  const fmtD=t=>new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  const lines=[`📊 ${pref("biz")||APP_NAME} · ${L}${p!=="all"?` (${fmtD(a)}${b-a>DAY+1?" – "+fmtD(Math.min(b,Date.now())-1):""})`:""}`,"",
    `Orders: ${ol.length} (completed ${done.length}, cancelled ${ol.filter(o=>o.status==="Cancelled").length}, pending ${ol.filter(o=>o.status==="Pending"||o.status==="Appeal").length})`,
    `Bought: ${fmtQ(+st.b.q.toFixed(4))} @ avg ₹${st.b.avg.toFixed(2)} = ${inr(Math.round(st.b.v))}`,
    `Sold: ${fmtQ(+st.s.q.toFixed(4))} @ avg ₹${st.s.avg.toFixed(2)} = ${inr(Math.round(st.s.v))}`,
    `Spread profit: ${inr(+st.profit.toFixed(2))}`,
    ...byMode.map(([m,c,pf])=>`  · ${m}: ${c} orders, profit ${inr(+pf.toFixed(2))}`),
    `Personal expenses: ${inr(Math.round(ex))}`,
    `Net (profit − expenses): ${inr(Math.round(st.profit-ex))}`,
    dp?`Direct payments made: ${inr(Math.round(dp))}`:"",
    "",`Money left now: ${inr(Math.round(money))} · USDT left: ${fmtQ(+usdt.toFixed(2))}`].filter(x=>x!=="");
  const cnt={done:done.length,canc:ol.filter(o=>o.status==="Cancelled").length,pend:ol.filter(o=>o.status==="Pending"||o.status==="Appeal").length};
  return{text:lines.join("\n"),orders:ol,label:L,a,b,st,ex,dp,money,usdt,byMode,cnt};
}
sheets.profit=function(){let per="today",ca="",cb="";
  const rng=()=>{const d0=new Date();d0.setHours(0,0,0,0);const t0=d0.getTime();
    if(per==="today")return[t0,Date.now()+1];if(per==="7")return[t0-6*DAY,Date.now()+1];if(per==="30")return[t0-29*DAY,Date.now()+1];if(per==="all")return[0,Date.now()+1];
    const A=ca?new Date(ca+"T00:00:00").getTime():0,B=cb?new Date(cb+"T00:00:00").getTime()+DAY:Date.now()+1;return[A,B]};
  const draw=()=>{const [a,b]=rng();const R=profitReport(a,b);const L=(k,v,c,sub)=>`<div class="dqr"><span>${k}${sub?`<small style="display:block;color:var(--muted)">${sub}</small>`:""}</span><b class="${c||""}">${v}</b></div>`;const M=v=>(v<0?"−":"")+inr(Math.round(Math.abs(v)));
    openSheet(`<div class="insw"><div class="insh"><h3>Profit analytics</h3></div>
    ${insSeg("pa-seg",[["today","Today"],["7","7D"],["30","30D"],["all","All"],["c","Custom"]],per)}
    ${per==="c"?`<div class="row2" style="margin:8px 0"><label>From<input id="pa-a" type="date" value="${ca}"></label><label>To<input id="pa-b" type="date" value="${cb}"></label></div>`:""}
    <div class="rsug" style="margin-top:10px"><div><span>Net profit</span><b class="${R.net<0?"neg":"pos"}">${M(R.net)}</b></div><div><span>Orders</span><b>${R.n}</b></div><div><span>Volume</span><b>${inr(Math.round(R.vol))}</b></div></div>
    <div class="pcsec">How it adds up</div><div class="rml">
    ${L("Gross spread profit",M(R.gross),"",R.sellN+" completed sell"+(R.sellN===1?"":"s"))}
    ${L("Platform fees","−"+inr(Math.round(R.fees)),R.fees?"neg":"","from the Fee field on orders")}
    ${L("Transfer charges","−"+inr(Math.round(R.xfer)),R.xfer?"neg":"","bank charges on transfers")}
    ${L("Business costs","−"+inr(Math.round(R.biz)),R.biz?"neg":"","expenses marked Business")}
    ${L("<b>Net profit</b>",M(R.net),R.net<0?"neg":"")}</div>
    ${R.tds?`<div class="pcsec">Tax</div><div class="rml">${L("TDS deducted on sells",inr(Math.round(R.tds)),"","a tax credit, not a cost. Not taken off profit")}</div>`:""}
    <div class="pcsec">Averages</div><div class="rml">
    ${L("Profit per order",M(R.perOrder))}${L("Net profit per USDT sold",R.soldQ?"₹"+R.perUsdt.toFixed(3):"—")}${L("Average spread per USDT",R.soldQ?"₹"+R.spread.toFixed(3):"—","","before fees and costs")}${L("USDT sold",fmtQ(+R.soldQ.toFixed(4)))}</div>
    <div class="pcsec">After personal spending</div><div class="rml">${L("Personal expenses","−"+inr(Math.round(R.pers)),R.pers?"neg":"")}${L("<b>Left after personal spending</b>",M(R.takeHome),R.takeHome<0?"neg":"")}</div>
    <p class="note">Only Completed orders count. ${R.skipped?R.skipped+" cancelled, pending or disputed order"+(R.skipped>1?"s are":" is")+" left out. ":""}A day means the day the order was completed.${R.noCost?" "+R.noCost+" sell"+(R.noCost>1?"s have":" has")+" no buy cost yet, so profit on "+(R.noCost>1?"them":"it")+" is ₹0.":""}</p></div>`,el=>{
      el.querySelectorAll("#pa-seg button").forEach(x=>x.onclick=()=>{per=x.dataset.k;draw()});
      const ia=el.querySelector("#pa-a"),ib=el.querySelector("#pa-b");if(ia)ia.onchange=()=>{ca=ia.value;draw()};if(ib)ib.onchange=()=>{cb=ib.value;draw()}})};
  draw()};

