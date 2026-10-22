// ================= SMART INTAKE ENGINE =================
// photo → read on phone → classify → extract → match payments to orders → verify → (AI only when needed) → risk → save
// Each step has its own status. A save problem never turns a good analysis into "failed".
const IX_TYPES={PAY_RECEIPT:"Payment receipt",BANK_TX:"Bank transaction",UPI:"UPI payment",IMPS:"IMPS payment",EX_ORDER:"Exchange order",CRYPTO_ORDER:"Crypto order",UNKNOWN:"Unknown"};
const ixIsPay=t=>["PAY_RECEIPT","BANK_TX","UPI","IMPS"].includes(t),ixIsOrd=t=>["EX_ORDER","CRYPTO_ORDER"].includes(t);
const IX_EXCH=/binance|kucoin|bybit|okx|mexc|bitget|gate\.?io|htx|huobi|coinswitch|wazirx|zebpay|bitfinex/i;
function ixClassify(text){const t=String(text||"");if(t.trim().length<12)return{type:"UNKNOWN",conf:0,pay:0,ord:0};
  {const lg=ixLedgerRows(t);if(lg.pairs.length)return{type:"EX_LEDGER",conf:0.85,pay:0,ord:0,ledger:lg}}
  {const lr=ixListRows(t);if(lr.length>=2)return{type:"EX_LIST",conf:0.8,pay:0,ord:0,rows:lr}}
  const cnt=(re)=>(t.match(re)||[]).length;
  const P=payParse(t);
  const pay=cnt(/upi ref|utr|transaction id|txn id|paid to|payment (?:successful|completed)|money sent|payment (?:to|from)|debited|credited|reference (?:no|number)|bank ref|google ?pay|phonepe|paytm|bhim|\bimps\b|\bneft\b|a\/c|ifsc|banking name/ig)+(P.ok?3:0)+(P.utr?1:0)
    +(/payment successful/i.test(t)?1:0)+(/[\w.\-•*]{3,}@[a-z]{2,}\b/i.test(t)?1:0)+(/split expense|share receipt|view details/i.test(t)?1:0); // wallet apps (GPay, PhonePe…) print no UTR on the first screen
  const ord=cnt(/order (?:no|id|number|#)|\bbuyer\b|\bseller\b|total price|unit price|\bquantity\b|usdt|crypto|\bp2p\b|escrow|release|appeal|you (?:buy|sell)|counterparty|fiat amount|transfer notice|cancell?ed|cancellation|expired|time ?out|timed out|order closed|\b(?:buy|sell)\s+(?:usdt|usdc|btc|eth|bnb|trx)\b|payment (?:window|time limit|deadline)|unit price/ig)+(IX_EXCH.test(t)?2:0)+(/\b\d{16,24}\b/.test(t)?1:0);
  let type="UNKNOWN",conf=0.4;
  if(pay>=2&&pay>=ord+2){type=/imps/i.test(t)?"IMPS":/upi|gpay|google ?pay|phonepe|paytm|bhim/i.test(t)?"UPI":/a\/c|account|ifsc|neft|debited|credited|bank/i.test(t)?"BANK_TX":"PAY_RECEIPT";conf=Math.min(0.99,0.55+0.07*(pay-ord))}
  else if(ord>=2&&ord>=pay+2){type=IX_EXCH.test(t)?"EX_ORDER":"CRYPTO_ORDER";conf=Math.min(0.99,0.55+0.07*(ord-pay))}
  if(type==="UNKNOWN"&&ord>=1&&pay===0&&/cancell?ed|expired|time ?out|timed out|appeal|dispute|released|order closed/i.test(t)){type=IX_EXCH.test(t)?"EX_ORDER":"CRYPTO_ORDER";conf=0.5}
  return{type,conf,pay,ord}}
// ---- names: drop field labels and icon noise that OCR glues onto a person's name
const IX_LABELISH=/\b(transaction|txn|utr|debited|credited|banking|reference|ref|number|created|order|amount|total|price|rate|quantity|date|time|phonepe|google|gpay|paytm|bhim|transfer|details|status|successful|success|completed|upi|bank|account|payment|method|counterparty|merchant|released|chat|funding|assets|support|receipt|history|expense|expense|share|again|send)\b/i;
function ixNameClean(v){v=String(v||"").replace(/\(.*$/,"").replace(/\S+@\S+/g," ").replace(/[^A-Za-z .'\-]/g," ").replace(/\s+/g," ").trim();
  let w=v.split(" ").filter(Boolean);while(w.length>2&&/^[a-z]{1,2}$/.test(w[0]))w.shift();while(w.length>1&&/^[^A-Za-z]$|^[A-Za-z]$/.test(w[w.length-1])&&w.length>2)w.pop();
  {const seen=new Set();w=w.filter(x=>{const k=x.toLowerCase().replace(/[^a-z]/g,"");if(k.length<3)return true;if(seen.has(k))return false;seen.add(k);return true})}
  v=w.join(" ").replace(/^[.'\-\s]+|[.'\-\s]+$/g,"");if(v.length<2||IX_LABELISH.test(v)||/\b(?:has|have|will|please|paid|payment|release|confirm|balance|recipient|buyer|seller|crypto|proof|review)\b/i.test(v)||!w.some(x=>x.replace(/[^A-Za-z]/g,"").length>=3))return null;return v.slice(0,40)}
// ================= INTAKE MEMORY: what Smart Intake learns. Kept on this phone only; every item can be forgotten.
var IXL;
const ixlH=x=>{let h=5381;x=String(x);for(let i=0;i<x.length;i++)h=((h<<5)+h+x.charCodeAt(i))|0;return(h>>>0).toString(36)};
const ixlN=n=>String(n||"").toLowerCase().replace(/[^a-z\s]/g," ").split(/\s+/).filter(t=>t&&!/^(mr|mrs|ms|shri|smt|sri|dr|m)$/.test(t)).sort().join(" ");
function ixlGet(){const R=typeof recs!=="undefined"&&Array.isArray(recs)?recs:[];
  if(IXL&&!IXL.dirty&&IXL.rl===R.length)return IXL;
  IXL={alias:new Map(),lab:{ord:{},pay:{}},acct:{},n:0,dirty:false,rl:R.length};
  R.filter(r=>r.kind==="ixl").forEach(r=>{IXL.n++;
    if(r.t==="alias"){[[r.a,r.b],[r.b,r.a]].forEach(([x,y])=>{let st=IXL.alias.get(x);if(!st){st=new Set();IXL.alias.set(x,st)}st.add(y)})}
    else if(r.t==="lab"){const o=(IXL.lab[r.s]=IXL.lab[r.s]||{});(o[r.f]=o[r.f]||[]).push({l:r.l,n:r.n||1})}
    else if(r.t==="acct"){IXL.acct[r.l4]=r.bank}});
  ["ord","pay"].forEach(k=>Object.keys(IXL.lab[k]).forEach(f=>IXL.lab[k][f].sort((a,b)=>b.n-a.n)));return IXL}
function ixlAlias(a,b){const A=ixlN(a),B=ixlN(b);if(!A||!B||A===B)return false;const st=ixlGet().alias.get(A);return!!(st&&st.has(B))}
async function ixlSet(id,obj){try{const old=recs.find(r=>r.id===id);if(old)await patchRec(id,{n:(old.n||1)+1,last:Date.now()});else await putRec({id,kind:"ixl",...obj,n:1,time:Date.now(),last:Date.now()});if(IXL)IXL.dirty=true;return!old}catch(e){return false}}
// the label that sits in front of a value on the screen ("Counterparty", "Total Amount", "Banking Name" …)
function ixlFindLabel(text,val,kind){if(val==null||val==="")return null;const lines=String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const okLab=x=>{x=String(x||"").replace(/[₹$]|INR|Rs\.?/gi," ").replace(/[:：\-–(]+\s*$/,"").replace(/\s+/g," ").trim();return/^[A-Za-z][A-Za-z .\/'\-]{2,30}$/.test(x)&&!/^(buyer|seller)$/i.test(x)?x.toLowerCase():null};
  let re=null,tok=null;
  if(kind==="num"){const sv=String(val),[ip,fp]=sv.split(".");if(!/^\d+$/.test(ip))return null;re=new RegExp("(?<![\\d.,])"+ip.replace(/\B(?=(\d{3})+(?!\d))/g,",?")+(fp?"\\."+fp:"")+"(?![\\d])")}
  else{const tk=String(val).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>=3);tok=tk[0]||String(val).slice(0,10).toLowerCase();if(tok.length<3)return null}
  for(let i=0;i<lines.length;i++){const L=lines[i];let idx=-1;
    if(re){const m=L.match(re);if(m)idx=m.index}else idx=L.toLowerCase().indexOf(tok);
    if(idx<0)continue;const before=L.slice(0,idx);let l=okLab(before);
    if(l)return{l,m:"in"};
    if(!before.replace(/[₹$:：\-\s]|INR|Rs\.?/gi,"")&&i>0){const l2=okLab(lines[i-1]);if(l2)return{l:l2,m:"below"}}}
  return null}
// read a value using a label that was learned earlier (only used when the built-in reader found nothing)
function ixlGrab(text,labs,shape){if(!labs||!labs.length)return null;const lines=String(text||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
  for(const {l} of labs){const re=new RegExp("^"+l.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s*")+"\\b\\s*[:：\\-]?\\s*(.*)$","i");
    for(let i=0;i<lines.length;i++){const m=lines[i].match(re);if(!m)continue;let v=(m[1]||"").trim();if(!v&&lines[i+1])v=lines[i+1];
      if(shape==="num"){const x=v.match(/[0-9][0-9,]*(?:\.\d+)?/);if(x){const n=parseFloat(x[0].replace(/,/g,""));if(isFinite(n))return n}}
      else if(shape==="name"){const c=ixNameClean(v);if(c)return c}
      else{const x=v.match(/[0-9A-Za-z]{8,40}/);if(x){let id=x[0];const nx=lines[i+1];if((m[1]||"").trim()&&nx&&/^[0-9A-Za-z]{2,8}$/.test(nx)&&/\d/.test(nx)&&!IX_LABELISH.test(nx)&&id.length>=14)id+=nx;return id}}}}
  return null}
// after the AI filled something the phone could not read: remember WHERE it sits, but only if the value really is in the phone's text
async function ixlLearnLayout(g){try{const F=g.aiFilled;if(!F||!F.size)return 0;let n=0;
  const ordT=g.order&&g.order.ocr&&g.order.ocr.text,payIt=g.pays.find(x=>!x.support)||g.pays[0],payT=payIt&&payIt.ocr&&payIt.ocr.text;
  const jobs=[["ord","id","str",ordT],["ord","buyer","str",ordT],["ord","seller","str",ordT],["ord","fiat","num",ordT],["ord","price","num",ordT],["ord","crypto","num",ordT],["pay","receiver","str",payT],["pay","sender","str",payT],["pay","utr","str",payT],["pay","amount","num",payT]];
  for(const [sc,k,kind,txt] of jobs){if(!txt||!F.has(sc+"."+k))continue;const v=(sc==="ord"?g.aiOrd:g.aiPay||{})[k];if(v==null)continue;const hit=ixlFindLabel(txt,v,kind);if(!hit)continue;
    const f=(k==="buyer"||k==="seller")?"cp":k;if(await ixlSet("ixl_lab_"+sc+"_"+f+"_"+ixlH(hit.l),{t:"lab",s:sc,f,l:hit.l,m:hit.m}))n++}
  const l4=String((payIt&&payIt.pay&&payIt.pay.last4)||"").replace(/\D/g,"");
  if(l4.length===4&&g.aiPay&&g.aiPay.bank&&F.has("pay.bank")){const B=PAY_BANKS.find(([,re])=>re.test(g.aiPay.bank));if(B&&await ixlSet("ixl_acct_"+l4,{t:"acct",l4,bank:B[0]}))n++}
  return n}catch(e){return 0}}
// on save: two similar names in the same deal (every word of the shorter name is in the longer one) are the same person from now on
async function ixlOnSave(g){try{let n=0;const M=[];
  for(const f of g.cmp.fields){if(!(f.k==="buyer"||f.k==="seller")||f.res!=="UNCLEAR"||!f.pay||!f.ord||f.pay==="—"||f.ord==="—")continue;
    const A=verTok(f.pay),B=verTok(f.ord),[S,Lg]=A.length<=B.length?[A,B]:[B,A];
    if(S.length<2||!S.every(t=>Lg.some(u=>u===t||(t.length>=3&&u.startsWith(t))||(u.length>=3&&t.startsWith(u)))))continue;
    const a=ixlN(f.pay),b=ixlN(f.ord);if(!a||!b||a===b||ixlAlias(f.pay,f.ord))continue;const [x,y]=a<b?[a,b]:[b,a];
    if(await ixlSet("ixl_alias_"+ixlH(x+"|"+y),{t:"alias",a:x,b:y,da:f.pay,db:f.ord})){n++;M.push(f.pay+" = "+f.ord)}}
  return n?`Learned ${n} name${n>1?"s":""}: ${M.join(", ")}`:""}catch(e){return""}}
function ixlKnown(name,side){if(!name)return 0;return orders.filter(o=>o.status!=="Cancelled"&&o.side===side&&o.cp&&verName(o.cp,name)==="M").length}
const ixMs=ms=>{if(!ms)return null;const d=new Date(ms),p=n=>String(n).padStart(2,"0");return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
// payment text → same shape verParse() gives
function ixPayFrom(text,conf){const p=payParse(text),d=ixMs(p.time);
  return{status:p.status==="Failed"?"FAILED":p.status==="Pending"?"PENDING":p.status==="Success"?"SUCCESS":null,amount:p.amount||null,currency:p.amount?"INR":null,sender:p.sender||null,receiver:p.receiver||null,utr:p.utr||null,method:p.method||null,bank:p.bank||null,date:d?d.slice(0,10):null,time:d?d.slice(11):null,acct:p.last4?"••"+p.last4:null,conf:conf,dir:p.dir||"",last4:p.last4||"",ok:p.ok,vpa:ixVpa(text),amountAlts:p.amountAlts||null,fromLabel:p.fromLabel||null,fromLast4:p.fromLast4||null,alts:(p.timeAlts||[]).length>1?p.timeAlts.map(ixMs):null,...(p.lite?{lite:true,liteApp:p.liteApp||null,liteGuess:p.liteGuess||null}:{}),...(p.liteLoad?{liteLoad:true,liteApp:p.liteApp||null}:{})}}
function ixOrdSide(flat){const C="(?:usdt|usdc|btc|eth|bnb|trx|xrp|sol|doge|dai|ltc|matic|shib)";const b=new RegExp("\\b(?:buy|buying|bought)\\s+"+C+"\\b","i").test(flat)||/\bBuy\s+[A-Z]{3,5}\b/.test(flat),s=new RegExp("\\b(?:sell|selling|sold)\\s+"+C+"\\b","i").test(flat)||/\bSell\s+[A-Z]{3,5}\b/.test(flat);
  if(b&&!s)return"BUY";if(s&&!b)return"SELL";if(!b&&!s){if(/you\s*pay\b/i.test(flat)&&!/you\s*(?:will\s*)?receive\s*(?:₹|rs|inr)/i.test(flat))return"BUY";if(/you\s*(?:will\s*)?receive\s*(?:₹|rs|inr)/i.test(flat))return"SELL"}return null}
// some pictures are read column by column: all the labels first, then all the values ("Total Amount / USDT Price / Amount" … "19,000 INR / 108.98 INR / 174.34 USDT"). Pair them up again and put the pairs in front of the text
function ixZipCols(text){try{const L=String(text||"").split(/\n/).map(x=>x.trim()).filter(Boolean);
  const LAB=/^(total\s*amount|total\s*price|fiat\s*amount|usdt\s*price|unit\s*price|price|amount|quantity|tax|tds|fee|counter\s*-?\s*party|order\s*(?:number|no\.?|id)|created\s*(?:at|time)|payment\s*(?:method|time)|status|buyer|seller)\s*[?:]?\s*[?⌀ⓘ]?$/i;
  let i=0;while(i<L.length){if(!LAB.test(L[i])){i++;continue}let j=i;while(j<L.length&&LAB.test(L[j]))j++;const n=j-i;
    if(n>=3){const labs=L.slice(i,j).map(x=>x.replace(/[?:⌀ⓘ]/g,"").trim()),vals=L.slice(j,j+n);
      if(vals.length===n&&!vals.some(v=>LAB.test(v))){return labs.map((l,q)=>l+" "+vals[q]).join("\n")+"\n"+L.join("\n")}}
    i=j}
  return String(text||"")}catch(e){return String(text||"")}}
// KuCoin-style order numbers (24 hex) start with the order's creation time in seconds. So a misread start (6 read as B) can be checked, and fixed, against the "Created At" printed on the same screen
const IX_CONF={"6":"b8g","b":"683","8":"6b03","0":"od8","o":"0","d":"0","1":"li","l":"1i","i":"1l","5":"s","s":"5","2":"z","z":"2","9":"gq","g":"69","3":"8b","a":"4","e":"c","c":"e"};
function ixIdHeadOk(h,ts){const v=parseInt(h,16);return /^[0-9a-f]{8}$/.test(h)&&Math.abs(v-ts/1000)<=125}
function ixIdFix(id,ts){try{if(!id||!(ts>0))return id;const s0=String(id).replace(/\s+/g,"");if(!/^[0-9A-Za-z]{24}$/.test(s0))return id;const low=s0.toLowerCase();if(ixIdHeadOk(low.slice(0,8),ts)){const t=low.slice(8).replace(/[oq]/g,"0").replace(/[li]/g,"1").replace(/s/g,"5").replace(/z/g,"2");return/^[0-9a-f]{16}$/.test(t)?low.slice(0,8)+t:s0}
  let best=null;const H=low.slice(0,8).split("");const go=(i,arr,n)=>{if(best&&best.n<=n)return;if(i===8){const h=arr.join("");if(ixIdHeadOk(h,ts)&&(!best||n<best.n))best={h,n};return}
    go(i+1,arr,n);if(n<2)for(const c of(IX_CONF[H[i]]||"")){const a2=arr.slice();a2[i]=c;go(i+1,a2,n+1)}};go(0,H,0);
  if(!best)return id;const t=low.slice(8).replace(/[oq]/g,"0").replace(/[li]/g,"1").replace(/s/g,"5").replace(/z/g,"2");return/^[0-9a-f]{16}$/.test(t)?best.h+t:best.h+low.slice(8)}catch(e){return id}}
const ixIdDoubt=(id,ts)=>{const s0=String(id||"").replace(/\s+/g,"");if(!s0)return true;if(/^\d{12,}$/.test(s0))return false;if(/^[0-9A-Za-z]{24}$/.test(s0))return ts>0?!ixIdHeadOk(s0.toLowerCase().slice(0,8),ts):false;return s0.length>=18&&s0.length<=30};
function ixOrdFrom(text,conf){const t=ixZipCols(text),flat=t.replace(/\s+/g," ");const num=s=>{const n=parseFloat(String(s).replace(/,/g,""));return isFinite(n)?n:null};
  const CUR="(?:₹|Rs\\.?|INR|[~£<¥%?=])";
  let id=null;{const wm=t.match(/(?:order\s*(?:no\.?|number|id|#)|订单号?)\s*[:：#]?\s*([0-9A-Za-z]{14,40})(?:[ \t]+[^\s]{1,2})?[ \t]*\n+[ \t]*([0-9A-Za-z]{2,8})[ \t]*(?:\n|$)/i);if(wm&&(/\d/.test(wm[2])||(/^[0-9a-f]{1,8}$/i.test(wm[2])&&wm[1].length>=18&&wm[1].length+wm[2].length<=34))&&!IX_LABELISH.test(wm[2]))id=wm[1]+wm[2]}
  if(!id)id=(flat.match(/(?:order\s*(?:no\.?|number|id|#)|订单号?)\s*[:：#]?\s*([0-9A-Za-z]{8,30})/i)||[])[1]||(flat.match(/#\s*(\d{10,24})/)||[])[1]||(flat.match(/\b(\d{16,24})\b/)||[])[1]||null;
  let fiat=null;{const lab=flat.match(new RegExp("(?:total\\s*price|fiat\\s*amount|you\\s*(?:pay|will\\s*receive|receive)|amount)\\D{0,14}"+CUR+"?\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)","i"));if(lab)fiat=num(lab[1]);
    if(fiat==null){const all=[...flat.matchAll(new RegExp(CUR+"\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)","g"))].map(m=>num(m[1])).filter(v=>v>=10);if(all.length)fiat=Math.max(...all)}}
  const cm=flat.match(/([0-9][0-9,]*(?:\.\d{1,8})?)\s*(USDT|USDC|BTC|ETH|BNB|TRX)\b/i);let crypto=cm?num(cm[1]):null,coin=cm?cm[2].toUpperCase():null;
  let price=null;{const pm=flat.match(new RegExp("(?:unit\\s*)?(?:price|rate)\\D{0,14}"+CUR+"?\\s*([0-9]{2,3}(?:\\.\\d{1,4})?)","i"));if(pm)price=num(pm[1]);if(price==null&&fiat&&crypto)price=+(fiat/crypto).toFixed(2)}
  const nm=(lab)=>{const m=flat.match(new RegExp(lab+"\\s*(?:name)?\\s*[:：]?\\s*([A-Za-z][A-Za-z.' ]{2,36}?)(?=\\s{2,}|\\s(?:order|price|amount|total|quantity|status|payment|seller|buyer|time|date)\\b|$|[0-9])","i"));if(!m)return null;const v=m[1].trim();return /^[a-z]/.test(v)||/\b(?:paid|payment|released?|the|has|have)\b/i.test(v)?null:v};
  const ixn=v=>v?ixNameClean(v):null;let buyer=ixn(nm("buyer")),seller=ixn(nm("seller"));
  let cp=null,nick=null;{const Ls=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);for(let i=0;i<Ls.length&&!cp;i++){const m=Ls[i].match(/^(?:counter\s*-?\s*party|merchant|advertiser|trader)\b\s*[:：]?\s*(.*)$/i);if(m){cp=ixNameClean(m[1])||(Ls[i+1]&&!IX_LABELISH.test(Ls[i+1])?ixNameClean(Ls[i+1]):null);nick=((m[1].match(/\(([^)]{2,30})\)/)||[])[1]||"").trim()||null;
    // the name wraps: "MOHAMMED ILIYAZ HUSSAIN" / "BELLARY (Ily67)"
    const nx=m[1].trim()&&Ls[i+1]?Ls[i+1].match(/^([A-Za-z][A-Za-z.' ]{1,24}?)\s*(?:\(([^)]{2,30})\))?$/):null;if(cp&&nx&&!IX_LABELISH.test(nx[1])&&!/\b(?:order|price|amount|total|created|status|quantity|payment|time|date|number|buyer|seller|having|place|check)\b/i.test(nx[1])){cp=ixNameClean(cp+" "+nx[1])||cp;if(nx[2]&&!nick)nick=nx[2].trim()}}}}
  const st=(flat.match(/\b(completed|released|paid|unpaid|to be paid|waiting for payment|cancell?ed|appeal|dispute|pending|processing)\b/i)||[])[1];
  let ts=payTime(t);if(!ts){const m=flat.match(/(\d{4})-(\d{2})-(\d{2})[ T]+(\d{1,2}):(\d{2})/);if(m)ts=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime()}
  let whenAlt=null,whenAlts=null;{const ta=ixTimeAlts(t);if(!ts&&ta.alts.length)ts=ta.alts[0];if(ta.amb&&ts){whenAlts=ta.alts.map(ixMs);const o=ta.alts.find(x=>x!==ts);if(o)whenAlt=ixMs(o)}}
  {const LB=ixlGet().lab.ord||{};if(!id&&LB.id)id=ixlGrab(t,LB.id,"id");if(fiat==null&&LB.fiat)fiat=ixlGrab(t,LB.fiat,"num");if(price==null&&LB.price)price=ixlGrab(t,LB.price,"num");if(crypto==null&&LB.crypto)crypto=ixlGrab(t,LB.crypto,"num");if(!cp&&LB.cp)cp=ixlGrab(t,LB.cp,"name");if(price==null&&fiat&&crypto)price=+(fiat/crypto).toFixed(2)}
  let why=null;{const L=t.split(/\n+/).map(x=>x.trim()),i=L.findIndex(l=>/reason\s*for\s*cancel/i.test(l));if(i>=0){let r=L[i].replace(/^.*reason\s*for\s*cancel\w*\s*[:：]?\s*/i,"");if(L[i+1]&&L[i+1].length<30&&!/[:：]/.test(L[i+1])&&/^[a-z]/.test(L[i+1]))r+=" "+L[i+1];why=r.replace(/\s+/g," ").trim().slice(0,140)||null}}
  let tds=null,tdsQ=null;{const lab="\\b(?:TDS|tax(?:\\s*deducted(?:\\s*at\\s*source)?)?|1\\s*%\\s*tax)\\b";
    const mc=flat.match(new RegExp(lab+"[^0-9A-Za-z]{0,8}([0-9][0-9,]*(?:\\.\\d{1,8})?)\\s*(USDT|USDC|BTC|ETH|BNB|TRX)\\s*(?:\\(?\\s*([0-9]+(?:\\.\\d+)?)\\s*%\\s*\\)?)?","i"));
    const mr=flat.match(new RegExp(lab+"\\D{0,16}"+CUR+"\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)","i"));
    if(mc){const q=num(mc[1]),pc=mc[3]?num(mc[3]):null;if(q>0&&(!crypto||q<crypto*0.05)){tdsQ=q;if(fiat&&pc)tds=+(fiat*pc/100).toFixed(2);else if(price)tds=+(q*price).toFixed(2)}}
    else if(mr){const v=num(mr[1]);if(v>0&&(!fiat||v<fiat*0.05))tds=v}}
  return{nick,why,tds,tdsQ,id:ixIdFix(id,ts),status:st?st[0].toUpperCase()+st.slice(1).toLowerCase():null,buyer,seller,fiat,crypto,coin,price,method:verMeth(flat)||null,when:ixMs(ts),acct:null,platform:(flat.match(IX_EXCH)||[])[0]||null,side:ixOrdSide(flat),cp,whenAlt:whenAlt,whenAlts:whenAlts,conf:conf}}
// the order number is unclear: cut out just that place, enlarge it and read it again, then trust it only if it fits the creation time
async function ixZoomCrop(file,box){const bmp=await createImageBitmap(file);const W=bmp.width,H=bmp.height,x0=Math.max(0,Math.floor(box.x)),y0=Math.max(0,Math.floor(box.y)),w=Math.min(W-x0,Math.ceil(box.w)),h=Math.min(H-y0,Math.ceil(box.h));if(w<20||h<10)return null;
  const k=Math.max(3,Math.min(6,1500/w)),c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);const g=c.getContext("2d");g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,x0,y0,w,h,0,0,c.width,c.height);
  const d=g.getImageData(0,0,c.width,c.height),px=d.data;let lo=255,hi=0;for(let i=0;i<px.length;i+=4){const v=(px[i]*299+px[i+1]*587+px[i+2]*114)/1000;px[i]=v;if(v<lo)lo=v;if(v>hi)hi=v}
  let dark=0,n=0;for(let i=0;i<px.length;i+=64){dark+=px[i];n++}const inv=dark/n<110,sp=Math.max(1,hi-lo);for(let i=0;i<px.length;i+=4){let v=(px[i]-lo)*255/sp;if(inv)v=255-v;v=v<128?Math.max(0,v*.55):Math.min(255,128+(v-128)*1.6);px[i]=px[i+1]=px[i+2]=v;px[i+3]=255}g.putImageData(d,0,0);
  return await new Promise(r=>c.toBlob(r,"image/png"))}
async function ixZoomReadBlob(b){if(window.P2POcr&&P2POcr.recognize){try{const n=await ixNativeOcr(b,20000);return n.text||""}catch(e){}}try{const w=await ocrInit();const r=await Promise.race([w.recognize(b),new Promise((_,no)=>setTimeout(()=>no(new Error("t")),30000))]);return(r.data&&r.data.text)||""}catch(e){return""}}
function ixZoomBox(it,W,H){const L=((it.ocr||{}).lines||[]).filter(x=>x&&x[0]&&x[4]>x[2]&&x[3]>x[1]);if(!L.length)return null;const mx=Math.max(...L.map(x=>Math.max(+x[3],+x[4]))),sc=mx<=1.5?[W,H]:[1,1];
  const B=L.map(x=>({t:String(x[0]),l:x[1]*sc[0],t0:x[2]*sc[1],r:x[3]*sc[0],b:x[4]*sc[1]}));const lab=B.find(x=>/order\s*(?:no\.?|number|id|#)|订单号?/i.test(x.t));if(!lab)return null;const h=lab.b-lab.t0;
  const idl=B.filter(x=>x!==lab&&x.t0>=lab.t0-h&&x.t0<=lab.b+h*3.2&&x.l>=lab.r-4&&/^[0-9A-Za-z]{2,40}$/.test(x.t.replace(/\s+/g,""))&&/\d/.test(x.t));const src=idl.length?idl:[lab];
  const x0=Math.min(lab.r,...src.map(x=>x.l))-h*.6,y0=Math.min(lab.t0,...src.map(x=>x.t0))-h*.5,x1=Math.max(...src.map(x=>x.r))+h*.8,y1=Math.max(lab.b,...src.map(x=>x.b))+h*.7;return{x:x0,y:y0,w:x1-x0,h:y1-y0}}
async function ixZoomIds(items){for(const it of items||[]){try{const O=it.ord;if(!O||it.zoomTried)continue;const ts=O.when?new Date(String(O.when).replace(" ","T")).getTime():0;if(!ixIdDoubt(O.id,ts))continue;it.zoomTried=true;
    const bmp=await createImageBitmap(it.file),box=ixZoomBox(it,bmp.width,bmp.height);if(!box)continue;const blob=await ixZoomCrop(it.file,box);if(!blob)continue;const txt=await ixZoomReadBlob(blob);if(!txt)continue;
    const cands=[...new Set([...(txt.replace(/\s+/g,"").match(/[0-9A-Za-z]{18,30}/g)||[]),...(txt.match(/[0-9A-Za-z]{18,30}/g)||[])])];let pick=null;
    for(const c of cands){const f=ixIdFix(c,ts);if(/^[0-9a-f]{24}$/.test(String(f).toLowerCase())&&ixIdHeadOk(String(f).toLowerCase().slice(0,8),ts)){pick=String(f).toLowerCase();break}if(!pick&&/^\d{12,24}$/.test(c))pick=c}
    if(pick&&pick!==O.id){O.idRead=O.id;O.id=pick;O.idZoom=true;it.zoomed=true}else if(pick){it.zoomed=true}}catch(e){}}}
// ---- OCR: on-phone ML Kit when the app has it, otherwise the tesseract engine; one result per picture, never throws
const ixOcrCache=new Map();let ixNative=0;
function ixNativeOcr(blob,ms){return new Promise((ok,no)=>{if(!(window.P2POcr&&P2POcr.recognize))return no(new Error("none"));
  const id="o"+(++ixNative);window.__ocrCb=window.__ocrCb||{};const t=setTimeout(()=>{delete window.__ocrCb[id];no(new Error("timeout"))},ms||30000);
  window.__ocrCb[id]=(text,conf,err,lines,extra)=>{clearTimeout(t);delete window.__ocrCb[id];err?no(new Error(err)):ok({text:text||"",conf:conf,lines:Array.isArray(lines)?lines:null,extra:extra&&typeof extra==="object"?extra:null})};
  verB64(blob).then(b64=>P2POcr.recognize(id,b64)).catch(e=>{clearTimeout(t);no(e)})})}
// the reader gives lines with their boxes: lines that sit on the same row of the screen (a label on the left, its value on the right) are joined into one line, in reading order
function ixRowsText(lines){try{const L=(lines||[]).filter(x=>x&&x[0]&&String(x[0]).trim()).map(x=>({t:String(x[0]).trim(),l:+x[1],tp:+x[2],r:+x[3],b:+x[4]})).filter(x=>x.b>x.tp&&x.r>x.l);if(L.length<2)return"";
  L.forEach(x=>{x.cy=(x.tp+x.b)/2;x.h=x.b-x.tp});L.sort((a,b)=>a.cy-b.cy||a.l-b.l);
  const rows=[];L.forEach(x=>{const r=rows[rows.length-1];if(r&&Math.abs(x.cy-r.cy)<=0.45*Math.min(x.h,r.h)){r.items.push(x);r.cy=r.items.reduce((t,i)=>t+i.cy,0)/r.items.length;r.h=Math.min(r.h,x.h)}else rows.push({items:[x],cy:x.cy,h:x.h})});
  return rows.map(r=>r.items.sort((a,b)=>a.l-b.l).map(i=>i.t).join("   ")).join("\n")}catch(e){return""}}
window.P2POcrResult=(id,text,conf,err,lines,extra)=>{const f=(window.__ocrCb||{})[id];if(f)f(text,conf,err,lines,extra)};
async function ixOcr(it,skip){if(ixOcrCache.has(it.hash))return ixOcrCache.get(it.hash);let r=null;
  if(window.P2POcr&&P2POcr.recognize){try{const n=await ixNativeOcr(it.file,45000);const rt=ixRowsText(n.lines),X2=n.extra||{},alt2=X2.l2?ixRowsText(X2.l2):"";r={text:rt&&rt.replace(/\s/g,"").length>=n.text.replace(/\s/g,"").length*0.8?rt:n.text,raw:n.text,alt:(alt2&&alt2.replace(/\s/g,"").length>=20?alt2:(X2.t2||"")),big:X2.t3||"",conf:n.conf==null?90:n.conf,engine:"ML Kit",lines:n.lines||null,status:n.text.trim().length>8?"ok":"partial"}}catch(e){}}
  if(!r){
    // everything the phone reader does for this picture is one job; "skip" (or the 25 s auto-skip with an AI connected) must be able to end it at any point
    const tess=async()=>{const w=await ocrInit();const prepd=await Promise.race([ocrPrep(it.file),new Promise(r2=>setTimeout(()=>r2(it.file),15000))]);
      const rd=async img=>{const d=(await Promise.race([w.recognize(img),new Promise((_,no)=>setTimeout(()=>no(new Error("timeout")),60000))])).data;return{text:(d&&d.text||"").replace(/[ \t]+\n/g,"\n").trim(),conf:d&&d.confidence||0}};
      let o=await rd(prepd);
      if(o.text.length<=8){try{const o2=await rd(it.file);if(o2.text.length>o.text.length)o=o2}catch(e){}} // nothing came out: try the untouched picture once
      return o.text.length>8?{text:o.text,conf:Math.round(o.conf),engine:"Tesseract",status:"ok"}:{text:o.text,conf:0,engine:"Tesseract",status:"fail",err:"empty"}};
    try{const job=tess();job.catch(()=>{});r=await (skip?Promise.race([job,skip]):job)}
    catch(e){r={text:"",conf:0,engine:"none",status:"fail",err:e&&e.message==="skip"?"skipped":e&&e.message==="timeout"?"timeout":"unavailable"}}}
  if(r.status!=="fail")ixOcrCache.set(it.hash,r);return r}
// ---- more than one reading of the same picture: the normal one, an enhanced one (contrast, bigger, flipped when dark) and the biggest number cut out and enlarged. Gaps are filled from the others, and a number the readings disagree on is settled by the order total or the cut-out number
function ixBigNum(t){const m=String(t||"").replace(/[\s₹]/g,"").match(/\d[\d,]*\.\d{1,2}|\d[\d,]*/);if(!m)return null;const v=+m[0].replace(/,/g,"");return v>0?v:null}
function ixMergeReads(it){try{const o=it.ocr;if(!o||!o.alt||o.alt===o.text)return it;const cf=o.conf==null?null:o.conf/100,big=ixBigNum(o.big),diff=[];
  const fill=(a,b,ks)=>{ks.forEach(k=>{if((a[k]==null||a[k]==="")&&b[k]!=null&&b[k]!=="")a[k]=b[k]})};
  if(it.pay){const b=ixPayFrom(o.alt,cf),a=it.pay;fill(a,b,["utr","date","time","receiver","sender","last4","acct","vpa","status","bank","method","dir","lite","liteApp","liteLoad","liteGuess"]);
    if(a.amount>0&&b.amount>0&&Math.abs(a.amount-b.amount)>0.004){
      if(big&&Math.abs(big-b.amount)<0.005&&Math.abs(big-a.amount)>=0.005){a.amountRead=a.amount;a.amount=b.amount}
      else if(!(big&&Math.abs(big-a.amount)<0.005)){a.amountAlts=[...new Set([a.amount,b.amount,...(big?[big]:[])])];a.amountConflict=true}}
    else if(!(a.amount>0)&&b.amount>0)a.amount=b.amount;
    if(a.utr&&b.utr&&String(a.utr)!==String(b.utr)){const d12=x=>/^\d{12}$/.test(String(x));if(!d12(a.utr)&&d12(b.utr))a.utr=b.utr;else if(d12(a.utr)&&d12(b.utr)){a.utrAlt=b.utr;diff.push("UTR")}}
    a.ok=!!(a.amount&&a.utr)}
  else if(it.ord){const b=ixOrdFrom(o.alt,cf),a=it.ord;fill(a,b,["id","crypto","coin","price","buyer","seller","cp","when","status","tds","tdsQ","method","platform","side"]);
    if(a.fiat!=null&&b.fiat!=null&&Math.abs(a.fiat-b.fiat)>0.004){const q=a.crypto,r=a.price;if(q>0&&r>0){const da=Math.abs(a.fiat-q*r),db=Math.abs(b.fiat-q*r);if(db<da-0.5)a.fiat=b.fiat;else if(Math.abs(da-db)<=0.5){a.fiatAlt=b.fiat;diff.push("total")}}else{a.fiatAlt=b.fiat;diff.push("total")}}
    else if(a.fiat==null&&b.fiat!=null)a.fiat=b.fiat}
  it.disagree=diff;it.ext=it.pay?(it.pay.amount!=null&&it.pay.utr?"ok":it.pay.amount!=null||it.pay.utr?"partial":"fail"):it.ord?(it.ord.fiat!=null&&it.ord.id?"ok":it.ord.fiat!=null||it.ord.id||it.ord.crypto!=null?"partial":"fail"):it.ext}catch(e){}return it}
// which app made the screenshot (shown on the card, and a hint for what to expect on it)
function ixApp(t){const x=String(t||"");const L=[[/phonepe|phone\s*pe/i,"PhonePe"],[/google\s*pay|\bg\s*pay\b|gpay/i,"Google Pay"],[/paytm/i,"Paytm"],[/bhim/i,"BHIM"],[/amazon\s*pay/i,"Amazon Pay"],[/cred\b/i,"CRED"],[/\bsbi\b|yono|state bank/i,"SBI"],[/hdfc/i,"HDFC"],[/icici|imobile/i,"ICICI"],[/axis\s*bank/i,"Axis"],[/kotak/i,"Kotak"],[/slice/i,"Slice"],[/kucoin/i,"KuCoin"],[/binance/i,"Binance"],[/\bhtx\b|huobi/i,"HTX"],[/bybit/i,"Bybit"],[/\bokx\b/i,"OKX"]];const h=L.find(r=>r[0].test(x));return h?h[1]:""}
// ---- item = one picture: classify + extract
function ixItem(it,forceType){const o=it.ocr||{text:"",conf:0};const c=ixClassify(o.text);it.cls=forceType?{type:forceType,conf:1,forced:true}:c;
  it.pay=null;it.ord=null;it.list=null;it.ledger=null;const cf=o.conf==null?null:o.conf/100;if(it.cls.type==="EX_LEDGER"){it.ledger=c.ledger||ixLedgerRows(o.text);it.ext=it.ledger.pairs.length?"ok":"fail";return it}if(it.cls.type==="EX_LIST"){it.list=c.rows||ixListRows(o.text);it.ext=it.list.length?"ok":"fail";return it}
  if(ixIsPay(it.cls.type)||(it.cls.type==="UNKNOWN"&&payParse(o.text).ok&&!forceType)){it.pay=ixPayFrom(o.text,cf);if(it.cls.type==="UNKNOWN"){it.cls={type:"PAY_RECEIPT",conf:0.5}}}
  else if(ixIsOrd(it.cls.type)){it.ord=ixOrdFrom(o.text,cf)}
  it.ext=it.pay?(it.pay.amount!=null&&it.pay.utr?"ok":it.pay.amount!=null||it.pay.utr?"partial":"fail"):it.ord?(it.ord.fiat!=null&&it.ord.id?"ok":it.ord.fiat!=null||it.ord.id||it.ord.crypto!=null?"partial":"fail"):"fail";it.app=ixApp(o.text);return ixMergeReads(it)}

// ---- v74: who is who. The exchange order page shows only the OTHER person; a sell is paid to YOUR account, whatever name it carries
const ixTrusted=new Set(); // receivers proven to be your own account (account number or UPI handle matches one of your banks)
function ixMyNames(){const s=[pref("owner"),pref("nick"),...ixTrusted];try{s.push(...JSON.parse(pref("myNames")||"[]"))}catch(e){}banks.forEach(b=>{if(b.holder)s.push(b.holder)});return s.filter(Boolean)}
function ixMyVpas(){let v=[];try{v=JSON.parse(pref("myVpas")||"[]")}catch(e){}banks.forEach(b=>(b.vpas||[]).forEach(x=>v.push(x)));return v.map(x=>String(x).toLowerCase())}
const ixIsMe=n=>!!n&&ixMyNames().some(m=>{const r=verName(m,n);if(r==="M")return true;if(r!=="U")return false;const x=verTok(m)[0],y=verTok(n)[0];return!!(x&&y&&(x===y||x.startsWith(y)||y.startsWith(x)))}); // same surname alone is not you
// the bank a payment belongs to. On a sell, a payment proof that shows money SENT carries the buyer's bank, not yours
function ixBankOf(q,sd){const dir=q.dir||"",vp=q.vpa||"",l4=String(q.last4||"").replace(/\D/g,"").slice(-4);if(sd==="SELL"&&dir==="out")return vp?payBank({vpa:vp}):null;return payBank({last4:l4,bank:q.bank||"",vpa:vp})}
// the bank behind a UPI id: its handle after the @ (axisbank, okhdfcbank, oksbi, okicici ...). Only when exactly one of your banks fits
function ixVpaBank(vpa){try{const h=String(vpa||"").split("@")[1]||"";if(!h)return null;const M=[[/axis|^axl$|^apl$/i,/axis/i],[/hdfc/i,/hdfc/i],[/icici|^ibl$/i,/icici/i],[/sbi/i,/sbi|state bank/i],[/kotak/i,/kotak/i],[/yesbank|^ybl$/i,/yes/i],[/paytm/i,/paytm/i],[/pnb/i,/pnb|punjab/i],[/idfc/i,/idfc/i],[/indus/i,/indus/i],[/federal|^fbl$/i,/federal/i],[/boi/i,/bank of india/i],[/baroda|barb/i,/baroda/i],[/canara|cnrb/i,/canara/i],[/union/i,/union/i],[/slice/i,/slice/i]];
  const m=M.find(x=>x[0].test(h));if(!m)return null;const c=banks.filter(b=>b.type!=="Cash"&&m[1].test((b.name||"")+" "+(b.bankName||"")));return c.length===1?c[0]:null}catch(e){return null}}
function ixMineRow(m){const c=banks.filter(b=>b.type!=="Cash");const pre=ixVpaBank(m.vpa);return`<div class="ixmrow"><div class="note" style="margin:0">${m.name?`Name: <b>${esc(m.name)}</b>`:""}${m.name&&m.vpa?" · ":""}${m.vpa?`UPI ID: <b>${esc(m.vpa)}</b>`:""}</div>${m.vpa&&c.length?`<select class="ssel" data-ixmbank><option value="">Which bank is it? (optional)</option>${c.map(b=>`<option value="${esc(b.id)}"${pre&&pre.id===b.id?" selected":""}>${esc(b.name||b.bankName)}</option>`).join("")}</select>`:""}<button class="mini" type="button" data-ix="mine" data-nm="${esc(m.name||"")}" data-vp="${esc(m.vpa||"")}">Yes, this is my account${pre?" ("+esc(pre.name||pre.bankName)+")":""}</button></div>`}
// ---- v71: smarter intake helpers
const ixDfmtMem={};let ixDfmtT=0;
const ixDfmtGet=()=>{let L={};try{L=JSON.parse(pref("ixDfmt")||"{}")||{}}catch(e){}return{...L,...ixDfmtMem}};
// saved a moment later: saving the intake history reloads the settings and would wipe a preference written at the same time
function ixDfmtSave(){clearTimeout(ixDfmtT);ixDfmtT=setTimeout(()=>{try{const v=JSON.stringify(ixDfmtGet());if(v!==(pref("ixDfmt")||""))setPref("ixDfmt",v)}catch(e){}},2500)}
// decide which reading of every ambiguous date is right: they must agree with each other, not be in the future, and match what this exchange / app used before
function ixResolveDates(g,X){try{g.dateNote="";const now=Date.now(),NY=new Date().getFullYear(),O=X.ord||{},P=X.pay||{};
  const T=v=>{const t=new Date(String(v).replace(" ","T")).getTime();return isFinite(t)?t:0};
  const LO=(g.order&&g.order.ord)||{},LPi=(g.pays||[]).find(x=>!x.support)||(g.pays||[])[0]||{},LP=LPi.pay||{};
  const yrO=/\b20\d\d\b/.test((g.order&&g.order.ocr&&g.order.ocr.text)||""),yrP=/\b20\d\d\b/.test((g.pays||[]).map(x=>(x.ocr&&x.ocr.text)||"").join(" "));
  // every way this date could be read: both numeric orders (day/month, month/day), what the phone text said, what the AI said,
  // and the two usual AI slips: a year it had to guess (screenshots rarely print one) and a 12-hour time read without its PM
  const build=(prim,list,loc,locList,explicitYear)=>{const L=[...(list||[]),...(locList||[])].map(T).filter(Boolean),fm=t=>{const l=(list&&list.length>1?list:locList&&locList.length>1?locList:[]).map(T);const i=l.findIndex(x=>Math.abs(x-t)<6e4);return i<0?"":(i===0?"DMY":"MDY")};
    const base=[];const add=(v,pri)=>{const t=T(v);if(t>0&&!base.some(x=>Math.abs(x.t-t)<6e4))base.push({t,fmt:fm(t),tw:pri?0:0.01,tag:""})};
    add(prim,1);(list||[]).forEach(v=>add(v,0));add(loc,0);(locList||[]).forEach(v=>add(v,0));
    const out=[];base.forEach(bs=>{const d=new Date(bs.t),y=d.getFullYear(),h=d.getHours(),Ys=explicitYear?[y]:[...new Set([y,NY,NY-1])],Hs=h<12?[0,12]:[0];
      Ys.forEach(yy=>Hs.forEach(hh=>{const nd=new Date(bs.t);if(yy!==y){nd.setFullYear(yy)}if(hh)nd.setHours(h+hh);const t=nd.getTime();if(!isFinite(t))return;const tw=bs.tw+(yy!==y?0.15:0)+(hh?0.15:0),tag=[yy!==y?"year "+y+" → "+yy:"",hh?"time "+String(h).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+" → "+String(h+hh).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+" (PM)":""].filter(Boolean).join(", ");
        const ex=out.find(x=>Math.abs(x.t-t)<6e4);if(!ex)out.push({t,fmt:bs.fmt,tw,tag});else if(tw<ex.tw){ex.tw=tw;ex.tag=tag;ex.fmt=bs.fmt||ex.fmt}}))});return out};
  const pD=P.date?P.date+" "+(P.time||"00:00"):"",lD=LP.date?LP.date+" "+(LP.time||"00:00"):"";
  const oC=build(O.when,[...(O.whenAlts||[O.whenAlt])].filter(Boolean),LO.when,(LO.whenAlts||[]),yrO),pC=build(pD,P.alts||[],lD,(LP.alts||[]),yrP);
  if(!oC.length&&!pC.length)return;
  const F=ixDfmtGet(),ko=String(O.platform||"ord").toLowerCase(),kp="pay";
  const sc=[];(oC.length?oC:[null]).forEach(o=>{(pC.length?pC:[null]).forEach(p=>{let s=0;const ot=o?o.t:0,pt=p?p.t:0;
      if(o){s+=o.tw;if(ot>now+6e5)s+=1e6;if(now-ot>400*864e5)s+=50;s+=Math.abs(now-ot)/864e5*0.01;if(F[ko]&&o.fmt&&o.fmt!==F[ko])s+=2.5}
      if(p){s+=p.tw;if(pt>now+6e5)s+=1e6;if(now-pt>400*864e5)s+=50;s+=Math.abs(now-pt)/864e5*0.01;if(F[kp]&&p.fmt&&p.fmt!==F[kp])s+=2.5}
      if(o&&p){const d=Math.abs(ot-pt)/864e5;if(d>1.5)s+=d;if(pt<ot-30*6e4)s+=1;else if(pt<ot-5*6e4)s+=0.1}
      sc.push({o,p,s})})});
  sc.sort((a,b)=>a.s-b.s);const best=sc[0];
  if(best.o){X.ord.when=ixMs(best.o.t);X.ord.whenAlt=null;X.ord.whenAlts=null}
  if(best.p){const q=ixMs(best.p.t);X.pay.date=q.slice(0,10);X.pay.time=q.slice(11);X.pay.alts=null}
  const bits=[];if(best.o&&best.o.tag)bits.push("exchange date fixed: "+best.o.tag);if(best.p&&best.p.tag)bits.push("payment date fixed: "+best.p.tag+(yrP?"":" (the AI had to guess it)"));
  const ambO=oC.some(x=>x.fmt==="DMY")&&oC.some(x=>x.fmt==="MDY"),ambP=pC.some(x=>x.fmt==="DMY")&&pC.some(x=>x.fmt==="MDY");
  if(ambO&&best.o&&best.o.fmt&&!best.o.tag)bits.push("exchange date as "+(best.o.fmt==="DMY"?"day/month":"month/day"));
  if(ambP&&best.p&&best.p.fmt&&!best.p.tag)bits.push("payment date as "+(best.p.fmt==="DMY"?"day/month":"month/day"));
  if(bits.length)g.dateNote="Dates worked out: "+bits.join("; ")+(best.o&&best.p?" (both agree)":F[ko]||F[kp]?" (as before)":"");
  // learn the exchange's date order only when the other screenshot makes it certain
  const alt=(arr,pick)=>sc.find(x=>x[arr]&&pick.fmt&&x[arr].fmt&&x[arr].fmt!==pick.fmt);const L={...F};let ch=false;
  if(ambO&&best.o&&best.o.fmt&&!best.o.tag){const n=alt("o",best.o);if(best.s<1&&n&&n.s-best.s>=3&&L[ko]!==best.o.fmt){L[ko]=best.o.fmt;ch=true}}
  if(ambP&&best.p&&best.p.fmt&&!best.p.tag){const n=alt("p",best.p);if(best.s<1&&n&&n.s-best.s>=3&&L[kp]!==best.p.fmt){L[kp]=best.p.fmt;ch=true}}
  if(ch){Object.assign(ixDfmtMem,L);ixDfmtSave()}
 }catch(e){console.error(e)}}
// when an order was created: of the two readings of 10/08/2026 (day-first or month-first) take the real, recent one
function ixOrdTime(X,ref){const O=X&&X.ord;if(!O)return 0;const T=v=>{const t=new Date(String(v).replace(" ","T")).getTime();return isFinite(t)?t:0},now=Date.now();
  const c=[O.when,O.whenAlt].filter(Boolean).map(T).filter(t=>t>0&&t<=now+36e5&&now-t<400*864e5);if(!c.length)return 0;const r=ref||now;c.sort((a,b)=>Math.abs(a-r)-Math.abs(b-r));return c[0]}
function ixTypRate(){try{const r=orders.filter(o=>o.status!=="Cancelled"&&o.rate>0).sort((a,b)=>b.time-a.time).slice(0,30).map(o=>+o.rate).sort((a,b)=>a-b);return r.length>=3?r[r.length>>1]:null}catch(e){return null}}
// quantity × rate must equal the total: when one of the three was misread, the payment tells which
function ixNumFix(g,X){g.fixes=[];g.numBad=false;const O=X.ord,P=X.pay;if(!O)return;const f=O.fiat,q=O.crypto,r=O.price;if(!(f>0&&q>0&&r>0))return;
  const near=(a,b)=>Math.abs(a-b)<=Math.max(1.5,b*0.004);if(near(q*r,f))return;
  const amt=P&&P.amount>0?P.amount:null,med=ixTypRate(),rr=n=>+n.toFixed(2),money=n=>"₹"+(+n.toFixed(2)).toLocaleString("en-IN");
  if(amt&&near(q*r,amt)&&!near(f,amt)){O.fiat=amt;g.fixes.push(`Order total was read as ${money(f)} but quantity × rate and your payment both say ${money(amt)}. Corrected.`);return}
  if(amt&&near(f,amt)){
    const good=v=>med?Math.abs(v-med)/med<0.06:(v>=50&&v<=200);
    const rateOk=good(r),newRate=f/q,qtyOk=good(newRate);
    if(rateOk&&!qtyOk){O.crypto=rr(f/r);g.fixes.push(`Quantity was read as ${q} but total ${money(f)} ÷ rate ₹${r} gives ${O.crypto}. Corrected.`);return}
    if(!rateOk&&qtyOk){O.price=rr(newRate);g.fixes.push(`Rate was read as ₹${r} but total ${money(f)} ÷ ${q} gives ₹${O.price}. Corrected.`);return}}
  g.numBad=true}
// UTR sanity: UPI / IMPS references are 12 digits
function ixUtrOdd(u){u=String(u||"").replace(/\s+/g,"");if(!u)return"";
  if(/^\d+$/.test(u)){if(u.length>=9&&u.length<=11||u.length>=13&&u.length<=15)return`UTR has ${u.length} digits (UPI and IMPS ones are usually 12). It may be misread or edited`;
    if(/^(\d)\1{6,}$/.test(u)||/^0+\d?$/.test(u)||u==="123456789012"||u==="012345678901")return"UTR looks made up (repeating or sequential digits)"}return""}
// the UPI id you paid: remember it per person and warn when it changes
function ixVpa(t){try{const flat=String(t||"").replace(/\s+/g," ");for(const m of flat.matchAll(/([A-Za-z0-9._\-]{2,40})@([A-Za-z]{2,15})\b(?!\.)/g)){if(/^(gmail|yahoo|outlook|hotmail|icloud|proton|rediffmail)$/i.test(m[2]))continue;const pre=flat.slice(Math.max(0,m.index-32),m.index).toLowerCase();if(/\b(from|sender|debited|your)\b[^@]{0,28}$/.test(pre))continue;return(m[1]+"@"+m[2]).toLowerCase()}}catch(e){}return""}
function ixAcctNew(g){try{const X=g.X,sd=ixSide(g);if(sd!=="BUY")return null;const P=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{},vpa=P.vpa||X.pay.vpa;if(!vpa)return null;
  const name=X.ord.seller||X.pay.receiver||(g.target&&g.target.cp)||"";if(!name)return null;
  const prev=orders.filter(o=>o.vpa&&o.side==="BUY"&&o.cp&&(!g.target||o.id!==g.target.id)),same=prev.filter(o=>verName(o.cp,name)==="M");
  if(same.length&&!same.some(o=>o.vpa===vpa))return{name,vpa,old:same[0].vpa,kind:"new"};
  const other=prev.find(o=>o.vpa===vpa&&verName(o.cp,name)==="X");if(other)return{name,vpa,other:other.cp,kind:"other"};return null}catch(e){return null}}
// a payment alone: find the open order it settles (same side, remaining amount, name not contradicting)
function ixAutoTarget(g,X){const P=X.pay;if(!(P&&P.amount>0))return;const pp=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{},dir=P.dir||pp.dir||"";
  const sd=dir==="out"?"BUY":dir==="in"?"SELL":null;if(!sd)return;const pt=verWhen(P.date,P.time)||Date.now(),who=sd==="BUY"?P.receiver:P.sender;
  const u=normRef(P.utr);
  const c=orders.filter(o=>o.side===sd&&o.status!=="Cancelled"&&!(u&&normRef(o.utr)===u)&&o.time<=pt+15*60e3&&pt-o.time<=72*3600e3&&Math.abs((orderTotal(o)-allocated(o))-P.amount)<=Math.max(1,P.amount*0.002));
  const nm=o=>who?verName(o.cp||"",who):"NF",ok=c.filter(o=>nm(o)!=="X");if(!ok.length)return;
  const strong=ok.filter(o=>nm(o)==="M"),pick=strong.length===1?strong[0]:(ok.length===1?ok[0]:null);
  if(pick){g.target=pick;g.autoT=true}else g.autoTHint=ok.length}
function ixTargetOrd(t){const own=pref("owner")||pref("nick")||null;return{id:exIdOf(t)||null,status:null,fiat:+orderTotal(t).toFixed(2),crypto:t.qty,coin:t.coin,price:t.rate,buyer:t.side==="SELL"?t.cp:own,seller:t.side==="BUY"?t.cp:own,method:t.pay||null,when:ixMs(t.time),platform:t.platform||null,side:t.side,cp:t.cp||null,conf:1}}
// ---- order-list screenshot: one picture, many orders
function ixListRows(t){try{const L=String(t||"").split(/\n+/).map(x=>x.trim()).filter(Boolean),starts=[];
  L.forEach((l,i)=>{if(l.length<=60&&/^(?:you\s+)?(?:buy|sell|buying|selling|bought|sold)\b/i.test(l)&&/\b(?:usdt|usdc|btc|eth|bnb|trx|xrp|sol)\b/i.test(l))starts.push(i)});
  if(starts.length<2)return[];const rows=[];
  starts.forEach((a,k)=>{const blk=L.slice(a,k+1<starts.length?starts[k+1]:L.length).slice(0,14);const o=ixOrdFrom(blk.join("\n"),null),qty=o.crypto,fiat=o.fiat;
    if(!o.side||!(fiat>0)||!(qty>0))return;const ts=o.when?new Date(String(o.when).replace(" ","T")).getTime():0;
    rows.push({side:o.side,coin:o.coin||"USDT",fiat,qty,rate:o.price||+(fiat/qty).toFixed(2),status:o.status,cp:o.cp||o.buyer||o.seller||null,id:o.id,ts:isFinite(ts)&&ts>0?ts:0,platform:o.platform})});
  if(rows.length<2||new Set(rows.map(r=>r.fiat)).size<2)return[];return rows}catch(e){return[]}}
// ---- exchange wallet history ("Sell Crypto -302.78 / Tax -3.0278", same minute): TDS is taken AFTER the order completes, as its own line
function ixLedgerRows(t){try{const L=String(t||"").split(/\n+/).map(x=>x.trim()).filter(Boolean),E=[];let cur={};
  const DT=/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s+(\d{1,2}):(\d{2})(?::\d{2})?$/;
  for(const l of L){const d=l.match(DT);
    if(d){if(cur.label&&cur.amt!=null)E.push({label:cur.label,amt:cur.amt,a:+d[1],b:+d[2],h:+d[3],m:+d[4],key:(+d[1])+"/"+(+d[2])+" "+(+d[3])+":"+d[4]});cur={};continue}
    const lab=l.match(/^(sell crypto|buy crypto|tax|transfer|fee|withdraw\w*|deposit\w*)\b\s*([+\-−–]?\s*\d[\d,]*(?:\.\d+)?)?\s*$/i);
    if(lab){cur.label=lab[1].toLowerCase();cur.amt=lab[2]?Math.abs(parseFloat(lab[2].replace(/[−–\s,+\-]/g,""))):null;continue}
    const am=l.match(/^[+\-−–]?\s*(\d[\d,]*(?:\.\d+)?)$/);if(am&&cur.label)cur.amt=parseFloat(am[1].replace(/,/g,""))}
  const pairs=[];E.filter(e=>e.label==="tax").forEach(tx=>{const sl=E.find(e=>e.label==="sell crypto"&&e.key===tx.key&&e.amt>0&&tx.amt/e.amt>0.0005&&tx.amt/e.amt<=0.02);
    if(sl&&!pairs.some(q=>q.key===tx.key&&q.qty===sl.amt))pairs.push({qty:sl.amt,tax:tx.amt,pct:+(tx.amt/sl.amt*100).toFixed(2),key:tx.key,a:tx.a,b:tx.b,h:tx.h,m:tx.m})});
  return{pairs}}catch(e){return{pairs:[]}}}
function ixLedgerOrder(p){try{const Y=new Date().getFullYear(),at=(mo,d)=>new Date(Y,mo-1,d,p.h,p.m).getTime();const refs=[at(p.a,p.b)];if(p.a<=12&&p.b<=12&&p.a!==p.b)refs.push(at(p.b,p.a));
  const C=orders.filter(o=>o.side==="SELL"&&o.status!=="Cancelled"&&Math.abs((+o.qty)-p.qty)<0.011).map(o=>{const r=o.doneAt||o.payAt||o.time;return{o,d:Math.min(...refs.map(x=>Math.abs(x-r)))}}).filter(x=>x.d<36*36e5).sort((a,b)=>a.d-b.d);
  return C.length?C[0].o:null}catch(e){return null}}
const ixLedgerRupee=(p,o)=>Math.abs(p.pct-1)<0.05?+(orderTotal(o)*0.01).toFixed(2):+(p.tax*o.rate).toFixed(2);
async function ixLedgerSave(it){let n=0;for(const p of it.ledger.pairs){const o=ixLedgerOrder(p);if(!o)continue;const ru=ixLedgerRupee(p,o);if(+o.tds===ru&&o.tdsSrc==="ledger")continue;
    try{await patchRec(o.id,{tds:ru,tdsQ:p.tax,tdsSrc:"ledger"});try{await auditLog(o,"edit",{chg:`TDS ${o.tds??"–"} → ${ru} (wallet history)`})}catch(e){}n++}catch(e){console.error(e)}}
  it.ledgerDone=n;return n}
function ixListDup(r){try{if(r.id){const m=riskIdx().e.get(normRef(r.id));if(m&&m.length)return true}
  return orders.some(o=>o.side===r.side&&Math.abs(o.qty-r.qty)<0.011&&Math.abs(o.rate-r.rate)<0.011&&(!o.cp||!r.cp||verName(o.cp,r.cp)!=="X")&&(!r.ts||Math.abs(o.time-r.ts)<3*60e3))}catch(e){return false}}
async function ixListSave(it){const rows=(it.list||[]).filter((r,i)=>it.listSel&&it.listSel.has(i)&&!ixListDup(r));let n=0;
  for(const r of rows){try{const no={id:newId("o"),side:r.side,coin:r.coin,qty:r.qty,rate:r.rate,status:ixStatusOf(r.status),mode:"P2P",pay:"UPI",platform:r.platform?(r.platform[0].toUpperCase()+r.platform.slice(1).toLowerCase()):(pref("plat")||"Binance"),cp:r.cp||"",note:"From order list screenshot · bank not assigned",splits:[],proofs:[],shots:[it.hash],pv:"ai",time:r.ts||Date.now(),src:"ai"};
    if(r.id)no.exId=String(r.id).slice(0,40);await putRec(no);await auditLog(no,"create",{by:"intake-list"});n++}catch(e){console.error(e)}}
  it.listDone=n;return n}
// ---- auto-save: only what is verified AND low risk, with undo
const ixSafe=g=>!!(!g.saved&&g.cmp&&g.cmp.overall==="VERIFIED"&&g.risk&&g.risk.level==="LOW"&&!(g.dups||[]).length&&!(g.fixes||[]).length&&!g.numBad&&!(g.conflicts&&g.conflicts.length)&&(g.order||g.target)&&ixSide(g)&&(g.cancelOnly||(g.conf>=80&&g.pays.length)));
async function ixAutoSafe(){if(pref("ixAuto")==="0"||ixS.autoOff)return;const done=[];
  for(const g of ixS.groups){if(!ixSafe(g))continue;g.prevT=g.target?JSON.parse(JSON.stringify(g.target)):null;const r=await ixSave(g,true);g.save=r;if(r.state==="saved"){g.auto=true;done.push(g)}}
  ixS.auto=done;if(done.length){ixDraw();renderIxHist();toast(`Auto-saved ${done.length} safe one${done.length>1?"s":""}`)}}
async function ixAutoUndo(){const A=(ixS.auto||[]).filter(g=>g.saved&&g.auto);
  for(const g of [...A].reverse()){try{if(g.prevT)await putRec(g.prevT);else if(g.savedId)await delRec(g.savedId);if(g.histId)await patchRec(g.histId,{saved:false,orderId:null})}catch(e){}g.saved=false;g.save=null;g.auto=false;g.savedId=null;g.target=g.prevT?null:g.target;}
  ixS.auto=[];ixS.autoOff=true;ixS.groups.forEach(g=>{try{ixVerify(g)}catch(e){}});ixDraw();renderIxHist();toast("Auto-save undone")}
function ixDrawExtras(out){
  const A=(ixS.auto||[]).filter(g=>g.saved&&g.auto);
  if(A.length){const c=document.createElement("div");c.className="acard ixautob";c.innerHTML=`<div class="ah">✓ AUTO-SAVED ${A.length} SAFE ${A.length>1?"ONES":"ONE"}</div><div class="note">Verified and low risk, so ${A.length>1?"they were":"it was"} saved for you. Anything else is waiting below for your check.</div><div class="row2"><button class="mini ghost" type="button" data-ixundo>Undo auto-save</button><button class="mini ghost" type="button" data-go="orders">View orders</button></div>`;twoTap(c.querySelector("[data-ixundo]"),ixAutoUndo);out.appendChild(c)}
  (ixS.items||[]).filter(x=>x.ledger&&x.ledger.pairs.length).forEach(it=>{const rows=it.ledger.pairs.map(p=>{const o=ixLedgerOrder(p);const ru=o?ixLedgerRupee(p,o):0;return{p,o,ru,done:!!(o&&+o.tds===ru&&o.tdsSrc==="ledger")}});const n=rows.filter(r=>r.o&&!r.done).length;
    const c=document.createElement("div");c.className="acard ixlist ixledger";
    c.innerHTML=`<div class="ah">WALLET HISTORY · ${rows.length} TDS ${rows.length===1?"ENTRY":"ENTRIES"} FOUND</div>`+(it.ledgerDone!=null?`<div class="note"><b>TDS added to ${it.ledgerDone} order${it.ledgerDone===1?"":"s"}.</b></div>`:`<div class="note">The exchange cuts TDS after the order completes, as a separate Tax line. Each one is matched to your sell order by quantity and time.</div>`)+
      rows.map(r=>`<div class="ixlr${r.o&&!r.done?"":" dup"}"><span><b class="sd SELL">SELL</b> ${fmtQ(r.p.qty)} USDT · Tax <b>${fmtQ(r.p.tax)} USDT</b> (${r.p.pct}%)</span><small>${r.o?(r.done?"already added":"→ "+inr(r.ru)+" on "+esc(r.o.cp||"your order")+" · "+fdt(r.o.time)):"no matching sell order in the app yet. Save that order first"}</small></div>`).join("")+
      (it.ledgerDone!=null?"":`<button class="primary" type="button" data-ledsave ${n?"":"disabled"}>ADD TDS TO ${n} ORDER${n===1?"":"S"}</button>`);
    const bt=c.querySelector("[data-ledsave]");if(bt)bt.onclick=async()=>{bt.disabled=true;bt.textContent="Adding…";const k=await ixLedgerSave(it);toast(`TDS added to ${k} order${k===1?"":"s"}`);ixDraw()};
    out.appendChild(c)});
  (ixS.items||[]).filter(x=>x.list&&x.list.length).forEach(it=>{if(!it.listSel)it.listSel=new Set(it.list.map((r,i)=>i).filter(i=>!ixListDup(it.list[i])));
    const c=document.createElement("div");c.className="acard ixlist";const rows=it.list;const n=[...it.listSel].filter(i=>!ixListDup(rows[i])).length;
    c.innerHTML=`<div class="ah">ORDER LIST · ${rows.length} ORDERS FOUND</div>`+(it.listDone!=null?`<div class="note"><b>Added ${it.listDone} order${it.listDone===1?"":"s"}.</b> Assign banks later from the order.</div>`:`<div class="note">Tick the ones to add. Orders already in the app are greyed out.</div>`)+
      rows.map((r,i)=>{const d=ixListDup(r);return`<label class="ixlr${d?" dup":""}"><input type="checkbox" data-li="${i}" ${it.listSel.has(i)&&!d?"checked":""} ${d||it.listDone!=null?"disabled":""}><span><b class="sd ${r.side}">${r.side}</b> ${fmtQ(r.qty)} ${esc(r.coin)} @ ₹${r.rate} = <b>${inr(r.fiat)}</b></span><small>${[r.cp?esc(r.cp):"",r.status?esc(r.status):"",r.ts?new Date(r.ts).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}):"time not read",d?"already in app":""].filter(Boolean).join(" · ")}</small></label>`}).join("")+
      (it.listDone!=null?"":`<button class="primary" type="button" data-lisave ${n?"":"disabled"}>ADD ${n} ORDER${n===1?"":"S"}</button>`);
    c.addEventListener("change",e=>{const b=e.target.closest("[data-li]");if(!b)return;const i=+b.dataset.li;if(b.checked)it.listSel.add(i);else it.listSel.delete(i);const k=[...it.listSel].filter(j=>!ixListDup(rows[j])).length,bt=c.querySelector("[data-lisave]");if(bt){bt.textContent=`ADD ${k} ORDER${k===1?"":"S"}`;bt.disabled=!k}});
    const bt=c.querySelector("[data-lisave]");if(bt)bt.onclick=async()=>{bt.disabled=true;bt.textContent="Adding…";const k=await ixListSave(it);toast(`Added ${k} order${k===1?"":"s"}`);ixDraw();renderIxHist()};
    out.appendChild(c)})}
// ---- pairing: every payment against every order, best first
function ixPairScore(p,o,pText){let s=0;const amt=o.fiat!=null?o.fiat:(o.crypto&&o.price?o.crypto*o.price:null);
  if(p.amount!=null&&amt!=null)s+=Math.abs(p.amount-amt)<=1?4:-3;
  const nb=verName(p.sender,o.buyer),ns=verName(p.receiver,o.seller);s+=nb==="M"?2:nb==="U"?1:nb==="X"?-2:0;s+=ns==="M"?1:ns==="X"?-1:0;
  const a=verMeth(p.method),b=verMeth(o.method);if(a&&b&&a===b)s+=1;
  const pt=verWhen(p.date,p.time),ot=verWhen((o.when||"").slice(0,10),(o.when||"").slice(11,16));if(pt&&ot){const d=pt-ot;s+=d>=-5*60e3&&d<=48*36e5?1:-2}
  if(o.id&&normRef(pText).includes(normRef(o.id)))s+=4;
  return s}
// Every screenshot is classified first; only then are they grouped. One order + its payment(s) = ONE transaction.
function ixHard(p,o){ // clear contradiction between a payment and an order
  const amt=o.fiat!=null?o.fiat:(o.crypto&&o.price?o.crypto*o.price:null);
  if(p.amount!=null&&amt!=null&&Math.abs(p.amount-amt)>Math.max(1,amt*0.002)){ // different amount: only a contradiction if the payment is not a partial payment of this order
    return true}
  if(verName(p.sender,o.buyer)==="X"&&verName(p.receiver,o.seller)==="X")return true;
  return false}
function ixGroup(items){items=items.filter(x=>!x.list&&!x.ledger);const pays=items.filter(x=>x.pay),ords=items.filter(x=>x.ord),rest=items.filter(x=>!x.pay&&!x.ord);
  const groups=ords.map(o=>({order:o,pays:[],unknown:[]}));
  const score=(p,j)=>ixPairScore(p.pay,ords[j].ord,p.ocr.text);
  const pairs=[];pays.forEach(p=>ords.forEach((o,j)=>pairs.push({p,j,s:score(p,j),hard:ixHard(p.pay,o.ord)})));pairs.sort((a,b)=>b.s-a.s);
  const used=new Set(),taken=new Set();
  // pass 0: part payments. Several payments (other banks / other amounts) that add up to exactly one order's total are ONE transaction
  const oTot=o=>{const O=o.ord;return O.fiat!=null?O.fiat:(O.crypto&&O.price?O.crypto*O.price:null)};
  // a figure whose rupee sign was read as a digit ("71,905"): if one reading is exactly an order's total, take it
  pays.forEach(p=>{const A=p.pay.amountAlts;if(!(A&&A.length)||(p.pay.amount>0&&!p.pay.amountConflict))return;const hit=A.find(a=>ords.some(o=>{const t=oTot(o);return t>0&&Math.abs(a-t)<=Math.max(1,t*0.002)}));if(hit){p.pay.amount=hit;p.pay.amountAlts=null;p.pay.amountConflict=false;p.pay.amountFixed=true}});
  // the rupee sign read as a digit and glued on ("₹3,207.21" read as 73,207.21): if cutting that first 7 / 2 / 1 gives exactly an order's total (and the figure as read fits no order), the sign was misread
  pays.forEach(p=>{const v=p.pay.amount;if(!(v>0)||ords.some(o=>{const t=oTot(o);return t>0&&Math.abs(v-t)<=Math.max(1,t*0.002)}))return;
    const str=v.toFixed(2).replace(/\.00$/,"");if(!/^[721]/.test(str)||str.replace(/\.\d+$/,"").length<4)return;const cut=+str.slice(1);
    if(cut>0&&ords.some(o=>{const t=oTot(o);return t>0&&Math.abs(cut-t)<=Math.max(1,t*0.002)})){p.pay.amountRead=v;p.pay.amount=cut;p.pay.amountFixed=true}});
  ords.forEach((o,j)=>{try{const O=o.ord,amt=O.fiat!=null?O.fiat:(O.crypto&&O.price?O.crypto*O.price:null);if(!(amt>0))return;const tol=Math.max(1,amt*0.002);
    if(pays.some(p=>!used.has(p)&&p.pay.amount!=null&&Math.abs(p.pay.amount-amt)<=tol))return; // one payment already fits the whole order
    const ot=verWhen((O.when||"").slice(0,10),(O.when||"").slice(11,16));
    const opts=p=>p.pay.amount>0?[p.pay.amount]:(p.pay.amountAlts||[]);
    const cand=pays.filter(p=>{const q=p.pay;if(used.has(p)||!opts(p).some(a=>a>0&&a<amt-tol))return false;
      if(verName(q.sender,O.buyer)==="X"&&verName(q.receiver,O.seller)==="X")return false;
      const pt=verWhen(q.date,q.time);if(pt&&ot){const d=pt-ot;if(d<-5*60e3||d>48*36e5)return false}return true})
      .sort((a,b)=>(verWhen(a.pay.date,a.pay.time)||0)-(verWhen(b.pay.date,b.pay.time)||0)).slice(0,8);
    let best=null;for(let m=1;m<(1<<cand.length);m++){const sub=cand.filter((_,i)=>m&(1<<i));if(sub.length<2||sub.length>4)continue;
      let pick=null;const walk=(i,acc,ch)=>{if(pick)return;if(i===sub.length){if(Math.abs(acc-amt)<=tol)pick=ch;return}opts(sub[i]).forEach(a=>walk(i+1,acc+a,ch.concat(a)))};walk(0,0,[]);if(!pick)continue;
      const u=sub.map(x=>x.pay.utr?normRef(x.pay.utr):"").filter(Boolean);if(new Set(u).size<u.length)continue; // the same payment twice is not two part payments
      if(!best||sub.length<best.length){best=sub;best.pick=pick}}
    let loose=false;
    // nothing fit once names / times were checked (dark receipts often lose the date, or name the sender differently): the parts still add up to this order's total to the rupee, so it is the same trade. Needs 2-3 unused payments, never the same UTR twice
    if(!best){const cand2=pays.filter(p=>!used.has(p)&&opts(p).some(a=>a>0&&a<amt-tol)).slice(0,6),t2=Math.max(1,amt*0.0005);
      for(let m=1;m<(1<<cand2.length);m++){const sub=cand2.filter((_,i)=>m&(1<<i));if(sub.length<2||sub.length>3)continue;
        let pick=null;const walk=(i,acc,ch)=>{if(pick)return;if(i===sub.length){if(Math.abs(acc-amt)<=t2)pick=ch;return}opts(sub[i]).forEach(a=>walk(i+1,acc+a,ch.concat(a)))};walk(0,0,[]);if(!pick)continue;
        const u=sub.map(x=>x.pay.utr?normRef(x.pay.utr):"").filter(Boolean);if(new Set(u).size<u.length)continue;
        if(!best||sub.length<best.length){best=sub;best.pick=pick;loose=true}}}
    if(best){best.forEach((p,i)=>{if(!(p.pay.amount>0)){p.pay.amount=best.pick[i];p.pay.amountAlts=null;p.pay.amountFixed=true}used.add(p);p.part=true;p.pairScore=3});taken.add(j);groups[j].pays.push(...best);groups[j].partSum=best.reduce((t,x)=>t+x.pay.amount,0);if(loose)groups[j].partLoose=true}}catch(e){}});
  // pass 1: strong evidence, one payment per order first
  pairs.forEach(x=>{if(used.has(x.p)||taken.has(x.j)||x.s<2||x.hard)return;used.add(x.p);taken.add(x.j);groups[x.j].pays.push(x.p);x.p.pairScore=x.s});
  // pass 2: whatever is left. A lone order and a lone payment are the same transaction unless they clearly contradict each other
  const freeP=pays.filter(p=>!used.has(p)),freeO=ords.map((o,j)=>j).filter(j=>!taken.has(j));
  if(freeP.length&&freeO.length){const lone=freeO.length===1&&freeP.length===1;const rest2=pairs.filter(x=>!used.has(x.p)&&(lone||!x.hard)).sort((a,b)=>b.s-a.s);
    rest2.forEach(x=>{if(used.has(x.p))return;
      if(lone||!taken.has(x.j)){used.add(x.p);taken.add(x.j);groups[x.j].pays.push(x.p);x.p.pairScore=x.s;x.p.forced=true}})}
  // pass 3: extra payments for an order that already has one (part payments, or the bank screenshot of the same payment)
  pays.filter(p=>!used.has(p)).forEach(p=>{const c=pairs.filter(x=>x.p===p&&!x.hard&&x.s>=1).sort((a,b)=>b.s-a.s)[0];
    if(c){const g=groups[c.j],q=g.pays[0];p.support=!!(q&&((q.pay.utr&&p.pay.utr&&normRef(q.pay.utr)===normRef(p.pay.utr))||(q.pay.amount!=null&&q.pay.amount===p.pay.amount)));used.add(p);g.pays.push(p);p.pairScore=c.s}});
  // ambiguity: a payment that fits two orders about equally well
  pays.forEach(p=>{if(!used.has(p))return;const mine=pairs.filter(x=>x.p===p&&!x.hard).sort((a,b)=>b.s-a.s);if(mine.length>1&&mine[0].s-mine[1].s<=1&&mine[1].s>=3)p.uncertain=true});
  pays.filter(p=>!used.has(p)).forEach(p=>groups.push({order:null,pays:[p],unknown:[]}));
  if(rest.length){if(groups.length>=1)groups[0].unknown=rest;else groups.push({order:null,pays:[],unknown:rest})}
  groups.forEach((g,i)=>{g.id="g"+i;g.items=[g.order,...g.pays,...g.unknown].filter(Boolean)});return groups.filter(g=>g.items.length)}
// After classifying ALL pictures: fix obvious type slips before anything is grouped
function ixReconcile(items){const ALL=items;items=items.filter(x=>!x.list&&!x.ledger);const fam=x=>ixIsPay(x.cls.type)?"p":ixIsOrd(x.cls.type)?"o":"u";
  const sc=x=>{const c=ixClassify(x.ocr&&x.ocr.text||"");return c.pay-c.ord};
  if(items.length===2){const [a,b]=items,fa=fam(a),fb=fam(b);
    if(fa==="u"&&fb!=="u"||fb==="u"&&fa!=="u"){const u=fa==="u"?a:b,k=fa==="u"?b:a;ixItem(u,fam(k)==="p"?"EX_ORDER":"PAY_RECEIPT")} // the other one must be the complement
    else if(fa===fb&&fa!=="u"){const [pay,ord]=sc(a)>=sc(b)?[a,b]:[b,a];ixItem(pay,pay.cls.type&&ixIsPay(pay.cls.type)?pay.cls.type:"PAY_RECEIPT");ixItem(ord,ixIsOrd(ord.cls.type)?ord.cls.type:"EX_ORDER")}
    else if(fa==="u"&&fb==="u"){const [pay,ord]=sc(a)>=sc(b)?[a,b]:[b,a];ixItem(pay,"PAY_RECEIPT");ixItem(ord,"EX_ORDER")}}
  else{const hasP=items.some(x=>fam(x)==="p"),hasO=items.some(x=>fam(x)==="o");
    items.filter(x=>fam(x)==="u").forEach(u=>{if(hasO&&!hasP)ixItem(u,"PAY_RECEIPT");else if(hasP&&!hasO)ixItem(u,"EX_ORDER");
      else if(hasP&&hasO){const c=ixClassify(u.ocr&&u.ocr.text||"");if(c.pay>c.ord)ixItem(u,"PAY_RECEIPT");else if(c.ord>c.pay)ixItem(u,"EX_ORDER")}})}
  return ALL}
// ---- merge AI-read values into what the phone read. Phone values win when the phone was sure; differences are reported
function ixMerge(local,ai,conf){const out={...local},diffs=[],filled=[];Object.keys(ai||{}).forEach(k=>{if(k==="conf")return;const a=ai[k],l=local[k];
    if(l==null||l===""){if(a!=null){out[k]=a;filled.push(k)}}
    else if(a!=null&&String(a).toLowerCase().replace(/\s|,/g,"")!==String(l).toLowerCase().replace(/\s|,/g,"")&&!["acct","bank","method","status","date","time","when","sender","receiver","buyer","seller"].includes(k)){diffs.push(k);if(conf!=null&&conf<0.85){out[k]=a;filled.push(k)}}})
  return{v:out,diffs,filled}}
function ixAiReady(){return aiCfg.prov!=="builtin"||i2Max>0}
// ---- analyse one group: verify locally, decide if AI is needed, risk, duplicates
// proof that an account is yours: its number ends like one of your saved accounts, or its UPI handle (@oksbi, @axisbank …) belongs to the one bank of that name you saved and that bank is where the money was placed
function ixOwnAcct(l4,vp,dir,bk){if(dir==="out")return null;if(l4){const x=banks.find(y=>y.type!=="Cash"&&y.accNo&&String(y.accNo).replace(/\D/g,"").endsWith(l4));if(x)return x}const vb=vp?ixVpaBank(vp):null;return vb&&bk&&bk.id===vb.id?vb:null}
function ixVerify(g){const P=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay,O=(g.order||{}).ord;
  const X={pay:g.aiPay||P||{status:null,amount:null,currency:null,sender:null,receiver:null,utr:null,method:null,bank:null,date:null,time:null,acct:null,conf:null},ord:g.aiOrd||O||{id:null,status:null,buyer:null,seller:null,fiat:null,crypto:null,coin:null,price:null,method:null,when:null,acct:null,conf:null},flags:g.aiFlags||[]};
  // clean junk names, then fill in YOUR side: the receipt rarely prints your own name, and the exchange order never prints it
  g.inferred=[];X.pay={...X.pay};X.ord={...X.ord};if(g.partSum&&X.pay)X.pay.amount=g.partSum;
  // the amount that was finally chosen (often the AI's) must fit the order. If it does not, a misread rupee sign glued on as a digit is the usual cause ("₹5,083.09" read as 75,083): try the phone's own reading, then the figure without its first digit, and take one only if it is exactly the order total
  try{const tot=X.ord&&X.ord.fiat!=null?X.ord.fiat:(X.ord&&X.ord.crypto&&X.ord.price?X.ord.crypto*X.ord.price:null),v=X.pay&&X.pay.amount;if(!g.partSum&&tot>0&&v>0){const fit=a=>a>0&&Math.abs(a-tot)<=Math.max(1,tot*0.002);
    if(!fit(v)){const C=[];(g.pays||[]).forEach(q=>{if(q.pay){if(q.pay.amount>0)C.push(q.pay.amount);(q.pay.amountAlts||[]).forEach(z=>C.push(z))}});const str=v.toFixed(2).replace(/\.00$/,"");if(/^[721]/.test(str)&&str.replace(/\.\d+$/,"").length>=4)C.push(+str.slice(1));
      const hit=C.find(fit);if(hit!=null){X.pay.amountRead=v;X.pay.amount=hit;X.pay.amountFixed=true}}}}catch(e){}
  {const lt=/\bupi\s*lite\b/i,PX=X.pay;if(PX.lite||lt.test(PX.sender||"")||lt.test(PX.bank||"")||lt.test(PX.acct||"")||/^lite\b/i.test(PX.sender||"")){PX.lite=true;if(!PX.sender||/lite/i.test(PX.sender))PX.sender=null;const gs=new Set([PX.liteGuess,...(g.pays||[]).map(x=>x.pay&&x.pay.liteGuess)].filter(Boolean)),fb=g.liteBank?banks.find(b=>b.id===g.liteBank&&b.lite&&b.lite.on):null,hn=fb||ixLiteHint([PX.bank,...(g.pays||[]).map(x=>x.pay&&x.pay.bank),...(g.pays||[]).map(x=>x.pay&&x.pay.fromLabel)].filter(h=>!gs.has(h)),PX.liteApp),lb=hn||ixLiteBank(PX.amount,PX.liteApp);g.liteCur=lb?lb.id:"";g.liteAmbig=!hn&&banks.filter(b=>b.type!=="Cash"&&b.lite&&b.lite.on&&(!PX.liteApp||b.lite.app===PX.liteApp)).length>1;if(lb){PX.bank=lb.bankName||lb.name;const l4=lb.accNo?String(lb.accNo).replace(/\D/g,"").slice(-4):"";if(l4){PX.acct="••"+l4;(g.pays||[]).forEach(x=>{if(x.pay&&!x.support){x.pay.last4=l4;x.pay.bank=PX.bank}})}}}}
  ["sender","receiver"].forEach(k=>{if(X.pay[k]){const c=ixNameClean(X.pay[k]);X.pay[k]=c||null}});["buyer","seller"].forEach(k=>{if(X.ord[k]){const c=ixNameClean(X.ord[k]);X.ord[k]=c||null}});
  ixResolveDates(g,X);
  if(!g.partSum)try{g.pays.filter(x=>x.support&&x.pay&&x!==(g.pays.find(y=>!y.support)||g.pays[0])).forEach(x=>{["utr","date","time","last4","vpa","bank","receiver","sender","status"].forEach(k=>{if((X.pay[k]==null||X.pay[k]==="")&&x.pay[k])X.pay[k]=x.pay[k]})})}catch(e){} // a second picture of the same payment fills what the first one missed
  g.X=X;try{ixNumFix(g,X)}catch(e){}
  try{const sd1=ixSide(g),pp1=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{},d1=X.pay.dir||pp1.dir||"";if(sd1==="SELL"&&X.pay.receiver&&X.pay.amount!=null){const l41=ixL4(pp1.last4||X.pay.acct||""),vp1=pp1.vpa||X.pay.vpa||"";const bk1=ixBankOf({last4:l41,bank:X.pay.bank||"",dir:d1,vpa:vp1},sd1);if(ixOwnAcct(l41,vp1,d1,bk1))ixTrusted.add(X.pay.receiver)}}catch(e){} // your own account: its name counts as you from here on
  try{const sd=ixSide(g),O2=X.ord;g.roleFix=null;if(sd&&O2){const mk=sd==="SELL"?"seller":"buyer",ok2=sd==="SELL"?"buyer":"seller";if(!O2[ok2]&&O2.cp)O2[ok2]=O2.cp;
    const v=O2[mk];if(v&&ixMyNames().length&&!ixIsMe(v)&&O2[ok2]&&!ixIsMe(O2[ok2])&&verName(O2[ok2],v)!=="M"){g.roleFix=`“${v}” on the order is the other person's nickname, not you. On a ${sd} order the exchange page shows only the other person, so your side is you.`;O2[mk]=null}}}catch(e){}
  try{const pp0=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{},dir0=X.pay.dir||pp0.dir||"",ow=pref("owner"),sd0=ixSide(g);
    const l4=ixL4(pp0.last4||X.pay.acct||""),mine=X.pay.amount!=null&&(l4||X.pay.bank)&&payBank({last4:l4,bank:X.pay.bank||""});
    if(ow&&mine&&!(sd0==="SELL"&&dir0==="out")){if(dir0==="out"&&!X.pay.sender){X.pay.sender=ow;g.inferred.push("sender")}else if(dir0==="in"&&!X.pay.receiver){X.pay.receiver=ow;g.inferred.push("receiver")}}
    if(sd0==="BUY"){if(!X.ord.seller&&X.ord.cp)X.ord.seller=X.ord.cp;if(!X.ord.buyer&&ow){X.ord.buyer=ow;g.inferred.push("buyer")}}
    else if(sd0==="SELL"){if(!X.ord.buyer&&X.ord.cp)X.ord.buyer=X.ord.cp;if(!X.ord.seller&&ow){X.ord.seller=ow;g.inferred.push("seller")}}}catch(e){}
  try{const sd=ixSide(g),pp1=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{},vp=pp1.vpa||X.pay.vpa||"",ow=pref("owner");
    if(sd==="SELL"&&X.pay.amount!=null&&ow){const byV=vp&&ixMyVpas().includes(vp.toLowerCase()),byN=X.pay.receiver&&ixIsMe(X.pay.receiver);if((byV||byN)&&X.pay.receiver!==ow){X.pay.receiver=ow;if(!g.inferred.includes("receiver"))g.inferred.push("receiver")}}}catch(e){}
  try{if(!g.order&&!g.target&&g.pays.length)ixAutoTarget(g,X);if(!g.order&&g.target&&g.autoT)X.ord={...X.ord,...ixTargetOrd(g.target)}}catch(e){}
  const hashes=g.items.map(x=>x.hash);const cmp=verCompare(X,{hashes,side:ixSide(g)});
  if(g.dateNote){const tf=cmp.fields.find(f=>f.k==="time");if(tf)tf.note=(tf.note?tf.note+" · ":"")+g.dateNote}
  cmp.fields.forEach(f=>{if((f.k==="buyer"&&(g.inferred.includes("buyer")||g.inferred.includes("sender")))||(f.k==="seller"&&(g.inferred.includes("seller")||g.inferred.includes("receiver"))))f.note=(f.note?f.note+" · ":"")+"Your side is worked out from your bank and your name"});
  // spec: different payment method or a partial name is never "verified"
  if(g.autoT&&!g.order&&cmp.overall==="REVIEW"){const of=cmp.fields.find(f=>f.k==="orderid");if(of&&of.res==="NOTFOUND"&&!(g.target&&exIdOf(g.target))&&cmp.fields.filter(f=>f.major&&f.k!=="orderid").every(f=>f.res==="MATCH"||f.res==="FOUND"))cmp.overall="VERIFIED"} // your own order has no exchange id to compare, everything else agrees
  try{if(ixSide(g)==="SELL"&&X.pay.receiver&&!(g.inferred||[]).includes("receiver")&&!ixIsMe(X.pay.receiver)&&!(X.pay.dir==="out"&&ixIsMe(X.pay.sender))){const f=cmp.fields.find(x=>x.k==="seller");if(f&&f.res==="MISMATCH"){f.res="UNCLEAR";f.note="This receiver is not one of your saved accounts yet. Confirm below that it is yours"}
    if(cmp.overall==="MISMATCH"&&!cmp.fields.some(x=>x.res==="MISMATCH"))cmp.overall="REVIEW"}}catch(e){}
  try{if(ixSide(g)==="SELL"&&(g.inferred||[]).includes("receiver")&&!X.pay.sender&&cmp.overall==="REVIEW"){const bf=cmp.fields.find(x=>x.k==="buyer");if(bf&&bf.res==="NOTFOUND"&&cmp.fields.filter(f=>f.major&&f.k!=="buyer").every(f=>f.res==="MATCH"||f.res==="FOUND")){bf.note="The buyer's name is not shown on this payment page";cmp.overall="VERIFIED"}}}catch(e){} // a buyer's proof often shows only who was paid
  const soft=cmp.fields.some(f=>(f.k==="method"||f.k==="seller")&&f.res==="UNCLEAR");if(cmp.overall==="VERIFIED"&&soft)cmp.overall="REVIEW";
  if(cmp.overall!=="VERIFIED"&&!g.ai&&!g.reasonsAI0)g.needAI=true;
  if(g.conflicts&&g.conflicts.length&&cmp.overall==="VERIFIED"){cmp.overall="REVIEW"}
  if(!g.order&&!g.target&&cmp.overall==="VERIFIED")cmp.overall="REVIEW"; // payment alone has nothing to be compared with
  g.cmp=cmp;g.dups=ixDups(g);g.risk=ixRisk(g);if(cmp.overall==='VERIFIED'&&g.risk.level!=='LOW')cmp.overall=g.risk.level==='HIGH'?'MISMATCH':'REVIEW';else if(cmp.overall==='REVIEW'&&g.risk.level==='HIGH')cmp.overall='MISMATCH';
  g.cancelOnly=!!(g.order&&!g.pays.length&&ixStatusOf(X.ord.status)==="Cancelled"&&X.ord.fiat>0&&(X.ord.crypto>0||X.ord.price>0));
  if(g.cancelOnly){const dp=g.dups||[];g.risk={level:dp.length?"MEDIUM":"LOW",reasons:dp.map(d=>d.msg)};cmp.overall=dp.length?"REVIEW":"VERIFIED";g.needAI=false} // nothing to verify: no money moves on a cancelled order
  const confs=g.items.map(x=>x.ocr&&x.ocr.conf!=null?x.ocr.conf:null).filter(x=>x!=null);
  g.reasonsAI=[];const need=g.reasonsAI;if(g.needAI&&!g.ai)need.push(cmp.overall==='MISMATCH'?'result shows a mismatch (could be a reading error)':'result needs review');
  if(g.items.some(x=>x.ocr&&x.ocr.engine==="Tesseract"&&x.ocr.conf<85&&x.ocr.status!=="fail"))need.push("OCR confidence below 85%");
  if(g.items.some(x=>x.cls.type==="UNKNOWN"))need.push("screenshot type unclear");
  if(g.pays.length&&!(X.pay.amount!=null&&X.pay.utr))need.push("payment amount or UTR missing");
  if(g.order&&!(X.ord.id&&(X.ord.fiat!=null)))need.push("order ID or amount missing");
  if(g.pays.some(p=>p.uncertain))need.push("payment/order link uncertain");
  if(g.order&&g.pays.length&&cmp.fields.some(f=>f.major&&(f.res==="MISMATCH"||f.res==="UNCLEAR")))need.push("conflicting information");
  if(cmp.flags.some(f=>["EDITED_LOOKING","CROPPED_DETAILS","INCONSISTENT_FONTS"].includes(f)))need.push("suspicious structure");
  g.conf=Math.round(100*Math.max(0,Math.min(1,(confs.length?Math.min(...confs)/100:cmp.confidence)*0.5+cmp.confidence*0.5)));
  return g}
function ixDups(g){const out=[],X=g.X,I=riskIdx();const target=g.target||((X.ord.id)?orders.find(o=>normRef(exIdOf(o))&&normRef(exIdOf(o))===normRef(X.ord.id)):null)||null;g.target=target;
  const u=normRef(X.pay.utr);if(u.length>=8){const m=(I.u.get(u)||[]);if(m.length)out.push({k:"utr",msg:(target&&m.some(o=>o.id===target.id)?"This UTR / transaction ID is already recorded on the matching order: ":"This UTR / transaction ID is already used in ")+shortO(m[0]),o:m[0],same:!!(target&&m.some(o=>o.id===target.id))})}
  if(!target&&X.ord.id){const e=normRef(X.ord.id);const m=I.e.get(e);if(m&&m.length)out.push({k:"ex",msg:"This exchange order ID is already saved: "+shortO(m[0]),o:m[0]})}
  g.items.forEach(it=>{const m=(I.s.get(it.hash)||[]).filter(o=>!target||o.id!==target.id)[0];if(m)out.push({k:"shot",msg:"This screenshot was already used for "+shortO(m),o:m})});
  if(X.pay.amount!=null){const pt=verWhen(X.pay.date,X.pay.time);if(pt){const m=orders.find(o=>o.status!=="Cancelled"&&(!target||o.id!==target.id)&&Math.abs(orderTotal(o)-X.pay.amount)<=1&&Math.abs((o.payAt||o.time)-pt)<10*60e3&&(!X.ord.buyer&&!X.ord.seller||!o.cp||verName(o.cp,X.ord.buyer||X.ord.seller)!=="X"));if(m&&!out.some(d=>d.o&&d.o.id===m.id))out.push({k:"amt",msg:"Same amount at almost the same time as "+shortO(m),o:m})}}
  return out}
// ---- P2P rule: a BUY is paid from MY account, a SELL lands in MY account
function ixMine(g){try{const X=g.X,P=X.pay,O=X.ord;const side=ixSide(g);if(!side||!g.X)return{side:side||null,verdict:"na",lines:[],bank:null};
  const pp=(g.pays.find(x=>!x.support)||g.pays[0]||{}).pay||{};const dir=P.dir||pp.dir||"";const l4=ixL4(pp.last4||P.acct||"");
  const bk=P.amount!=null?ixBankOf({last4:l4,bank:P.bank||"",dir,vpa:pp.vpa||P.vpa||""},side):null;const haveBanks=banks.some(b=>b.type!=="Cash");
  const me=ixMyNames();const isMe=n=>ixIsMe(n);const notMe=n=>!!n&&me.length>0&&!ixIsMe(n);
  const L=[];let w="ok";const add=(st,t,sh)=>{L.push({s:st,t,r:sh||t});if(st==="bad")w="bad";else if(st==="warn"&&w!=="bad")w="warn"};
  const acct=bk?`${bk.name||bk.bankName}${l4?" ••"+l4:""}`:"";
  if(P.lite&&g.liteAmbig)add("warn","UPI Lite is on more than one of your banks. The receipt does not name the bank, so check the small bank logo on the UPI Lite icon before you save.","Which bank has this UPI Lite?");
  if(P.lite&&P.amount>1000)add("warn",`UPI Lite payment of ${inr(P.amount)}. One Lite payment is up to ₹1,000, so check which account it was really paid from.`,"UPI Lite payment above ₹1,000");
  if(side==="BUY"){
    if(dir==="in")add("bad","This is a BUY order, but this payment shows money received, not paid.","BUY order, but payment shows money received");
    if(bk&&dir!=="in")add("ok",`Paid from your ${acct}`);
    else if(!bk&&haveBanks&&(l4||P.bank)&&dir!=="in"){add("warn",`Paid from an account that is not in your bank list${l4?" (••"+l4+")":""}. Is it yours?`,"Paid from an account not in your bank list");if(l4)L[L.length-1].own=l4}
    if(P.sender){if((g.inferred||[]).includes("sender"))add("ok","Sender is you (paid from your own bank)");else if(isMe(P.sender))add("ok","Sender name is you");else if(notMe(P.sender))add("bad",`Sender “${P.sender}” is not you. On a P2P buy, pay from your own account only.`,"Paid by someone else (third-party payment)")}
    if(P.receiver&&O.seller&&verName(P.receiver,O.seller)==="M")add("ok","Receiver is the seller on the order");
  }else{
    const vp=pp.vpa||P.vpa||"",vpMine=!!vp&&ixMyVpas().includes(vp.toLowerCase());
    // proof that the account is yours: its number ends like one of your saved accounts, or its UPI handle (@oksbi, @axisbank …) belongs to the one bank of that name you saved and that bank is where the money was placed
    const sb=ixOwnAcct(l4,vp,dir,bk);
    if(dir==="out"&&isMe(P.sender))add("bad","This is a SELL order, but this payment shows money sent by you, not received.","SELL order, but payment shows money sent");
    else if(dir==="out")add("na","This is the buyer's payment proof: money sent to your account.");
    if(bk&&dir!=="out")add("ok",`Received in your ${acct}`);
    else if(!bk&&haveBanks&&(l4||P.bank)&&dir!=="out"){add("warn",`Money went to an account that is not in your bank list${l4?" (••"+l4+")":""}. Is it yours?`,"Received in an account not in your bank list");if(l4)L[L.length-1].own=l4}
    if(P.receiver){if((g.inferred||[]).includes("receiver"))add("ok",vpMine?`Paid to your saved UPI ID ${vp}`:"Receiver is you (credited to your own bank)");else if(isMe(P.receiver))add("ok","Receiver name is you");
      else if(notMe(P.receiver)&&sb){ixTrusted.add(P.receiver);add("ok",`Receiver “${P.receiver}” is your own account: ${sb.name||sb.bankName}, matched by ${l4?"account number ••"+l4:"UPI handle"}`)}
      else if(notMe(P.receiver)){if(dir==="out"&&isMe(P.sender))add("bad",`Receiver “${P.receiver}” is not you. The money did not go to your account.`,"Money went to someone else's account");else{add("warn",`Receiver “${P.receiver}” is not in your saved accounts yet. Is this your account?`,"Receiver is not one of your saved accounts yet");L[L.length-1].mine={name:P.receiver,vpa:vp}}}}
    else if(vp){if(vpMine)add("ok",`Paid to your saved UPI ID ${vp}`);else if(sb)add("ok",`Paid to your own account: ${sb.name||sb.bankName}, matched by ${l4?"account number ••"+l4:"UPI handle"}`);else{add("warn",`Paid to UPI ID ${vp}, which is not saved as yours yet. Is it yours?`,"UPI ID is not saved as yours yet");L[L.length-1].mine={name:"",vpa:vp}}}
    if(P.sender&&O.buyer&&verName(P.sender,O.buyer)==="M")add("ok","Sender is the buyer on the order");
  }
  {const other=side==="BUY"?(O.seller||O.cp):(O.buyer||O.cp),role=side==="BUY"?"seller":"buyer";if(other){const k=ixlKnown(other,side);if(k)add("ok",`Known ${role}: ${k} earlier deal${k>1?"s":""} with ${other}`);else add("na",`New ${role}: first deal with ${other}`)}else if(g.order)add("na",`The ${role}'s name was not found on the order. Tap DEEP AI CHECK once and I will learn where it sits on this screen.`)}
  return{side,verdict:L.length?w:"na",lines:L,bank:bk,acct}}catch(e){return{side:null,verdict:"na",lines:[],bank:null}}}
// ---- risk: LOW / MEDIUM / HIGH with the reasons
function ixCpOf(g){const X=g.X||{},O=X.ord||{},P=X.pay||{};if(g.target&&g.target.cp)return g.target.cp;const sd=ixSide(g);return sd==="SELL"?(O.buyer||P.sender||""):sd==="BUY"?(O.seller||P.receiver||""):(O.buyer||O.seller||"")}
function ixCpRisk(g,hi,me){try{if(!feat("counterparties"))return;const cpn=ixCpOf(g);if(!cpn)return;const t=cpTag(cpn);if(t&&t.tag==="block")hi.push("Blocked counterparty: "+cpn);
  const x=cpx(cpn),lw=((x&&x.labels)||[]).filter(l=>CP_LBL_WARN.includes(l));if(lw.length)me.push(lw.join(", ")+": "+cpn);
  const st=cpStats()[cpKey(cpn)];if(st&&st.n>=3&&st.c/st.n>=0.3&&!(t&&t.tag==="block"))me.push(`${st.c} of ${st.n} orders with ${cpn} were cancelled`);
  const am=(g.X.pay&&g.X.pay.amount)||(g.X.ord&&g.X.ord.fiat);const w=am?cpLimitWarn(cpn,+am):"";if(w)me.push(w)}catch(e){}}
function ixRisk(g){const F=g.cmp.fields,hi=[],me=[],fl=g.cmp.flags;const f=k=>F.find(x=>x.k===k)||{};if(g.partLoose)me.push("Part payments were joined only because they add up to the order total (names / time did not confirm). Check once.");
  if(f("amount").res==="MISMATCH")hi.push("Amount mismatch");
  if(f("buyer").res==="MISMATCH"||f("seller").res==="MISMATCH")hi.push("Name mismatch");else if(f("buyer").res==="UNCLEAR"||f("seller").res==="UNCLEAR")me.push("Names only partly match");
  ixCpRisk(g,hi,me);
  if(g.cmp.local.some(x=>/Duplicate UTR/.test(x)))hi.push("Duplicate UTR");
  if((g.dups||[]).some(d=>d.k==="amt"))me.push("Possible duplicate transaction");if((g.dups||[]).some(d=>d.k==="shot"))hi.push("Screenshot already used");
  if(f("status").res==="MISMATCH")hi.push("Payment shows as failed");else if(f("status").res==="UNCLEAR")me.push("Payment status missing or unclear");
  if(f("time").res==="MISMATCH")hi.push("Suspicious date / time");else if(f("time").res==="UNCLEAR"){
    // a receipt whose time simply was not read is no alarm when amount, UTR and status all agree (the same screenshot and the same UTR can still not be used twice)
    const solid=f("amount").res==="MATCH"&&f("utr").res==="FOUND"&&f("status").res==="MATCH"&&/not visible/i.test(f("time").note||"");
    if(!solid)me.push("Date / time unclear")}
  if(f("utr").res==="NOTFOUND"||f("utr").res==="UNCLEAR")me.push("Incomplete receipt (no reliable UTR)");
  if(f("method").res==="UNCLEAR")me.push("Payment method differs between screenshots");
  if(fl.includes("EDITED_LOOKING"))hi.push("Screenshot looks edited");
  ["CROPPED_DETAILS","INCONSISTENT_FONTS","SUSPICIOUS_AMOUNT_FORMAT","MULTIPLE_TRANSACTIONS","BLURRY"].forEach(k=>{if(fl.includes(k))me.push(VER_RISK[k])});
  {const M=ixMine(g);M.lines.forEach(l=>{if(l.s==="bad")hi.push(l.r);else if(l.s==="warn")me.push(l.r)})}
  if(g.conflicts&&g.conflicts.length)me.push("Phone reading and AI reading differ");
  {const cf=g.pays.filter(p=>p.pay&&p.pay.amountConflict&&p.pay.amountAlts);if(cf.length)me.push("Two readings of the payment screenshot gave different amounts ("+cf[0].pay.amountAlts.map(v=>inr(v)).join(" / ")+"). Please check the amount");
   const dg=[...new Set(g.items.flatMap(x=>x.disagree||[]))];if(dg.length)me.push("Two readings of a screenshot differ on the "+dg.join(", ")+". Please check")}
  if((g.fixes||[]).length)me.push("A misread number was corrected automatically. Please check it");if(g.numBad)me.push("Quantity × rate does not equal the total, so a number may be misread");
  {const uo=ixUtrOdd(g.X.pay.utr);if(uo)me.push(uo);const an=ixAcctNew(g);g.acctNew=an;if(an)me.push(an.kind==="new"?`New UPI ID for ${an.name}: ${an.vpa} (before: ${an.old}). Make sure it is really theirs`:`This UPI ID ${an.vpa} was earlier used for ${an.other}, not ${an.name}`)}
  if(g.pays.some(p=>p.uncertain))me.push("Screenshots may belong to another order");
  const level=hi.length?"HIGH":me.length?"MEDIUM":"LOW";return{level,reasons:[...hi,...me]}}

function sheetAuditLog(){const L=[...audits].sort((a,b)=>b.time-a.time).slice(0,120);
  openSheet(`<div class="insw"><div class="insh"><h3>Activity log</h3><span class="note">orders created, edited, deleted · overrides</span></div>
    <div class="rml">${L.length?L.map(a=>{const o=orders.find(x=>x.id===a.order);return`<div class="dqr"><span>${esc(auTxt(a))}<br><small class="note" style="margin:0">${o?esc(shortO(o)):esc(a.sum||"deleted order")}${a.warn&&a.warn.length?" · ⚠ "+esc(a.warn.join(" ")):""}</small></span><b style="font-weight:500;color:var(--muted);white-space:nowrap">${fdt(a.time)}</b></div>`}).join(""):'<div class="dqr"><span class="note" style="margin:0">Nothing yet. Every new order, edit, status change and delete from now on is listed here.</span></div>'}</div></div>`)}
