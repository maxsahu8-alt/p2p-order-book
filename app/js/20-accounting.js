// ---- bank management: one place for per-bank numbers (balance, today, pending, count, status, reconciliation)
function bankStats(b,mv,bal){
  mv=mv||movements();const t=mv.filter(x=>x.bank===b.id),td=t.filter(x=>isToday(x.time));
  const inn=td.filter(x=>x.amt>0).reduce((a,x)=>a+x.amt,0),out=-td.filter(x=>x.amt<0).reduce((a,x)=>a+x.amt,0);
  const pend=t.filter(x=>x.pend);const last=t.reduce((m,x)=>Math.max(m,x.time||0),0);
  const balance=bal==null?(+b.opening||0)+t.reduce((a,x)=>a+x.amt,0):bal;
  const checks=recs.filter(r=>r.kind==="bankrec"&&r.bank===b.id).sort((a,c)=>c.time-a.time);
  const idle=last?Math.floor((Date.now()-last)/DAY):null;
  let status="Active",tone="";
  if(b.status==="frozen"){status="Frozen";tone="bad"}else if(b.status==="paused"){status="Paused";tone="warn"}
  else{const L=b.limits||{};if(+L.ALL||+L.UPI||+L.IMPS||+L.NEFT){const u=limitUse();const left=Math.min(...["UPI","IMPS","NEFT"].filter(m=>+L[m]).map(m=>limitLeft(b,m,u)),+L.ALL?limitLeft(b,"IMPS",u):Infinity);if(left<=0){status="Limit reached";tone="warn"}}
    if(status==="Active"&&(idle==null||idle>=7)){status=idle==null?"New":"Idle "+idle+"d";tone="muted"}}
  return{balance,inn,out,volume:inn+out,todayN:td.length,total:t.length,pendN:pend.length,pendIn:pend.filter(x=>x.amt>0).reduce((a,x)=>a+x.amt,0),pendOut:-pend.filter(x=>x.amt<0).reduce((a,x)=>a+x.amt,0),last,status,tone,checks};
}
// TDS the exchange cuts from the wallet after a SELL completes, in coins (exact from wallet history / order page, else rupees ÷ rate)
function tdsCoin(o){if(!o||o.side!=="SELL"||o.status!=="Completed")return 0;const q=+o.tdsQ;if(q>0)return q;const t=+o.tds,r=+o.rate;return t>0&&r>0?+(t/r).toFixed(6):0}
function stockLeft(){
  const coins=new Set(["USDT",...Object.keys(settings.stock||{}),...orders.map(o=>o.coin)]);const out={};
  coins.forEach(c=>{let q=+(settings.stock||{})[c]||0;orders.forEach(o=>{if(o.coin===c&&o.status==="Completed")q+=o.side==="BUY"?+o.qty:-o.qty-tdsCoin(o)});out[c]=q});
  return out;
}
// KuCoin-style coin wallet history: opening, Buy Crypto, Sell Crypto and the Tax line of the same minute, with a running balance
function coinLedger(c){
  const rows=[];const q0=+((settings.stock||{})[c])||0;
  orders.filter(o=>o.coin===c&&o.status==="Completed"&&+o.qty>0).forEach(o=>{const t=doneT(o);
    if(o.side==="BUY")rows.push({t,label:"Buy Crypto",q:+o.qty,o});
    else{rows.push({t,label:"Sell Crypto",q:-o.qty,o});const x=tdsCoin(o);if(x>0)rows.push({t:t+1,label:"Tax",q:-x,o,est:o.tdsSrc!=="ledger"})}});
  rows.sort((a,b)=>a.t-b.t);let run=q0;rows.forEach(r=>{run+=r.q;r.bal=run});
  return{open:q0,rows,bal:run};
}
// ================= ACCOUNTING — one place for every money number (net worth, balances, stock, dues, profit)
// Rules:
//  • Bank/cash balance = opening + payments recorded on orders (not Cancelled) − expenses − party payments ± transfers
//  • Coin stock = opening stock + Completed BUY − Completed SELL
//  • Pending/Appeal order whose payment is already recorded = coins "in transit" (BUY: coming to you, SELL: owed to buyer)
//  • Party dues = what you owe Direct parties (dues − payments); paid extra = advance (asset)
//  • Profit = on each Completed SELL: (sell rate − average cost of your stock) × qty  (moving average cost, carries stock across days)
//  • Net worth = banks + cash + stock value (at average cost) + coins in transit − dues + advances
const r2=v=>Math.round((+v||0)*100)/100;
const doneT=o=>o.doneAt||o.time||0;
function ACC(){if(accCache)return accCache;
  const {bal,mv}=balances();let bank=0,cash=0;allBanks.forEach(b=>{const v=bal[b.id]||0;if(b.type==="Cash")cash+=v;else bank+=v+(b.lite&&b.lite.on?Math.max(0,+b.lite.bal||0):0)});
  const known=new Set(allBanks.map(b=>b.id));const orphan=mv.filter(x=>!known.has(x.bank));
  const stock=stockLeft();
  // moving average cost per coin
  const buys=orders.filter(o=>o.status==="Completed"&&o.side==="BUY"&&+o.qty>0);
  const allAvg={};buys.forEach(o=>{const a=allAvg[o.coin]=allAvg[o.coin]||{q:0,v:0};a.q+=+o.qty;a.v+=o.qty*o.rate});
  const fallback=c=>allAvg[c]&&allAvg[c].q?allAvg[c].v/allAvg[c].q:0;
  const pos={},sellP={},sellCost={};let noCost=0;
  orders.filter(o=>o.status==="Completed"&&+o.qty>0&&+o.rate>0).sort((a,b)=>doneT(a)-doneT(b)||(a.side==="BUY"?-1:1)).forEach(o=>{
    const c=o.coin;let p=pos[c];if(!p){const q0=+((settings.stock||{})[c])||0;p=pos[c]={q:q0,cost:q0>0?(+((settings.stockCost||{})[c])||fallback(c)):0}}
    const q=+o.qty;
    if(o.side==="BUY"){const nq=p.q+q;p.cost=p.q>0&&nq>0?(p.q*p.cost+q*o.rate)/nq:o.rate;p.q=nq}
    else{const fromStock=Math.max(0,Math.min(q,p.q));const extra=q-fromStock;const cExtra=fallback(c)||p.cost;
      const cost=fromStock*p.cost+extra*cExtra;if(!(p.cost||cExtra))noCost++;
      sellCost[o.id]=q?cost/q:0;sellP[o.id]=(p.cost||cExtra)?q*o.rate-cost:0;p.q-=q+tdsCoin(o);if(p.q<=1e-9)p.q=Math.max(0,p.q)}});
  const lastRate=c=>{const o=orders.filter(x=>x.coin===c&&x.status==="Completed"&&+x.rate>0).sort((a,b)=>doneT(b)-doneT(a))[0];return o?+o.rate:0};
  const avgCost={},stockVal={};let stockValue=0;
  Object.keys(stock).forEach(c=>{const q=stock[c];avgCost[c]=(pos[c]&&pos[c].cost)||fallback(c)||lastRate(c);stockVal[c]=Math.max(0,q)*avgCost[c];stockValue+=stockVal[c]});
  // coins in transit (pending/appeal with payment recorded, partly or fully)
  const transit={};let transitValue=0;const pend={inn:0,out:0,n:0};
  orders.filter(o=>o.status==="Pending"||o.status==="Appeal").forEach(o=>{const tot=orderTotal(o);if(!tot)return;
    const frac=noBank(o)?(o.dueLink?1:0):Math.min(1,allocated(o)/tot);pend.n++;
    if(o.side==="SELL")pend.inn+=tot;else pend.out+=tot;if(!frac)return;
    const dq=(o.side==="BUY"?1:-1)*o.qty*frac;transit[o.coin]=(transit[o.coin]||0)+dq;transitValue+=dq*(avgCost[o.coin]||o.rate)});
  // party dues (grouped by party id, so dues of a deleted party still count)
  const pid=new Set([...pdues.map(x=>x.party),...ppays.map(x=>x.party)]);let owe=0,adv=0;const perParty={};
  pid.forEach(id=>{const net=pdues.filter(x=>x.party===id).reduce((t,x)=>t+(+x.amt||0),0)-ppays.filter(x=>x.party===id).reduce((t,x)=>t+(+x.amt||0),0);perParty[id]=net;if(net>0)owe+=net;else adv+=-net});
  const money=bank+cash;
  const netWorth=money+stockValue+transitValue-owe+adv;
  return accCache={bal,bank:r2(bank),cash:r2(cash),money:r2(money),stock,avgCost,stockVal,stockValue:r2(stockValue),transit,transitValue:r2(transitValue),pend,owe:r2(owe),adv:r2(adv),perParty,
    sellP,sellCost,noCost,orphan:{n:orphan.length,amt:r2(orphan.reduce((t,x)=>t+x.amt,0))},netWorth:r2(netWorth)}}
// profit of a list of orders = sum of profit on its Completed SELL orders (cost from the running average)
// ---- profit analytics: gross spread − platform fees − transfer charges − business costs = net profit
// Only Completed orders count (Cancelled / Appeal / Pending never do). A day is the day the order was completed.
const doneTime=o=>o.doneAt||o.time;
function profitReport(a,b){
  const inR=t=>t>=a&&t<b;const P=ACC().sellP;
  const ds=orders.filter(o=>o.status==="Completed"&&inR(doneTime(o)));const sells=ds.filter(o=>o.side==="SELL");
  const gross=sells.reduce((t,o)=>t+(P[o.id]||0),0);
  const fees=ds.reduce((t,o)=>t+(+o.fee||0),0);const tds=sells.reduce((t,o)=>t+(+o.tds||0),0);
  const mvs=moves.filter(x=>inR(x.time)&&+x.cost>0);const xfer=mvs.reduce((t,x)=>t+(+x.cost||0),0);
  const bizL=exps.filter(x=>x.biz&&inR(x.time)),biz=bizL.reduce((t,x)=>t+(+x.amt||0),0);
  const pers=exps.filter(x=>!x.biz&&inR(x.time)).reduce((t,x)=>t+(+x.amt||0),0);
  const net=gross-fees-xfer-biz;const soldQ=sells.reduce((t,o)=>t+(+o.qty||0),0);
  const vol=ds.reduce((t,o)=>t+(+o.qty||0)*(+o.rate||0),0);
  const skipped=orders.filter(o=>inR(o.time)&&(o.status==="Cancelled"||o.status==="Appeal"||o.status==="Pending")).length;
  const noCost=sells.filter(o=>!(o.id in P)||P[o.id]===0&&!ACC().avgCost[o.coin]).length;
  return{gross,fees,tds,xfer,biz,pers,net,soldQ,vol,n:ds.length,sellN:sells.length,perOrder:ds.length?net/ds.length:0,perUsdt:soldQ?net/soldQ:0,spread:soldQ?gross/soldQ:0,skipped,takeHome:net-pers,noCost,ds};
}
function listProfit(list){const P=ACC().sellP;return list.reduce((t,o)=>t+(o.status==="Completed"&&o.side==="SELL"?(P[o.id]||0):0),0)}
function sheetNetWorth(){const A=ACC();const L=(k,v,c)=>`<div class="dqr"><span>${k}</span><b class="${c||""}">${v}</b></div>`;
  const coins=Object.keys(A.stock).filter(c=>Math.abs(A.stock[c])>1e-6);
  openSheet(`<div class="insw"><div class="insh"><h3>Net worth</h3></div>
    <div class="rsug"><div><span>Net worth</span><b>${inr(Math.round(A.netWorth))}</b></div><div><span>Money</span><b>${inr(Math.round(A.money))}</b></div><div><span>Coins</span><b>${inr(Math.round(A.stockValue+A.transitValue))}</b></div></div>
    <div class="pcsec">How it adds up</div><div class="rml">
    ${L("Banks",inr(Math.round(A.bank)))}${A.cash?L("Cash",inr(Math.round(A.cash))):""}
    ${coins.map(c=>L(`${esc(c)} ${fmtQ(+A.stock[c].toFixed(4))} × avg cost ₹${(A.avgCost[c]||0).toFixed(2)}`,inr(Math.round(A.stockVal[c]||0)))).join("")}
    ${Object.keys(A.transit).filter(c=>Math.abs(A.transit[c])>1e-6).map(c=>L(`${esc(c)} ${A.transit[c]>0?"+":"−"}${fmtQ(Math.abs(+A.transit[c].toFixed(4)))} in transit (${A.transit[c]>0?"paid, not received yet":"money in, not released yet"})`,(A.transit[c]>0?"+":"−")+inr(Math.round(Math.abs(A.transit[c])*(A.avgCost[c]||0))),A.transit[c]<0?"neg":"")).join("")}
    ${A.owe?L("You owe Direct parties","−"+inr(Math.round(A.owe)),"neg"):""}${A.adv?L("Advance paid to parties","+"+inr(Math.round(A.adv))):""}
    ${L("<b>Net worth</b>",inr(Math.round(A.netWorth)))}</div>
    ${A.pend.n?`<p class="note">${A.pend.n} pending/appeal order${A.pend.n>1?"s":""}: coins move only after Completed. Money already recorded on them is in the bank figures.</p>`:""}
    ${A.orphan.n?`<p class="note neg">${A.orphan.n} payment${A.orphan.n>1?"s":""} (${inr(Math.round(A.orphan.amt))}) point to a deleted bank and are not counted. Edit those orders and pick a bank.</p>`:""}
    ${A.noCost?`<p class="note">${A.noCost} sell${A.noCost>1?"s have":" has"} no buy cost yet, so profit on ${A.noCost>1?"them":"it"} is ₹0. Add your opening stock and its cost in Opening crypto stock.</p>`:""}
    <p class="note">Coins are valued at your average buy cost, not today's market rate.</p></div>`)}
