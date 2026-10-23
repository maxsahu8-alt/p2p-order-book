// ================= REPORT (summary cards + charts; the share text stays the same)
const RP_P=[["today","Today"],["yesterday","Yesterday"],["week","This week"],["month","This month"],["lastmonth","Last month"],["all","All time"]];
const rpM=v=>(v<0?"−":"")+inr(Math.round(Math.abs(v)));
const rpK=v=>{const a=Math.abs(v),s=v<0?"−":"";return s+"₹"+(a>=1e5?(a/1e5).toFixed(1).replace(/\.0$/,"")+"L":a>=1e3?(a/1e3).toFixed(1).replace(/\.0$/,"")+"k":Math.round(a))};
// the period to compare with
function rpPrev(p,a,b){const n=Math.min(b,Date.now()+1);
  if(p==="today")return[a-DAY,a,"vs yesterday"];
  if(p==="yesterday")return[a-DAY,a,"vs day before"];
  if(p==="week")return[a-7*DAY,a-7*DAY+(n-a),"vs same days last week"];
  if(p==="month"){const d=new Date(a),pa=new Date(d.getFullYear(),d.getMonth()-1,1).getTime();return[pa,Math.min(a,pa+(n-a)),"vs same days last month"]}
  if(p==="lastmonth"){const d=new Date(a);return[new Date(d.getFullYear(),d.getMonth()-1,1).getTime(),a,"vs month before"]}
  return null}
// chart buckets: 2-hour blocks for a day, days for a week or month, months for all time (last 12)
function rpBuckets(p,a){const B=[],now=Date.now();
  if(p==="today"||p==="yesterday"){for(let h=0;h<24;h+=2)B.push({a:a+h*36e5,b:a+(h+2)*36e5,l:h===0?"12am":h===12?"12pm":h<12?h+"am":(h-12)+"pm",k:h%6===0,t:`${h===0?12:h>12?h-12:h}${h<12?"am":"pm"}–${(h+2)%12||12}${h+2<12||h+2===24?"am":"pm"}`})}
  else if(p==="week"){for(let i=0;i<7;i++){const t=a+i*DAY,d=new Date(t);B.push({a:t,b:t+DAY,l:d.toLocaleDateString("en-IN",{weekday:"short"}),k:true,t:d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})})}}
  else if(p==="month"||p==="lastmonth"){const d=new Date(a),n=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    for(let i=1;i<=n;i++){const t=new Date(d.getFullYear(),d.getMonth(),i).getTime();B.push({a:t,b:new Date(d.getFullYear(),d.getMonth(),i+1).getTime(),l:String(i),k:i===1||i%5===0,t:new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short"})})}}
  else{const first=orders.length?Math.min(...orders.map(o=>o.time)):now,e=new Date();let s=new Date(first);s=new Date(s.getFullYear(),s.getMonth(),1);
    const lim=new Date(e.getFullYear(),e.getMonth()-11,1);if(s<lim)s=lim;
    for(let d=s;d<=e;d=new Date(d.getFullYear(),d.getMonth()+1,1)){const t=d.getTime();B.push({a:t,b:new Date(d.getFullYear(),d.getMonth()+1,1).getTime(),l:d.toLocaleDateString("en-IN",{month:"short"}),k:true,t:d.toLocaleDateString("en-IN",{month:"long",year:"numeric"})})}}
  const P=ACC().sellP;const sells=orders.filter(o=>o.status==="Completed"&&o.side==="SELL");
  B.forEach(x=>{const L=sells.filter(o=>o.time>=x.a&&o.time<x.b);x.v=L.reduce((t,o)=>t+(P[o.id]||0),0);x.n=L.length;x.fut=x.a>now;x.cur=now>=x.a&&now<x.b});
  return B}
function rpChart(B){if(!B.some(x=>x.n))return`<div class="rpempty">No completed sells in this period</div>`;
  const W=320,H=132,pt=16,pb=20,ch=H-pt-pb,n=B.length;
  const mx=Math.max(0,...B.map(x=>x.v)),mn=Math.min(0,...B.map(x=>x.v)),sp=(mx-mn)||1;
  const y=v=>pt+(mx-v)/sp*ch,z=y(0),gap=n>20?2:n>10?4:8,bw=(W-gap*(n-1))/n;
  const bars=B.map((x,i)=>{const X=(i*(bw+gap)).toFixed(1),hit=`<rect class="rph" data-i="${i}" x="${X}" y="0" width="${(bw+gap).toFixed(1)}" height="${H}"/>`;
    if(x.fut)return`<rect class="rpf" x="${X}" y="${(z-1).toFixed(1)}" width="${bw.toFixed(1)}" height="2" rx="1"/>`+hit;
    const h=x.v?Math.max(2,Math.abs(y(x.v)-z)):0;
    return(h?`<rect class="rpb${x.v<0?" n":""}${x.cur?" c":""}" data-b="${i}" x="${X}" y="${(x.v<0?z:z-h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4,bw/3).toFixed(1)}"/>`:"")+hit}).join("");
  const lab=B.map((x,i)=>x.k?`<text x="${(i*(bw+gap)+bw/2).toFixed(1)}" y="${H-5}" text-anchor="middle">${esc(x.l)}</text>`:"").join("");
  const grid=(mx>0?`<line class="rpg" x1="0" x2="${W}" y1="${y(mx).toFixed(1)}" y2="${y(mx).toFixed(1)}"/><text class="rpgl" x="${W}" y="${(y(mx)-4).toFixed(1)}" text-anchor="end">${rpK(mx)}</text>`:"")+
    (mn<0?`<line class="rpg" x1="0" x2="${W}" y1="${y(mn).toFixed(1)}" y2="${y(mn).toFixed(1)}"/><text class="rpgl" x="${W}" y="${(y(mn)+11).toFixed(1)}" text-anchor="end">${rpK(mn)}</text>`:"");
  return`<svg class="rpsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profit chart">${grid}<line class="rpz" x1="0" x2="${W}" y1="${z.toFixed(1)}" y2="${z.toFixed(1)}"/>${bars}${lab}</svg>`}
function rpTipText(B,i){if(i==null){const live=B.filter(x=>x.n);if(!live.length)return"";const best=live.reduce((m,x)=>x.v>m.v?x:m,live[0]);return`Best: <b>${esc(best.t)}</b> · ${rpM(best.v)} · tap a bar for details`}
  const x=B[i];return x.fut?`<b>${esc(x.t)}</b> · not yet`:`<b>${esc(x.t)}</b> · ${x.n?`<span class="${x.v<0?"neg":"pos"}">${rpM(x.v)}</span> from ${x.n} sell${x.n>1?"s":""}`:"no sells"}`}
function rpHtml(p){const R=buildReport(p),st=R.st,pf=st.profit,pv=rpPrev(p,R.a,R.b);
  let delta="";if(pv){const L=orders.filter(o=>o.time>=pv[0]&&o.time<pv[1]);const d=pf-listProfit(L);if(L.length)delta=`<span class="rpdl ${d>=0?"pos":"neg"}">${d>=0?"▲":"▼"} ${rpM(Math.abs(d))}</span><small>${pv[2]}</small>`}
  const net=pf-R.ex-R.chg,sold=st.s.v,margin=sold?pf/sold*100:0,sprd=st.b.avg&&st.s.avg?st.s.avg-st.b.avg:null,vol=st.b.v+st.s.v;
  const B=rpBuckets(p,R.a),c=R.cnt,tot=c.done+c.canc+c.pend;
  const bmx=Math.max(st.b.v,st.s.v)||1;
  const bs=(k,cls,q,avg,v)=>`<div class="rpbr"><div class="rpbt"><span><i class="${cls}"></i>${k} <small>${fmtQ(+q.toFixed(4))} USDT</small></span><b>${inr(Math.round(v))}</b></div><div class="rpbk"><i class="${cls}" style="width:${Math.max(v?2:0,v/bmx*100).toFixed(1)}%"></i></div><small>avg ₹${avg?avg.toFixed(2):"—"}</small></div>`;
  const seg=(v,cls)=>v?`<i class="${cls}" style="flex:${v}"></i>`:"";
  const modes=R.byMode.filter(m=>!/Pair/.test(m[0]));const mmx=Math.max(1,...modes.map(m=>Math.abs(m[2])));
  const row=(k,v,cls,sub)=>`<div class="rpr${cls?" "+cls:""}"><span>${k}${sub?`<small>${sub}</small>`:""}</span><b>${v}</b></div>`;
  return{R,B,html:`
  <div class="rphero"><span class="rpk">Profit · ${esc(R.label)}</span>
    <div class="rpbig ${pf<0?"neg":pf>0?"pos":""}">${pf>0?"+":""}${rpM(pf)}</div>
    <div class="rpdel">${delta}</div>
    <div class="rpkp">
      <div><span>Orders</span><b>${tot}</b><small>${c.done} done</small></div>
      <div><span>Volume</span><b>${rpK(vol)}</b><small>buy + sell</small></div>
      <div><span>Margin</span><b>${sold?margin.toFixed(1)+"%":"—"}</b><small>profit ÷ sold</small></div>
    </div></div>
  <div class="rpcard"><div class="rph3"><b>Profit trend</b><small>${p==="today"||p==="yesterday"?"every 2 hours":p==="all"?"by month":"by day"}</small></div>
    <div class="rpch" id="rpCh">${rpChart(B)}</div><div class="rptip" id="rpTip">${rpTipText(B)}</div></div>
  <div class="rpcard"><div class="rph3"><b>Buy vs sell</b>${sprd!=null?`<small class="rpsp ${sprd<0?"neg":""}">Spread ₹${sprd.toFixed(2)} / USDT</small>`:""}</div>
    ${bs("Bought","b",st.b.q,st.b.avg,st.b.v)}${bs("Sold","s",st.s.q,st.s.avg,st.s.v)}</div>
  ${tot?`<div class="rpcard"><div class="rph3"><b>Orders</b><small>${tot} total</small></div>
    <div class="rpst">${seg(c.done,"d")}${seg(c.pend,"p")}${seg(c.canc,"x")}</div>
    <div class="rplg"><span><i class="d"></i>Completed <b>${c.done}</b></span><span><i class="p"></i>Pending <b>${c.pend}</b></span><span><i class="x"></i>Cancelled <b>${c.canc}</b></span></div></div>`:""}
  ${modes.length>1?`<div class="rpcard"><div class="rph3"><b>Profit by type</b></div>${modes.map(([m,n,v])=>`<div class="rpbr"><div class="rpbt"><span>${esc(m)} <small>${n} order${n>1?"s":""}</small></span><b class="${v<0?"neg":""}">${rpM(v)}</b></div><div class="rpbk"><i class="${v<0?"s":"m"}" style="width:${(Math.abs(v)/mmx*100).toFixed(1)}%"></i></div></div>`).join("")}</div>`:""}
  <div class="rpcard"><div class="rph3"><b>After costs</b></div>
    ${row("Trading profit",(pf>0?"+":"")+rpM(pf),pf<0?"rn":"")}
    ${R.chg?row("Bank charges","−"+inr(Math.round(R.chg)),"rn"):""}
    ${row("Personal expenses",R.ex?"−"+inr(Math.round(R.ex)):"₹0",R.ex?"rn":"")}
    ${row("Net",(net>0?"+":"")+rpM(net),"tot "+(net<0?"rn":"rg"),net<0?"costs were more than profit":"")}</div>
  <div class="rpcard"><div class="rph3"><b>Balance now</b></div>
    <div class="rpkp rpkp2"><div><span>Money in banks</span><b>${inr(Math.round(R.money))}</b></div><div><span>USDT left</span><b>${fmtQ(+R.usdt.toFixed(2))}</b></div></div>
    ${R.dp?row("Direct payments made",inr(Math.round(R.dp)),"",esc(R.label.toLowerCase())):""}</div>
  <details class="rpd"><summary>Message preview</summary><pre id="repTxt">${esc(R.text)}</pre></details>`}}
sheets.report=function(){let p="today";
  const draw=el=>{const {R,B,html}=rpHtml(p);el.querySelector("#rpBody").innerHTML=html;
    el.querySelector("#repWa").href="https://wa.me/?text="+encodeURIComponent(R.text);el.querySelector("#repCsv").textContent=`Orders CSV (${R.orders.length})`;
    const ch=el.querySelector("#rpCh"),tip=el.querySelector("#rpTip");
    if(ch)ch.onclick=e=>{const h=e.target.closest("[data-i]");if(!h)return;const i=+h.dataset.i;ch.querySelectorAll(".rpb").forEach(r=>r.classList.toggle("on",+r.dataset.b===i));tip.innerHTML=rpTipText(B,i)}};
  openSheet(`<div class="rep rpw"><h3>Report</h3><div class="filters" id="repP">${RP_P.map(([k,l],i)=>`<button type="button" class="chip" aria-pressed="${i===0}" data-p="${k}">${l}</button>`).join("")}</div>
    <div id="rpBody"></div>
    <div class="row2"><button class="primary" type="button" id="repCopy">Copy</button><a class="primary wa" id="repWa" href="#" target="_blank" rel="noopener">WhatsApp</a></div>
    <div class="row2"><button class="mini ghost" type="button" id="repCsv">Orders CSV</button><button class="mini ghost" type="button" data-ai="full">AI report</button><button class="mini ghost" type="button" data-close>Close</button></div></div>`,el=>{
    draw(el);
    el.querySelector("#repP").onclick=e=>{const b=e.target.closest("[data-p]");if(!b)return;p=b.dataset.p;el.querySelectorAll("#repP .chip").forEach(x=>x.setAttribute("aria-pressed",x===b));draw(el)};
    el.querySelector("#repCopy").onclick=()=>copyText(buildReport(p).text,el.querySelector("#repTxt"));
    el.querySelector("#repCsv").onclick=()=>{const R=buildReport(p);const q=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
      const rows=[...R.orders].sort((a,b)=>a.time-b.time).map(o=>{const d=new Date(o.time);return[d.toLocaleDateString("en-CA"),d.toLocaleTimeString("en-GB"),modeOf(o),o.side,o.coin,o.qty,o.rate,orderTotal(o).toFixed(2),o.status,o.platform,o.pay,o.cp,(o.splits||[]).map(x=>bankName(x.bank)+" "+x.amt).join("; "),o.note].map(q).join(",")});
      saveFile(`Pexai-${R.label.toLowerCase().replace(/\s+/g,"-")}-${new Date().toLocaleDateString("en-CA")}.csv`,"﻿"+["Date,Time,Mode,Side,Coin,Quantity,Rate,Total INR,Status,Platform,Payment,Counterparty,Banks,Note",...rows].join("\n"))};
  })};
