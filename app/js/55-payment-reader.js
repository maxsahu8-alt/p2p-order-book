// ================= PAYMENT SCREENSHOT READER — reads UPI / bank screenshots and SMS on the phone, you confirm
const PAY_BANKS=[["SBI",/state bank(?: of(?: india)?)?|\bsbi\b/i],["HDFC Bank",/hdfc(?: bank)?/i],["ICICI Bank",/icici(?: bank)?/i],["Axis Bank",/axis(?: bank)?/i],["Kotak Bank",/kotak(?: mahindra)?(?: bank)?/i],["Yes Bank",/yes bank/i],["PNB",/punjab national(?: bank)?|\bpnb\b/i],["Bank of Baroda",/bank of baroda|\bbob\b/i],["Canara Bank",/canara(?: bank)?/i],["Union Bank",/union bank(?: of india)?/i],["IDFC First",/idfc(?: first)?(?: bank)?/i],["IndusInd Bank",/indusind(?: bank)?/i],["Federal Bank",/federal bank/i],["Paytm Payments Bank",/paytm payments bank/i],["Airtel Payments Bank",/airtel payments bank/i],["Jio Payments Bank",/jio payments bank/i],["India Post Payments Bank",/india post payments bank|\bippb\b/i],["Central Bank",/central bank(?: of india)?/i],["Bank of India",/bank of india/i],["Indian Bank",/indian bank/i],["UCO Bank",/uco bank/i],["IDBI Bank",/idbi(?: bank)?/i],["RBL Bank",/rbl(?: bank)?/i],["AU Small Finance",/au small finance(?: bank)?/i],["Bandhan Bank",/bandhan(?: bank)?/i]];
const PAY_MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function payTime(t){t=String(t||"").replace(/\b0(?=ct\b)/gi,"O").replace(/\bn0v\b/gi,"Nov").replace(/\b2[Oo](\d\d)\b/g,"20$1").replace(/(?<![\d,.])(\d{1,2})\.(\d{2})(\s*[ap]\.?m\b)/gi,"$1:$2$3"); // OCR slips: 0CT, 2O26, 11.47 AM
  const yy=v=>{v=+v;return v<100?2000+v:v};let mi=0,tight=true;
  const tm=x=>{const m=String(x||"").match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);if(!m)return null;let H=+m[1];const A=(m[3]||"").toLowerCase();if(A==="pm"&&H<12)H+=12;if(A==="am"&&H===12)H=0;return H>23?null:[H,+m[2]]};
  const MN="(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)";let m,d,mo,y,r=null;
  if(m=t.match(new RegExp("(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-\\/.,]+"+MN+"[a-z]*\\.?[\\s\\-\\/.,]+(\\d{2,4})(?![\\d:])(.{0,32})","i"))){d=+m[1];mo=PAY_MON[m[2].toLowerCase()];y=yy(m[3]);r=tm(m[4]);tight=/^[\s,T@\-]*(?:at\s+)?\d{1,2}:\d{2}/i.test(m[4]);mi=m.index}
  else if(m=t.match(new RegExp(MN+"[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})(.{0,32})","i"))){mo=PAY_MON[m[1].toLowerCase()];d=+m[2];y=+m[3];r=tm(m[4])}
  else if(m=t.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(.{0,32})/)){d=+m[1];mo=+m[2]-1;y=yy(m[3]);r=tm(m[4])}
  else if(m=t.match(new RegExp("(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-\\/.,]+"+MN+"[a-z]*\\.?,?\\s+(\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:am|pm)?)","i"))){d=+m[1];mo=PAY_MON[m[2].toLowerCase()];y=new Date().getFullYear();r=tm(m[3]);if(new Date(y,mo,d).getTime()>Date.now()+864e5)y--}
  else return 0;
  if((!r||!tight)&&mi>0){const pre=t.slice(Math.max(0,mi-20),mi).match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:on|,|-)?\s*$/i);if(pre)r=tm(pre[1])}
  if(!(mo>=0&&mo<=11&&d>=1&&d<=31&&y>=2015&&y<=2100))return 0;const dt=new Date(y,mo,d,r?r[0]:0,r?r[1]:0);return isNaN(dt)?0:dt.getTime()}
// ---- v78: dates. A numeric date can be read two ways (day/month or month/day), so every reading is kept and the screenshots decide.
// order of readings: [day/month, month/day]. Dates with a month name, or year first, have one reading.
function ixTimeAlts(t){try{t=String(t||"").replace(/['’‘`´]\s?(\d{2})\b/g," 20$1");const now=Date.now();
  const MON="(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)";
  if(new RegExp("\\d{1,2}(?:st|nd|rd|th)?[\\s\\-\\/.,]+"+MON+"[a-z]*\\.?[\\s\\-\\/.,]+\\d{2,4}|"+MON+"[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}(?:st|nd|rd|th)?[\\s\\-\\/.,]+"+MON+"[a-z]*\\.?,?\\s+\\d{1,2}:\\d{2}","i").test(t)){const ts=payTime(t);return{alts:ts?[ts]:[],amb:false}}
  const clock=(i,len)=>{const a=t.slice(i+len,i+len+36).match(/^[\s,T@\-]*(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)/i)||null;if(a)return a[1];const b=t.slice(Math.max(0,i-22),i).match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)[\s,\-on]*$/i);return b?b[1]:""};
  const mk=(d,mo,y,c)=>{if(!(d>=1&&d<=31&&mo>=1&&mo<=12))return 0;return payTime(d+"/"+mo+"/"+y+" "+(c||""))||0};
  let m;
  if(m=t.match(/(?<![\d])(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})(?![\d])/)){const y=+m[1],p=+m[2],q=+m[3],c=clock(m.index,m[0].length);const ts=p<=12?mk(q,p,y,c):mk(p,q,y,c);return{alts:ts?[ts]:[],amb:false}}
  if(m=t.match(/(?<![\d\/])(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})(?![\d])/)){const a=+m[1],b=+m[2],y=m[3],c=clock(m.index,m[0].length);const L=[mk(a,b,y,c),a!==b?mk(b,a,y,c):0].filter(Boolean);return{alts:[...new Set(L)],amb:L.length>1}}
  if(m=t.match(/(?<![\d\/])(\d{1,2})\/(\d{1,2})(?![\d\/])[\s,]+(\d{1,2}:\d{2})/)){const a=+m[1],b=+m[2],c=m[3];let y=new Date().getFullYear();
    const one=(d,mo)=>{let v=mk(d,mo,y,c);if(v>now+864e5)v=mk(d,mo,y-1,c);return v};const L=[one(a,b),a!==b?one(b,a):0].filter(Boolean);return{alts:[...new Set(L)],amb:L.length>1}}
  return{alts:[],amb:false}}catch(e){return{alts:[],amb:false}}}
// PhonePe transaction ids carry the payment time: T + yymmddHHMMSS + digits (T2610222342058895458329 = 22 Oct 2026, 23:42:05).
// Used to double-check the time the reader found (a dark screenshot can lose the first digit of "11:42" and give 1:42).
function payIdTime(t){try{const m=String(t||"").match(/\bT(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\d{6,}\b/);if(!m)return 0;const y=2000+ +m[1],mo=+m[2],d=+m[3],h=+m[4],mi=+m[5];
  if(!(mo>=1&&mo<=12&&d>=1&&d<=31&&h<=23&&mi<=59))return 0;const dt=new Date(y,mo-1,d,h,mi);if(dt.getMonth()!==mo-1)return 0;const ms=dt.getTime(),now=Date.now();if(ms>now+15*6e4||now-ms>400*864e5)return 0;return ms}catch(e){return 0}}
function payParse(raw){const lines=String(raw||"").split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);const flat=lines.join(" ");
  const P={amount:0,utr:"",sender:"",receiver:"",bank:"",last4:"",time:0,status:"",dir:"",method:"UPI",ok:false};if(!flat)return P;
  // amount: first ₹ / Rs / INR figure (OCR often turns ₹ into ~ £ < ?), skipping balance / fee lines
  const CUR="(?:₹|Rs\\.?|INR|[~£<¥%?=])";const skip=/(?:bal(?:ance)?|avl|available|fee|charge|limit|cashback|reward)\W{0,12}$/i;
  for(const m of flat.matchAll(new RegExp("(?:^|[^A-Za-z0-9])"+CUR+"\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)","ig"))){if(skip.test(flat.slice(Math.max(0,m.index-18),m.index+1)))continue;const v=+m[1].replace(/,/g,"");if(v>=1&&v<1e9&&String(Math.trunc(v)).length<=9){P.amount=v;break}}
  if(!P.amount){const c=lines.filter(l=>/^\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?$|^\d{1,7}\.\d{1,2}$/.test(l));if(c.length===1)P.amount=+c[0].replace(/,/g,"")}
  // wallet apps print the figure next to a button ("71,905 Split Expense"); the ₹ is often read as a 7 / 2 stuck to the number, so "71,905" may be ₹1,905
  if(!P.amount){const c=lines.map(l=>l.match(/^([^\d\s])?\s?(\d[\d,]*(?:\.\d{1,2})?)\s+(?:split\s*expense|pay\s*again|share|view\s*details|details|done)\b/i)).filter(Boolean);
    if(c.length===1&&!c[0][1]){const raw=c[0][2],v=+raw.replace(/,/g,""),cut=raw.slice(1);const v2=/^[72]/.test(raw)&&/^\d{1,3}(?:,\d{2,3})*$|^\d{1,6}$/.test(cut)&&raw.length>=5?+cut.replace(/,/g,""):null;
      if(v2>=1){P.amountAlts=[v2,v]}else if(v>=1)P.amount=v}
    else if(c.length===1&&+c[0][2].replace(/,/g,"")>=1)P.amount=+c[0][2].replace(/,/g,"")}
  // wallet receipts that are scrolled down show the amount only at the end of the "Debited from" row ("XXXXXX2594   30,000"): the ₹ there is often lost or read as a digit, so "730,000" may be ₹30,000
  if(!P.amount&&!(P.amountAlts&&P.amountAlts.length)){const c=lines.map(l=>l.match(/^(?:[xX*•.]{3,}\s?\d{4}|(?:a\/?c|acct?|account)[^\d]{0,12}[xX*•.]*\s?\d{4})\s+([^\d\s]{0,2})\s?(\d[\d,]*(?:\.\d{1,2})?)\s*$/i)).filter(Boolean);
    if(c.length===1){const lead=c[0][1],raw=c[0][2],v=+raw.replace(/,/g,""),cut=raw.slice(1),ok=/^\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?$|^\d{1,9}(?:\.\d{1,2})?$/;
      const v2=!lead&&/^[721]/.test(raw)&&raw.replace(/\.\d+$/,"").length>=5&&ok.test(cut)?+cut.replace(/,/g,""):null;
      if(v2>=1&&v>=1)P.amountAlts=[v2,v];else if(v>=1)P.amount=v}
    else if(!c.length){const mi=lines.findIndex(l=>/^(?:[xX*•.]{3,}\s?\d{4})$/.test(l));if(mi>=0){const near=lines.slice(mi+1,mi+3).map(l=>l.match(/^([^\d\s]{0,2})\s?(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d{1,7}\.\d{1,2})$/)).filter(Boolean);
      if(near.length===1){const raw=near[0][2],v=+raw.replace(/,/g,""),cut=raw.slice(1),v2=!near[0][1]&&/^[721]/.test(raw)&&raw.replace(/\.\d+$/,"").length>=5&&/^\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?$|^\d{1,9}(?:\.\d{1,2})?$/.test(cut)?+cut.replace(/,/g,""):null;if(v2>=1&&v>=1)P.amountAlts=[v2,v];else if(v>=1)P.amount=v}}}}
  // UTR / reference (labelled first, then a bare 12-digit UPI reference)
  const fixO=v=>/^[0-9OIlSB]{12}$/.test(v)&&(v.match(/\d/g)||[]).length>=10?v.replace(/[Oo]/g,"0").replace(/[Il]/g,"1").replace(/S/g,"5").replace(/B/g,"8"):v;
  const find=re=>{for(const m of flat.matchAll(new RegExp(re.source,"ig"))){const v=fixO(m[1]);if((v.match(/\d/g)||[]).length>=6)return v}return ""};
  P.utr=find(/\bUTR\s*(?:No\.?|number)?\s*[:\-#]?\s*([A-Z0-9]{8,24})/)||find(/\bUPI\s*(?:Ref(?:erence)?\.?|Txn|transaction)\s*(?:No\.?|ID|number)?\s*[:\-#]?\s*([A-Z0-9]{8,24})/)||find(/\b(?:IMPS|NEFT|RTGS)\s*(?:Ref(?:erence)?\.?\s*)?(?:No\.?|ID|number)?\s*[:\-#]?\s*([A-Z0-9]{8,24})/)||find(/\b(?:Ref(?:erence)?\.?|RRN)\s*(?:No\.?|ID|number)?\s*[:\-#]?\s*(?:IMPS|NEFT|UPI)?\s*([A-Z0-9]{8,24})/)||find(/\b(?:Transaction|Txn)\s*(?:ID|No\.?)\s*[:\-#]?\s*([A-Z0-9]{8,32})/);
  if(!P.utr){const m=flat.match(/(?:^|[^\d])(\d{12})(?!\d)/);if(m)P.utr=m[1]}
  P.status=/fail(?:ed|ure)|declin|unsuccessful|reject|reversed|cancel/i.test(flat)?"Failed":/pending|processing|in progress|initiated/i.test(flat)?"Pending":/success|complet|credited|debited|received|\bsent\b|\bpaid\b/i.test(flat)?"Success":"";
  P.dir=/debited from|paid to|money sent|sent to|transferred to|you paid/i.test(flat)?"out":/received|credited (?:to|in|by|with)|credit alert/i.test(flat)?"in":"";
  P.method=/\bIMPS\b/i.test(flat)?"IMPS":/\bNEFT\b|\bRTGS\b/i.test(flat)?"NEFT":"UPI";
  const flatB=flat.replace(/powered by.*$/i," ").replace(/\S+@\S+/g," ");const B=PAY_BANKS.find(([,re])=>re.test(flatB));P.bank=B?B[0]:"";
  const flatV=flat.replace(/\S*\d\S*\s?@\s?[A-Za-z]\S*/g," ");const l4=flatV.match(/(?:[xX*•]{2,}|a\/c(?: no\.?)?|acct?|account|ending(?: in| with)?|card)\s*[:\-]?\s*[xX*•]*\s*\d*?(\d{4})\b/i)||flatV.match(/(?:bank|india|limited|ltd)\s*[•*xX\s]*(\d{4})\b/i);P.last4=l4?l4[1]:"";
  P.time=payTime(flat)||payTime(flat.replace(/['’‘`´]\s?(\d{2})\b/g," 20$1"));
  {const ta=ixTimeAlts(flat);P.timeAlts=ta.amb&&ta.alts.includes(P.time)?ta.alts:(P.time?[P.time]:ta.alts);if(!P.time&&ta.alts.length)P.time=ta.alts[0]}
  P.idTime=payIdTime(flat);if(P.idTime&&(!P.time||(new Date(P.time).toDateString()===new Date(P.idTime).toDateString()&&Math.abs(P.time-P.idTime)>10*6e4))){P.timeRead=P.time||0;P.time=P.idTime;P.timeAlts=[P.idTime]}
  const nameOf=v=>{v=v.replace(/\(.*?\)/g," ").replace(/\S+@\S+/g," ");PAY_BANKS.forEach(([,re])=>{v=v.replace(new RegExp(re.source,"ig")," ")});v=v.replace(/\b(?:a\/c|acct?|account|no\.?|ref|upi|vpa|bank|ltd|limited)\b/ig," ").replace(/[xX*•]{2,}\d*/g," ").replace(/[^A-Za-z .'\-]/g," ").replace(/\s+/g," ").trim();v=ixNameClean(v)||"";return v.length>=2?v.slice(0,40):""};
  const grab=re=>{for(let i=0;i<lines.length;i++){const m=lines[i].match(re);if(!m)continue;let v=(m[1]||"").trim();if(!v&&lines[i+1])v=lines[i+1];const n=nameOf(v);if(n)return n}return ""};
  P.receiver=grab(/^(?:banking name|beneficiary(?: name)?)\b\s*[:\-]?\s*(.*)$/i)||grab(/^(?:paid to|money sent to|sent to|transferred to|credited to|beneficiary(?: name)?|banking name|to)\b\s*[:\-]?\s*(.*)$/i);
  // Google Pay / PhonePe style: the name (often wrapped over 2 lines) sits right above the masked UPI id ("••••8047-1@ybl")
  if(!P.receiver){const i=lines.findIndex(l=>/^\S{0,10}\d{3,}[\w.\-]*@[a-z]{2,}\b/i.test(l)&&!/[a-z]{4,}/i.test(l.split("@")[0].replace(/^\S{0,10}(?=\d)/,"")));
    if(i>0){const nl=[];for(let j=i-1;j>=0&&nl.length<3;j--){const l=lines[j].replace(/^[^A-Za-z]+/,"");if(/^[A-Za-z][A-Za-z.' ]{1,28}$/.test(l)&&!/\b(?:successful|payment|paid|done|share|receipt|details|split|expense|completed|failed|pending|transaction|status|sent|received|history)\b/i.test(l)&&!/\b(?:\d{1,2}\s+\w+\s+\d{4})\b/.test(l))nl.unshift(l.replace(/^[lI](?=[a-z]{3})/,"I"));else break}
      const n=nameOf(nl.join(" "));if(n)P.receiver=n}}
  if(!P.receiver){const i=lines.findIndex(l=>/^UPI ID\s*[:\-]/i.test(l));if(i>0){const n=nameOf(lines[i-1]);if(n)P.receiver=n}}
  if(!P.status&&/pay again|check balance/i.test(flat)&&!/fail|declin|reject|cancel/i.test(flat))P.status="Success";
  if(!P.dir&&/pay again|check balance/i.test(flat))P.dir="out";
  P.sender=grab(/^(?:money received from|received from|paid by|paid from|sender(?: name)?|remitter|debited from|from)\b\s*[:\-]?\s*(.*)$/i);
  // "From: slice savings / xx9798" is the payer's ACCOUNT, not a person: keep it apart from the name
  {const MK=/^[xX*•.]{2,}\s*\d{3,4}(?![\d@])(?:\s|$)(?!.*@)/,MD=t=>(String(t).match(/[xX*•.]{2,}\s*(\d{3,4})/)||[])[1]||"";for(let i=0;i<lines.length;i++){const m=lines[i].match(/^(?:debited from|paid from|from)\b\s*(?:account|a\/c)?\s*[:\-]?\s*(.*)$/i);if(!m)continue;
      let rest=(m[1]||"").trim(),nx=(lines[i+1]||"").trim(),l4="",lab="";
      const inl=rest.match(/^(.*?)\s*[xX*•.]{2,}\s*(\d{3,4})\s*$/);
      if(inl){lab=inl[1];l4=inl[2]}else if(MK.test(nx)){lab=rest;l4=MD(nx)}else if(!rest&&lines[i+2]&&MK.test((lines[i+2]||"").trim())){lab=nx;l4=MD(lines[i+2])}
      if(l4){lab=lab.replace(/[^A-Za-z0-9 .&'\-]/g," ").replace(/\s+/g," ").trim();P.fromLabel=lab.slice(0,40);P.fromLast4=l4.slice(-4);if(!P.last4||/^(?:debited from|paid from)\b/i.test(lines[i]))P.last4=l4.slice(-4);
        const w=(lab.toLowerCase().match(/[a-z]{3,}/g)||[]);if(P.sender&&w.some(x=>P.sender.toLowerCase().includes(x)))P.sender="";break}}}
  // SMS style (one line): "... credited to RAVI KUMAR VPA ..." / "... received from AMIT SHARMA ..."
  const nm="([A-Za-z][A-Za-z .'\\-]{2,40}?)(?=\\s+(?:VPA|UPI|IMPS|NEFT|on|ref|via|a\\/c|\\()|[.,;(]|\\s*$)";
  if(!P.receiver){const m=flat.match(new RegExp("(?:credited to|paid to|sent to|transferred to)\\s+"+nm,"i"));if(m)P.receiver=nameOf(m[1])}
  if(!P.sender){const m=flat.match(new RegExp("(?:received from|credited by|by a\\/c of|from)\\s+"+nm,"i"));if(m)P.sender=nameOf(m[1])}
  {const LB=ixlGet().lab.pay||{};if(!P.receiver&&LB.receiver)P.receiver=ixlGrab(raw,LB.receiver,"name")||"";if(!P.sender&&LB.sender)P.sender=ixlGrab(raw,LB.sender,"name")||"";if(!P.utr&&LB.utr){const u=ixlGrab(raw,LB.utr,"id");if(u&&(u.match(/\d/g)||[]).length>=6)P.utr=u}if(!P.amount&&LB.amount)P.amount=ixlGrab(raw,LB.amount,"num")||0;if(!P.bank&&P.last4){const lb=ixlGet().acct[P.last4];if(lb)P.bank=lb}}
  if(/\bupi\s*lite\b/i.test(flat)&&/debit|paid (?:from|via|using|with)|\bsent\b/i.test(flat)&&P.dir!=="in"&&!/(?:added|add(?:ing)? money|top.?up|load(?:ed)?|transferred)\s+(?:money\s+)?(?:to|in|into)\s+upi\s*lite|upi\s*lite\s+(?:top.?up|load|balance added)/i.test(flat)){P.lite=true;P.liteApp=liteAppOf(flat);P.sender="";P.fromLabel="";const lb=ixLiteBank(P.amount,P.liteApp);P.bank=lb?(lb.bankName||lb.name):"";P.liteGuess=P.bank;P.last4=lb&&lb.accNo?String(lb.accNo).replace(/\D/g,"").slice(-4):""}
  if(/(?:added|add(?:ing)? money|top.?up|load(?:ed)?|transferred)\s+(?:money\s+)?(?:to|in|into)\s+upi\s*lite|upi\s*lite\s+(?:top.?up|load|balance added)/i.test(flat)){P.liteLoad=true;P.liteApp=liteAppOf(flat)}
  P.ok=P.amount>0&&!!P.utr;return P}
const fileHash=async f=>{try{const b=await f.arrayBuffer();if(window.crypto&&crypto.subtle){const h=await crypto.subtle.digest("SHA-256",b);return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,32)}return"f"+impHash(String.fromCharCode(...new Uint8Array(b.slice(0,60000))))}catch(e){return""}};
async function liteAutoTop(b,bb0,nb){const au=b.lite&&b.lite.auto;if(au&&au.on&&+au.below>0&&+au.amt>0&&nb<+au.below){const add=Math.min(+au.amt,5e3-nb,Math.floor(bb0));if(add>0){await putRec({id:newId("l_"),kind:"litemove",bank:b.id,amt:add,dir:"in",time:Date.now()+1,note:"auto top-up"});const lite={...b.lite,bal:nb+add,t:Date.now()};await patchRec(b.id,{lite});b.lite=lite;nb+=add}}return nb}
async function liteApply(b,mode,amt,note,force){const cur=+b.lite.bal||0;const bb0=Math.max(0,(balances().bal[b.id])||0);amt=Math.max(0,Math.min(amt,mode==="in"?5e3-cur:cur));if(!(amt>0))return cur;
  if(mode==="in"&&!force&&amt>bb0+0.5)throw new Error(`Low balance: ${b.name} has only ${inr(Math.round(bb0))}, so ${inr(Math.round(amt))} cannot go into UPI Lite`);let nb=mode==="in"?Math.min(5e3,cur+amt):Math.max(0,cur-amt);
  await putRec({id:newId("l_"),kind:"litemove",bank:b.id,amt,dir:mode,time:Date.now(),...(note?{note}:{})});
  let lite={...b.lite,bal:nb,t:Date.now()};await patchRec(b.id,{lite});b.lite=lite;
  nb=await liteAutoTop(b,bb0,nb);
  return nb}
const liteBanks=()=>feat("lite")?banks.filter(b=>b.type!=="Cash"&&b.lite&&b.lite.on):[];
const LITE_APPS=["PhonePe","Google Pay","Paytm","BHIM","Other"];
const liteAppOf=t=>/phonepe|phone pe/i.test(t)?"PhonePe":/google ?pay|gpay|g pay/i.test(t)?"Google Pay":/paytm/i.test(t)?"Paytm":/\bbhim\b/i.test(t)?"BHIM":"";
const ixLiteHint=(hints,app)=>{try{if(!feat("lite"))return null;const L=banks.filter(b=>b.type!=="Cash"&&b.lite&&b.lite.on);for(const h0 of hints||[]){const h=String(h0||"");if(!h||/yes bank|upi\s*lite|^lite$/i.test(h))continue;const B=PAY_BANKS.find(([,re])=>re.test(h)),k=String(B?B[0]:h).toLowerCase().split(" ")[0];if(k.length<3)continue;let c=L.filter(b=>((b.name||"")+" "+(b.bankName||"")).toLowerCase().includes(k));if(c.length>1&&app)c=c.filter(b=>b.lite.app===app);if(c.length===1)return c[0]}}catch(e){}return null};
const ixLiteBank=(amt,app)=>{if(!feat("lite"))return null;const L=banks.filter(b=>b.type!=="Cash"&&b.lite&&b.lite.on);if(!L.length)return null;const A=app?L.filter(b=>b.lite.app===app):[];const pool=A.length?A:L;return pool.find(b=>(+b.lite.bal||0)>=(amt||0))||pool[0]||null};
function ixL4(v){const t=String(v==null?"":v).replace(/\S*\d\S*@[A-Za-z]\S*/g," ");const m=[...t.matchAll(/(\d{4})(?!\d)/g)];return m.length?m[m.length-1][1]:!/@/.test(String(v||""))&&String(v||"").replace(/\D/g,"").length===4?String(v).replace(/\D/g,""):""}
function payBank(p){const mine=banks.filter(b=>b.type!=="Cash");let b=null;if(p.last4)b=mine.find(x=>x.accNo&&String(x.accNo).replace(/\D/g,"").endsWith(p.last4));
  if(!b&&p.vpa){const v=String(p.vpa).toLowerCase().trim(),VL=x=>[...(x.vpas||[]),...String(x.upi||"").split(/[\s,;]+/)].map(y=>String(y).toLowerCase().trim()).filter(y=>y.includes("@"));b=mine.find(x=>VL(x).includes(v))||null;
    if(!b){const m=v.match(/^[xX*•.\s-]{2,}([\w.\-]{2,})@([a-z0-9.\-]+)$/);if(m){const c=mine.filter(x=>VL(x).some(y=>{const q=y.split("@");return q[1]===m[2]&&q[0].endsWith(m[1])}));if(c.length===1)b=c[0]}}}
  if(!b&&p.bank){const k=p.bank.toLowerCase().split(" ")[0];const c=mine.filter(x=>((x.name||"")+" "+(x.bankName||"")).toLowerCase().includes(k));if(c.length===1)b=c[0]}return b||null}
function payMatches(p){const side=p.dir==="in"?"SELL":p.dir==="out"?"BUY":"";
  return orders.filter(o=>o.status!=="Cancelled"&&o.via!=="ex"&&modeOf(o)!=="Direct"&&(!side||o.side===side)&&Math.abs(orderTotal(o)-p.amount)<=1).sort((a,b)=>(a.status==="Pending"?0:1)-(b.status==="Pending"?0:1)||b.time-a.time).slice(0,6)}
const nameTok=v=>String(v||"").toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=3);
let formProof=null;
// what could be wrong with this payment for this order (shown live; you can still confirm with a reason)
function payWarn(v,o,hash){const W=[];
  if(v.status&&v.status!=="Success")W.push(`The screenshot shows this payment as ${v.status}, not Success.`);
  if(!(v.amount>0))W.push("No amount.");
  if(!v.utr)W.push("No UTR / reference. Add it so the payment can be traced.");
  else{const D=dupFlags({id:o?o.id:"__x",utr:v.utr,status:"Pending"});if(D.length)W.push(`This UTR was already used in another order: ${shortO(D[0].o)}.`)}
  if(hash){const u=shotUsed([hash],"__none");if(u)W.push(`This screenshot was already used for ${u.id===(o&&o.id)?"this order":"another order"}: ${shortO(u)}.`)}
  if(o){const tot=orderTotal(o),paid=allocated(o);
    if(v.amount>0&&Math.abs(v.amount-tot)>1)W.push(v.amount<tot?`Partial payment: ${inr(Math.round(v.amount))} of ${inr(Math.round(tot))}.`:`Payment ${inr(Math.round(v.amount))} is more than the order total ${inr(Math.round(tot))}.`);
    const other=o.side==="BUY"?v.receiver:v.sender;const a=nameTok(other),b=nameTok(o.cp);
    if(a.length&&b.length&&!a.some(w=>b.some(z=>z.includes(w)||w.includes(z))))W.push(`${o.side==="BUY"?"Receiver":"Sender"} “${other}” is not the client “${o.cp}” (exchange nicknames can differ).`);
    if(o.utr&&v.utr&&normRef(o.utr)!==normRef(v.utr))W.push(`This order already has a different UTR (${o.utr}).`)}
  return W}
function payCard(p,file,src){
  const card=document.createElement("div");card.className="acard paycard";let hash="";const hp=file?fileHash(file).then(h=>{hash=h;upd2()}):Promise.resolve();
  const bk0=payBank(p),ms=payMatches(p);const oo=orders.filter(o=>!ms.includes(o)&&(o.status==="Pending"||o.status==="Appeal")&&o.via!=="ex"&&modeOf(o)!=="Direct").sort((a,b)=>b.time-a.time).slice(0,6);
  const lab=o=>`${o.side} ${fmtQ(o.qty)} ${o.coin} · ${o.cp||"—"} · ${inr(Math.round(orderTotal(o)))} · ${o.status}`;
  const dtv=p.time?new Date(p.time-new Date(p.time).getTimezoneOffset()*6e4).toISOString().slice(0,16):"";
  card.innerHTML=`<div class="ah">Payment found <small>${src==="AI"?"AI extracted":"read on your phone"} · check, then confirm</small></div>
    <div class="payg"><label>Amount ₹<input data-f="amount" inputmode="decimal" value="${p.amount||""}"></label><label>UTR / reference<input data-f="utr" value="${esc(p.utr)}"></label>
    <label>From<input data-f="sender" value="${esc(p.sender)}"></label><label>To<input data-f="receiver" value="${esc(p.receiver)}"></label>
    <label>Bank<input data-f="bank" value="${esc(p.bank)}"></label><label>Date &amp; time<input data-f="time" type="datetime-local" value="${dtv}"></label>
    <label>Status<select data-f="status">${["Success","Pending","Failed"].map(x=>`<option ${x===(p.status||"Success")?"selected":""}>${x}</option>`).join("")}</select></label>
    <label>Match to order<select data-f="order">${ms.map(o=>`<option value="${o.id}">✓ ${esc(lab(o))}</option>`).join("")}${oo.map(o=>`<option value="${o.id}">${esc(lab(o))}</option>`).join("")}<option value="">No order yet · start a new one</option></select></label></div>
    <label class="dirchk" data-recw hidden><input type="checkbox" data-f="rec"><span data-rect></span></label>
    <div class="paywarn" data-w></div>
    <div class="row2"><button class="mini" type="button" data-ok>Confirm &amp; attach</button><button class="mini ghost" type="button" data-skip>Skip</button></div>`;
  const F=k=>card.querySelector(`[data-f="${k}"]`);
  const read=()=>({amount:+String(F("amount").value).replace(/,/g,"")||0,utr:F("utr").value.trim(),sender:F("sender").value.trim(),receiver:F("receiver").value.trim(),bank:F("bank").value.trim(),time:F("time").value?new Date(F("time").value).getTime():0,status:F("status").value,order:F("order").value,rec:F("rec").checked});
  function upd2(){const v=read(),o=orders.find(x=>x.id===v.order);const W=payWarn(v,o,hash);card.querySelector("[data-w]").textContent=W.length?"⚠️ "+W.join("\n⚠️ "):"";
    const bk=bk0,can=!!(o&&bk&&v.status==="Success"&&v.amount>0&&allocated(o)+v.amount<=orderTotal(o)+1);const rw=card.querySelector("[data-recw]");rw.hidden=!can;
    if(can)card.querySelector("[data-rect]").textContent=`Also record ${inr(Math.round(v.amount))} ${o.side==="BUY"?"paid from":"received in"} ${bk.name}`;if(!can)F("rec").checked=false}
  card.addEventListener("input",upd2);card.addEventListener("change",e=>{if(e.target.dataset.f==="order"){const o=orders.find(x=>x.id===F("order").value);if(o&&allocated(o)===0&&bk0&&!F("rec").checked&&read().status==="Success")F("rec").checked=true}upd2()});
  card.querySelector("[data-skip]").onclick=()=>card.remove();
  card.querySelector("[data-ok]").onclick=async()=>{const btn=card.querySelector("[data-ok]");btn.disabled=true;
    try{await hp;const v=read(),o=orders.find(x=>x.id===v.order);const W=payWarn(v,o,hash);let why="";
      if(W.length){const c=await confirmRisk(W,"Check this payment","Confirm anyway");if(!c){btn.disabled=false;return}why=c.why}
      let ids=[];try{if(file&&assetsApi)ids=await uploadProofs([file])}catch(e){toast("Screenshot not saved, details will still be added")}
      if(!o){formProof={ids,hashes:hash?[hash]:[],time:v.time};$("#t-add").click();$("#pdet").open=true;$("#f-utr").value=v.utr;$("#f-pv").value="verified";$("#f-note").value=`Payment ${inr(Math.round(v.amount))}${v.sender?" from "+v.sender:""}${v.receiver?" to "+v.receiver:""}`.slice(0,120);
        const sb=document.querySelector(`#sideSeg [data-v="${p.dir==="in"?"SELL":"BUY"}"]`);if(sb)sb.click();$("#f-cp").value=(p.dir==="in"?v.sender:v.receiver)||"";if(v.status!=="Success")$("#f-status").value="Pending";dupHint();upd();card.remove();toast("Add quantity and rate, then save. The screenshot is attached.");return}
      const patch={pv:"verified",proofs:[...(o.proofs||[]),...ids],shots:[...(o.shots||[]),...(hash?[hash]:[])]};if(v.time)patch.payAt=v.time;
      if(!o.utr&&v.utr)patch.utr=v.utr;else if(v.utr&&normRef(v.utr)!==normRef(o.utr))patch.note=((o.note?o.note+" · ":"")+"UTR "+v.utr).slice(0,200);
      if(v.rec&&bk0)patch.splits=[...(o.splits||[]),{bank:bk0.id,amt:r2(v.amount),method:p.method||"UPI"}];
      await patchRec(o.id,patch);await auditLog(o,"proof",{utr:v.utr,amt:Math.round(v.amount),why,warn:W});
      card.querySelector(".ah").innerHTML="Saved <small>verified by you</small>";card.querySelector(".payg").remove();card.querySelector(".row2").remove();card.querySelector("[data-recw]").remove();card.querySelector("[data-w]").textContent=`Attached to ${shortO(o)}`;card.querySelector("[data-w]").style.color="var(--accent)";toast("Payment verified")
    }catch(err){console.error(err);btn.disabled=false;toast("Couldn't save. Try again.")}};
  {const o0=orders.find(x=>x.id===F("order").value);if(o0&&bk0&&allocated(o0)===0&&(p.status||"Success")==="Success")F("rec").checked=true}
  upd2();return card}
function plans(amount,dir,cashOnly,method){
  const {bal}=balances();const use=limitUse();
  const avail=b=>{if(dir!=="pay"||!method)return bal[b.id];return Math.min(bal[b.id],limitLeft(b,method,use))};
  const ok=b=>b.status!=="frozen"&&b.status!=="paused";
  let list=banks.filter(b=>(cashOnly?b.type==="Cash":b.type!=="Cash")&&ok(b)).map(b=>({id:b.id,name:b.name,bal:avail(b)}));
  if(!list.length)return[];
  if(dir==="receive"){const low=[...list].sort((a,b)=>a.bal-b.bal),lowPlan={title:"Lowest balance",why:"Keeps money spread out",parts:[{id:low[0].id,name:low[0].name,amt:amount}]};
    if(cashOnly)return[{...lowPlan,title:"Receive in"}];
    const mv=movements(),I={};list.forEach(x=>{const b=banks.find(y=>y.id===x.id);I[x.id]=bankInsight(b,mv,bal[x.id]||0,use)});
    const safe=[...list].sort((a,b)=>I[a.id].pts-I[b.id].pts||a.bal-b.bal),top=safe[0],ti=I[top.id];
    const out=[];
    if(ti.capLeft>=amount-0.5)out.push({title:"Safest bank",why:"Lowest freeze risk ("+ti.level.toLowerCase()+")"+(ti.cap?" and "+inr(Math.round(ti.capLeft))+" left under your receive cap":""),parts:[{id:top.id,name:top.name,amt:amount}]});
    else{let left=amount;const parts=[];for(const x of safe){if(left<=0.009)break;const room=I[x.id].capLeft;const t=Math.floor(Math.min(room,left)*100)/100;if(t>0){parts.push({id:x.id,name:x.name,amt:t});left-=t}}
      if(left>0.009){if(parts.length)parts[0].amt=+(parts[0].amt+left).toFixed(2);else parts.push({id:top.id,name:top.name,amt:amount})}
      out.push({title:"Spread by receive cap",why:"Each bank gets only what fits under its receive cap, safest first",parts})}
    out.push(lowPlan);return out}
  const res=[];const pos=list.filter(b=>b.bal>0);
  const one=pos.filter(b=>b.bal>=amount).sort((a,b)=>a.bal-b.bal)[0];
  if(one)res.push({title:"One bank",why:"Smallest balance that covers the full amount"+(method?" within the "+method+" limit left":""),parts:[{id:one.id,name:one.name,amt:amount}]});
  const take=(arr)=>{let left=amount;const parts=[];for(const b of arr){if(left<=0.009)break;const t=Math.floor(Math.min(b.bal,left)*100)/100;if(t>0){parts.push({id:b.id,name:b.name,amt:t});left-=t}}return{parts,left:Math.max(0,+left.toFixed(2))}};
  const small=take([...pos].sort((a,b)=>a.bal-b.bal));
  if(small.parts.length>1||!one)res.push({title:"Use leftovers first",why:"Clears small balances lying in many banks",parts:small.parts,left:small.left});
  const big=take([...pos].sort((a,b)=>b.bal-a.bal));
  if(!one&&big.parts.length<small.parts.length)res.push({title:"Fewest banks",why:"Splits across as few banks as possible",parts:big.parts,left:big.left});
  return res;
}
// split editor used in the order form and the assign sheet
function makeSplit(box,remainEl,getTotal,getDir,getMethod){
  let rows=[];
  function draw(){
    const {bal}=balances();const dir=getDir();const use=limitUse();
    box.innerHTML=rows.map((x,i)=>{const b=banks.find(k=>k.id===x.bank);const a=+x.amt||0;const ll=b&&dir==="pay"?limitLeft(b,x.method,use):Infinity;
      const warn=dir==="pay"&&b?(bal[x.bank]<a?" · not enough balance":ll<a?` · over ${x.method} limit`:""):"";
      return `<div class="srow"><select data-i="${i}" data-f="bank" aria-label="Bank"><option value="">Choose bank</option>${banks.map(b=>`<option value="${b.id}" ${b.id===x.bank?"selected":""}>${esc(b.name)}</option>`).join("")}</select><input data-i="${i}" data-f="amt" type="number" inputmode="decimal" step="any" placeholder="Amount" value="${x.amt||""}" aria-label="Amount"><button type="button" class="xbtn" data-x="${i}" aria-label="Remove">×</button>
      <div class="mrow">${METHODS.map(m=>`<button type="button" class="mpill ${m===x.method?"on":""}" data-i="${i}" data-m="${m}">${m}</button>`).join("")}</div>
      ${b?`<div class="bal ${warn?"low":""}">Balance ${inr(bal[x.bank]||0)}${ll!==Infinity?` · ${x.method} left ${x.method==="UPI"?"(24h)":"today"} ${inr(Math.max(0,ll))}`:""}${warn}</div>`:""}</div>`}).join("");
    refresh();
  }
  function refresh(){
    const tot=getTotal(),sum=rows.reduce((t,x)=>t+(+x.amt||0),0),left=tot-sum;
    if(!banks.length){remainEl.innerHTML='No banks yet. Add your banks in Wallet first.';return}
    if(!rows.length){remainEl.textContent="You can leave this empty and assign banks later from Wallet.";return}
    remainEl.innerHTML=Math.abs(left)<0.5?'<span style="color:var(--buy)">Fully assigned ✓</span>':left>0?`Left to assign: <b class="num">${inr(left)}</b> (you can do it later)`:`<span style="color:var(--sell)">More than total by ${inr(-left)}</span>`;
  }
  box.addEventListener("input",e=>{const i=e.target.dataset.i;if(i==null)return;rows[i][e.target.dataset.f]=e.target.dataset.f==="amt"?e.target.value:e.target.value;if(e.target.dataset.f==="bank")draw();else refresh()});
  box.addEventListener("change",e=>{if(e.target.dataset.f==="bank"){rows[e.target.dataset.i].bank=e.target.value;draw()}});
  box.addEventListener("click",e=>{const mp=e.target.closest("[data-m]");if(mp){rows[mp.dataset.i].method=mp.dataset.m;draw();return}const x=e.target.closest("[data-x]");if(!x)return;rows.splice(+x.dataset.x,1);draw()});
  return{
    add(){const left=getTotal()-rows.reduce((t,x)=>t+(+x.amt||0),0);rows.push({bank:"",amt:left>0?+left.toFixed(2):"",method:getMethod()});draw()},
    set(list){rows=(list||[]).map(x=>({bank:x.bank,amt:x.amt,method:x.method||getMethod()}));draw()},
    suggest(cashOnly){const t=getTotal();if(!(t>0)){toast("Enter quantity and rate first");return}const already=rows.reduce((s,x)=>s+(+x.amt||0),0);const need=t-already;if(need<=0.5){toast("Already fully assigned");return}
      const m=getMethod();const pl=plans(need,getDir(),cashOnly,m)[0];if(!pl){toast(cashOnly?"Add a Cash account in Wallet first":"Add your banks in Wallet first");return}
      pl.parts.forEach(p=>rows.push({bank:p.id,amt:p.amt,method:m}));draw();if(pl.left>0.5)toast("Not enough balance or limit left. "+inr(pl.left)+" still to assign")},
    get(){const splits=rows.filter(x=>x.bank&&+x.amt>0).map(x=>({bank:x.bank,amt:+(+x.amt).toFixed(2),method:x.method||getMethod()}));return{splits,sum:splits.reduce((t,x)=>t+x.amt,0)}},
    reset(){rows=[];draw()},refresh:draw
  };
}
window.formSplit=makeSplit($("#f-splits"),$("#f-remain"),()=>(+$("#f-qty").value||0)*(+$("#f-rate").value||0),()=>side==="BUY"?"pay":"receive",()=>formMode==="Cash"?"Cash":methodOf($("#f-pay").value));
$("#f-addsplit").onclick=()=>formSplit.add();
$("#f-suggest").onclick=()=>formSplit.suggest(formMode==="Cash");

// sheets
