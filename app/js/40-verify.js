// ================= SCREENSHOT VERIFICATION · payment + order (extract, compare, report) =================
// It only compares what is visible in two screenshots. It never says a payment is genuine.
const VER_RISK={EDITED_LOOKING:"Screenshot looks edited",INCONSISTENT_FONTS:"Fonts or layout look inconsistent",SUSPICIOUS_AMOUNT_FORMAT:"Amount formatting looks unusual",CROPPED_DETAILS:"Transaction details look cropped",MULTIPLE_TRANSACTIONS:"More than one transaction is visible",BLURRY:"Image is blurry or low quality",NO_REFERENCE:"No transaction / reference number visible",STATUS_UNCLEAR:"Payment status is unclear",DATE_INCONSISTENT:"Date or time looks inconsistent"};
const verNum=v=>{if(v==null||v==="")return null;const n=typeof v==="number"?v:parseFloat(String(v).replace(/[₹,\s]|INR|Rs\.?/gi,""));return isFinite(n)?n:null};
const verStr=v=>{if(v==null)return null;const s=String(v).trim();return s&&!/^(null|none|n\/a|na|unknown|not visible|-)$/i.test(s)?s:null};
const verConf=v=>{const n=verNum(v);if(n==null)return null;return Math.max(0,Math.min(1,n>1?n/100:n))};
function verPrompt(){return `You read TWO screenshots for an Indian P2P crypto merchant. The images may be in any order. One is the PAYMENT screenshot (UPI / bank app), one is the P2P ORDER screenshot (exchange app); work out which is which. If only one image is given, leave the other part null. Analyse each independently.
Rules: copy only what is clearly visible. Never guess or invent. On a P2P exchange ORDER page only the OTHER person (the counterparty) is shown, often as 'Real Name(nickname)' or a nickname next to a round avatar at the top: on a SELL order that person is the BUYER, on a BUY order the SELLER. Put the real name (the part outside the brackets) in that field, never the nickname, and leave the other field (the user's own side) null unless a name is printed right under a Buyer or Seller label. In a payment screenshot where one name sits above a UPI ID and the amount, that is the person who was PAID (receiver_name): do not invent a sender. Use null for anything you cannot read. Do not say whether the payment is genuine.
Dates: today is ${new Date().toLocaleDateString("en-CA")} (India). Payment screenshots often print no year: then use today's year, never an older one. Write transaction_time and order_datetime in 24-hour time (6:58 PM = 18:58). If you cannot tell AM from PM, set transaction_time to null instead of guessing. If a date such as 10/09/2026 could be day/month or month/day, copy it exactly as printed; the app decides.
Respond with ONLY this JSON, no other text:
{"payment":{"status":"SUCCESS|PENDING|FAILED|null","amount":number|null,"currency":"INR"|null,"sender_name":string|null,"receiver_name":string|null,"utr":string|null,"payment_method":"UPI|IMPS|NEFT|RTGS|BANK|CASH"|null,"bank_or_upi":string|null,"transaction_date":"YYYY-MM-DD"|null,"transaction_time":"HH:MM"|null,"visible_account_details":string|null,"direction":"PAID|RECEIVED"|null,"confidence":0-1},
"order":{"order_id":string|null,"order_status":string|null,"buyer_name":string|null,"seller_name":string|null,"fiat_amount":number|null,"crypto_amount":number|null,"crypto_symbol":string|null,"price":number|null,"payment_method":string|null,"order_datetime":"YYYY-MM-DD HH:MM"|null,"order_type":"BUY|SELL"|null,"visible_account_details":string|null,"confidence":0-1},
"risk_flags":[ any of: ${Object.keys(VER_RISK).join(", ")} ]}
direction: PAID if the money was sent out of the account shown, RECEIVED if it came in. order_type: BUY or SELL exactly as the merchant sees it on the order (for example "Buy USDT" is BUY).
risk_flags: only add a flag when you can point to something visible (e.g. misaligned text, different fonts in one amount, cut-off reference number, several payments in one image). An empty list is fine.`}
function verParse(raw){let j=null;try{const m=String(raw||"").match(/\{[\s\S]*\}/);j=m?JSON.parse(m[0]):null}catch(e){}
  if(!j||typeof j!=="object"||(!j.payment&&!j.order))return null;
  const p=j.payment||{},o=j.order||{};
  const stt=String(p.status||p.payment_status||"").toUpperCase();
  const pay={status:/SUCC|COMPLET|PAID|DONE/.test(stt)?"SUCCESS":/PEND|PROCESS|WAIT/.test(stt)?"PENDING":/FAIL|DECLIN|REJECT|REVERS/.test(stt)?"FAILED":null,
    amount:verNum(p.amount),currency:verStr(p.currency),sender:verStr(p.sender_name),receiver:verStr(p.receiver_name),utr:verStr(p.utr||p.transaction_id||p.reference_number),
    method:verStr(p.payment_method),bank:verStr(p.bank_or_upi),date:verStr(p.transaction_date),time:verStr(p.transaction_time),acct:verStr(p.visible_account_details),conf:verConf(p.confidence)};{const dd=String(p.direction||"").toUpperCase();if(/PAID|SENT|DEBIT/.test(dd))pay.dir="out";else if(/RECEIV|CREDIT/.test(dd))pay.dir="in"}
  const ord={id:verStr(o.order_id),status:verStr(o.order_status),buyer:verStr(o.buyer_name),seller:verStr(o.seller_name),fiat:verNum(o.fiat_amount!=null?o.fiat_amount:o.amount),
    crypto:verNum(o.crypto_amount),coin:verStr(o.crypto_symbol),price:verNum(o.price),method:verStr(o.payment_method),when:verStr(o.order_datetime||o.order_date),acct:verStr(o.visible_account_details),conf:verConf(o.confidence)};{const ot=String(o.order_type||"").toUpperCase();if(ot==="BUY"||ot==="SELL")ord.side=ot}
  const flags=(Array.isArray(j.risk_flags)?j.risk_flags:[]).map(x=>String(x).toUpperCase().replace(/[^A-Z_]/g,"")).filter(x=>VER_RISK[x]);
  return{pay,ord,flags:[...new Set(flags)]}}
// ---- name compare: M match · U unclear · X mismatch · NF not found (handles reordered / masked / initial-only names)
const verTok=n=>String(n||"").toLowerCase().replace(/[^a-z\s]/g," ").split(/\s+/).filter(t=>t&&!/^(mr|mrs|ms|shri|smt|sri|dr|m)$/.test(t));
function verLev(a,b){const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];for(let j=1;j<=b.length;j++)d[i][j]=i?0:j}for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
function verName(a,b){const r=verNameBase(a,b);return r!=="M"&&r!=="NF"&&(ixlAlias(a,b)||cpPayerKnown(b,a))?"M":r}
function verNameBase(a,b){const A=verTok(a),B=verTok(b);if(!A.length||!B.length)return"NF";let hit=0,typo=0;const used=new Set();
  A.forEach(t=>{let j=B.findIndex((u,i)=>!used.has(i)&&(u===t||(t.length>=3&&u.length>=3&&(u.startsWith(t)||t.startsWith(u)))||(t.length===1&&u[0]===t)||(u.length===1&&t[0]===u)));
    if(j<0)j=B.findIndex((u,i)=>!used.has(i)&&t.length>=5&&u.length>=5&&verLev(t,u)<=1&&(typo++,true));
    if(j>=0){used.add(j);hit++}});
  const need=Math.min(A.length,B.length);if(hit>=need&&!typo&&A.length===B.length)return"M";if(hit>=need)return"U";return hit>=1?"U":"X"}
const verMeth=m=>{m=String(m||"").toLowerCase();return/upi|gpay|google ?pay|phonepe|paytm|bhim/.test(m)?"UPI":/imps/.test(m)?"IMPS":/neft/.test(m)?"NEFT":/rtgs/.test(m)?"RTGS":/bank|transfer/.test(m)?"BANK":/cash/.test(m)?"CASH":""};
function verWhen(date,time){if(!date)return 0;const iso=/^\d{4}-\d{2}-\d{2}/.test(date)?Date.parse(date.slice(0,10)+"T"+((time||String(date).slice(11)||"00:00").slice(0,5))+":00"):0;return iso||payTime(date+" "+(time||""))||0}
// ---- compare engine. Returns fields (each: k,label,pay,ord,res,note), overall, flags, confidence
function verCompare(X,ctx){ctx=ctx||{};const P=X.pay,O=X.ord,F=[];const now=ctx.now||Date.now();
  const I=riskIdx();const linked=ctx.linked||(O.id?orders.find(o=>normRef(exIdOf(o))&&normRef(exIdOf(o))===normRef(O.id)):null)||null;
  const add=(k,label,pay,ord,res,note,major)=>F.push({k,label,pay:pay==null?"—":String(pay),ord:ord==null?"—":String(ord),res,note:note||"",major:!!major});
  const money=v=>v==null?null:"₹"+Number(v).toLocaleString("en-IN",{maximumFractionDigits:2});
  // amount
  const oAmt=O.fiat!=null?O.fiat:(O.crypto&&O.price?+(O.crypto*O.price).toFixed(2):null);
  if(P.amount==null||oAmt==null)add("amount","Amount",money(P.amount),money(oAmt),P.amount==null&&oAmt==null?"NOTFOUND":"UNCLEAR",P.amount==null?"Payment amount not visible":"Order amount not visible",true);
  else{const d=Math.abs(P.amount-oAmt);add("amount","Amount",money(P.amount),money(oAmt),d<=1?"MATCH":"MISMATCH",d<=1?"":P.amount<oAmt?`Paid ${money(oAmt-P.amount)} less than the order`:`Paid ${money(P.amount-oAmt)} more than the order`,true)}
  if(P.currency&&!/inr|₹|rs/i.test(P.currency))F.push({k:"cur",label:"Currency",pay:P.currency,ord:"INR",res:"MISMATCH",note:"Payment is not in INR",major:true});
  // names
  const nm=(k,label,a,b)=>{const r=verName(a,b);add(k,label,a,b,r==="M"?"MATCH":r==="U"?"UNCLEAR":r==="X"?"MISMATCH":"NOTFOUND",r==="U"?"Names look similar but not the same":r==="X"?"Names are different":"",k==="buyer")};
  nm("buyer","Sender ↔ Buyer",P.sender,O.buyer);nm("seller","Receiver ↔ Seller",P.receiver,O.seller);
  // UTR
  {const u=normRef(P.utr);let res="FOUND",note="";
    if(!u)res="NOTFOUND";else if(u.length<8){res="UNCLEAR";note="Reference looks too short or cut off"}
    else{const dup=(I.u.get(u)||[]).filter(x=>!linked||x.id!==linked.id);if(dup.length){res="MISMATCH";note="This UTR is already used in "+shortO(dup[0])}}
    add("utr","UTR / reference",P.utr,"—",res,note,true)}
  // order id
  {let res=O.id?"FOUND":"NOTFOUND",note="";if(O.id&&linked){note="Found in your orders: "+shortO(linked);if(linked.utr&&P.utr&&normRef(linked.utr)!==normRef(P.utr)){res="MISMATCH";note="That order already has a different UTR ("+linked.utr+")"}}
    add("orderid","Order ID","—",O.id,res,note,true)}
  // method
  {const a=verMeth(P.method),b=verMeth(O.method);let res="NOTFOUND";if(a&&b)res=a===b||(a!=="UPI"&&b==="BANK")||(b!=="UPI"&&a==="BANK")?"MATCH":"UNCLEAR";else if(a)res="AUTO"; /* the exchange page never shows the method: take it from the payment itself */ add("method","Payment method",P.method||a,b?O.method:(a?a+" · read from the payment":O.method),res,res==="UNCLEAR"?"Methods differ":res==="AUTO"?"The exchange page does not show it, so it is taken from the payment.":"")}
  // time
  {const pt=verWhen(P.date,P.time),ot=verWhen((O.when||"").slice(0,10),(O.when||"").slice(11,16));let res="NOTFOUND",note="";
    if(pt&&pt>now+10*60e3){res="MISMATCH";note="Payment time is in the future"}
    else if(pt&&ot){if(pt<ot-30*60e3){res="MISMATCH";note="Payment is dated before the order was created"}else if(pt<ot-5*60e3){res="UNCLEAR";note="Payment is a few minutes before the order's Created time. Some exchanges show the time the page was opened, so check once"}else if(pt-ot>48*36e5){res="UNCLEAR";note="Payment is more than 2 days after the order"}else res="MATCH"}
    else if(pt||ot){res="UNCLEAR";note=pt?"Order time not visible":"Payment time not visible"}
    add("time","Date & time",P.date?P.date+(P.time?" "+P.time:""):null,O.when,res,note,res==="MISMATCH")}
  // bank / UPI details
  {const t=s=>(String(s||"").toLowerCase().match(/[a-z0-9@._]{4,}/g)||[]);const a=t(P.bank+" "+P.acct),b=t(O.acct);let res="NOTFOUND";if(P.acct||P.bank){if(b.length)res=a.some(x=>b.includes(x))?"MATCH":"UNCLEAR";else res="AUTO"}
    let at=[P.bank,P.acct].filter(Boolean).join(" · ")||null,lab="Bank / UPI details";
    if(P.dir==="out"&&(P.vpa||P.fromLabel||P.fromLast4)){const sd=ctx.side,fl=sd==="SELL"?"From (client)":sd==="BUY"?"From (you)":"From",tl=sd==="SELL"?"To (you)":sd==="BUY"?"To (seller)":"To";
      const fr=[P.fromLabel||P.bank,P.fromLast4?"••"+P.fromLast4:P.acct].filter(Boolean).join(" ");const to=[P.receiver,P.vpa].filter(Boolean).join(" ");
      at=[fr?fl+": "+fr:"",to?tl+": "+to:""].filter(Boolean).join("  →  ")||at;lab="Paid from → paid to"}
    add("acct",lab,at,O.acct,res,res==="UNCLEAR"?"No common detail found":res==="AUTO"?"The exchange page does not show accounts. This is what the payment shows.":"")}
  // payment status
  add("status","Payment status",P.status,O.status,P.status==="SUCCESS"?"MATCH":P.status==="FAILED"?"MISMATCH":"UNCLEAR",P.status==="FAILED"?"Payment shows as failed":P.status==="PENDING"?"Payment still pending":P.status?"":"Status not visible",true);
  // sanity: fiat vs crypto × price
  const flags=[...X.flags];
  if(O.fiat!=null&&O.crypto&&O.price&&Math.abs(O.fiat-O.crypto*O.price)>Math.max(2,O.fiat*0.01))flags.push("SUSPICIOUS_AMOUNT_FORMAT");
  if(!normRef(P.utr))flags.push("NO_REFERENCE");if(P.status==null||P.status==="PENDING")flags.push("STATUS_UNCLEAR");
  if(F.find(f=>f.k==="time"&&f.res==="MISMATCH"))flags.push("DATE_INCONSISTENT");
  const local=[];
  if(F.find(f=>f.k==="utr"&&f.res==="MISMATCH"&&/already used/.test(f.note)))local.push("Duplicate UTR");
  if(ctx.hashes){const dup=ctx.hashes.map(h=>(I.s.get(h)||[]).filter(x=>!linked||x.id!==linked.id)[0]).filter(Boolean)[0];if(dup)local.push("This screenshot was already used for "+shortO(dup))}
  if(F.find(f=>f.k==="amount"&&f.res==="MISMATCH"))local.push("Order / payment amount mismatch");
  const fl=[...new Set(flags)];
  // overall
  const major=F.some(f=>f.res==="MISMATCH"&&(f.major||f.k==="seller"));
  const weak=F.some(f=>f.major&&(f.res==="NOTFOUND"||f.res==="UNCLEAR"))||F.some(f=>(f.k==="seller"||f.k==="method")&&f.res==="UNCLEAR");
  const lowConf=[P.conf,O.conf].some(c=>c!=null&&c<0.7)||(P.conf==null&&O.conf==null);
  const eDit=fl.some(x=>["EDITED_LOOKING","INCONSISTENT_FONTS","MULTIPLE_TRANSACTIONS","CROPPED_DETAILS","BLURRY"].includes(x));
  const overall=(major||local.length)?"MISMATCH":(weak||lowConf||eDit||fl.length)?"REVIEW":"VERIFIED";
  let conf=Math.min(...[P.conf,O.conf].filter(c=>c!=null),1);if(P.conf==null&&O.conf==null)conf=0.5;
  conf-=0.08*F.filter(f=>f.res==="UNCLEAR").length+0.25*F.filter(f=>f.res==="MISMATCH").length+0.05*fl.length;conf=Math.max(0,Math.min(1,conf));
  return{fields:F,overall,flags:fl,local,confidence:Math.round(conf*100)/100,linked:linked?linked.id:null}}
const VER_TXT={VERIFIED:["🟢","VERIFIED","Screenshot appears consistent"],REVIEW:["🟡","NEEDS REVIEW","Some details are missing or unclear"],MISMATCH:["🔴","MISMATCH","Potential inconsistency detected"]};
const VER_ICO={MATCH:"✅",FOUND:"✅",AUTO:"ℹ️",UNCLEAR:"⚠️",MISMATCH:"❌",NOTFOUND:"—"};
const VER_LBL={MATCH:"MATCH",FOUND:"FOUND",AUTO:"FROM PAYMENT",UNCLEAR:"UNCLEAR",MISMATCH:"MISMATCH",NOTFOUND:"NOT FOUND"};
// ---- run: provider adapter. Order of use: your Verify server (if set) → the AI you connected in Settings → on-phone reader (payment only)
function verCfg(){try{return JSON.parse(localStorage.getItem("p2p_verify")||"{}")||{}}catch(e){return{}}}
const verB64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]||"");r.onerror=no;r.readAsDataURL(b)});
async function verExtract(blobs){const cfg=verCfg();const prompt=verPrompt();let raw="";
  const ask=async extra=>{
    if(cfg.url){const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),70000);
      try{const res=await fetch(cfg.url.replace(/\/+$/,"")+"/verify",{method:"POST",signal:ac.signal,headers:{"content-type":"application/json",...(cfg.token?{authorization:"Bearer "+cfg.token}:{})},body:JSON.stringify({prompt:prompt+(extra||""),images:await Promise.all(blobs.map(async b=>({mime:b.type||"image/jpeg",data:await verB64(b)})))})});
        if(res.status===401||res.status===403)throw aiErr("bad_key","The Verify server rejected the token.");if(!res.ok)throw aiErr("busy","The Verify server had a problem ("+res.status+").");
        const j=await res.json().catch(()=>null);return j&&typeof j==="object"?(j.text||JSON.stringify(j.result||j)):""}
      catch(e){if(e&&e.code)throw e;throw aiErr(ac.signal.aborted?"busy":"network",ac.signal.aborted?"The Verify server took too long.":"Can't reach the Verify server. Check its URL and your internet.")}finally{clearTimeout(tm)}}
    const cap=new Promise((_,no)=>setTimeout(()=>no(aiErr("busy","The AI took too long to answer.")),80000));
    const p=aiCall([{role:"user",content:prompt+(extra||"")}],null,blobs);p.catch(()=>{});return Promise.race([p,cap])};
  raw=await ask("");let X=verParse(raw);
  if(!X){raw=await ask("\n\nIMPORTANT: your last answer was not valid JSON. Reply with the JSON object only.");X=verParse(raw)}
  if(!X)throw aiErr("bad_json","The AI's answer couldn't be understood. Try again or use clearer screenshots.");
  return{X,raw}}
async function verFallback(file){ // no AI: read the payment on the phone, order side stays empty
  if(!ocrWorker)await ocrInit();const t=await ocrImage(file,()=>{});const p=payParse(t);
  const tm=p.time?new Date(p.time):null,pad=n=>String(n).padStart(2,"0");
  const X={pay:{status:p.status==="Failed"?"FAILED":p.status==="Pending"?"PENDING":p.status?"SUCCESS":null,amount:p.amount||null,currency:p.amount?"INR":null,sender:p.sender||null,receiver:p.receiver||null,utr:p.utr||null,method:p.method||null,bank:p.bank||null,lite:p.lite||false,liteLoad:p.liteLoad||false,liteApp:p.liteApp||"",date:tm?`${tm.getFullYear()}-${pad(tm.getMonth()+1)}-${pad(tm.getDate())}`:null,time:tm?pad(tm.getHours())+":"+pad(tm.getMinutes()):null,acct:p.last4?"••"+p.last4:null,conf:p.ok?0.6:0.3},
    ord:{id:null,status:null,buyer:null,seller:null,fiat:null,crypto:null,coin:null,price:null,method:null,when:null,acct:null,conf:null},flags:[]};
  return{X,raw:t}}

