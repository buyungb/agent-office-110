import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { buildWorld, ROOMS, FLOOR, hex } from './rooms.js';
import { createPerson, POSES_DAILY, walkPose, mixPose } from './people.js';
import { buildPrayer, samplePrayer } from './prayer.js';
import { TEAM, PRODUCTS } from './team.js';
import { PRAYERS, KIND_LABELS, activityAt, planFor, simRate, wibNow, fmt, parseTime, seatPlan, seatKey } from './schedule.js';
import { sampleRoute } from './nav.js';

// All models and textures are generated locally. No backend calls; activity and PnL are sample data.
const $ = (q) => document.querySelector(q);
const scene = new THREE.Scene();
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(error){$('#loading').remove();$('#error').hidden=false;$('#errorMessage').textContent='WebGL tidak tersedia. Aktifkan akselerasi grafis di browser lalu coba lagi.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('#stage').append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,300);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.1;controls.screenSpacePanning=true;
controls.minPolarAngle=.25;controls.maxPolarAngle=1.38;
controls.minZoom=.45;controls.maxZoom=8;
controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};
controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
controls.keyPanSpeed=20;
const defaultOffset=new THREE.Vector3(58,65,76);
camera.position.copy(defaultOffset);
controls.target.set(0,0,0);
controls.update();

const world=buildWorld(scene);
const byId=world.byId;
const PRAYER=buildPrayer(4);
const MAKMUM_DELAY=1.05;
const PRAYER_MINUTES=(PRAYER.duration+MAKMUM_DELAY)/60;

// Clock: accelerated simulation (default) or real Jakarta time. ?t=HH:MM pins the simulated time; add &run to let it continue.
const params=new URLSearchParams(location.search);
const pinned=parseTime(params.get('t'));
let mode=params.get('mode')==='real'?'real':'sim';
try{if(!params.get('mode')&&localStorage.getItem('office-clock')==='real')mode='real';}catch{}
let simMinute=pinned??(7*60+24);
const frozen=pinned!==null&&!params.has('run');
function clock(){if(mode==='real'&&!frozen)return wibNow();return {minute:simMinute,weekend:false};}

// ?nav draws the corridor graph and every seat for debugging routes.
if(params.has('nav')){
  const pts=[];for(const [id,set] of world.nav.edges)for(const other of set){const a=world.nav.nodes.get(id),b=world.nav.nodes.get(other);pts.push(a[0],FLOOR+.06,a[1],b[0],FLOOR+.06,b[1]);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xff3df5})));
  for(const s of world.spots.values()){const m=new THREE.Mesh(new THREE.SphereGeometry(.08,6,4),new THREE.MeshBasicMaterial({color:0xfff23d}));m.position.set(s.x,FLOOR+.06,s.z);scene.add(m);}
}
// Each person gets a seat for every place in their timetable.
const men=TEAM.filter(p=>!p.hijab&&!p.imam),women=TEAM.filter(p=>p.hijab);
const seatsById=seatPlan();
const skins=[0xd5ab87,0xc99a72,0xe0b896,0xb8875f];
const people=TEAM.map((p,i)=>{
  const seats=seatsById.get(p.id);
  const rig=createPerson({color:p.color,hair:p.hair,hijab:p.hijab,glasses:p.glasses,skin:skins[i%4],scale:p.hijab?.95:1-(i*7%5)*.012});
  scene.add(rig.root);
  const person={...p,index:i,rig,seats,heading:0,state:null};
  rig.root.traverse(o=>{o.userData.person=person;});
  return person;
});
function spotFor(person,block){
  return world.spots.get(seatKey(person.seats,block))||world.spots.get(person.seats.desk);
}

// DOM labels track world positions and remain accessible buttons.
const tracked=[];
function label(text,x,y,z,accent,roomId,subtitle=''){const el=document.createElement('button');el.className='world-label room-label';el.style.setProperty('--accent',hex(accent??0x52e0ff));const b=document.createElement('b');b.textContent=text;el.append(b);const small=document.createElement('small');small.textContent=subtitle;small.hidden=!subtitle;el.append(small);el.addEventListener('click',()=>focusRoom(roomId));$('#labels').append(el);tracked.push({el,point:new THREE.Vector3(x,y,z),room:roomId});return el;}
const roomLabels={};
for(const r of ROOMS.slice(1))roomLabels[r.id]=label(`${r.icon} ${r.label||r.name}`,r.x,3.3,r.z-(r.d||8)/2,r.accent,r.id);
label('🅿️ PARKIR',-24.5,1,9,0x52e0ff,'all');
roomLabels.mushola.querySelector('small').hidden=false;roomLabels.mushola.querySelector('small').textContent=`Dzuhur ${fmt(PRAYERS.dzuhur.iqamah)} · Ashar ${fmt(PRAYERS.ashar.iqamah)}`;
for(const p of people){
  const el=document.createElement('button');el.className='world-label agent-label';el.style.setProperty('--agent-color',hex(p.color));el.setAttribute('aria-label',`${p.name}, ${p.role}, lihat detail`);
  el.innerHTML=`<span class="speech"></span><span class="agent-tag"><span class="name"><i class="dot"></i>${p.emoji} ${p.short}</span><span class="agent-role">${p.role}</span></span>`;
  el.addEventListener('click',()=>showPerson(p));$('#labels').append(el);
  p.label=el;p.speech=el.querySelector('.speech');p.dot=el.querySelector('.dot');
  p.entry={el,point:new THREE.Vector3(),room:p.home,agent:true};tracked.push(p.entry);
}
let selected='all',transition=null,modal=null;
for(const r of ROOMS){const b=document.createElement('button');b.className='tab';b.dataset.room=r.id;b.setAttribute('aria-pressed',r.id==='all');b.innerHTML=`<span class="ic">${r.icon}</span>${r.name}`;b.addEventListener('click',()=>focusRoom(r.id));$('#tabs').append(b);}
function baseSpan(){return innerWidth<760?86:66;}
// Canvas and labels share the stage's measured size; innerWidth/innerHeight drift on mobile (address bar, rotation).
const view={w:0,h:0};
function resize(){const rect=$('#stage').getBoundingClientRect();const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height)),aspect=w/h;if(w===view.w&&h===view.h)return;view.w=w;view.h=h;const span=baseSpan();camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);if(selected==='all')focusRoom('all',true);}
function focusRoom(id,immediate=false){const r=byId[id];if(!r)return;selected=id;document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-pressed',b.dataset.room===id));const mobile=innerWidth<760;const span=id==='all'?baseSpan():r.span*(mobile?1.65:1);const zoom=id==='all'?(mobile?.72:.92):baseSpan()/span;const target=new THREE.Vector3(r.x,id==='all'?8:2,r.z);const offset=defaultOffset.clone();const pos=target.clone().add(offset);
  transition={from:camera.position.clone(),to:pos,start:controls.target.clone(),target,zoomFrom:camera.zoom,zoomTo:zoom,time:performance.now(),duration:750};
  if(immediate){camera.position.copy(pos);controls.target.copy(target);camera.zoom=zoom;camera.updateProjectionMatrix();transition=null;controls.update();}
  $('#stage').dataset.focus=id;
}
controls.addEventListener('start',()=>{transition=null;});
$('#stage').addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,250));window.visualViewport?.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe($('#stage'));
addEventListener('keydown',e=>{if($('#agentDialog').open||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();transition=null;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);const delta=(e.key==='ArrowLeft'?right.multiplyScalar(-1):e.key==='ArrowRight'?right:e.key==='ArrowDown'?up.multiplyScalar(-1):up).multiplyScalar(1.5/camera.zoom);camera.position.add(delta);controls.target.add(delta);});
$('#zoomIn').onclick=()=>{transition=null;camera.zoom=Math.min(8,camera.zoom*1.25);camera.updateProjectionMatrix();};
$('#zoomOut').onclick=()=>{transition=null;camera.zoom=Math.max(.45,camera.zoom/1.25);camera.updateProjectionMatrix();};
$('#rotate').onclick=()=>{transition=null;const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/6);camera.position.copy(controls.target).add(offset);};
$('#reset').onclick=()=>focusRoom('all');
document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>focusRoom(b.dataset.focus));
function renderMode(){$('#mode').textContent=mode==='real'?'🕐 Jam nyata':'⏩ Simulasi';$('#mode').setAttribute('aria-pressed',mode==='real');$('#mode').title=mode==='real'?'Mengikuti jam WIB sekarang. Klik untuk simulasi dipercepat.':'Satu hari kerja dipercepat. Klik untuk jam WIB nyata.';}
$('#mode').onclick=()=>{mode=mode==='real'?'sim':'real';if(mode==='sim')simMinute=wibNow().minute;try{localStorage.setItem('office-clock',mode);}catch{}renderMode();};
renderMode();

// Where each person is and what they do right now, derived only from the clock.
const STATUS_CLASS={work:'working',meeting:'working',oncall:'working',coffee:'recent',lunch:'recent',prayer:'prayer',off:'offline'};
function stateOf(p,c){
  const {block,prev,next}=activityAt(p,c.minute,c.weekend);
  const to=spotFor(p,block),from=spotFor(p,prev);
  if(from.key!==to.key){
    const route=world.nav.route(from,to),walked=(c.minute-block.start)*(mode==='real'&&!frozen?80:8);
    if(walked<route.length)return {block,next,to,route,walked,walking:true};
  }
  return {block,next,to,walking:false};
}
const tmp=new THREE.Vector3();
function updatePerson(p,c,t){
  const s=p.state=stateOf(p,c),rig=p.rig,root=rig.root;
  let pose,visible=true,attire=false;
  if(s.walking){
    const at=sampleRoute(s.route,s.walked);root.position.set(at.x,FLOOR,at.z);
    if(at.heading!==null){let d=at.heading-p.heading;d=Math.atan2(Math.sin(d),Math.cos(d));p.heading+=d*.25;}
    root.rotation.y=p.heading;pose=walkPose(s.walked*4.8);
  }else{
    const spot=s.to;root.position.set(spot.x,FLOOR,spot.z);root.rotation.y=p.heading=spot.rot;
    visible=s.block.kind!=='off';const k=p.index;
    if(spot.pose==='pray'){
      attire=true;const pr=PRAYERS[s.block.prayer],secs=(c.minute-pr.iqamah)*60-(p.imam?0:MAKMUM_DELAY);
      pose=secs<0?POSES_DAILY.stand:samplePrayer(secs,PRAYER.steps).pose;
    }else if(spot.pose==='typing'){
      const base=POSES_DAILY.typing;const tap=Math.sin(t*13+k)*.012;
      pose={...base,turn:Math.sin(t*.35+k)*.25,wrists:[[base.wrists[0][0],base.wrists[0][1]+tap,base.wrists[0][2]],[base.wrists[1][0],base.wrists[1][1]-tap,base.wrists[1][2]]]};
    }else if(spot.pose==='sitCup'){
      const u=(t+k*1.7)%6,sip=u<1.4?Math.sin(u/1.4*Math.PI):0;pose=mixPose(POSES_DAILY.sitCup,POSES_DAILY.drink,sip);pose.turn=Math.sin(t*.5+k)*.35;
    }else if(spot.pose==='play'){
      const b=Math.abs(Math.sin(t*4+k));pose={...POSES_DAILY.play,hip:[0,.8+b*.03,.02]};
    }else{pose={...POSES_DAILY[spot.pose]||POSES_DAILY.stand,turn:Math.sin(t*.4+k)*.3};}
  }
  root.visible=visible;rig.setPrayerAttire(attire);rig.apply(pose);
  // Label text and status dot.
  const text=s.walking?`🚶 Menuju ${roomName(s.to)}`:s.block.label;
  if(p.shownText!==text){p.shownText=text;p.speech.textContent=text;}
  const cls=s.walking?'walking':STATUS_CLASS[s.block.kind];if(p.shownCls!==cls){p.shownCls=cls;p.dot.className=`dot ${cls}`;}
  p.label.classList.toggle('hidden-label',!visible);p.label.classList.toggle('quiet',!s.walking&&s.block.kind==='prayer');
  rig.head.getWorldPosition(tmp);p.entry.point.set(tmp.x,tmp.y+.5,tmp.z);p.entry.room=s.walking?null:s.to.roomId;
}
const roomName=spot=>spot.roomId==='parking'?'parkiran':byId[spot.roomId]?.name||'kantor';

// Detail dialogs for people and products.
function fillPerson(p){
  const s=p.state,c=clock();$('#modalEmoji').textContent=p.emoji;$('#modalName').textContent=p.name;$('#modalRole').textContent=p.role;
  const where=s.walking?`Perjalanan ke ${roomName(s.to)}`:s.block.kind==='off'?'Di luar kantor':roomName(s.to);
  const status=s.walking?'Berjalan':KIND_LABELS[s.block.kind];
  $('#modalDetails').innerHTML=`<dt>Status</dt><dd>${status}</dd><dt>Lokasi</dt><dd>${where}</dd><dt>Meja</dt><dd>${byId[p.home].name}</dd><dt>Berikutnya</dt><dd>${s.next?`${s.next.label} · ${fmt(s.next.start)}`:'—'}</dd><dt>Framework</dt><dd>AI Agent</dd><dt>Koneksi</dt><dd>Simulasi lokal</dd>`;
  $('#activityTitle').textContent='AKTIVITAS SEKARANG';$('#modalActivity').textContent=s.walking?`🚶 Menuju ${roomName(s.to)} untuk: ${s.block.label}`:s.block.label;
  const plan=planFor(p,c.weekend).filter(b=>b.start>0||b.kind!=='off');
  $('#modalSchedule').innerHTML=plan.map(b=>`<li class="${b===s.block?'now':''}"><time>${fmt(b.start)}</time>${b.label}</li>`).join('');$('#modalSchedule').hidden=false;
  $('#sampleNote').textContent='Jadwal dan aktivitas adalah simulasi — tidak terhubung ke sistem produksi.';
}
function fillProduct(p){
  $('#modalEmoji').textContent='💎';$('#modalName').textContent=p.name;$('#modalRole').textContent='Produk SaaS APLINDO';
  const i=PRODUCTS.indexOf(p),v=p.pnl*(1+.015*Math.sin(performance.now()/1000*.15+i*1.7));
  $('#modalDetails').innerHTML=`<dt>PnL bulan ini</dt><dd>+Rp ${v.toFixed(1).replace('.',',')} jt</dd><dt>Porsi</dt><dd>${Math.round(p.pnl/PRODUCTS.reduce((s,q)=>s+q.pnl,0)*100)}% dari total SaaS</dd><dt>Lokasi</dt><dd>Tambang SaaS</dd><dt>Situs</dt><dd>aplindo.tech</dd>`;
  $('#activityTitle').textContent='DESKRIPSI';$('#modalActivity').textContent=p.desc;$('#modalSchedule').hidden=true;
  $('#sampleNote').textContent='Angka PnL adalah data contoh, bukan laporan keuangan.';
}
function fillModal(){if(!modal)return;modal.kind==='person'?fillPerson(modal.item):fillProduct(modal.item);}
function showPerson(p){modal={kind:'person',item:p};fillModal();$('#agentDialog').showModal();}
function showProduct(p){modal={kind:'product',item:p};fillModal();$('#agentDialog').showModal();}
$('#closeDialog').onclick=()=>$('#agentDialog').close();
$('#agentDialog').addEventListener('click',e=>{if(e.target===$('#agentDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#goToAgent').onclick=()=>{$('#agentDialog').close();if(modal.kind==='product')return focusRoom('mine');const s=modal.item.state;focusRoom(s.walking||s.to.roomId==='parking'?'all':s.to.roomId);};
// Tapping a person's body or a product sign opens its detail; drags stay camera pans.
const raycaster=new THREE.Raycaster(),tapPoint=new THREE.Vector2();
let tapStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{tapStart=e.isPrimary?{x:e.clientX,y:e.clientY,t:performance.now()}:null;});
renderer.domElement.addEventListener('pointerup',e=>{const s=tapStart;tapStart=null;if(!s||!e.isPrimary||Math.hypot(e.clientX-s.x,e.clientY-s.y)>8||performance.now()-s.t>500)return;
  const r=renderer.domElement.getBoundingClientRect();tapPoint.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(tapPoint,camera);
  const targets=[...people.filter(p=>p.rig.root.visible).map(p=>p.rig.root),...world.signs];
  const hit=raycaster.intersectObjects(targets,true)[0];if(!hit)return;
  if(hit.object.userData.product)return showProduct(hit.object.userData.product);
  if(hit.object.userData.person)showPerson(hit.object.userData.person);});

// HUD: clock, active count, PnL total, prayer panel.
function daylight(m){const ramp=(a,b)=>Math.max(0,Math.min(1,(m-a)/(b-a)));return ramp(5*60+30,6*60+30)*(1-ramp(17*60+40,18*60+40));}
const rupiah=v=>`Rp ${Math.round(v)} jt`;
let lastHud=0;
function updateHud(c,t){
  $('#clock').textContent=`${fmt(c.minute)} WIB`;$('#clockSub').textContent=mode==='real'&&!frozen?(c.weekend?'Akhir pekan':'Jam nyata'):frozen?'Jam dikunci':'Simulasi';
  const working=people.filter(p=>!p.state.walking&&['work','meeting','oncall'].includes(p.state.block.kind)).length;
  $('#activeCount').textContent=`${working} / ${people.length}`;$('#pnlTotal').textContent=rupiah(world.pnlTotal(t));
  const praying=Object.values(PRAYERS).find(pr=>c.minute>=pr.start&&c.minute<pr.iqamah+18);
  $('#prayerStatus').hidden=selected!=='mushola';
  if(praying){const secs=(c.minute-praying.iqamah)*60,st=samplePrayer(Math.max(0,secs),PRAYER.steps);
    $('#prayerTitle').textContent=`🕌 Sholat ${praying.name} berjamaah`;
    $('#prayerPhase').textContent=secs<0?`Menunggu iqamah ${fmt(praying.iqamah)}`:secs>PRAYER.duration?'Selesai · dzikir':`${st.rakaat?'Rakaat '+st.rakaat+' · ':''}${st.label}`;
    $('#prayerInfo').textContent=`Imam: Buyung Bahari · ${men.length} makmum laki-laki · ${women.length} makmum perempuan`;
  }else{const next=Object.values(PRAYERS).find(pr=>c.minute<pr.start)||PRAYERS.dzuhur;$('#prayerTitle').textContent='🕌 Mushalla';$('#prayerPhase').textContent=`Sholat berikutnya: ${next.name} ${fmt(next.iqamah)}`;$('#prayerInfo').textContent='Sholat berjamaah Dzuhur & Ashar di jam kerja';}
}

const projected=new THREE.Vector3();let lastShadow=0,lastFrame=null;
function frame(now){requestAnimationFrame(frame);if(document.hidden){lastFrame=null;return;}
  const dt=lastFrame===null?0:Math.min((now-lastFrame)/1000,.1);lastFrame=now;const t=now/1000;
  if(mode==='sim'&&!frozen)simMinute=(simMinute+dt*simRate(simMinute,PRAYER_MINUTES)+1440)%1440;
  const c=clock();
  world.setDaylight(daylight(c.minute));
  for(const p of people)updatePerson(p,c,t);
  const occupied=new Set(people.filter(p=>!p.state.walking&&p.rig.root.visible).map(p=>p.state.to.key));
  for(const a of world.animators)a(t,dt,c);world.sportTick(t,occupied);
  if(now-lastHud>250){lastHud=now;updateHud(c,t);if($('#agentDialog').open)fillModal();}
  if(transition){const k0=Math.min(1,(now-transition.time)/transition.duration),k=1-Math.pow(1-k0,3);camera.position.lerpVectors(transition.from,transition.to,k);controls.target.lerpVectors(transition.start,transition.target,k);camera.zoom=THREE.MathUtils.lerp(transition.zoomFrom,transition.zoomTo,k);camera.updateProjectionMatrix();if(k0===1)transition=null;}
  controls.update();
  const overview=camera.zoom<1.8;$('#labels').classList.toggle('overview',overview);
  for(const l of tracked){projected.copy(l.point).project(camera);const x=(projected.x*.5+.5)*view.w,y=(-projected.y*.5+.5)*view.h;const outside=projected.z>1||x<-200||x>view.w+200||y<-100||y>view.h+100;l.el.hidden=outside;l.el.style.display=outside?'none':'';if(!outside){l.el.style.transform=`translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;l.el.style.zIndex=String(Math.round((1-projected.z)*1000)+(l.agent?2:0));l.el.classList.toggle('faded',selected!=='all'&&l.room!==selected);}}
  // Moving people need fresher shadows than a still office.
  const walking=people.some(p=>p.state.walking);
  if(now-lastShadow>(walking?250:1500)){renderer.shadowMap.needsUpdate=true;lastShadow=now;}renderer.render(scene,camera);
}
resize();
{const c=clock();for(const p of people)updatePerson(p,c,0);updateHud(c,0);world.setDaylight(daylight(c.minute));}
renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);$('#loading').remove();$('#stage').dataset.ready='true';requestAnimationFrame(frame);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#errorMessage').textContent='Koneksi grafis terputus. Muat ulang halaman untuk melanjutkan.';});
