// ================= FEATURES: which parts of the app are switched on =================
// Every optional part of the app is listed here. To hide or show a part nothing else has to change:
//   k       short name            n / d   what the person sees      tier   basic · pro · business (plan presets)
//   go      pages (tabs, menu)    sheets  screens (sheets.xxx)       css    other selectors to hide
// Anything in the html with data-feat="k" is hidden too, and code that belongs to a part calls feat("k").
// Basic (always on): orders, banks, wallet and stock, expenses, profit, backup, app lock, settings.
const FEATURES=[
 {k:"counterparties",n:"Counterparties",d:"Client list, trust score, labels, limits, notes and warnings",tier:"pro",sheets:["cps","cptop","trader","ident"],css:["#cpRep"]},
 {k:"intake",n:"Smart Intake",d:"Reads payment and order screenshots and fills in your orders",tier:"pro",go:["intake"],sheets:["ixhist","ixmem","ixdebug","verify"]},
 {k:"lite",n:"UPI Lite",d:"UPI Lite balance, loads and Lite payments",tier:"pro",sheets:["lite"]},
 {k:"history",n:"History import",d:"Bring in old order history from files",tier:"pro",go:["import"],sheets:["imphist","gallery"]},
 {k:"templates",n:"Chat templates",d:"Ready replies for your buyers and sellers",tier:"pro",sheets:["tpl"]},
 {k:"whatsapp",n:"WhatsApp sharing",d:"Send reminders and statements on WhatsApp",tier:"pro",sheets:["wa","wasend"]},
 {k:"reports",n:"Reports and statements",d:"Period reports, PDFs and client statements",tier:"pro",sheets:["report","stmt"]},
 {k:"direct",n:"Direct deals and khata",d:"Direct parties, weekly payments and dues",tier:"business",go:["direct"],sheets:["party","partyView","pstmt","due","pay","pair","payee","khata"]},
 {k:"insights",n:"Business insights",d:"Best time, best rate, targets, coach, loss finder, bank health",tier:"business",sheets:["besttime","bestrate","target","mscore","nightrep","coach","loss","rules","cashflow","bankrisk","bankhealth","insights","dayclose","glance"]},
 {k:"ai",n:"AI assistant",d:"Ask anything, voice assistant and P2P Brain",tier:"business",go:["ai"],sheets:["brain","conv"],css:["#aiFab",".aifab"]},
 {k:"market",n:"Live market and coins",d:"USDT price, P2P ads and coins",tier:"business",go:["coins"],sheets:["market","coinledger"],css:[".mkchip"]},
 {k:"nightalarm",n:"Night order alarm",d:"Loud alarm for new KuCoin orders (Android app)",tier:"pro",sheets:["nalarm"]},
 {k:"audit",n:"Audit log",d:"Full history of every change",tier:"business",sheets:["auditlog"]},
 {k:"sync",n:"Phone database sync",d:"Keep a copy on your always-on phone",tier:"business",sheets:["dbphone"]}
];
// App language (this phone only): "en" English, "hi" Hinglish (Hindi in English letters). tr(english, hinglish) picks the text.
// Screens are moved to tr() one by one; a text without a Hinglish version simply stays in English.
function LANG(){try{return localStorage.getItem("p2p_lang")==="hi"?"hi":"en"}catch(e){return"en"}}
const tr=(en,hi)=>LANG()==="hi"&&hi?hi:en;
const FEAT_BY={};FEATURES.forEach(f=>FEAT_BY[f.k]=f);
// The owner's PUBLIC key (safe to be in the app). Empty = the app is open: every part is on unless switched off on this phone.
// Once a key is here, optional parts need a licence code made with the matching private key (kept only on the owner's phone).
let LIC_PUB="";
const FS={off:[],lic:null,owner:false};
function featLoad(){try{FS.off=JSON.parse(localStorage.getItem("p2p_feat_off")||"[]")}catch(e){FS.off=[]}
  try{FS.lic=JSON.parse(localStorage.getItem("p2p_lic_ok")||"null")}catch(e){FS.lic=null}
  try{FS.owner=!!localStorage.getItem("p2p_lic_priv")}catch(e){FS.owner=false}}
featLoad();
function licOk(){const l=FS.lic;if(!l)return null;if(l.exp&&Date.parse(l.exp+"T23:59:59")<Date.now())return null;return l}
// is this part of the app on?  (unknown names are always on)
function feat(k){const f=FEAT_BY[k];if(!f)return true;if(FS.off.indexOf(k)>=0)return false;if(!LIC_PUB||FS.owner)return true;
  const l=licOk();return!!l&&(l.f==="*"||(Array.isArray(l.f)&&l.f.indexOf(k)>=0))}
