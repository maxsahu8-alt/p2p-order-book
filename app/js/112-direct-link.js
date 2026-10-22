// direct deal ↔ party dues
function daysTo(due){const d0=new Date();d0.setHours(0,0,0,0);return Math.round((new Date(due+"T00:00")-d0)/864e5)}
function accLefts(p,exceptOrder){const L={};(p.accounts||[]).forEach(a=>{const got=ppays.filter(x=>x.party===p.id&&x.account===a.id&&(!exceptOrder||x.order!==exceptOrder)).reduce((t,x)=>t+(+x.amt||0),0);L[a.id]=Math.max(0,(+a.target||0)-got)});return L}
async function syncDirectLink(o){const old=recs.filter(r=>r.order===o.id&&(r.kind==="pdue"||r.kind==="ppay"));for(const r of old)await delRec(r.id);
  if(!(o.dueLink&&o.party&&o.status!=="Cancelled"))return;const p=parties.find(x=>x.id===o.party);
  const amt=Math.round(orderTotal(o)*100)/100,note=`${o.side==="BUY"?"Bought":"Sold"} ${fmtQ(o.qty)} ${o.coin} @ ₹${fmtR(o.rate)}${o.cp?" · "+o.cp:""}`;
  if(o.side==="BUY"){await putRec({id:"dl_"+o.id,kind:"pdue",party:o.party,amt,note,order:o.id,time:o.time});return}
  const base={kind:"ppay",party:o.party,paidBy:(o.cp||"Buyer").slice(0,40),splits:[],proofs:[],note,order:o.id,time:o.time};
  let parts=[];if(o.payAcc&&o.payAcc!=="auto")parts=[[o.payAcc,amt]];
  else if(o.payAcc==="auto"&&p){const lefts=accLefts(p,o.id);let rem=amt;(p.accounts||[]).filter(a=>lefts[a.id]>0.5).sort((x,y)=>(x.due||"9999")<(y.due||"9999")?-1:(x.due||"9999")>(y.due||"9999")?1:0).forEach(a=>{if(rem<=0.5)return;const t=Math.min(rem,lefts[a.id]);parts.push([a.id,Math.round(t*100)/100]);rem-=t});if(rem>0.5)parts.push(["",Math.round(rem*100)/100])}
  else parts=[["",amt]];
  for(let k=0;k<parts.length;k++)await putRec({...base,id:"dl_"+o.id+(k?"_"+k:""),account:parts[k][0],amt:parts[k][1],time:o.time+k})}
