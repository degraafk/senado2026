const COL={'PP':'#2f7be0','PSOE':'#e03a4b','PSC':'#ee6a75','SdP':'#c42a47','Frente Amplio':'#f2541b','VOX':'#63b43d','ERC':'#f5b50a','Junts':'#1cb5ba','EH Bildu':'#a3cf1d','PNV':'#3aa86b','BNG':'#8cc2f0','CC':'#f0d000','UPN':'#4c7fd6','NC':'#52b356','PDeCAT-CiU':'#5b7bf0','Geroa Bai':'#d14d3d','AHI':'#a07fd0','ASG':'#b9703f','EiF':'#f08a1c','Adelante Andalucía':'#5ec462','Bloque Extremeño':'#8b97a8','Coalición por Melilla':'#74829b'};
const ORDER=['PSC','PSOE','SdP','Frente Amplio','EH Bildu','ERC','BNG','Junts','PDeCAT-CiU','PNV','Geroa Bai','EiF','Adelante Andalucía','AHI','ASG','CC','NC','Coalición por Melilla','Bloque Extremeño','UPN','PP','VOX'];
const PARTIES=['PP','PSOE','Frente Amplio','VOX','ERC','Junts','EH Bildu','PNV','BNG','CC','UPN','NC','PDeCAT-CiU'];
const DIRECT=['AHI','ASG','Adelante Andalucía','Bloque Extremeño','Coalición por Melilla','Geroa Bai'];
const EIF='Balears (Illes): EIVISSA-FORMENTERA',IBZ='Balears (Illes): IBIZA',FOR='Balears (Illes): FORMENTERA';
const IBV={SdP:23921,PP:21593,VOX:6236},FOV={SdP:2014,PP:1525,VOX:272};
const M={};BASEDATA.mult.forEach(m=>M[m.g]=m);
const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>n.toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:'always'});
const col=g=>COL[g]||'#98a2b3';
const nm=n=>{if(!n.includes(': '))return n;const s=n.split(': ')[1];return s.toLowerCase().replace(/(^|[ \/-])(\S)/g,(a,b,c)=>b+c.toUpperCase()).replace(/ De /g,' de ').replace(/ Del /g,' del ').replace(/ Las /g,' las ')};
let st,last,filt='all',bloc=new Set(['PP']);
function setBase(){st={pct:{},sdp:null,direct:{},X:0,Y:0,thr:st?st.thr:133};PARTIES.forEach(g=>st.pct[g]=M[g].b);DIRECT.forEach(g=>st.direct[g]=1)}
function buildData(){
  const rows=[];
  BASEDATA.rows.forEach(r=>{
    if(r.g==='EiF')r={...r,g:'SdP'};
    if(r.c!==EIF){rows.push(r);return}
    if(IBV[r.g]==null){rows.push({...r,c:IBZ},{...r,c:FOR,v:0});return}
    rows.push({...r,c:IBZ,v:IBV[r.g]},{...r,c:FOR,v:FOV[r.g]});
  });
  const cons=[];BASEDATA.cons.forEach(c=>{if(c[0]===EIF){cons.push([IBZ,1,c[2]],[FOR,1,{}])}else cons.push(c)});
  return {rows,cons,mult:BASEDATA.mult};
}
function buildInputs(){
  $('pcts').innerHTML=PARTIES.map(g=>{const mx=M[g].b>.05?50:6;return `<div class="p" style="--c:${col(g)}"><b>${g} <span class="note">(${fmt(M[g].b*100,1)})</span></b><input type="number" data-g="${g}" step="0.1" min="0" aria-label="${g} %"><input type="range" data-r="${g}" min="0" max="${mx}" step="0.1" aria-label="${g} deslizador"><small id="m_${g}"></small></div>`}).join('');
  $('direct').innerHTML=DIRECT.map(g=>`<div class="p" style="--c:${col(g)}"><b>${g}</b><input type="number" data-d="${g}" step="0.05" min="0" aria-label="${g} factor"></div>`).join('');
  const num=v=>{v=parseFloat(v);return isNaN(v)?0:v};
  document.querySelectorAll('[data-g],[data-r]').forEach(e=>e.addEventListener('input',()=>{const g=e.dataset.g||e.dataset.r;st.pct[g]=num(e.value)/100;sync(g);run()}));
  document.querySelectorAll('[data-d]').forEach(e=>e.addEventListener('input',()=>{st.direct[e.dataset.d]=e.value===''?1:num(e.value);run()}));
  $('sdp').addEventListener('input',e=>{const v=parseFloat(e.target.value);st.sdp=isNaN(v)?null:v/100;run()});
  $('X').addEventListener('input',e=>{st.X=e.target.value/100;run()});
  $('Y').addEventListener('input',e=>{st.Y=e.target.value/100;run()});
  $('thr').addEventListener('input',e=>{st.thr=Math.max(1,Math.min(209,num(e.target.value)));run()});
  $('q').addEventListener('input',()=>renderCons(last));
  document.querySelectorAll('button[data-f]').forEach(b=>b.addEventListener('click',()=>{filt=b.dataset.f;document.querySelectorAll('button[data-f]').forEach(x=>x.classList.toggle('on',x===b));renderCons(last)}));
  $('r23').onclick=()=>{setBase();syncAll();run()};$('share').onclick=share;
}
function sync(g){const v=+(st.pct[g]*100).toFixed(3);document.querySelector(`[data-g="${g}"]`).value=v;document.querySelector(`[data-r="${g}"]`).value=v}
function syncAll(){PARTIES.forEach(sync);DIRECT.forEach(g=>document.querySelector(`[data-d="${g}"]`).value=st.direct[g]);$('sdp').value=st.sdp==null?'':+(st.sdp*100).toFixed(3);$('X').value=Math.round(st.X*100);$('Y').value=Math.round(st.Y*100);$('thr').value=st.thr}
const seatList=res=>ORDER.concat(Object.keys(res.seats).filter(g=>ORDER.indexOf(g)<0));
function run(){
  const res=computeModel(buildData(),{pct:st.pct,sdpOverride:st.sdp,direct:st.direct,X:st.X,Y:st.Y});last=res;
  PARTIES.forEach(g=>$('m_'+g).textContent='×'+fmt(res.mult[g],2)+' respecto a 2023');
  $('sdpm').textContent='×'+fmt(res.mult.SdP,2)+' respecto a 2023';
  $('Yv').textContent=`El ${Math.round(st.Y*100)} % de los votos de Frente Amplio pasa al PSOE (PSC en Cataluña)`;
  $('Xv').textContent=`El ${Math.round(st.X*100)} % de los votos de VOX pasa al PP`;
  const s=PARTIES.reduce((a,g)=>a+st.pct[g],0);
  $('sum').className='sum'+(s>1?' bad':'');$('sum').textContent=`Suma de partidos: ${fmt(s*100,1)} %`+(s>1?' (supera el 100 %)':'');
  save();renderHero(res);renderTotals(res);renderCons(res);
}
const DN={cx:350,cy:350,ro:300,ri:228,qo:210,qi:192},NS='http://www.w3.org/2000/svg';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let cur={},cur23={},tgt={},tgt23={},raf=0,hov=null,el={},el23={},TT=[209,208],legendGs=[];
const rank=g=>{const i=ORDER.indexOf(g);return i<0?99:i};
const pt=(r,f)=>{const a=Math.PI*(1-f);return[DN.cx+r*Math.cos(a),DN.cy-r*Math.sin(a)]};
function arc(f1,f2,ro,ri){if(f2-f1<1e-4)return'';const[a,b]=pt(ro,f1),[c,d]=pt(ro,f2),[e,f]=pt(ri,f2),[g,h]=pt(ri,f1);return`M${a} ${b}A${ro} ${ro} 0 0 1 ${c} ${d}L${e} ${f}A${ri} ${ri} 0 0 0 ${g} ${h}Z`}
function mk(g){
  if(el[g])return;
  [[el23,'ring23','arc q'],[el,'ring','arc']].forEach(([map,host,cls])=>{
    const p=document.createElementNS(NS,'path');p.setAttribute('class',cls);p.style.fill=col(g);p.dataset.p=g;
    p.appendChild(document.createElementNS(NS,'title'));
    p.addEventListener('mouseenter',()=>setHov(g));p.addEventListener('mouseleave',()=>setHov(null));
    p.addEventListener('click',()=>toggleBloc(g));
    if(map===el){p.setAttribute('tabindex','0');p.setAttribute('role','button');p.addEventListener('focus',()=>setHov(g));p.addEventListener('blur',()=>setHov(null));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleBloc(g)}})}
    map[g]=p;$(host).appendChild(p);
  });
}
function draw(){
  let a=0,b=0;
  Object.keys(el).sort((x,y)=>rank(x)-rank(y)).forEach(g=>{const v=cur[g]||0,w=cur23[g]||0;
    el[g].setAttribute('d',arc(a/TT[0],(a+v)/TT[0],DN.ro,DN.ri));el23[g].setAttribute('d',arc(b/TT[1],(b+w)/TT[1],DN.qo,DN.qi));a+=v;b+=w});
}
function tick(){
  let more=false;
  Object.keys(el).forEach(g=>[[cur,tgt],[cur23,tgt23]].forEach(([c,t])=>{const d=(t[g]||0)-(c[g]||0);if(Math.abs(d)>.02){c[g]=(c[g]||0)+d*.2;more=true}else c[g]=t[g]||0}));
  draw();raf=more?requestAnimationFrame(tick):0;
}
function setHov(g){
  hov=g;
  Object.keys(el).forEach(k=>{const d=!!g&&k!==g;el[k].classList.toggle('dim',d);el23[k].classList.toggle('dim',d)});
  document.querySelectorAll('#legend button').forEach(b=>b.classList.toggle('dim',!!g&&b.dataset.p!==g));
  center();
}
function center(){
  const r=last;if(!r)return;const g=hov;
  if(!g){$('c1').textContent=r.total;$('c2').textContent='senadores electos';$('c3').textContent='Pasa el ratón por un partido'}
  else{const s=r.seats[g]||0,d=s-(r.baseSeats[g]||0);$('c1').textContent=s;$('c2').textContent=g;$('c3').textContent=`${fmt(s/r.total*100,1)} % de los escaños · ${d>0?'+':''}${d} vs 2023`}
  $('c1').style.fill=g?col(g):'#fff';
}
function toggleBloc(g){bloc.has(g)?bloc.delete(g):bloc.add(g);renderBloc(last)}
function renderHero(res){
  res.total=res.cons.reduce((a,c)=>a+c.n,0);
  const gs=seatList(res).filter(g=>res.seats[g]||res.baseSeats[g]);gs.forEach(mk);
  Object.keys(el).forEach(g=>{tgt[g]=res.seats[g]||0;tgt23[g]=res.baseSeats[g]||0;
    el[g].lastChild.textContent=`${g}: ${tgt[g]} escaños en 2026`;el23[g].lastChild.textContent=`${g}: ${tgt23[g]} escaños en 2023`;
    el[g].setAttribute('aria-label',`${g}, ${tgt[g]} escaños`)});
  TT=[res.total,Object.values(res.baseSeats).reduce((a,b)=>a+b,0)||1];
  if(reduce){cur={...tgt};cur23={...tgt23};draw()}else if(!raf)raf=requestAnimationFrame(tick);
  legendGs=gs.filter(g=>res.seats[g]).sort((a,b)=>res.seats[b]-res.seats[a]);
  const abs=Math.floor(res.total/2)+1,tq=Math.ceil(res.total*3/5),marks=[[abs,'Mayoría absoluta'],[tq,'3/5']];
  if(st.thr!==abs&&st.thr!==tq)marks.push([st.thr,'Umbral propio']);
  $('ticks').innerHTML=marks.map(([v])=>{const f=v/res.total,[x1,y1]=pt(DN.ro+6,f),[x2,y2]=pt(DN.ro+20,f),[tx,ty]=pt(DN.ro+36,f);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text x="${tx}" y="${ty+4}" text-anchor="middle">${v}</text>`}).join('');
  $('tickleg').textContent='Marcas: '+marks.map(([v,l])=>`${v} ${l.toLowerCase()}`).join(' · ');
  renderBloc(res);center();
}
function renderBloc(res){
  $('legend').innerHTML=legendGs.map(g=>`<button class="${bloc.has(g)?'on':''}" data-p="${g}" style="--c:${col(g)}" aria-pressed="${bloc.has(g)}"><i class="dot"></i><b>${res.seats[g]}</b> ${g}</button>`).join('');
  document.querySelectorAll('#legend button').forEach(b=>{const g=b.dataset.p;b.onmouseenter=b.onfocus=()=>setHov(g);b.onmouseleave=b.onblur=()=>setHov(null);b.onclick=()=>toggleBloc(g)});
  Object.keys(el).forEach(g=>el[g].classList.toggle('sel',bloc.has(g)));
  const total=res.total,sum=[...bloc].reduce((a,g)=>a+(res.seats[g]||0),0),abs=Math.floor(total/2)+1,tq=Math.ceil(total*3/5),thr=st.thr;
  const marks=[[abs,'t',abs],[tq,'b',tq]];if(thr!==abs&&thr!==tq)marks.push([thr,'t',thr]);
  $('meter').innerHTML=`<i style="width:${Math.min(100,sum/total*100)}%"></i>`+marks.map(([v,p,l])=>`<u class="${p}" style="left:${v/total*100}%"><span>${l}</span></u>`).join('');
  const ok=v=>sum>=v?`<span class="yes">✔ alcanzada</span>`:`<span class="no">✘ faltan ${v-sum}</span>`;
  $('verdict').innerHTML=`<span><b>${sum}</b> escaños${bloc.size?' · '+[...bloc].join(' + '):''}</span><span>Mayoría absoluta (${abs}): ${ok(abs)}</span><span>3/5 (${tq}): ${ok(tq)}</span>`+(thr!==abs&&thr!==tq?`<span>Umbral ${thr}: ${ok(thr)}</span>`:'');
}
const pack=()=>btoa(unescape(encodeURIComponent(JSON.stringify({p:st.pct,s:st.sdp,d:st.direct,X:st.X,Y:st.Y,t:st.thr,b:[...bloc]}))));
function unpack(){try{const h=location.hash.match(/s=([^&]+)/);if(!h)return;const o=JSON.parse(decodeURIComponent(escape(atob(h[1]))));Object.assign(st.pct,o.p);st.sdp=o.s;Object.assign(st.direct,o.d);st.X=o.X;st.Y=o.Y;st.thr=o.t;bloc=new Set(o.b)}catch(e){}}
function save(){try{history.replaceState(null,'','#s='+pack())}catch(e){}}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2000)}
function share(){save();const u=location.href;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('Enlace copiado'),()=>prompt('Copia el enlace del escenario:',u))}
function renderTotals(res){
  const gs=seatList(res).filter(g=>res.seats[g]||res.baseSeats[g]).sort((a,b)=>(res.seats[b]||0)-(res.seats[a]||0)),mx=Math.max(...gs.map(g=>res.seats[g]||0),1);
  $('tot').innerHTML=`<tr><th>Partido</th><th>2026</th><th>2023 real</th><th>Dif.</th></tr>`+gs.map(g=>{const a=res.seats[g]||0,b=res.baseSeats[g]||0,d=a-b;
   return `<tr style="--c:${col(g)}"><td><i class="dot"></i> ${g}</td><td><span class="bar" style="width:${a/mx*110}px"></span><b>${a}</b></td><td>${b}</td><td class="${d>0?'pos':d<0?'neg':''}">${d>0?'+':''}${d}</td></tr>`}).join('')+(()=>{const F=['SdP','PSOE','PSC','Frente Amplio'],a=F.reduce((x,g)=>x+(res.seats[g]||0),0),b=F.reduce((x,g)=>x+(res.baseSeats[g]||0),0),d=a-b;return `<tr><td><b>PSOE + Frente Amplio</b> <span class="note">(SdP, PSOE, PSC y Frente Amplio juntos)</span></td><td><b>${a}</b></td><td>${b}</td><td class="${d>0?'pos':d<0?'neg':''}">${d>0?'+':''}${d}</td></tr>`})();
}
function diffOf(c){if(c.name===FOR)return null;const gs=new Set([...Object.keys(c.tally),...Object.keys(c.baseTally)]);const o=[];gs.forEach(g=>{const d=(c.tally[g]||0)-(c.baseTally[g]||0);if(d)o.push([g,d])});return o}
function renderCons(res){
  const q=$('q').value.trim().toLowerCase();
  const list=res.cons.filter(c=>nm(c.name).toLowerCase().includes(q)).filter(c=>filt==='chg'?(diffOf(c)||[]).length:filt==='tight'?(c.margin!=null&&c.margin<3000):true);
  $('cons').innerHTML=list.map(c=>{
    const dots=seatList(res).filter(g=>c.tally[g]).map(g=>Array(c.tally[g]).fill(`<i style="--c:${col(g)}" title="${g}"></i>`).join('')).join('');
    const d=diffOf(c),tight=c.margin!=null&&c.margin<3000;
    const chg=d===null?'<span class="chg note">Nueva en 2026</span>':d.length?`<span class="chg tight">${d.map(([g,v])=>`${v>0?'+':'−'}${Math.abs(v)} ${g}`).join(' · ')}</span>`:'<span class="chg note">Igual que en 2023</span>';
    return `<button class="card${d&&d.length?' flip':''}" data-n="${c.name}"><h3><span>${nm(c.name)}</span><span class="note">${c.n} esc.</span></h3><div class="dots">${dots}</div>${chg}<small class="${tight?'tight':''}">Margen: ${c.margin==null?'–':fmt(c.margin)} votos</small></button>`}).join('')||'<p class="note">No hay circunscripciones con ese filtro.</p>';
  document.querySelectorAll('.card').forEach(b=>b.onclick=()=>openDlg(b.dataset.n));
}
function openDlg(n){
  const c=last.cons.find(x=>x.name===n);
  $('dbody').innerHTML=`<h2>${nm(n)}</h2><p class="sub">${c.n} ${c.n>1?'escaños':'escaño'}. Ganan los ${c.n} más votados.</p><table><tr><th>Puesto</th><th>Lista</th><th>Votos 2023</th><th>Votos 2026</th></tr>`+c.list.map(r=>`<tr class="${r.rank<=c.n?'in':'out'}${r.rank===c.n+1?' cut':''}" style="--c:${col(r.g)}"><td>${r.rank}</td><td><i class="dot"></i> ${r.g}${r.note?` <span class="note">(${r.note})</span>`:''}</td><td>${fmt(r.v)}</td><td>${fmt(r.f)}</td></tr>`).join('')+'</table>';
  $('dlg').showModal();
}
$('dlg').addEventListener('click',e=>{if(e.target===$('dlg'))$('dlg').close()});
setBase();unpack();buildInputs();syncAll();run();
