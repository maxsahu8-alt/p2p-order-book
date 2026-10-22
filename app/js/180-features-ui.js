// ================= FEATURES: switching parts on/off, licence codes, owner tools =================
// The list of parts and feat() live in 05-features.js. This file applies the switches to the screen
// and handles licence codes (signed with the owner's private key, checked with the public key in LIC_PUB).
const b64u={enc(u8){let s="";u8.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")},
  dec(t){t=String(t).replace(/-/g,"+").replace(/_/g,"/");while(t.length%4)t+="=";const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}};
const licText=s=>new TextEncoder().encode(s);
const licJwkSame=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
function featSel(f){return[...(f.go||[]).flatMap(g=>[`[data-go="${g}"]`,`.tabs button[data-tab="${g}"]`]),...(f.sheets||[]).flatMap(s=>[`[data-sheet="${s}"]`,`[data-sheet^="${s}:"]`]),`[data-feat="${f.k}"]`,...(f.css||[])]}
function featPurge(){const off=FEATURES.filter(f=>!feat(f.k));if(!off.length)return;const sel=off.flatMap(featSel).join(",");
  try{document.querySelectorAll("#dAll .dri").forEach(b=>{if(b.matches(sel))b.remove()});document.querySelectorAll("#dAll .dgrp").forEach(g=>{if(!g.querySelector(".dri"))g.remove()})}catch(e){}}
let featStyle=null;
function featApply(){const off=FEATURES.filter(f=>!feat(f.k));
  if(!featStyle){featStyle=document.createElement("style");featStyle.id="featcss";document.head.appendChild(featStyle)}
  featStyle.textContent=off.map(f=>featSel(f).join(",")+"{display:none!important}").join("\n");
  featPurge();
  off.forEach(f=>(f.sheets||[]).forEach(n=>{const o=sheets[n];if(typeof o==="function"&&!o.__lock){const w=function(){featLocked(f)};w.__lock=1;w.__orig=o;sheets[n]=w}}));
  window.__featOff=off.map(f=>f.k)}
// a screen of a part that is off: say why and how to get it
function featLocked(f){const sw=FS.off.indexOf(f.k)>=0;
  openSheet(`<h3>${esc(f.n)}</h3><p class="note">${sw?"This part is switched off on this phone.":"This part is not included in your licence."}</p><div class="row2"><button class="primary" type="button" data-fl="open">${sw?"Turn it on":"Licence and features"}</button><button class="mini ghost" type="button" data-close>Close</button></div>`,el=>{el.querySelector("[data-fl]").onclick=()=>sheets.features()})}
// ---- licence codes: PX1.<payload>.<signature>  (ECDSA P-256, payload = JSON, signature over "PX1.<payload>")
async function licVerify(code){const m=/^PX1\.([\w-]+)\.([\w-]+)$/.exec(String(code||"").trim());
  if(!m)return{ok:false,why:"That does not look like a licence code."};
  if(!LIC_PUB)return{ok:false,why:"This build does not check licence codes."};
  if(!(window.crypto&&crypto.subtle))return{ok:false,why:"This phone cannot check licence codes here."};
  try{const key=await crypto.subtle.importKey("jwk",JSON.parse(LIC_PUB),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const good=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,b64u.dec(m[2]),licText("PX1."+m[1]));
    if(!good)return{ok:false,why:"This licence code is not valid."};
    const p=JSON.parse(new TextDecoder().decode(b64u.dec(m[1])));
    if(p.exp&&Date.parse(p.exp+"T23:59:59")<Date.now())return{ok:false,why:"This licence ended on "+p.exp+".",payload:p};
    return{ok:true,payload:p}}catch(e){return{ok:false,why:"This licence code is not valid."}}}
async function licActivate(code){const r=await licVerify(code);if(!r.ok)return r;
  try{localStorage.setItem("p2p_lic",String(code).trim());localStorage.setItem("p2p_lic_ok",JSON.stringify({n:r.payload.n||"",f:r.payload.f,exp:r.payload.exp||"",id:r.payload.id||""}))}catch(e){}
  featLoad();return r}
async function licGenKeys(){const kp=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  const priv=await crypto.subtle.exportKey("jwk",kp.privateKey),pub=await crypto.subtle.exportKey("jwk",kp.publicKey);
  localStorage.setItem("p2p_lic_priv",JSON.stringify(priv));localStorage.setItem("p2p_lic_pub",JSON.stringify(pub));featLoad();return pub}
async function licSign(payload){const priv=JSON.parse(localStorage.getItem("p2p_lic_priv")||"null");if(!priv)throw new Error("no key");
  const key=await crypto.subtle.importKey("jwk",priv,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const body=b64u.enc(licText(JSON.stringify(payload)));const sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,licText("PX1."+body));
  return"PX1."+body+"."+b64u.enc(new Uint8Array(sig))}
// is this phone the owner's? (its private key must match the public key built into this app)
(function(){try{const pub=JSON.parse(localStorage.getItem("p2p_lic_pub")||"null");FS.owner=!!(LIC_PUB&&pub&&licJwkSame(pub,JSON.parse(LIC_PUB)))}catch(e){FS.owner=false}})();
featLoad=(old=>function(){old();try{const pub=JSON.parse(localStorage.getItem("p2p_lic_pub")||"null");FS.owner=!!(LIC_PUB&&pub&&licJwkSame(pub,JSON.parse(LIC_PUB)))}catch(e){FS.owner=false}})(featLoad);
// ---- the screen
sheets.features=function(){const owner=FS.owner,lic=licOk(),setup=!LIC_PUB;
  const st=setup?["Open","This build does not ask for a licence code. Every part is on unless you switch it off here."]:owner?["Owner","Your phone has the licence key. Every part works here."]:lic?["Licensed",(lic.n?lic.n+" · ":"")+(lic.exp?"valid till "+lic.exp:"no end date")]:["No licence","Only the basic parts work. Enter a licence code to unlock more."];
  const row=f=>{const locked=!setup&&!owner&&!(lic&&(lic.f==="*"||(lic.f||[]).indexOf(f.k)>=0));const on=FS.off.indexOf(f.k)<0&&!locked;
    return`<div class="dqr fsr"><span><b>${esc(f.n)}</b><small>${esc(f.d)}</small></span>${locked?'<em class="cpp risk">Locked</em>':`<label class="tog"><input type="checkbox" data-fk="${f.k}" ${on?"checked":""}><span></span></label>`}</div>`};
  const grp=(t,n)=>`<div class="pcsec">${n}</div><div class="rml">${FEATURES.filter(f=>f.tier===t).map(row).join("")}</div>`;
  openSheet(`<div class="insw"><h3>Features and licence</h3>
    <div class="fstat"><b>${st[0]}</b><small>${esc(st[1])}</small></div>
    <p class="note" style="margin:8px 0 0">Basic parts (orders, banks, wallet, expenses, profit, backup, lock) are always on.</p>
    ${grp("pro","Pro")}${grp("business","Business")}
    <div class="cpexp"><button type="button" class="primary" id="fs-save">Save and restart</button></div>
    <div class="pcsec">Licence code</div><div class="tgf"><input id="fs-code" placeholder="PX1…" autocomplete="off" autocapitalize="off"><button type="button" class="mini ghost" id="fs-act">Activate</button></div><p class="note" id="fs-msg" style="margin:6px 0 0"></p>
    ${setup||owner?`<div class="pcsec">Owner tools</div><div id="fs-own"></div>`:""}
    <div class="cpexp"><button type="button" class="mini ghost" data-close>Close</button></div></div>`,el=>{
    const q=s=>el.querySelector(s),msg=t=>{q("#fs-msg").textContent=t};
    q("#fs-save").onclick=()=>{const off=[...el.querySelectorAll("[data-fk]")].filter(c=>!c.checked).map(c=>c.dataset.fk);try{localStorage.setItem("p2p_feat_off",JSON.stringify(off))}catch(e){}toast("Saved. Restarting…");setTimeout(()=>location.reload(),350)};
    q("#fs-act").onclick=async()=>{const r=await licActivate(q("#fs-code").value);if(!r.ok){msg(r.why);return}msg("Licence accepted. Restarting…");setTimeout(()=>location.reload(),500)};
    if(q("#fs-own"))featOwner(q("#fs-own"))})};
// owner tools: make the signing keys once, then make a code for each customer
function featOwner(box){const have=()=>!!localStorage.getItem("p2p_lic_priv");
  const draw=()=>{if(!have()){box.innerHTML=`<p class="note">To sell the app with licence codes, first make your signing keys. They stay on this phone. You then give Claude the public key (safe to share) so it can be built into the app.</p><div class="cpexp"><button type="button" class="mini ghost" id="fo-gen">Make my signing keys</button></div>`;
      box.querySelector("#fo-gen").onclick=async()=>{try{await licGenKeys();draw()}catch(e){toast("This phone cannot make keys here")}};return}
    const pub=localStorage.getItem("p2p_lic_pub")||"";
    box.innerHTML=`<p class="note">Public key (safe to share, it goes into the app):</p><textarea id="fo-pub" readonly rows="3" class="fotx">${esc(pub)}</textarea><div class="cpexp"><button type="button" class="mini ghost" id="fo-cp">Copy public key</button><button type="button" class="mini ghost" id="fo-bk">Save private key backup</button></div>
      <p class="note">The private key makes codes. Keep the backup file safe and never send it to anyone.</p>
      <div class="pcsec">New licence code</div><div class="cpterms"><input id="fo-name" placeholder="Customer name" maxlength="40"><select id="fo-plan"><option value="pro">Pro plan</option><option value="business">Business plan (everything)</option><option value="basic">Basic plan (no extras)</option><option value="custom">Pick parts</option></select><div class="lbs" id="fo-feats" hidden>${FEATURES.map(f=>`<label class="lbc"><input type="checkbox" data-fo="${f.k}" hidden>${esc(f.n)}</label>`).join("")}</div><select id="fo-exp"><option value="1">Valid 1 month</option><option value="3">Valid 3 months</option><option value="12" selected>Valid 12 months</option><option value="0">No end date</option></select></div>
      <div class="cpexp"><button type="button" class="primary" id="fo-make">Create code</button></div><textarea id="fo-out" readonly rows="4" class="fotx" hidden></textarea><div class="cpexp" id="fo-act" hidden><button type="button" class="mini ghost" id="fo-copy">Copy code</button><button type="button" class="mini ghost" id="fo-wa">Send on WhatsApp</button></div>`;
    const q=s=>box.querySelector(s);
    q("#fo-cp").onclick=()=>copyText(pub);
    q("#fo-bk").onclick=()=>saveFile("pexai-licence-private-key-SECRET.json",localStorage.getItem("p2p_lic_priv")||"");
    q("#fo-plan").onchange=()=>{const v=q("#fo-plan").value;q("#fo-feats").hidden=v!=="custom"};
    q("#fo-feats").addEventListener("click",e=>{const l=e.target.closest(".lbc");if(!l)return;e.preventDefault();const c=l.querySelector("input");c.checked=!c.checked;l.classList.toggle("on",c.checked)});
    q("#fo-make").onclick=async()=>{const name=q("#fo-name").value.trim();if(!name){toast("Type the customer name");return}
      const plan=q("#fo-plan").value;let f=plan==="business"?"*":plan==="basic"?[]:plan==="pro"?FEATURES.filter(x=>x.tier==="pro").map(x=>x.k):[...box.querySelectorAll("[data-fo]")].filter(c=>c.checked).map(c=>c.dataset.fo);
      const mo=+q("#fo-exp").value;let exp="";if(mo){const d=new Date();d.setMonth(d.getMonth()+mo);exp=d.toISOString().slice(0,10)}
      try{const code=await licSign({v:1,n:name,f,exp,id:Math.random().toString(36).slice(2,8),iat:Date.now()});const o=q("#fo-out");o.value=code;o.hidden=false;q("#fo-act").hidden=false;
        q("#fo-copy").onclick=()=>copyText(code);q("#fo-wa").onclick=()=>window.open("https://wa.me/?text="+encodeURIComponent("Your Pexai licence code:\n"+code),"_blank")}catch(e){toast("Couldn't make the code")}}};
  draw()}
// check a saved licence when the app starts (and once more if it changed, e.g. ended)
async function licBoot(){let code="";try{code=localStorage.getItem("p2p_lic")||""}catch(e){}if(!LIC_PUB||!code)return;
  const had=JSON.stringify(FS.lic),r=await licVerify(code);
  try{if(r.ok)localStorage.setItem("p2p_lic_ok",JSON.stringify({n:r.payload.n||"",f:r.payload.f,exp:r.payload.exp||"",id:r.payload.id||""}));else localStorage.removeItem("p2p_lic_ok")}catch(e){}
  featLoad();if(had!==JSON.stringify(FS.lic)){try{if(!sessionStorage.getItem("p2p_lic_rl")){sessionStorage.setItem("p2p_lic_rl","1");location.reload()}}catch(e){}}}
// ---- put the switches in force: pages can't be opened, screens say why, menus lose the entries
{const _go=goPage;goPage=function(t){const f=FEATURES.find(x=>(x.go||[]).indexOf(t)>=0);if(f&&!feat(f.k)){featLocked(f);t="home"}return _go(t)};
 if(typeof p7Drawer==="function"){const _p7=p7Drawer;p7Drawer=function(){const r=_p7.apply(this,arguments);featPurge();return r}}}
featApply();licBoot();
