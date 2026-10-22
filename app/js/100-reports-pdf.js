// ---------- reports ----------
function periodRange(p){const n=new Date();const d0=new Date(n);d0.setHours(0,0,0,0);
  if(p==="today")return[d0.getTime(),Date.now()+1];
  if(p==="yesterday"){const a=d0.getTime()-DAY;return[a,d0.getTime()]}
  if(p==="week")return[weekStart(),Date.now()+1];
  if(p==="month")return[new Date(n.getFullYear(),n.getMonth(),1).getTime(),Date.now()+1];
  if(p==="lastmonth")return[new Date(n.getFullYear(),n.getMonth()-1,1).getTime(),new Date(n.getFullYear(),n.getMonth(),1).getTime()];
  return[0,Date.now()+1]}
let jspdfP=null;
function loadJs2(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>{s.remove();rej(new Error("load"))};document.head.appendChild(s)})}
function loadJsPDF(){if(window.jspdf)return Promise.resolve(window.jspdf);return jspdfP||(jspdfP=loadJs2("lib/jspdf.umd.min.js").catch(()=>loadJs2("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")).then(()=>{if(!window.jspdf)throw new Error("no jspdf");return window.jspdf}).catch(e=>{jspdfP=null;throw e}))}
function partyStmt(p,per){const now=Date.now(),d0=new Date();d0.setHours(0,0,0,0);
  const from=per==="week"?weekStart():per==="month"?new Date(d0.getFullYear(),d0.getMonth(),1).getTime():per==="d30"?d0.getTime()-29*864e5:0;
  const all=[...pdues.filter(x=>x.party===p.id).map(x=>({...x,_t:"due"})),...ppays.filter(x=>x.party===p.id).map(x=>({...x,_t:"pay"}))].sort((a,b)=>a.time-b.time);
  let open=0;all.filter(x=>x.time<from).forEach(x=>open+=x._t==="due"?+x.amt||0:-(+x.amt||0));
  let bal=open,added=0,paid=0;const rows=all.filter(x=>x.time>=from).map(x=>{const a=+x.amt||0;if(x._t==="due"){added+=a;bal+=a}else{paid+=a;bal-=a}return{...x,bal}});
  const first=from||(all[0]?all[0].time:now);const fd=t=>new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  const byPerson={};rows.filter(x=>x._t==="pay").forEach(x=>{const n=payerName(x);byPerson[n]=(byPerson[n]||0)+(+x.amt||0)});
  return{from,open,added,paid,close:bal,rows,byPerson,label:fd(first)+" to "+fd(now),per}}
function pxLogoPng(){return new Promise(ok=>{try{const svg=PX_LOGO.replace(/pxg/g,"pxe").replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace('width="40" height="40"','width="160" height="190"');const im=new Image();im.onload=()=>{try{const c=document.createElement("canvas");c.width=160;c.height=190;c.getContext("2d").drawImage(im,0,0,160,190);ok(c.toDataURL("image/png"))}catch(e){ok(null)}};im.onerror=()=>ok(null);im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)}catch(e){ok(null)}})}
async function partyPdf(p,R,incAcc,ret){const {jsPDF}=await loadJsPDF();const LG=await pxLogoPng();const d=new jsPDF({unit:"mm",format:"a4"});
  const W=210,M=14,cl=t=>String(t==null?"":t).replace(/₹/g,"Rs. ").replace(/[→➜]/g,"to").replace(/[–—]/g,"-").replace(/[^\x20-\x7E\xA0-\xFF]/g,"").trim();
  const rs=n=>(n<-0.5?"-":"")+"Rs. "+Math.abs(Math.round(n)).toLocaleString("en-IN");
  const ink=[17,24,39],mut=[107,114,128],line=[229,231,235],grn=[5,150,105],red=[220,38,38],amb=[180,110,10];
  const tm=t=>new Date(t).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"});
  const accName=x=>{const a=(p.accounts||[]).find(k=>k.id===x.account)||{};return a.bankName||a.upi||"account"};
  // header band
  d.setFillColor(...ink);d.rect(0,0,W,30,"F");const TX=LG?M+15:M;if(LG)try{d.addImage(LG,"PNG",M,8,10.5,12.5)}catch(e){}d.setTextColor(255,255,255);d.setFont("helvetica","bold");d.setFontSize(17);d.text("Party Statement",TX,14);
  d.setFont("helvetica","normal");d.setFontSize(9);d.setTextColor(200,205,215);d.text(APP_NAME+" - Direct payments",TX,21);
  d.text("Generated "+cl(tm(Date.now())),W-M,14,{align:"right"});d.text("Period: "+cl(R.label),W-M,21,{align:"right"});
  let y=42;d.setTextColor(...ink);d.setFont("helvetica","bold");d.setFontSize(15);d.text(cl(p.name)||"Party",M,y);
  const DAYS_=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];const dd=p.dueDay!==""&&p.dueDay!=null?DAYS_[+p.dueDay]:"";
  const sub=[p.phone,dd?"Pay day "+dd:"",+p.weekly?"Weekly "+rs(+p.weekly):""].filter(Boolean).map(cl).join("   |   ");
  d.setFont("helvetica","normal");d.setFontSize(9.5);d.setTextColor(...mut);if(sub){y+=6;d.text(sub,M,y)}
  // summary boxes
  y+=8;const bw=(W-2*M-9)/4,boxes=[["Opening balance",rs(R.open),ink],["Amount added",rs(R.added),amb],["Paid",rs(R.paid),grn],[R.close<-0.5?"Extra paid":"Closing balance",rs(Math.abs(R.close)),R.close>0.5?red:grn]];
  boxes.forEach(([l,v,c],i)=>{const x=M+i*(bw+3);d.setFillColor(246,247,249);d.setDrawColor(...line);d.roundedRect(x,y,bw,19,2,2,"FD");d.setFontSize(8);d.setTextColor(...mut);d.text(l,x+4,y+7);d.setFont("helvetica","bold");d.setFontSize(11.5);d.setTextColor(...c);d.text(v,x+4,y+14.5);d.setFont("helvetica","normal")});
  y+=27;
  if(incAcc&&(p.accounts||[]).length){d.setFont("helvetica","bold");d.setFontSize(10);d.setTextColor(...ink);d.text("Their accounts",M,y);y+=5;d.setFont("helvetica","normal");d.setFontSize(9);
    (p.accounts||[]).forEach(a=>{const t=[a.bankName,a.holder,a.accNo?"A/c "+a.accNo:"",a.ifsc?"IFSC "+a.ifsc:"",a.upi?"UPI "+a.upi:""].filter(Boolean).map(cl).join("   |   ");const ls=d.splitTextToSize(t,W-2*M);d.setTextColor(...mut);d.text(ls,M,y);y+=ls.length*4.4+1.5});y+=4}
  // table
  const cx={date:M,det:M+30,add:142,paid:170,bal:W-M};
  const head=()=>{d.setFillColor(...ink);d.rect(M,y,W-2*M,8,"F");d.setFont("helvetica","bold");d.setFontSize(8.5);d.setTextColor(255,255,255);
    d.text("Date",cx.date+2,y+5.3);d.text("Details",cx.det,y+5.3);d.text("Added",cx.add,y+5.3,{align:"right"});d.text("Paid",cx.paid,y+5.3,{align:"right"});d.text("Balance",cx.bal-2,y+5.3,{align:"right"});y+=8;d.setFont("helvetica","normal")};
  head();
  d.setFontSize(8.5);d.setFillColor(250,250,251);d.rect(M,y,W-2*M,7,"F");d.setTextColor(...mut);d.text("Opening balance",cx.det,y+4.8);d.setTextColor(...ink);d.text(rs(R.open),cx.bal-2,y+4.8,{align:"right"});y+=7;
  R.rows.forEach((x,i)=>{const det=x._t==="due"?"Amount to pay added"+(x.note?" - "+x.note:""):"Paid to "+accName(x)+" by "+payerName(x)+((x.splits||[]).length?" from "+x.splits.map(sp=>bankName(sp.bank)+" ("+sp.method+")").join(", "):"")+(x.utr?" - UTR "+x.utr:"")+(x.note?" - "+x.note:"")+((x.proofs||[]).length?" - "+x.proofs.length+" proof":"");
    const ls=d.splitTextToSize(cl(det),cx.add-cx.det-22);const h=Math.max(7,ls.length*4+3);
    if(y+h>280){d.addPage();y=16;head();d.setFontSize(8.5)}
    if(i%2){d.setFillColor(250,250,251);d.rect(M,y,W-2*M,h,"F")}
    d.setDrawColor(...line);d.line(M,y+h,W-M,y+h);
    d.setTextColor(...mut);d.text(cl(tm(x.time)),cx.date+2,y+4.8);d.setTextColor(...ink);d.text(ls,cx.det,y+4.8);
    if(x._t==="due"){d.setTextColor(...amb);d.text(rs(+x.amt||0),cx.add,y+4.8,{align:"right"})}else{d.setTextColor(...grn);d.text(rs(+x.amt||0),cx.paid,y+4.8,{align:"right"})}
    d.setTextColor(...(x.bal>0.5?red:ink));d.setFont("helvetica","bold");d.text(rs(x.bal),cx.bal-2,y+4.8,{align:"right"});d.setFont("helvetica","normal");y+=h});
  if(!R.rows.length){d.setTextColor(...mut);d.text("No entries in this period.",cx.det,y+5);y+=8}
  // totals
  if(y+10>280){d.addPage();y=16}
  d.setFillColor(240,242,245);d.rect(M,y,W-2*M,8,"F");d.setFont("helvetica","bold");d.setTextColor(...ink);d.text("Total",cx.det,y+5.3);d.setTextColor(...amb);d.text(rs(R.added),cx.add,y+5.3,{align:"right"});d.setTextColor(...grn);d.text(rs(R.paid),cx.paid,y+5.3,{align:"right"});d.setTextColor(...(R.close>0.5?red:ink));d.text(rs(R.close),cx.bal-2,y+5.3,{align:"right"});y+=14;
  const pb=Object.entries(R.byPerson);if(pb.length){if(y+8+pb.length*5>285){d.addPage();y=16}d.setFontSize(10);d.setTextColor(...ink);d.text("Paid by",M,y);y+=5;d.setFont("helvetica","normal");d.setFontSize(9);
    pb.sort((a,b)=>b[1]-a[1]).forEach(([n,v])=>{d.setTextColor(...mut);d.text(cl(n),M,y);d.setTextColor(...ink);d.text(rs(v),M+60,y,{align:"right"});y+=5})}
  const n=d.getNumberOfPages();for(let i=1;i<=n;i++){d.setPage(i);d.setFont("helvetica","normal");d.setFontSize(7.5);d.setTextColor(...mut);d.setDrawColor(...line);d.line(M,288,W-M,288);d.text("Generated by "+APP_NAME+" - computer generated statement - "+cl(p.name),M,292);d.text("Page "+i+" of "+n,W-M,292,{align:"right"})}
  const fn=("Pexai-Statement-"+cl(p.name).replace(/[^A-Za-z0-9]+/g,"-")+"-"+new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)+".pdf").replace(/-+/g,"-");
  if(ret)return{blob:d.output("blob"),name:fn};
  if(dlApi)await saveFile(fn,d.output("blob"));else d.save(fn);
  return d}
let qrP=null;
function loadQR(){if(window.qrcode)return Promise.resolve();return qrP||(qrP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="lib/qrcode.js";s.onload=()=>window.qrcode?res():rej(new Error("qr"));s.onerror=()=>{qrP=null;s.remove();rej(new Error("load"))};document.head.appendChild(s)}))}
function convRate(coin){coin=coin||pref("coin")||"USDT";const o=orders.filter(x=>x.coin===coin&&x.status!=="Cancelled"&&+x.rate>0).sort((a,b)=>b.time-a.time)[0];return o?+o.rate:null}
function allProofs(){const out=[];const pn=id=>(parties.find(p=>p.id===id)||{}).name||"Party";
  recs.forEach(r=>{(r.proofs||[]).forEach(id=>{let k="other",label="Payment",sub="";
    if(!r.kind){k="order";label=`${r.side==="BUY"?"Buy":"Sell"} ${fmtQ(r.qty)} ${r.coin}`;sub=[r.cp,inr(Math.round(orderTotal(r)))].filter(Boolean).join(" · ")}
    else if(r.kind==="ppay"){k="direct";label=pn(r.party);sub=inr(Math.round(+r.amt||0))+(r.note?" · "+r.note:"")}
    else if(r.kind==="expense"){label="Expense";sub=inr(Math.round(+r.amt||0))}
    out.push({id,k,label,sub:(sub?sub+" · ":"")+new Date(r.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"}),time:r.time||0})})});
  recs.filter(r=>r.kind==="intakejob").forEach(r=>(r.assets||[]).forEach(id=>{if(!out.some(x=>x.id===id))out.push({id,k:"intake",label:"Smart intake",sub:new Date(r.time).toLocaleDateString("en-IN",{day:"numeric",month:"short"}),time:r.time||0})}));
  return out.sort((a,b)=>b.time-a.time)}
const remSeen=new Set();
function remindTick(){const now=Date.now();reminds.filter(r=>!r.done&&r.at&&r.at<=now&&!remSeen.has(r.id)).forEach(r=>{remSeen.add(r.id);toast("⏰ "+r.text);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}})}
setInterval(()=>{try{remindTick()}catch(e){}},20000);
function drawPayCard(c,o,T){const W=1080,P=72,qrN=o.qr?(()=>{const qr=qrcode(0,"M");qr.addData("upi://pay?"+[["pa",c.upi],["pn",c.holder],c.amt?["am",c.amt.toFixed(2)]:null,["cu","INR"],c.note?["tn",c.note]:null].filter(x=>x&&x[1]).map(([k,v])=>k+"="+encodeURIComponent(v)).join("&"));qr.make();return qr})():null;
  const rows=[];if(o.bank){rows.push(["Account holder",c.holder],["Bank",c.bank],["Account number",c.acc],["IFSC",c.ifsc]);if(c.branch)rows.push(["Branch",c.branch])}
  if(o.upi)rows.push(["UPI ID",c.upi]);const R=rows.filter(r=>r[1]);
  const headH=c.amt?330:250,rowH=104,qrS=o.qr?520:0,H=headH+40+R.length*rowH+(o.qr?qrS+80:0)+(o.warn?130:40)+40;
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");const F="system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  g.fillStyle="#f4f5f7";g.fillRect(0,0,W,H);
  const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
  const gr=g.createLinearGradient(0,0,W,headH);gr.addColorStop(0,T[0]);gr.addColorStop(1,T[1]);g.fillStyle=gr;rr(24,24,W-48,headH,40);g.fill();
  g.fillStyle="rgba(255,255,255,.08)";g.beginPath();g.arc(W-120,60,180,0,7);g.fill();g.beginPath();g.arc(W-40,headH,120,0,7);g.fill();
  g.fillStyle="rgba(255,255,255,.75)";g.font=`600 30px ${F}`;g.fillText((c.mode==="party"?"PAY TO · "+(c.pname||""):(pref("biz")||"Payment details")).toUpperCase().slice(0,34),P,108);
  g.fillStyle="#fff";g.font=`800 58px ${F}`;g.fillText((c.holder||pref("owner")||"Pay to").slice(0,26),P,182);
  if(c.amt){g.font=`800 76px ${F}`;g.fillText("₹"+c.amt.toLocaleString("en-IN"),P,282)}
  else{g.fillStyle="rgba(255,255,255,.75)";g.font=`500 30px ${F}`;g.fillText(c.note||(c.mode==="party"?"Bank and UPI details":"Send payment to the details below"),P,226)}
  if(c.amt&&c.note){g.fillStyle="rgba(255,255,255,.75)";g.font=`500 28px ${F}`;g.textAlign="right";g.fillText(c.note,W-P,282);g.textAlign="left"}
  let y=headH+64;g.fillStyle="#fff";rr(24,y-24,W-48,R.length*rowH+24,32);if(R.length)g.fill();
  R.forEach(([l,v],i)=>{const ty=y+i*rowH;g.fillStyle="#6b7280";g.font=`500 26px ${F}`;g.fillText(l,P,ty+30);g.fillStyle="#111827";g.font=`700 38px ${F}`;g.fillText(String(v).slice(0,34),P,ty+76);if(i<R.length-1){g.fillStyle="#e5e7eb";g.fillRect(P,ty+rowH-6,W-2*P,2)}});
  y+=R.length*rowH+(R.length?24:0);
  if(qrN){y+=10;const n=qrN.getModuleCount(),cs=Math.floor(qrS*0.86/n),qs=cs*n,qx=(W-qs)/2,qy=y+40;g.fillStyle="#fff";rr(24,y,W-48,qs+120,32);g.fill();
    g.fillStyle="#111";for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(qrN.isDark(r,k))g.fillRect(qx+k*cs,qy+r*cs,cs,cs);
    g.textAlign="center";g.fillStyle="#111827";g.font=`700 34px ${F}`;g.fillText("Scan with any UPI app",W/2,qy+qs+56);g.textAlign="left";y+=qs+140}
  if(o.warn){g.fillStyle="#fff7ed";rr(24,y+8,W-48,96,24);g.fill();g.fillStyle="#9a3412";g.font=`600 27px ${F}`;g.textAlign="center";g.fillText("Pay only from your own bank account. Name must match.",W/2,y+66);g.textAlign="left"}
  return cv}
sheets.pair=function(id){const o=orders.find(x=>x.id===id);if(!o)return;const p=pairOf(o);
  const opp=o.side==="BUY"?"SELL":"BUY";
  const cand=orders.filter(x=>x.id!==o.id&&x.side===opp&&x.coin===o.coin&&modeOf(x)!==modeOf(o)&&!pairOf(x)&&Math.abs(x.time-o.time)<14*DAY).sort((a,b)=>(Math.abs(a.qty-o.qty)/o.qty+Math.abs(a.time-o.time)/DAY/7)-(Math.abs(b.qty-o.qty)/o.qty+Math.abs(b.time-o.time)/DAY/7)).slice(0,20);
  const row=x=>`<button type="button" class="pcand" data-pc="${x.id}"><span class="side ${x.side}">${x.side}</span><span><b>${fmtQ(x.qty)} ${esc(x.coin)} @ ₹${fmtR(x.rate)}</b><small>${esc(modeOf(x))}${x.cp?" · "+esc(x.cp):""} · ${tfmt(x.time)}</small></span><em class="${(o.side==="BUY"?x.rate-o.rate:o.rate-x.rate)>=0?"pos":"neg"}">${(()=>{const pf=(o.side==="BUY"?x.rate-o.rate:o.rate-x.rate)*Math.min(+x.qty,+o.qty);return(pf<0?"−":"+")+inr(Math.abs(Math.round(pf)))})()}</em></button>`;
  openSheet(`<div class="insw"><div class="insh"><h3>P2P ⇄ Direct pair</h3></div>
    <div class="pcur"><span class="side ${o.side}">${o.side}</span><div><b>${fmtQ(o.qty)} ${esc(o.coin)} @ ₹${fmtR(o.rate)}</b><small>${esc(modeOf(o))}${o.cp?" · "+esc(o.cp):""} · ${tfmt(o.time)}</small></div></div>
    ${p?`<div class="pcur linked"><span class="side ${p.side}">${p.side}</span><div><b>${fmtQ(p.qty)} ${esc(p.coin)} @ ₹${fmtR(p.rate)}</b><small>${esc(modeOf(p))}${p.cp?" · "+esc(p.cp):""} · ${tfmt(p.time)}</small></div></div>
      <div class="rsug" style="grid-template-columns:1fr 1fr"><div><span>Pair profit</span><b class="${pairProfit(o)>=0?"pos":"neg"}">${sgn(pairProfit(o))}</b></div><div><span>Spread / ${esc(o.coin)}</span><b>${(Math.abs(p.rate-o.rate)).toFixed(2)}</b></div></div>
      <p class="note">Each order stays in its own section (${esc(modeOf(o))} and ${esc(modeOf(p))}). In "All" totals they are counted once.</p>
      <button type="button" class="mini ghost" id="pr-un" style="width:100%;padding:12px;color:var(--sell)">Unlink pair</button>`
    :`<div class="pcsec">Link with a ${opp.toLowerCase()} order</div>${cand.length?`<div class="pcl2">${cand.map(row).join("")}</div>`:`<p class="note">No matching ${opp.toLowerCase()} order from another deal type in the last 14 days.</p>`}
      <p class="note">Showing ${opp} ${esc(o.coin)} orders from other deal types (not ${esc(modeOf(o))}), closest quantity and time first. If quantities differ, pair profit uses the smaller quantity.</p>`}</div>`,el=>{
    el.querySelectorAll("[data-pc]").forEach(b=>b.onclick=async()=>{const lk="lk_"+Date.now().toString(36);try{await patchRec(o.id,{link:lk});await patchRec(b.dataset.pc,{link:lk});toast("Linked as a pair");sheets.pair(o.id)}catch(e){toast("Couldn't link")}});
    const un=el.querySelector("#pr-un");if(un)twoTap(un,async()=>{try{await patchRec(o.id,{link:""});await patchRec(p.id,{link:""});toast("Unlinked");sheets.pair(o.id)}catch(e){toast("Couldn't unlink")}});
  })};
sheets.payee=function(pid,idx){const p=parties.find(x=>x.id===pid);if(!p)return;const a=idx!=null?{...(p.accounts||[])[idx]}:{id:newId("a_")};
  openSheet(`<h3>${idx!=null?"Edit person":"Add person to pay"}</h3><p class="note" style="margin:-6px 0 10px">${esc(p.name)} · who to pay, how much, by when</p>
    <label class="pcl">Paste details (optional)<textarea id="py-paste" rows="3" placeholder="Paste from WhatsApp: name, account no., IFSC, UPI, amount…" style="width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:12px;padding:10px;font:500 .88rem var(--body)"></textarea></label>
    <form id="sf" style="grid-template-columns:1fr 1fr" onsubmit="return false">
      <label class="full">Name<input id="py-h" value="${esc(a.holder||"")}" placeholder="Account holder name"></label>
      <label>Bank<input id="py-b" value="${esc(a.bankName||"")}" placeholder="e.g. SBI"></label><label>IFSC<input id="py-i" value="${esc(a.ifsc||"")}" style="text-transform:uppercase"></label>
      <label class="full">Account no.<input id="py-a" inputmode="numeric" value="${esc(a.accNo||"")}"></label>
      <label>UPI ID<input id="py-u" value="${esc(a.upi||"")}"></label><label>WhatsApp no.<input id="py-ph" inputmode="tel" value="${esc(a.phone||"")}" placeholder="Optional"></label>
      <label>Amount to pay (₹)<input id="py-t" type="number" inputmode="decimal" value="${a.target||""}"></label><label>Pay by<input id="py-d" type="date" value="${esc(a.due||"")}"></label>
      <button type="button" class="mini psdl full" id="py-save" style="padding:13px">${idx!=null?"Save":"Add person"}</button>
      ${idx!=null?'<button type="button" class="link del full" id="py-del">Remove this person</button>':""}</form>`,el=>{
    const q=x=>el.querySelector(x);
    q("#py-paste").addEventListener("input",e=>{const t=e.target.value;const ifsc=(t.match(/\b[A-Za-z]{4}0[A-Za-z0-9]{6}\b/)||[])[0],upi=(t.match(/[\w.\-]{2,}@[a-zA-Z]{2,}/)||[])[0],acc=(t.replace(/[\s-]/g," ").match(/\b\d{9,18}\b/)||[])[0];
      const amt=(t.match(/(?:₹|rs\.?|inr|amount|amt)\s*:?\s*([\d,]+(?:\.\d+)?)/i)||t.match(/\b([\d,]{4,})\s*(?:\/-|rs|₹|rupees)/i)||[])[1];
      const ph=(t.match(/(?:mob|mobile|phone|whatsapp|wa|no)\.?\s*[:\-]?\s*(\+?91[\s-]?)?([6-9]\d{9})\b/i)||[])[2];if(ph)q("#py-ph").value=ph;
      const nm=(t.match(/(?:name|a\/c name|holder)\s*[:\-]\s*([A-Za-z .]{3,40})/i)||[])[1];const bk=(t.match(/(?:bank)\s*[:\-]\s*([A-Za-z .]{2,40})/i)||[])[1];
      if(ifsc)q("#py-i").value=ifsc.toUpperCase();if(upi)q("#py-u").value=upi;if(acc&&acc!==(amt||"").replace(/,/g,""))q("#py-a").value=acc;if(amt)q("#py-t").value=amt.replace(/,/g,"");if(nm)q("#py-h").value=nm.trim();if(bk)q("#py-b").value=bk.trim();
      if(ifsc&&!q("#py-b").value){const BK={SBIN:"SBI",HDFC:"HDFC",ICIC:"ICICI",UTIB:"Axis",KKBK:"Kotak",PUNB:"PNB",BARB:"Bank of Baroda",CNRB:"Canara",UBIN:"Union Bank",IDIB:"Indian Bank",BKID:"Bank of India",YESB:"Yes Bank",INDB:"IndusInd",IDFB:"IDFC First",FDRL:"Federal",AUBL:"AU Bank",PYTM:"Paytm"};q("#py-b").value=BK[ifsc.slice(0,4).toUpperCase()]||""}});
    q("#py-save").onclick=async()=>{const n={...a,holder:q("#py-h").value.trim().slice(0,80),bankName:q("#py-b").value.trim().slice(0,80),accNo:q("#py-a").value.replace(/\s+/g,"").slice(0,30),ifsc:q("#py-i").value.trim().toUpperCase().slice(0,15),upi:q("#py-u").value.trim().slice(0,80),phone:q("#py-ph").value.trim().slice(0,20),target:+q("#py-t").value||0,due:q("#py-d").value||""};
      if(!n.accNo&&!n.upi){toast("Add an account number or UPI ID");return}const accs=[...(p.accounts||[])];if(idx!=null)accs[idx]=n;else accs.push(n);
      try{await patchRec(pid,{accounts:accs});toast(idx!=null?"Saved":"Person added");sheets.partyView(pid)}catch(e){toast("Couldn't save")}};
    const d=q("#py-del");if(d)twoTap(d,async()=>{const accs=[...(p.accounts||[])];accs.splice(idx,1);try{await patchRec(pid,{accounts:accs});sheets.partyView(pid)}catch(e){toast("Couldn't save")}});
  })};
