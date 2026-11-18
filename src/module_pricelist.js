// ===================== MODULE: price list designer =====================
// Her choices live in state.setup.priceList; anything she has not set falls back to her branding.
const PL_TPL={ band:{name:'Band',page:'bg',band:true}, clean:{name:'Clean',page:'white',centre:true,rule:true},
               bold:{name:'Bold',page:'accent'}, frame:{name:'Framed',page:'bg',centre:true,frame:true} };
// top/bot on Story keep clear of the parts Instagram covers with its own buttons
const PL_FMT={ square:{name:'Square 1:1',h:1080}, portrait:{name:'Portrait 4:5',h:1350}, long:{name:'Long',h:0} };
function plOptions(){ const s=state.setup, b=s.brand||{}, pal=PALETTES[b.palette]||PALETTES.berry, p=s.priceList||{};
  return {tpl:PL_TPL[p.tpl]?p.tpl:'band', fmt:PL_FMT[p.fmt]?p.fmt:'portrait', title:p.title??'Price list', name:p.name??(b.businessName||''), footer:p.footer||'', hours:p.hours!==false,
          hide:p.hide||[], accent:p.accent||pal.accent, bg:p.bg||pal.soft, kind:p.kind==='suggested'?'suggested':'current', photo:p.photo??(b.logo||'')}; }
function plRows(o){ return compute(state).treatments.filter(t=>!o.hide.includes(t.id)).map(t=>({name:t.name+(t.addon&&t.unitLabel?` (per ${t.unitLabel})`:t.addon?' (add-on)':''), price:o.kind==='suggested'?t.suggested:(+t.price||t.suggested)})); }
// What goes on each picture. A list that nearly fits is shrunk a little; a longer one is shared out over
// two or more pictures at full size, with the opening hours on the last. Long is one tall picture.
function plPages(o){ const T=PL_TPL[o.tpl], F=PL_FMT[o.fmt], rows=plRows(o), hrs=o.hours?hoursSummary():[], n=rows.length;
  const top=F.top||0, bot=(F.bot||0)+(T.frame?90:50), base=top+(T.band?320:350), foot=o.footer?100:0, need=hrs.length?84+hrs.length*52:0;
  if(!F.h) return [{rows,hrs,H:Math.max(1350,base+n*92+need+foot+bot),top,bot,y0:base,f:1,n:1,of:1}];
  const room=F.h-base-foot-bot, body=(r,h)=>r.length*92+(h.length?need:0), fit=(r,h)=>room/Math.max(1,body(r,h)), ok=(r,h)=>fit(r,h)>=0.85; // shrink by 15% at most
  const split=P=>{ const per=Math.ceil(n/P), c=[]; for(let i=0;i<n;i+=per) c.push(rows.slice(i,i+per)); return c.length?c:[[]]; };
  let c=[rows];
  if(!ok(rows,hrs)){ c=split(Math.ceil(n/Math.max(1,Math.floor(room/92)))||1);
    if(need&&!ok(c[c.length-1],hrs)) c=split(c.length+1); }      // one more picture, shared out evenly, often makes room for the hours
  const out=c.map((r,i)=>[r,need&&i===c.length-1&&ok(r,hrs)?hrs:[]]);
  if(need&&!out[out.length-1][1].length) out.push([[],hrs]);     // still no room: the hours get a picture of their own
  const f=Math.min(1,...out.map(([r,h])=>fit(r,h)));             // the same size writing on every picture
  return out.map(([r,h],i)=>({rows:r,hrs:h,H:F.h,top,bot,f,n:i+1,of:out.length,y0:base+(F.top?Math.max(0,(room-body(r,h)*f)/2):0)})); } // a short list sits in the middle of a Story
// dark or white writing, whichever shows up on that colour (so any colour she picks stays readable)
const plInk=hex=>{ const n=parseInt(String(hex).slice(1),16)||0, l=(0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255))/255; return l>0.6?'#1d1a26':'#ffffff'; };
let plPic=null, plTimer=0;
function plPhotoImg(src){ if(!src) return null;
  if(!plPic||plPic.src!==src){ const img=new Image(); plPic={src,img}; img.onload=plRefresh; img.src=src; }
  return plPic.img.complete&&plPic.img.naturalWidth?plPic.img:null; }
function plDraw(o,L){ const T=PL_TPL[o.tpl], W=1080, {H,f}=L, X=T.frame?120:72, ph=plPhotoImg(o.photo);
  const big=o.name||o.title, small=o.name?o.title:'';
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const x=cv.getContext('2d');
  const page=T.page==='accent'?o.accent:T.page==='white'?'#ffffff':o.bg, ink=plInk(page), strong=T.page==='accent'?ink:o.accent, line=ink==='#ffffff'?'rgba(255,255,255,.25)':'rgba(0,0,0,.12)';
  x.fillStyle=page; x.fillRect(0,0,W,H);
  if(T.frame){ x.strokeStyle=o.accent; x.lineWidth=6; x.strokeRect(44,44,W-88,H-88); }
  let head=strong; if(T.band){ x.fillStyle=o.accent; x.fillRect(0,0,W,L.top+230); head=plInk(o.accent); }
  if(ph){ const r=75, cx=W-X-r, cy=L.top+(T.band?115:140), k=Math.max(2*r/ph.naturalWidth,2*r/ph.naturalHeight), w=ph.naturalWidth*k, h=ph.naturalHeight*k; // a round picture in the top corner
    x.save(); x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.clip(); x.drawImage(ph,cx-w/2,cy-h/2,w,h); x.restore();
    x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.lineWidth=6; x.strokeStyle=T.band||T.page==='accent'?'#ffffff':o.accent; x.stroke(); }
  const tx=T.centre?W/2:X, room=W-2*X-(ph?(T.centre?340:170):0); x.textAlign=T.centre?'center':'left';
  x.fillStyle=head; x.font='800 72px "Bricolage Grotesque", "Segoe UI", sans-serif'; x.fillText(big,tx,L.top+(T.band?140:170),room);
  if(small){ x.fillStyle=T.band?head:ink; x.font='500 34px Figtree, "Segoe UI", sans-serif'; x.fillText(small,tx,L.top+(T.band?195:225),room); }
  if(T.rule){ x.fillStyle=o.accent; x.fillRect(W/2-60,L.top+255,120,4); }
  let y=L.y0-50+50*f; x.textAlign='left';
  const fmt=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2,minimumFractionDigits:0}), font=(wt,px)=>`${wt} ${Math.round(px*f)}px Figtree, "Segoe UI", sans-serif`;
  L.rows.forEach(r=>{ const ps=fmt.format(r.price); x.font=font(700,44); const w=x.measureText(ps).width; x.fillStyle=strong; x.fillText(ps,W-X-w,y);
    x.fillStyle=ink; x.font=font(600,40); x.fillText(r.name,X,y,W-2*X-w-30); x.fillStyle=line; x.fillRect(X,y+28*f,W-2*X,2); y+=92*f; });
  if(L.hrs.length){ y+=30*f; x.fillStyle=strong; x.font=font(700,36); x.fillText('Opening hours',X,y); y+=54*f;
    x.fillStyle=ink; x.font=font(500,34); L.hrs.forEach(l=>{ x.fillText(l,X,y,W-2*X); y+=52*f; }); }
  const more=L.of>1;
  if(o.footer){ x.textAlign='center'; x.fillStyle=strong; x.font='700 38px Figtree, "Segoe UI", sans-serif'; x.fillText(o.footer,W/2,H-L.bot-20,W-2*X-(more?220:0)); }
  if(more){ x.textAlign='right'; x.fillStyle=ink; x.globalAlpha=.65; x.font='600 28px Figtree, "Segoe UI", sans-serif'; x.fillText(`${L.n} of ${L.of}`,W-X,H-L.bot-20); x.globalAlpha=1; }
  return cv; }
function plCanvases(){ const o=plOptions(); return plPages(o).map(L=>plDraw(o,L)); }
function plRefresh(){ clearTimeout(plTimer); plTimer=setTimeout(()=>{ const box=document.getElementById('pl-imgs'); if(!box) return;
    const cvs=plCanvases(), n=document.getElementById('pl-count');
    box.innerHTML=cvs.map((c,i)=>`<img src="${c.toDataURL('image/png')}" alt="Your price list${cvs.length>1?`, picture ${i+1} of ${cvs.length}`:''}" style="width:100%;border-radius:10px">`).join('');
    if(n){ n.hidden=cvs.length<2; n.textContent=`Your list is on ${cvs.length} pictures so the writing stays big. Post them together.`; } },80); }
function plSet(k,v){ state.setup.priceList={...(state.setup.priceList||{}),[k]:v}; save(); plRefresh(); }
function plOpen(){ const o=document.getElementById('overlay'), op=plOptions();
  const chip=(k,v,l)=>`<button class="chip" data-act="pl-set" data-k="${k}" data-v="${v}" aria-pressed="${op[k]===v}">${l}</button>`;
  o.innerHTML=`<div class="card" style="max-width:520px;width:100%;max-height:92vh;overflow:auto">
    <div id="pl-imgs" class="stack" style="gap:10px"></div>
    <p id="pl-count" class="notice info" hidden></p>
    <div class="row"><button class="btn" data-act="pl-save">Save or share</button><button class="btn ghost" data-act="bk-close">Close</button></div>
    <p class="small muted">If that does not work on your phone, press and hold a picture to save it.</p>
    <h3>Make it yours</h3>
    <div class="field">Design<div class="chips">${Object.entries(PL_TPL).map(([k,t])=>chip('tpl',k,t.name)).join('')}</div></div>
    <div class="field">Shape<div class="chips">${Object.entries(PL_FMT).map(([k,t])=>chip('fmt',k,t.name)).join('')}</div>
      <p class="small muted">Square and Portrait suit Instagram posts. A long list is split over two or more pictures. Long puts everything on one tall picture, for printing.</p></div>
    <div class="field">Logo or photo<p class="small muted">Shows as a circle in the top corner.</p><div class="row">
      <label class="btn small ghost" style="cursor:pointer">${op.photo?'Change the picture':'Choose a picture'}<input type="file" accept="image/*" data-plphoto="1" hidden></label>
      ${op.photo?`<button class="btn small ghost" data-act="pl-photo-del">Remove it</button>`:''}</div></div>
    <label class="field">Heading<input id="pl-title" value="${esc(op.title)}" data-pl="title"></label>
    <label class="field">Your business name<span class="hint">Leave it empty to show none</span><input id="pl-name" value="${esc(op.name)}" placeholder="e.g. Nails by Sophie" data-pl="name"></label>
    <label class="field">Line at the bottom<span class="hint">How to book, or where to find you</span><input id="pl-footer" value="${esc(op.footer)}" placeholder="e.g. Message me to book" data-pl="footer"></label>
    <div class="fields"><label class="field">Main colour<input id="pl-accent" type="color" value="${esc(op.accent)}" data-pl="accent" style="height:46px;padding:4px"></label>
      <label class="field">Background<input id="pl-bg" type="color" value="${esc(op.bg)}" data-pl="bg" style="height:46px;padding:4px"></label></div>
    <button class="btn small ghost" data-act="pl-reset">Back to my usual colours</button>
    <div class="field">Prices to show<div class="chips">${chip('kind','current','My prices')}${chip('kind','suggested','Suggested prices')}</div></div>
    <label class="row small"><input type="checkbox" id="pl-hours" data-pl="hours" ${op.hours?'checked':''}> Show my opening hours</label>
    <div class="field">What to show<div class="stack" style="gap:8px">${state.treatments.map(t=>`<label class="row small" style="flex-wrap:nowrap"><input type="checkbox" data-plt="${t.id}" ${op.hide.includes(t.id)?'':'checked'} style="flex:none"><span>${esc(t.name)}</span></label>`).join('')}</div></div>
    <button class="btn ghost" data-act="bk-close">Close</button></div>`;
  o.hidden=false; plRefresh(); plClaudeSave(); } // ask early, so Save does not wait on it
// redraw the whole sheet (a button has to appear or go) without losing her place on it
function plReopen(){ const c=document.getElementById('overlay').firstElementChild, t=c?c.scrollTop:0; plOpen(); document.getElementById('overlay').firstElementChild.scrollTop=t; }
function makePriceList(kind){ if(kind) state.setup.priceList={...(state.setup.priceList||{}),kind}; plOpen(); }
async function plPhoto(file){ const url=await blobToDataURL(await shrinkTo(file,400)); if(!url){ toast('That picture could not be read'); return; } plSet('photo',url); plReopen(); }
// Opened inside Claude, a page may not save files itself: Claude offers its own Save box for each picture instead. Anywhere else this is null.
const plClaudeSave=()=>window.claude&&typeof window.claude.use==='function'?window.claude.use('downloads').catch(()=>null):Promise.resolve(null);
async function plSave(){ const cvs=plCanvases(), blobs=await Promise.all(cvs.map(c=>new Promise(r=>c.toBlob(r,'image/png'))));
  const name=i=>cvs.length>1?`price-list-${i+1}.png`:'price-list.png', files=blobs.map((b,i)=>new File([b],name(i),{type:'image/png'}));
  const dl=await plClaudeSave();
  if(dl){ for(let i=0;i<blobs.length;i++){ try{ await dl.save({filename:name(i),data:blobs[i]}); }catch(e){ if(!e||e.code!=='declined') toast('Press and hold a picture to save it'); return; } } return; }
  try{ if(navigator.canShare&&navigator.canShare({files})){ await navigator.share({files}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
  blobs.forEach((b,i)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name(i); a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); }); }
document.addEventListener('click', e=>{ const el=e.target.closest&&e.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='pl-set'){ plSet(el.dataset.k,el.dataset.v); el.parentElement.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(c===el))); }
  else if(a==='pl-reset'){ const p={...(state.setup.priceList||{})}; delete p.accent; delete p.bg; state.setup.priceList=p; save(); plReopen(); }
  else if(a==='pl-photo-del'){ plSet('photo',''); plReopen(); }
  else if(a==='pl-save') plSave(); });
document.addEventListener('input', e=>{ const el=e.target, d=el.dataset||{};
  if(d.pl) plSet(d.pl, el.type==='checkbox'?el.checked:el.value);
  else if(d.plt){ const hide=plOptions().hide.filter(id=>id!==d.plt); if(!el.checked) hide.push(d.plt); plSet('hide',hide); }
  else if(d.plphoto&&el.files&&el.files[0]) plPhoto(el.files[0]); });
