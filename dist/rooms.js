import * as THREE from 'three';
import { PRODUCTS } from './team.js';
import { createNav } from './nav.js';

// World height of every room floor and corridor; people stand on it.
export const FLOOR=.315;
// Rooms in tab order. Each door: side of the wall, offset along it, and the corridor line (z) it opens onto.
export const ROOMS=[
  {id:'all',icon:'🗺️',name:'Semua',x:0,z:0,span:66},
  {id:'lobby',icon:'🏢',name:'Lobby',label:'LOBBY APLINDO',x:-1,z:7.5,w:12,d:10,span:20,accent:0x52e0ff,doors:[{side:'back',at:0,corr:1},{side:'front',at:-1}]},
  {id:'house',icon:'👔',name:'Ruang Direksi',label:'RUANG DIREKSI',x:1,z:-18,w:10,d:8,span:18,accent:0xffc861,doors:[{side:'front',at:1.6,corr:-12}]},
  {id:'trading',icon:'🧠',name:'AI Lab',label:'AI LAB · APPLIED AI',x:-13,z:-5,w:11,d:9,span:18,accent:0x8f7cff,doors:[{side:'front',at:.5,corr:1}]},
  {id:'admin',icon:'🧩',name:'Product Studio',label:'PRODUCT STUDIO · SaaS',x:-13,z:7.5,w:11,d:10,span:19,accent:0x5cf2b0,doors:[{side:'back',at:.1,corr:1}]},
  {id:'meeting',icon:'🛰️',name:'War Room',label:'WAR ROOM',x:-1,z:-5,w:12,d:9,span:19,accent:0xff6fd8,doors:[{side:'front',at:2,corr:1}]},
  {id:'medical',icon:'🛡️',name:'Compliance Lab',label:'COMPLIANCE LAB · PATUH.AI',x:8,z:-5,w:5,d:9,span:14,accent:0x8dff7a,doors:[{side:'front',at:1.5,corr:1}]},
  {id:'dc',icon:'🖥️',name:'Data Center',label:'DATA CENTER',x:10,z:-18,w:7,d:8,span:15,accent:0x3df5ff,doors:[{side:'front',at:-2,corr:-12}]},
  {id:'gym',icon:'☕',name:'Pantry',label:'PANTRY & COFFEE BAR',x:-10,z:-18,w:10,d:8,span:18,accent:0xffa04d,doors:[{side:'front',at:0,corr:-12}]},
  {id:'mushola',icon:'🕌',name:'Mushalla',label:'MUSHALLA',x:14,z:-5,w:6,d:9,span:12,accent:0xe9c46a,doors:[{side:'front',at:0,corr:1}]},
  {id:'sport',icon:'🏀',name:'Sport Hall',label:'SPORT HALL',x:19,z:8,d:11,span:28,accent:0xff8c42},
  {id:'mine',icon:'💎',name:'Tambang SaaS',label:'TAMBANG SaaS · PnL PRODUK',x:8,z:23,d:11,span:23,accent:0x4fc3f7},
  {id:'farm',icon:'🌿',name:'Taman Inovasi',label:'TAMAN INOVASI',x:-12,z:22,d:11,span:23,accent:0x7dffb2},
];
export const hex=c=>`#${c.toString(16).padStart(6,'0')}`;

export function buildWorld(scene){
  let seed=317;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const materials=new Map(),glows=new Map();
  const mat=c=>{if(c?.isMaterial)return c;if(!materials.has(c))materials.set(c,new THREE.MeshLambertMaterial({color:c}));return materials.get(c);};
  const glow=c=>{if(!glows.has(c))glows.set(c,new THREE.MeshBasicMaterial({color:c}));return glows.get(c);};
  const holo=(c,opacity=.5)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const glass=new THREE.MeshLambertMaterial({color:0xa9d8ff,transparent:true,opacity:.22,depthWrite:false});
  const unitBox=new THREE.BoxGeometry(1,1,1);
  function box(p,x,y,z,w,h,d,c,shadow=true){const m=new THREE.Mesh(unitBox,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);const lit=!m.material.isMeshBasicMaterial;m.castShadow=shadow&&lit&&!m.material.transparent;m.receiveShadow=lit;p.add(m);return m;}
  function cyl(p,x,y,z,r,h,c,sides=16){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,sides),mat(c));m.position.set(x,y,z);m.castShadow=!m.material.isMeshBasicMaterial&&!m.material.transparent;m.receiveShadow=true;p.add(m);return m;}
  function group(x=0,y=0,z=0,parent=scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function canvasTex(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(paint)redraw(t,paint);return t;}
  function redraw(t,paint){const c=t.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);paint(ctx,c.width,c.height);t.needsUpdate=true;}
  function surface(p,x,y,z,w,h,map,rot=0,extra={}){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,...extra}));m.position.set(x,y,z);m.rotation.y=rot;p.add(m);return m;}
  function sprite(p,map,w,h){const s=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}));s.scale.set(w,h,1);p.add(s);return s;}
  function text(c,str,x,y,size,color,{weight='bold',align='center',font='sans-serif'}={}){c.font=`${weight} ${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(str,x,y);}
  const animators=[];const anim=f=>animators.push(f);
  let current=null;const accent=()=>current?.accent??0x52e0ff;

  // Lights and day/night state.
  const hemi=new THREE.HemisphereLight(0xe8f2ff,0x59503f,2.1);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1db,2.15);
  sun.position.set(-25,65,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-65,right:65,top:55,bottom:-55,near:1,far:170});sun.shadow.normalBias=.045;scene.add(sun);
  const dayColor=new THREE.Color('#9fc6f0'),nightColor=new THREE.Color('#0b1324');scene.background=dayColor.clone();
  const nightOnly=[];const dayNight=[];

  // Shared screen textures.
  const codeTex=canvasTex(256,512,(c,w,h)=>{c.fillStyle='#0d1320';c.fillRect(0,0,w,h);const cols=['#7aa2ff','#5ce1b0','#c792ea','#ffcb6b','#89ddff'];for(let i=0;i<60;i++){c.fillStyle=cols[i%5];c.fillRect(10+(i*7%4)*14,6+i*8.4,30+random()*150,3.2);}});
  codeTex.wrapT=THREE.RepeatWrapping;codeTex.repeat.set(1,.45);
  anim((t,dt)=>{codeTex.offset.y=(codeTex.offset.y-dt*.035+1)%1;});
  const dashTex=canvasTex(256,150,(c,w,h)=>{c.fillStyle='#0f1726';c.fillRect(0,0,w,h);c.fillStyle='#1d2940';c.fillRect(8,8,w-16,26);text(c,'APLINDO · DASHBOARD',16,21,12,'#8fb4ff',{align:'left'});const cols=['#4fc3f7','#81c784','#ffb74d','#ba68c8'];for(let i=0;i<8;i++){c.fillStyle=cols[i%4];const bh=20+random()*70;c.fillRect(16+i*29,h-12-bh,18,bh);}});
  const gridTex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#2a313c';c.fillRect(0,0,w,h);c.strokeStyle='#36404e';c.lineWidth=3;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(i*64,0);c.lineTo(i*64,h);c.stroke();c.beginPath();c.moveTo(0,i*64);c.lineTo(w,i*64);c.stroke();}c.fillStyle='#4b5a70';for(let x=0;x<=4;x++)for(let y=0;y<=4;y++)c.fillRect(x*64-3,y*64-3,6,6);});
  gridTex.wrapS=gridTex.wrapT=THREE.RepeatWrapping;gridTex.repeat.set(3,3);
  const wood=canvasTex(512,512,(c,w,h)=>{c.fillStyle='#8a6a48';c.fillRect(0,0,w,h);for(let y=0;y<16;y++)for(let x=-1;x<5;x++){c.fillStyle=`hsl(30,${28+random()*8}%,${38+random()*9}%)`;c.fillRect(x*128+(y%2)*64+1,y*32+1,126,30);}});
  wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(3,3);

  // Terrain, grass clumps and trees around the campus.
  const grass=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#5f8a3c';c.fillRect(0,0,w,h);for(let i=0;i<18000;i++){c.fillStyle=random()>.5?'#80a24f':'#4f7633';c.globalAlpha=.45;c.fillRect(random()*w,random()*h,1+random()*2,1+random()*2);}c.globalAlpha=1;});
  grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(28,24);
  const terrain=group();
  box(terrain,0,-.5,0,90,1,74,0x5c4630);box(terrain,0,.02,0,90,.12,74,new THREE.MeshLambertMaterial({map:grass}),false);
  const clumps=[];
  for(let i=0;i<1750;i++){const x=(random()-.5)*88,z=(random()-.5)*72;if(x>-30&&x<34&&z>-25&&z<31)continue;clumps.push({x,z,s:.25+random()*.48});}
  for(const [color,h,offset] of [[0x6b4d31,.32,.2],[0x6a9046,.16,.44]]){const mesh=new THREE.InstancedMesh(unitBox,mat(color),clumps.length),dummy=new THREE.Object3D();clumps.forEach((p,i)=>{dummy.position.set(p.x,offset,p.z);dummy.scale.set(p.s,h,p.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.receiveShadow=true;terrain.add(mesh);}
  function tree(p,x,z,s=1){const g=group(x,0,z,p);box(g,0,.95*s,0,.4*s,1.9*s,.4*s,0x695034);box(g,0,2*s,0,1.65*s,1.1*s,1.55*s,0x3d702f);box(g,.12*s,2.65*s,-.08*s,1.2*s,.7*s,1.2*s,0x4b8138);box(g,-.55*s,1.9*s,.25*s,.9*s,.8*s,1.05*s,0x477b34);return g;}
  for(let i=0;i<65;i++){const x=(random()-.5)*84,z=(random()-.5)*69;if(x>-30&&x<34&&z>-26&&z<31)continue;tree(scene,x,z,.65+random()*.55);}
  for(const p of [[-21,12.5],[-27,-15],[-23,25],[-2,31],[18,25],[33,15],[16,-21],[-17,-21]])tree(scene,...p,.8);

  // Furniture primitives. Heights are real-world metres: seat 0.42, desk 0.72.
  function plant(p,x,z,s=1){cyl(p,x,.22*s,z,.2*s,.44*s,0x2d3440,8);box(p,x,.45*s,z,.42*s,.02,.42*s,glow(accent()),false);const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(.42*s,0),mat(0x3f9a5a));leaves.position.set(x,.82*s,z);leaves.castShadow=true;p.add(leaves);}
  function chair(p,x,z,rot,color=0x2b3340,tall=false){const g=group(x,0,z,p);g.rotation.y=rot;box(g,0,.39,0,.5,.07,.48,color);box(g,0,tall?.85:.72,-.23,.48,tall?.82:.56,.06,color);box(g,0,tall?.85:.72,-.265,.3,.02,.01,glow(accent()),false);cyl(g,0,.2,0,.045,.34,0x1d2129,8);box(g,0,.03,0,.55,.05,.07,0x1d2129);box(g,0,.03,0,.07,.05,.55,0x1d2129);return g;}
  function sofa(p,x,z,rot=0,color=0x3d4f8f){const g=group(x,0,z,p);g.rotation.y=rot;box(g,0,.21,0,2.1,.42,.62,color);box(g,0,.62,-.27,2.1,.5,.14,color);for(const k of [-1,1])box(g,k*1.02,.36,0,.14,.32,.64,color);box(g,0,.02,0,2.1,.03,.64,glow(accent()),false);return g;}
  function coffeeTable(p,x,z,w=1.2){box(p,x,.4,z,w,.05,.6,0x1f2530);box(p,x,.38,z,w-.06,.02,.56,glow(accent()),false);box(p,x,.19,z,.1,.38,.1,0x1f2530);cyl(p,x+.25,.46,z,.05,.08,0xffffff,8);}
  function monitor(p,x,y,z,w=.6,tex=codeTex){const h=w*.58;box(p,x,y+.1+h/2,z,w,h,.03,0x12161c);surface(p,x,y+.1+h/2,z+.017,w-.04,h-.04,tex);box(p,x,y+.05,z-.03,.04,.1,.04,0x2a3038);box(p,x,y+.006,z-.03,.2,.012,.14,0x2a3038);}
  function rug(p,x,z,w,d,color=0x1c2232,edge=accent()){box(p,x,.005,z,w+.1,.01,d+.1,glow(edge),false);box(p,x,.012,z,w,.012,d,color,false);}
  const seatList=[];
  function seat(p,key,x,z,rot,pose,via=[]){const o=new THREE.Object3D();o.position.set(x,0,z);o.rotation.y=rot;p.add(o);seatList.push({key,o,pose,room:current,via});return o;}
  // Person sits 0.85 m in front of the desk centre facing it; chair is 0.12 m behind the hips.
  function desk(p,x,z,rot,{keys=[null],w,pose='typing',via=()=>[],exec=false,screens=null}={}){
    const n=keys.length;w=w??(n>1?2:1.4);
    const g=group(x,0,z,p);g.rotation.y=rot;
    box(g,0,.7,0,w,.04,.8,exec?0x3a2a20:0xe3e7ec);box(g,0,.695,.405,w,.03,.012,glow(accent()),false);
    for(const s of [-1,1])box(g,s*(w/2-.04),.34,0,.04,.68,.74,exec?0x2a201a:0x8f99a5);
    if(exec)box(g,0,.43,-.36,w-.1,.5,.03,0x2a201a);
    const xs=n>1?[-.5,.5]:[0];
    xs.forEach((sx,i)=>{
      monitor(g,sx,.72,-.22,.6,screens?.[i]??(i%2?dashTex:codeTex));box(g,sx,.73,.1,.42,.018,.14,0x2a2f37);box(g,sx+.3,.73,.14,.06,.02,.1,0x2a2f37);
      if(keys[i]===undefined)return;
      chair(g,sx,.73,Math.PI,exec?0x1d1f24:0x2b3340,exec);
      if(keys[i]){const lx=x+sx*Math.cos(rot)+.85*Math.sin(rot),lz=z-sx*Math.sin(rot)+.85*Math.cos(rot);seat(g,keys[i],sx,.85,Math.PI,pose,via(lx,lz));}
    });
    return g;
  }
  function screen(p,x,y,z,w,h,map,rot=0){const g=group(x,y,z,p);g.rotation.y=rot;box(g,0,0,-.03,w+.08,h+.08,.05,0x10141a);box(g,0,-h/2-.04,-.005,w+.08,.02,.02,glow(accent()),false);surface(g,0,0,0,w,h,map);return g;}

  // Room shell: dark floor, tall back/left walls with neon trim, low glass on the camera side, door gaps.
  const navRooms={};const nav=createNav();const corridors={};
  const shells={};
  function room(r){
    current=r;const g=group(r.x,.16,r.z);
    const floorMat=['gym','house'].includes(r.id)?new THREE.MeshLambertMaterial({map:wood}):r.id==='mushola'?mat(0x2f6b4a):new THREE.MeshLambertMaterial({map:gridTex,color:new THREE.Color(0xffffff).lerp(new THREE.Color(r.accent),.12)});
    box(g,0,-.06,0,r.w,.3,r.d,0x22272f);box(g,0,.11,0,r.w-.15,.09,r.d-.15,floorMat);
    const c=group(0,.155,0,g),W=r.w/2,D=r.d/2,dw=1.3,solid=0x353c48,trim=glow(r.accent);
    const gapOf=side=>r.doors.find(d=>d.side===side)?.at;
    const segs=(len,gap)=>gap==null?[[-len/2,len/2]]:[[-len/2,gap-dw/2],[gap+dw/2,len/2]];
    for(const [a,b] of segs(r.w,gapOf('back'))){if(b-a<.05)continue;box(c,(a+b)/2,1.3,-D,b-a,2.6,.17,solid);box(c,(a+b)/2,2.6,-D+.1,b-a,.04,.04,trim,false);}
    if(gapOf('back')!=null){const x=gapOf('back');box(c,x,2.4,-D,dw,.4,.17,solid);box(c,x,2.18,-D+.1,dw,.04,.04,trim,false);for(const s of [-1,1])box(c,x+s*dw/2,1.1,-D+.1,.04,2.2,.04,trim,false);}
    box(c,-W,1.3,0,.17,2.6,r.d,solid);box(c,-W+.1,2.6,0,.04,.04,r.d,trim,false);
    box(c,W,.46,0,.06,.92,r.d,glass,false);box(c,W,.02,0,.08,.04,r.d,trim,false);box(c,W,.93,0,.08,.03,r.d,trim,false);
    for(const [a,b] of segs(r.w,gapOf('front'))){if(b-a<.05)continue;box(c,(a+b)/2,.33,D,b-a,.66,.06,glass,false);box(c,(a+b)/2,.02,D,b-a,.04,.08,trim,false);box(c,(a+b)/2,.67,D,b-a,.03,.08,trim,false);}
    // Vertical light strips on the back wall.
    for(let x=-W+1.2;x<W-.6;x+=2.6)if(gapOf('back')==null||Math.abs(x-gapOf('back'))>1.2)box(c,x,1.35,-D+.095,.05,1.7,.02,holo(r.accent,.55),false);
    const door=r.doors.find(d=>d.corr!=null);
    if(door){const front=door.side==='front',wx=r.x+door.at,wz=r.z+(front?D:-D);navRooms[r.id]={id:r.id,doorIn:[wx,wz+(front?-.8:.8)],doorOut:nav.node(`${r.id}:out`,wx,door.corr)};(corridors[door.corr]??=[]).push(`${r.id}:out`);}
    shells[r.id]=c;return c;
  }
  const byId=Object.fromEntries(ROOMS.map(r=>[r.id,r]));
  for(const r of ROOMS)if(r.w)room(r);
  const on=id=>{current=byId[id];return shells[id];};

  // Ruang Direksi: three executive desks facing the door, globe hologram, Jakarta skyline wall.
  {const c=on('house');
    const via={'house:0':[[1.6,-1.85]],'house:2':[[1.6,-1.85]],'house:1':[[1.6,.5],[-1.6,.5],[-1.6,-1.85]]};
    [['house:1',-3.2,'COO · Muhammad'],['house:0',0,'CEO · Buyung Bahari'],['house:2',3.2,'CTO · Anggit']].forEach(([key,x,title])=>{
      desk(c,x,-1,Math.PI,{keys:[key],w:1.8,exec:true,via:()=>via[key]});
      const plate=canvasTex(256,48,(g,w,h)=>{g.fillStyle='#120e0a';g.fillRect(0,0,w,h);g.strokeStyle='#ffc861';g.lineWidth=3;g.strokeRect(2,2,w-4,h-4);text(g,title,w/2,h/2+1,19,'#ffe3a3');});
      surface(c,x,.52,-.59,1.1,.2,plate);
    });
    const skyDay=canvasTex(512,160,(g,w,h)=>{const grd=g.createLinearGradient(0,0,0,h);grd.addColorStop(0,'#7fb6ec');grd.addColorStop(1,'#d7ecff');g.fillStyle=grd;g.fillRect(0,0,w,h);for(let i=0;i<26;i++){const bw=12+random()*22,bh=30+random()*110;g.fillStyle=`hsl(215,18%,${38+random()*18}%)`;g.fillRect(i*20,h-bh,bw,bh);}g.fillStyle='#e9eef3';g.fillRect(238,30,16,130);g.beginPath();g.moveTo(232,30);g.lineTo(246,8);g.lineTo(260,30);g.fill();});
    const skyNight=canvasTex(512,160,(g,w,h)=>{g.fillStyle='#0a1222';g.fillRect(0,0,w,h);for(let i=0;i<26;i++){const bw=12+random()*22,bh=30+random()*110,x=i*20;g.fillStyle='#16203a';g.fillRect(x,h-bh,bw,bh);g.fillStyle='#ffd77a';for(let y=h-bh+6;y<h-4;y+=9)for(let xx=x+3;xx<x+bw-3;xx+=6)if(random()>.55)g.fillRect(xx,y,3,4);}g.fillStyle='#ffe9a8';g.fillRect(238,30,16,130);});
    const sky=screen(c,0,1.65,-3.88,5,1.4,skyDay);const skyMesh=sky.children[2];
    dayNight.push(f=>{skyMesh.material.map=f>.45?skyDay:skyNight;});
    cyl(c,-3.3,.35,2.3,.35,.7,0x1c2028);const gl=group(-3.3,1.45,2.3,c);
    const globe=new THREE.Mesh(new THREE.SphereGeometry(.55,18,12),new THREE.MeshBasicMaterial({color:0xffd27a,wireframe:true,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));gl.add(globe);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.015,6,48),holo(0xffc861,.7));ring.rotation.x=Math.PI/2;gl.add(ring);
    const beam=cyl(c,-3.3,1.05,2.3,.32,.7,holo(0xffc861,.12));
    anim(t=>{globe.rotation.y=t*.4;ring.rotation.z=t*.6;gl.position.y=1.45+Math.sin(t*1.3)*.04;beam.material.opacity=.1+Math.sin(t*2)*.04;});
    sofa(c,2.9,2.6,Math.PI,0x5a4a3a);coffeeTable(c,2.9,1.6);plant(c,4.4,3.4);plant(c,-4.4,-3.4);
    const logo=canvasTex(512,96,(g,w,h)=>{text(g,'APLINDO',w/2,h/2,64,'#ffd27a',{font:'Georgia'});});
    surface(c,-4.89,1.75,0,2.6,.5,logo,Math.PI/2,{transparent:true});
  }
  // AI Lab: rotating neural hologram, scrolling code walls, two double desks.
  {const c=on('trading');rug(c,-3,.3,3.8,6.6);
    desk(c,-3,-2.2,0,{keys:['ailab:0','ailab:1'],via:(x,z)=>[[-1.4,z]]});desk(c,-3,1.2,0,{keys:['ailab:2','ailab:3'],via:(x,z)=>[[-1.4,z]]});
    cyl(c,2.6,.25,-1,.7,.5,0x1b2030,24);const ringBase=new THREE.Mesh(new THREE.TorusGeometry(.66,.03,6,48),glow(0x8f7cff));ringBase.rotation.x=Math.PI/2;ringBase.position.set(2.6,.51,-1);c.add(ringBase);
    const brain=group(2.6,1.6,-1,c);
    const outer=new THREE.Mesh(new THREE.IcosahedronGeometry(.75,1),new THREE.MeshBasicMaterial({color:0xa79bff,wireframe:true,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false}));brain.add(outer);
    const inner=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,0),holo(0x6fe3ff,.55));brain.add(inner);
    const beam=cyl(c,2.6,1.05,-1,.45,1.1,holo(0x8f7cff,.1),24);
    const motes=[];for(let i=0;i<24;i++){const m=box(brain,0,0,0,.05,.05,.05,glow(i%2?0x6fe3ff:0xc6bcff),false);m.userData={r:.95+random()*.35,s:.6+random()*.8,a:random()*6.3,tilt:(random()-.5)*1.4};motes.push(m);}
    anim((t,dt)=>{outer.rotation.y+=dt*.45;outer.rotation.x=Math.sin(t*.3)*.3;inner.scale.setScalar(1+Math.sin(t*2.4)*.12);inner.rotation.y-=dt;beam.material.opacity=.08+Math.sin(t*1.7)*.04;
      for(const m of motes){const u=m.userData,a=u.a+t*u.s;m.position.set(Math.cos(a)*u.r,Math.sin(a*1.3)*u.tilt*.4,Math.sin(a)*u.r);}});
    screen(c,-2.6,1.6,-4.37,3.4,1.4,codeTex);
    const evalTex=canvasTex(320,160);let evalStep=-1;
    anim(t=>{const s=Math.floor(t/1.6);if(s===evalStep)return;evalStep=s;redraw(evalTex,(g,w,h)=>{g.fillStyle='#0d1222';g.fillRect(0,0,w,h);text(g,'EVAL · RAG AGENT',14,18,15,'#c6bcff',{align:'left'});const names=['akurasi','grounding','latensi','biaya'];names.forEach((n,i)=>{const v=.62+.3*Math.abs(Math.sin(s*.7+i));g.fillStyle='#232b45';g.fillRect(100,40+i*28,200,16);g.fillStyle=['#7aa2ff','#5ce1b0','#ffcb6b','#ff7ab6'][i];g.fillRect(100,40+i*28,200*v,16);text(g,n,14,48+i*28,13,'#d6dcf5',{align:'left',weight:'normal'});text(g,`${Math.round(v*100)}%`,292,48+i*28,12,'#0d1222',{align:'right'});});});});
    screen(c,2.4,1.75,-4.37,2.4,1.2,evalTex);plant(c,4.9,3.9);plant(c,-5,3.9);
  }
  // Product Studio: four double desks, product carousel and a kanban board with a sliding card.
  {const c=on('admin');rug(c,.1,.4,9.4,7.6,0x18222a);
    let k=0;for(const z of [-2,2])for(const x of [-2.3,2.5]){desk(c,x,z,0,{keys:[`studio:${k}`,`studio:${k+1}`],via:(sx,sz)=>[[.1,sz]]});k+=2;}
    const carousel=canvasTex(512,240);let shown=-1;
    anim(t=>{const i=Math.floor(t/3.5)%PRODUCTS.length;if(i===shown)return;shown=i;const p=PRODUCTS[i];redraw(carousel,(g,w,h)=>{g.fillStyle='#0b1318';g.fillRect(0,0,w,h);g.fillStyle=p.color;g.fillRect(0,0,10,h);text(g,'PRODUK SaaS APLINDO',34,30,18,'#7fe8c4',{align:'left'});text(g,p.name,34,92,52,p.color,{align:'left'});g.font='20px sans-serif';g.fillStyle='#d9e6ee';g.textAlign='left';const words=p.desc.split(' ');let line='',y=150;for(const wd of words){if(g.measureText(line+wd).width>440){g.fillText(line,34,y);line='';y+=28;}line+=wd+' ';}g.fillText(line,34,y);for(let d=0;d<PRODUCTS.length;d++){g.fillStyle=d===i?p.color:'#33424b';g.beginPath();g.arc(w-30-d*20,h-22,6,0,7);g.fill();}});});
    screen(c,-3,1.6,-4.87,3.2,1.5,carousel);
    const kanban=canvasTex(480,220,(g,w,h)=>{g.fillStyle='#0e1a1a';g.fillRect(0,0,w,h);['BACKLOG','BUILD','SHIP'].forEach((n,i)=>{g.fillStyle='#16302b';g.fillRect(12+i*156,40,144,170);text(g,n,84+i*156,24,17,'#7fe8c4');for(let j=0;j<3-i%2;j++){g.fillStyle=['#2f6f5c','#3d5a80','#6d597a'][j];g.fillRect(24+i*156,56+j*48,120,38);}});});
    const kb=screen(c,3.1,1.6,-4.87,3,1.4,kanban);
    const card=box(kb,0,0,.01,.6,.2,.01,glow(0x5cf2b0),false);
    anim(t=>{const u=(t/7)%1,col=Math.min(2,Math.floor(u*3));card.position.set(-.97+(u*3)*.97,-.38+Math.sin(u*Math.PI*3)*.04,.012);card.material=glow(col===2?0x5cf2b0:0xffcb6b);});
    plant(c,-5,4.4);plant(c,5,4.4);
  }
  // War Room: holographic oval table with orbiting product tiles; eight chairs.
  {const c=on('meeting');rug(c,0,-.3,8.6,5.6,0x1d1626);
    const cz=-.3,rx=2,rz=1.25;
    const top=cyl(c,0,.7,cz,1,.04,0x161b26,48);top.scale.set(rx,1,rz);cyl(c,0,.35,cz,.35,.68,0x252b36);
    const edge=new THREE.Mesh(new THREE.TorusGeometry(1,.02,6,64),glow(0xff6fd8));edge.rotation.x=Math.PI/2;edge.scale.set(rx,rz,1);edge.position.set(0,.72,cz);c.add(edge);
    const disk=new THREE.Mesh(new THREE.CircleGeometry(1,48),holo(0xff6fd8,.25));disk.rotation.x=-Math.PI/2;disk.scale.set(rx*.8,rz*.8,1);disk.position.set(0,.725,cz);c.add(disk);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.02,6,48),holo(0xffa6ec,.8));ring.rotation.x=Math.PI/2;ring.position.set(0,1.25,cz);c.add(ring);
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),holo(0xffd1f4,.7));core.position.set(0,1.25,cz);c.add(core);
    const tiles=PRODUCTS.map(p=>{const tex=canvasTex(256,96,(g,w,h)=>{g.fillStyle='rgba(20,10,30,.85)';g.fillRect(0,0,w,h);g.strokeStyle=p.color;g.lineWidth=4;g.strokeRect(3,3,w-6,h-6);text(g,p.name,w/2,h/2,30,p.color);});return sprite(c,tex,.9,.34);});
    anim(t=>{ring.rotation.z=t*.5;core.rotation.y=t*1.2;core.position.y=1.25+Math.sin(t*1.8)*.05;disk.material.opacity=.2+Math.sin(t*1.4)*.06;tiles.forEach((s,i)=>{const a=t*.3+i*Math.PI/3;s.position.set(Math.sin(a)*1.25,1.5+Math.sin(t*1.5+i)*.06,cz+Math.cos(a)*.8);});});
    for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,x=Math.sin(a)*(rx+.5),z=cz+Math.cos(a)*(rz+.48),rot=Math.atan2(-x,cz-z);
      chair(c,x+Math.sin(rot)*.12,z+Math.cos(rot)*.12,rot);
      const via=x<0?[[-3.1,2.4],[-3.1,z]]:z<cz?[[3.1,2.4],[3.1,z]]:[];
      seat(c,`war:${i}`,x,z,rot,'typing',via);}
    const pipeline=canvasTex(512,220);let pStep=-1;
    anim(t=>{const s=Math.floor(t/2.5);if(s===pStep)return;pStep=s;redraw(pipeline,(g,w,h)=>{g.fillStyle='#140c1c';g.fillRect(0,0,w,h);text(g,'PIPELINE KLIEN · CONTOH',20,26,20,'#ffa6ec',{align:'left'});['Lead','Demo','Proposal','Kontrak'].forEach((n,i)=>{const v=.35+.6*Math.abs(Math.sin(s*.4+i*.9));g.fillStyle='#2a1d36';g.fillRect(130,56+i*40,360,26);g.fillStyle=['#ff6fd8','#c792ea','#7aa2ff','#5ce1b0'][i];g.fillRect(130,56+i*40,360*v,26);text(g,n,20,69+i*40,17,'#f3e6f7',{align:'left',weight:'normal'});});});});
    screen(c,0,1.65,-4.37,4.4,1.6,pipeline);plant(c,5.4,-3.9);plant(c,-5.4,-3.9);
  }
  // Compliance Lab: ISO shield hologram, document scanner beam, audit checklist lighting up.
  {const c=on('medical');
    desk(c,-.6,-1.6,0,{keys:['compliance:0'],via:(x,z)=>[[1.5,z]]});
    const shieldTex=canvasTex(256,300,(g,w,h)=>{g.strokeStyle='#8dff7a';g.lineWidth=10;g.fillStyle='rgba(60,160,60,.25)';g.beginPath();g.moveTo(w/2,14);g.lineTo(w-24,58);g.quadraticCurveTo(w-28,220,w/2,h-14);g.quadraticCurveTo(28,220,24,58);g.closePath();g.fill();g.stroke();text(g,'ISO',w/2,120,52,'#d6ffd0');text(g,'27001',w/2,180,44,'#d6ffd0');});
    cyl(c,.9,.15,-3.4,.45,.3,0x1b2229,20);
    const shield=surface(c,.9,1.45,-3.4,1,1.18,shieldTex,0,{transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    anim(t=>{shield.rotation.y=.65+Math.sin(t*.6)*.35;shield.position.y=1.45+Math.sin(t*1.2)*.06;});
    box(c,-1,.36,2.3,1.2,.72,.8,0x2a313b);for(let i=0;i<5;i++)box(c,-1.25+i*.12,.76+i*.012,2.3,.36,.012,.5,0xf0f3f5);
    const beam=box(c,-1,.95,2.3,1.25,.4,.015,holo(0x8dff7a,.45),false);
    anim(t=>{beam.position.z=2.3+Math.sin(t*1.3)*.36;});
    const checks=[];const checkTex=canvasTex(512,64,(g,w,h)=>{text(g,'AUDIT · ISO 27001 · UU PDP · SOC 2',w/2,h/2,26,'#bfffb5');});
    surface(c,-2.4,2.25,.8,2.4,.3,checkTex,Math.PI/2,{transparent:true});
    for(let i=0;i<5;i++){checks.push(box(c,-2.4,1.9-i*.3,-.2+i*.5,.02,.22,.36,glow(0x23402a),false));}
    anim(t=>{const n=Math.floor(t/.9)%7;checks.forEach((m,i)=>{m.material=glow(i<n?0x7dff6a:0x23402a);});});
    plant(c,1.9,3.9);
  }
  // Data Center: racks with blinking LEDs, pulsing cold aisle, data packets on the cable tray, Bima's NOC desk.
  {const c=on('dc');
    const leds=[];const ledOn=[glow(0x4cff9a),glow(0x4cc8ff),glow(0xffd34c)],ledOff=glow(0x14303a);
    for(const z of [-2.7,-.5])for(const x of [-2.2,-.9,.4,1.7]){box(c,x,1.1,z,1.05,2.2,.8,0x161b22);
      const face=z<-1.6?.41:-.41;box(c,x,2.18,z+face,1.05,.04,.02,glow(0x3df5ff),false);for(let y=.25;y<2.05;y+=.24){box(c,x,y,z+face,.95,.17,.02,0x283340,false);for(const dx of [-.38,-.28])leds.push(box(c,x+dx,y,z+face*1.03,.045,.045,.02,ledOn[leds.length%3],false));}}
    anim(()=>{for(let i=0;i<7;i++){const m=leds[Math.floor(random()*leds.length)];m.material=random()>.35?ledOn[Math.floor(random()*3)]:ledOff;}});
    const aisle=box(c,-.25,.02,-1.6,5.2,.01,.9,holo(0x3df5ff,.35),false);
    box(c,-.25,2.5,-1.6,5.4,.05,.3,0x2a313b);const packets=[];for(let i=0;i<6;i++)packets.push(box(c,0,2.56,-1.6,.12,.06,.12,glow(i%2?0x3df5ff:0x8dff7a),false));
    anim(t=>{aisle.material.opacity=.22+Math.sin(t*2.2)*.12;packets.forEach((m,i)=>{m.position.x=-2.85+((t*1.4+i*.87)%5.2);});});
    desk(c,1.2,1.9,0,{keys:['dc:0'],w:1.6,via:()=>[]});
    const status=canvasTex(320,200);let st=-1;
    anim(t=>{const s=Math.floor(t/2);if(s===st)return;st=s;redraw(status,(g,w,h)=>{g.fillStyle='#071419';g.fillRect(0,0,w,h);text(g,'UPTIME 30 HARI',w/2,30,20,'#7ff3ff');text(g,'99.98%',w/2,82,54,'#3df5ff');g.strokeStyle='#3df5ff';g.lineWidth=2;g.beginPath();for(let x=0;x<w-30;x+=8){const y=160-Math.abs(Math.sin((x+s*40)*.05))*28-random()*6;x?g.lineTo(15+x,y):g.moveTo(15,y);}g.stroke();text(g,'contoh · simulasi',w/2,185,12,'#4f8a96',{weight:'normal'});});});
    screen(c,-3.39,1.6,1.6,2.2,1.3,status,Math.PI/2);
  }
  // Pantry & Coffee Bar: coffee machine with steam, robot barista arm, neon sign, three tables of four.
  {const c=on('gym');
    box(c,0,.5,-3.3,7.2,1,.7,0x23272e);box(c,0,1.01,-3.3,7.3,.03,.76,0x3a3f48);box(c,0,.98,-2.94,7.2,.03,.02,glow(0xffa04d),false);
    box(c,-2.2,1.37,-3.4,.65,.7,.45,0x1a1d22);box(c,-2.2,1.48,-3.17,.4,.2,.01,glow(0xffa04d),false);cyl(c,-2.2,1.08,-3.15,.05,.08,0xffffff,8);
    const puffTex=canvasTex(64,64,(g,w,h)=>{const grd=g.createRadialGradient(32,32,2,32,32,30);grd.addColorStop(0,'rgba(255,255,255,.9)');grd.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grd;g.fillRect(0,0,w,h);});
    const puffs=[0,1,2,3,4].map(()=>sprite(c,puffTex,.25,.25));
    anim(t=>{puffs.forEach((s,i)=>{const u=(t*.45+i/5)%1;s.position.set(-2.2+Math.sin(u*6+i)*.05,1.75+u*.75,-3.2);s.material.opacity=(1-u)*.55;s.scale.setScalar(.18+u*.3);});});
    const arm=group(1.4,1.02,-3.3,c);cyl(arm,0,.08,0,.16,.16,0x9aa3ae);const yaw=group(0,.16,0,arm);box(yaw,0,.25,0,.09,.5,.09,0xd8dde3);const elbow=group(0,.5,0,yaw);box(elbow,0,0,.2,.07,.07,.4,0xd8dde3);const grip=box(elbow,0,-.05,.42,.1,.1,.06,glow(0xffa04d),false);
    anim(t=>{yaw.rotation.y=Math.sin(t*.7)*1.1;elbow.rotation.x=.35+Math.sin(t*1.4)*.25;grip.material=glow(Math.sin(t*3)>0?0xffa04d:0xffd8a8);});
    for(let i=0;i<6;i++)cyl(c,.2+i*.18,1.07,-3.4,.04,.08,0xf4efe6,8);
    const neon=canvasTex(512,128,(g,w,h)=>{g.shadowColor='#ff9d3d';g.shadowBlur=18;text(g,'☕ NGOPI DULU',w/2,h/2,60,'#ffb766');});
    const sign=surface(c,0,2.05,-3.89,3,.75,neon,0,{transparent:true});
    anim(t=>{sign.material.opacity=Math.sin(t*17)>.97?.55:1;});
    let k=0;
    for(const tx of [-3,0,3]){const tz=.2;box(c,tx,.7,tz,.9,.04,.9,0x2b2f37);box(c,tx,.69,tz,.92,.02,.92,glow(0xffa04d),false);cyl(c,tx,.35,tz,.05,.68,0x1d2129,8);
      const aisle=tx<0?-1.5:1.5;
      for(const [dx,dz] of [[0,.9],[0,-.9],[-.9,0],[.9,0]]){const x=tx+dx,z=tz+dz,rot=Math.atan2(-dx,-dz);
        chair(c,x+Math.sin(rot)*.12,z+Math.cos(rot)*.12,rot,0x3b3230);
        const side=x+Math.sign(dx)*.6;const via=dz>0?[]:dz<0?[[aisle,2],[aisle,-1.4]]:[[side,2],[side,z]];
        seat(c,`pantry:${k++}`,x,z,rot,'sitCup',via);}}
    box(c,4.4,1,-1.8,.7,2,.7,0xd9dde2);box(c,4.04,1.2,-1.8,.01,1.2,.5,glow(0xffa04d),false);plant(c,-4.4,3.4);
  }
  // Mushalla: imam faces the mihrab; men's row behind him, women's row at the back.
  // Rows are 1.4 m apart so sujud never overlaps the row in front; each row fills from the centre outwards.
  const centreOut=xs=>[...xs].sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
  const menXs=centreOut([-2.4,-1.6,-.8,0,.8,1.6,2.4]),womenXs=centreOut([-2.25,-1.35,-.45,.45,1.35,2.25]);
  {const c=on('mushola');rug(c,0,-.3,5.6,7.6,0x2f7a4c,0xc9a95c);
    const rows=(prefix,xs,zs)=>zs.flatMap((z,r)=>xs.map((x,i)=>[`mushola:${prefix}${r*xs.length+i}`,x,z]));
    const mats=[['mushola:imam',0,-3],...rows('m',menXs,[-1.6,-.2]),...rows('w',womenXs,[1.2,2.6])];
    for(const [key,x,z] of mats){box(c,x,.03,z-.47,.72,.02,1.45,key.includes('w')?0x6b3f5f:0x1f5f43,false);box(c,x,.042,z-1.1,.5,.01,.04,glow(0xe9c46a),false);seat(c,key,x,z,Math.PI,'pray');}
    box(c,0,1.3,-4.34,1.45,2.1,.12,0xc9b475);box(c,0,1.28,-4.27,1.1,1.8,.08,0x417758);
    const niche=box(c,0,1.28,-4.22,.9,1.6,.01,holo(0xffe2a0,.25),false);
    const lamps=[-2,2].map(x=>box(c,x,2.1,-4.3,.25,.35,.06,holo(0xffd88a,.6),false));
    anim(t=>{const b=.5+Math.sin(t*.6)*.5;niche.material.opacity=.18+b*.12;lamps.forEach(l=>l.material.opacity=.45+b*.25);});
    box(c,2.4,.25,3.9,.9,.5,.35,0x6b5a3e);
  }
  // Lobby: APLINDO hologram, reception for Wulan, two sofas facing the entrance, flowing floor LEDs.
  {const c=on('lobby');rug(c,-1.6,2.4,6.4,3.2,0x16202c);
    desk(c,3,-1.8,Math.PI,{keys:['reception:0'],w:2.2,via:()=>[[1.5,-2.65]]});
    const front=canvasTex(512,96,(g,w,h)=>{g.fillStyle='#0b1a22';g.fillRect(0,0,w,h);text(g,'APLINDO',w/2,h/2,58,'#52e0ff',{font:'Georgia'});});
    surface(c,3,.45,-1.39,2,.38,front);
    cyl(c,-2.5,.15,-1.6,.6,.3,0x1a222b,24);
    const logoTex=canvasTex(512,160,(g,w,h)=>{g.shadowColor='#52e0ff';g.shadowBlur=20;text(g,'APLINDO',w/2,70,86,'#bff4ff',{font:'Georgia'});text(g,'SHIP SCALABLE SOFTWARE & APPLIED AI',w/2,132,20,'#7fe9ff');});
    const logo=surface(c,-2.5,1.35,-1.6,2.2,.7,logoTex,0,{transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    const lring=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,6,48),glow(0x52e0ff));lring.rotation.x=Math.PI/2;lring.position.set(-2.5,.31,-1.6);c.add(lring);
    anim(t=>{logo.rotation.y=t*.6;logo.position.y=1.35+Math.sin(t*1.2)*.05;lring.scale.setScalar(1+Math.sin(t*2)*.05);});
    const tiles=[];for(let i=0;i<9;i++)tiles.push(box(c,0,.02,-4.4+i*.5,.6,.01,.3,holo(0x52e0ff,.4),false));
    anim(t=>{tiles.forEach((m,i)=>{m.material.opacity=.15+Math.max(0,Math.sin(t*3-i*.7))*.55;});});
    let k=0;for(const sx of [-3.4,-.6]){sofa(c,sx,1.6,0,0x2e4a6b);for(const dx of [-.5,.5])seat(c,`sofa:${k++}`,sx+dx,1.52,0,'sit',[[0,2.6],[sx+dx,2.6]]);}
    coffeeTable(c,-2,3.2,1.6);
    const welcome=canvasTex(512,256,(g,w,h)=>{g.fillStyle='#08141c';g.fillRect(0,0,w,h);text(g,'Selamat datang di',w/2,60,28,'#9fdcef',{weight:'normal'});text(g,'APLINDO',w/2,125,70,'#52e0ff',{font:'Georgia'});text(g,'SaaS · Applied AI · Consultancy',w/2,185,22,'#d7f6ff');text(g,'Fractional CTO · Compliance',w/2,218,22,'#d7f6ff');});
    screen(c,-5.89,1.6,1.4,3,1.5,welcome,Math.PI/2);plant(c,5.4,4.4);plant(c,-5.4,-4.4);
  }

  // Corridors join every room door; west and east spines link the two corridor lines.
  const walk=0x2a3039;
  box(scene,-1.85,FLOOR-.05,1,40.7,.1,2.8,walk);box(scene,-1.15,FLOOR-.05,-12,39.3,.1,2.6,walk);
  for(const x of [-19.6,18.2])box(scene,x,FLOOR-.05,-5.5,1.3,.1,13.6,walk);
  box(scene,-2,FLOOR-.05,13.3,1.6,.1,1.8,walk);
  for(const [x,z,w,d] of [[-1.85,-.37,40.7,.04],[-1.85,2.37,40.7,.04],[-1.15,-13.27,39.3,.04],[-1.15,-10.73,39.3,.04]])box(scene,x,FLOOR+.005,z,w,.01,d,holo(0x52e0ff,.5),false);
  const bollards=[];for(let x=-20;x<=18;x+=4.2)for(const z of [-13.6,16.2]){cyl(scene,x,.5,z,.06,.7,0x2d3440,8);bollards.push(box(scene,x,.88,z,.1,.08,.1,glow(0x9feaff),false));}
  nav.node('west:a',-19.6,-12);nav.node('west:b',-19.6,1);nav.link('west:a','west:b');
  nav.node('east:a',18.2,-12);nav.node('east:b',18.2,1);nav.link('east:a','east:b');
  nav.node('parking:out',-21.8,1);nav.node('sport:out',9,1);
  nav.corridor([...corridors[-12],'west:a','east:a']);nav.corridor([...corridors[1],'west:b','east:b','parking:out','sport:out']);
  navRooms.parking={id:'parking',doorIn:[-21.8,1],doorOut:'parking:out'};
  navRooms.sport={id:'sport',doorIn:[9,3.6],doorOut:'sport:out'};

  // Parking with cars, lamps and the APLINDO entrance billboard.
  const parking=group(-24.5,.12,0);box(parking,0,0,0,8,.18,22,0x353b44);box(parking,-4.2,.06,0,.35,.3,22.4,0xc9ccd2);
  function car(p,x,z,color){const g=group(x,0,z,p);box(g,0,.53,0,1.65,.5,3.3,color);box(g,0,.95,-.2,1.45,.48,1.8,color);box(g,0,1,-1.15,1.3,.32,.025,0x8fa6ad);box(g,0,1,.72,1.3,.32,.03,0x8fa6ad);for(const xx of [-.84,.84]){box(g,xx,.96,-.2,.02,.3,1.5,0x476174);for(const zz of [-1,1]){const wh=cyl(g,xx,.33,zz,.32,.18,0x1d2229);wh.rotation.z=Math.PI/2;}}for(const xx of [-.55,.55])box(g,xx,.56,1.66,.25,.15,.04,glow(0xfff1c9),false);return g;}
  for(let i=0;i<6;i++){const z=-8.5+i*3.35;box(parking,0,.105,z,7.2,.025,.06,glow(0x52e0ff),false);if(i<5)car(parking,i%2?-1.7:1.7,z+1.7,[0x4f8ac9,0xd7d9d7,0xd28a36,0x486f38,0x795f54][i]);}
  for(const z of [-9,0,9]){box(scene,-28.5,1.85,z,.1,3.6,.1,0x55616a);box(scene,-28.3,3.6,z,.55,.12,.18,0x6f7c83);bollards.push(box(scene,-28.2,3.54,z,.3,.025,.15,glow(0xfff3c5),false));}
  function billboard(x,z,title,sub,w=7,color='#52e0ff',rot=0){const g=group(x,0,z);g.rotation.y=rot;for(const xx of [-w*.43,w*.43])box(g,xx,1.55,0,.14,3.1,.14,0x2d3440);box(g,0,3.1,0,w,2.05,.15,0x141922);const t=canvasTex(768,240);const paint=(title,sub)=>redraw(t,(c,cw,ch)=>{c.fillStyle='#0b1018';c.fillRect(0,0,cw,ch);c.strokeStyle=color;c.lineWidth=4;c.strokeRect(10,10,cw-20,ch-20);c.shadowColor=color;c.shadowBlur=16;text(c,title,cw/2,100,58,'#e9fbff',{font:'Georgia'});c.shadowBlur=0;text(c,sub,cw/2,170,22,color);});paint(title,sub);surface(g,0,3.1,.09,w-.15,1.92,t);return {g,paint};}
  billboard(-24.5,-12.8,'APLINDO','SHIP SCALABLE SOFTWARE & APPLIED AI');

  // Sport Hall: two courts, fence with a gate on the corridor side, basketball hoops, LED scoreboard.
  const sport=group(19,.215,8);current=byId.sport;box(sport,0,-.1,0,25,.35,11,0xc7ccca);
  const courtTex=canvasTex(1024,512,(c,w,h)=>{c.fillStyle='#ae9778';c.fillRect(0,0,w/2,h);c.fillStyle='#3f5f8f';c.fillRect(w/2,0,w/2,h);c.strokeStyle='#e9e5db';c.lineWidth=4;for(let k=0;k<2;k++){const ox=k*w/2;c.strokeRect(ox+30,24,w/2-60,h-48);c.beginPath();c.moveTo(ox+30,h/2);c.lineTo(ox+w/2-30,h/2);c.stroke();c.beginPath();c.arc(ox+w/4,h/2,52,0,Math.PI*2);c.stroke();if(!k){c.fillStyle='#a86354';c.fillRect(ox+164,25,180,100);c.fillRect(ox+164,h-125,180,100);c.strokeRect(ox+164,25,180,100);c.strokeRect(ox+164,h-125,180,100);}else{c.strokeRect(ox+100,24,312,h-48);for(const y of [142,h-142]){c.beginPath();c.moveTo(ox+100,y);c.lineTo(ox+412,y);c.stroke();}}}});
  const court=surface(sport,0,.1,0,24.5,10.6,courtTex);court.rotation.x=-Math.PI/2;court.material=new THREE.MeshLambertMaterial({map:courtTex});
  const fenceMat=new THREE.MeshLambertMaterial({color:0xb2c9d4,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});
  for(const z of [-5.5,5.5]){for(let x=-12.5;x<=12.5;x+=2.5)box(sport,x,1.8,z,.07,3.6,.07,0x6b7b82);box(sport,0,3.6,z,25,.06,.06,0x667985);
    for(const [a,b] of z<0?[[-12.5,-10.7],[-9.3,12.5]]:[[-12.5,12.5]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(b-a,3.6),fenceMat);panel.position.set((a+b)/2,1.8,z);sport.add(panel);}}
  box(sport,-10,2.3,-5.5,1.5,.06,.08,glow(0xff8c42),false);
  for(const x of [-12.5,0,12.5]){for(const z of [-5.5,0,5.5])box(sport,x,1.8,z,.07,3.6,.07,0x6b7b82);box(sport,x,3.6,0,.07,.07,11,0x6b7b82);}
  for(const z of [-4.9,4.9]){box(sport,-6.2,1.6,z,.09,3.2,.09,0x63727d);box(sport,-6.2,2.8,z,1.6,.9,.09,0xf3f3ed);box(sport,-6.2,2.8,z+(z<0?.06:-.06),.65,.4,.025,0xe18669);const hoop=new THREE.Mesh(new THREE.TorusGeometry(.27,.026,6,16),mat(0xc65e35));hoop.rotation.x=Math.PI/2;hoop.position.set(-6.2,2.45,z+(z<0?.5:-.5));sport.add(hoop);}
  for(let z=-4.8;z<=4.8;z+=.35)box(sport,6,.85,z,.01,1.1,.01,0xe0e4e0,false);box(sport,6,1.4,0,.02,.04,9.6,0xe0e4e0,false);
  const players=[[-7.4,-1.4],[-5,-1.4],[-7.4,1.4],[-5,1.4]];
  players.forEach(([x,z],i)=>seat(sport,`sport:${i}`,x,z,Math.atan2(-6.2-x,-z),'play',[[-10,-3.5]]));
  const score=canvasTex(320,120);let scoreA=12,scoreB=10,scoreStep=-1;
  const scoreBoard=group(8,2.4,-5.45,sport);box(scoreBoard,0,0,-.03,2.6,1,.06,0x10141a);surface(scoreBoard,0,0,.005,2.5,.92,score);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),mat(0xe0702c));ball.castShadow=true;ball.position.set(-6.2,.22,0);sport.add(ball);

  // Taman Inovasi: glowing paths, fountain, planters in product colours, benches, fireflies at night.
  const farm=group(-12,.12,22);current=byId.farm;box(farm,0,-.02,0,16,.1,11,0x4f7a3a);
  for(const [w,d] of [[15,.35],[.35,10]])box(farm,0,.05,0,w,.02,d,holo(0x7dffb2,.35),false);
  const basin=cyl(farm,0,.25,0,1.3,.4,0x2d3440,24);cyl(farm,0,.46,0,1.15,.04,holo(0x6fd3ff,.6),24);const jet=cyl(farm,0,.9,0,.08,.9,holo(0xbff4ff,.5),10);
  anim(t=>{jet.scale.y=.85+Math.sin(t*3)*.15;jet.position.y=.85+Math.sin(t*3)*.07;});
  PRODUCTS.forEach((p,i)=>{const a=i*Math.PI/3+Math.PI/6,x=Math.cos(a)*5.2,z=Math.sin(a)*3.4;box(farm,x,.25,z,1.6,.4,.9,0x3a2f25);for(let j=0;j<6;j++)box(farm,x-.6+j*.24,.55+random()*.1,z+(random()-.5)*.5,.1,.14,.1,glow(parseInt(p.color.slice(1),16)),false);});
  for(const [x,z,r] of [[-4,-4.3,0],[4,-4.3,0],[0,4.4,Math.PI]]){const b=group(x,0,z,farm);b.rotation.y=r;box(b,0,.42,0,1.6,.06,.45,0x8a6a48);box(b,0,.7,-.2,1.6,.4,.05,0x8a6a48);for(const s of [-.7,.7])box(b,s,.2,0,.06,.4,.4,0x2d3440);}
  for(const [x,z] of [[-6.8,-4.6],[6.8,-4.6],[-6.8,4.4],[6.8,4.4]])tree(farm,x,z,.75);
  const flyGeo=new THREE.BufferGeometry();const flyPos=new Float32Array(70*3);flyGeo.setAttribute('position',new THREE.BufferAttribute(flyPos,3));
  const flySeeds=[...Array(70)].map(()=>[(random()-.5)*15,.6+random()*2,(random()-.5)*10,random()*6]);
  const flies=new THREE.Points(flyGeo,new THREE.PointsMaterial({color:0xd9ff7a,size:.16,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));farm.add(flies);
  anim(t=>{if(flies.material.opacity<.02)return;flySeeds.forEach(([x,y,z,s],i)=>{flyPos[i*3]=x+Math.sin(t*.5+s)*.6;flyPos[i*3+1]=y+Math.sin(t*1.3+s*2)*.25;flyPos[i*3+2]=z+Math.cos(t*.4+s)*.6;});flyGeo.attributes.position.needsUpdate=true;});
  nightOnly.push(f=>{flies.material.opacity=Math.max(0,1-f*2)*.9;});
  box(scene,-5,FLOOR-.06,15,43,.1,2,0x2f3540);box(scene,-5,FLOOR-.005,15,43,.01,.06,holo(0x7dffb2,.5),false);
  // Billboards stand beside their area, turned to the camera, so they never hide a room.
  billboard(-24.5,22,'6 PRODUK · 5 LAYANAN','SaaS · APPLIED AI · CONSULTANCY · FRACTIONAL CTO · COMPLIANCE',7.4,'#7dffb2',.65);

  // Tambang SaaS: one glowing ore vein per product with a PnL sign, rail loop, mine cart, refinery core.
  const mine=group(8,.12,23);current=byId.mine;box(mine,0,.02,0,16,.12,11,0x3b342d);
  cyl(mine,0,.25,0,1.4,.35,0x2a2f37,6);const coreMesh=cyl(mine,0,1.1,0,.45,1.4,holo(0x4fc3f7,.45),20);cyl(mine,0,1.9,0,.7,.12,0x2a2f37,6);
  const refRing=new THREE.Mesh(new THREE.TorusGeometry(.9,.03,6,40),glow(0x4fc3f7));refRing.rotation.x=Math.PI/2;refRing.position.y=1.1;mine.add(refRing);
  for(const r of [3.15,3.65]){const rail=new THREE.Mesh(new THREE.TorusGeometry(1,.025,4,96),mat(0x8a8f96));rail.rotation.x=Math.PI/2;rail.scale.set(r,r*.68,1);rail.position.y=.12;mine.add(rail);}
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const s=box(mine,Math.sin(a)*3.4,.1,Math.cos(a)*2.31,.14,.04,.7,0x5a4330);s.rotation.y=a;}
  const cart=group(0,.12,0,mine);box(cart,0,.35,0,.6,.35,.8,0x4b5560);box(cart,0,.54,0,.62,.03,.82,glow(0x4fc3f7),false);for(const x of [-.3,.3])for(const z of [-.28,.28]){const wh=cyl(cart,x,.1,z,.1,.06,0x1d2229,10);wh.rotation.z=Math.PI/2;}
  const cargo=new THREE.Mesh(new THREE.OctahedronGeometry(.2,0),holo(0xffffff,.85));cargo.position.y=.65;cart.add(cargo);
  const signs=[];const veinAngles=[];
  PRODUCTS.forEach((p,i)=>{
    const a=i*Math.PI/3+Math.PI/6,x=Math.sin(a)*6.2,z=Math.cos(a)*4.1,color=parseInt(p.color.slice(1),16);veinAngles.push(a);
    const v=group(x,0,z,mine);
    for(let j=0;j<4;j++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.45+random()*.35,0),mat(j%2?0x5d5142:0x6e604e));rock.position.set((random()-.5)*1.4,.35,(random()-.5)*.9);rock.scale.y=.7+random()*.5;rock.castShadow=true;v.add(rock);}
    const crystals=[];for(let j=0;j<4;j++){const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.16+random()*.12,0),holo(color,.85));cr.position.set((random()-.5)*1,.75+random()*.3,(random()-.5)*.6);cr.scale.y=1.8;cr.rotation.z=(random()-.5)*.6;v.add(cr);crystals.push(cr);}
    const ground=new THREE.Mesh(new THREE.CircleGeometry(1.1,32),holo(color,.25));ground.rotation.x=-Math.PI/2;ground.position.y=.09;v.add(ground);
    const post=group(0,0,.9,v);box(post,0,1,0,.08,2,.08,0x2d3440);
    // Signs turn toward the default camera (from +x,+z).
    const board=group(0,2.2,0,post);board.rotation.y=.6;box(board,0,0,0,2.3,1.32,.04,0x10141a);
    const tex=canvasTex(320,180);const panel=surface(board,0,0,.03,2.2,1.24,tex);
    panel.userData.product=p;signs.push({p,tex,panel,crystals,ground,last:''});
  });
  const pnlNow=(p,i,t)=>p.pnl*(1+.015*Math.sin(t*.15+i*1.7));
  const pnlTotal=t=>PRODUCTS.reduce((s,p,i)=>s+pnlNow(p,i,t),0);
  const rp=v=>`+Rp ${v.toFixed(1).replace('.',',')} jt`;
  const totalBoard=billboard(23.5,21.5,'PnL SaaS','',7,'#4fc3f7',.65);let totalShown='';
  anim(t=>{
    coreMesh.material.opacity=.35+Math.sin(t*2)*.12;refRing.rotation.z=t*.8;refRing.position.y=1.1+Math.sin(t*1.2)*.25;
    const a=t*.32,cx=Math.sin(a)*3.4,cz=Math.cos(a)*2.31;cart.position.set(cx,.12,cz);cart.rotation.y=Math.atan2(Math.cos(a)*3.4,-Math.sin(a)*2.31);
    const near=veinAngles.reduce((best,va,i)=>{const d=Math.abs(Math.atan2(Math.sin(a-va),Math.cos(a-va)));return d<best.d?{d,i}:best;},{d:9,i:0});
    cargo.material.color.set(PRODUCTS[near.i].color);cargo.rotation.y=t*2;
    signs.forEach((s,i)=>{s.crystals.forEach((c,j)=>{c.rotation.y=t*.6+j;c.material.opacity=.6+Math.sin(t*2+j+i)*.25;});s.ground.material.opacity=.18+Math.sin(t*1.5+i)*.08;
      const label=rp(pnlNow(s.p,i,t));if(label===s.last)return;s.last=label;
      redraw(s.tex,(g,w,h)=>{g.fillStyle='#0a0f16';g.fillRect(0,0,w,h);g.fillStyle=s.p.color;g.fillRect(0,0,w,8);g.shadowColor=s.p.color;g.shadowBlur=12;text(g,s.p.name,w/2,50,36,s.p.color);g.shadowBlur=0;text(g,'PnL bulan ini',w/2,92,17,'#9fb2c4',{weight:'normal'});text(g,label,w/2,128,32,'#e9fbff');text(g,'data contoh · tap untuk detail',w/2,162,13,'#6b7f90',{weight:'normal'});});});
    const total=rp(pnlTotal(t));if(total!==totalShown){totalShown=total;totalBoard.paint(`PnL SaaS ${total.replace('+','+ ')}`,'TOTAL 6 PRODUK BULAN INI · DATA CONTOH');}
  });

  // Seat lookup in world coordinates for the scheduler.
  scene.updateMatrixWorld(true);
  const spots=new Map(),v=new THREE.Vector3(),q=new THREE.Quaternion(),e=new THREE.Euler();
  for(const s of seatList){s.o.getWorldPosition(v);s.o.getWorldQuaternion(q);e.setFromQuaternion(q,'YXZ');
    spots.set(s.key,{key:s.key,x:v.x,z:v.z,rot:e.y,pose:s.pose,roomId:s.room.id,room:navRooms[s.room.id],via:s.via.map(([a,b])=>[s.room.x+a,s.room.z+b])});}
  for(let i=0;i<30;i++)spots.set(`parking:${i}`,{key:`parking:${i}`,x:-22.4-(i%4)*.45,z:.4+Math.floor(i/4)*.3,rot:Math.PI/2,pose:'stand',roomId:'parking',room:navRooms.parking,via:[]});

  // Animated scoreboard and ball depend on which players are on court.
  function sportTick(t,occupied){
    const present=players.map((p,i)=>occupied.has(`sport:${i}`)?p:null).filter(Boolean);
    const s=Math.floor(t/6);
    if(s!==scoreStep){scoreStep=s;if(present.length>1){if(random()>.5)scoreA+=2;else scoreB+=2;}redraw(score,(g,w,h)=>{g.fillStyle='#060a10';g.fillRect(0,0,w,h);text(g,'APLINDO',70,30,20,'#ff8c42');text(g,'AI LAB',250,30,20,'#8f7cff');text(g,String(scoreA).padStart(2,'0'),70,80,48,'#ffd6b0');text(g,String(scoreB).padStart(2,'0'),250,80,48,'#d6ceff');text(g,':',160,78,40,'#ffffff');});}
    if(present.length<2){ball.position.set(-6.2,.22+Math.abs(Math.sin(t*1.5))*.05,0);return;}
    const leg=Math.floor(t/1.1)%present.length,u=(t/1.1)%1,a=present[leg],b=present[(leg+1)%present.length];
    ball.position.set(a[0]+(b[0]-a[0])*u,1.1+Math.sin(u*Math.PI)*1.2,a[1]+(b[1]-a[1])*u);
  }
  function setDaylight(f){
    scene.background.copy(nightColor).lerp(dayColor,f);hemi.intensity=.55+1.55*f;sun.intensity=.2+1.95*f;
    sun.color.setHSL(.09,.5+(1-f)*.3,.85);for(const fn of nightOnly)fn(f);for(const fn of dayNight)fn(f);
  }
  return {byId,spots,nav,animators,signs:signs.map(s=>s.panel),setDaylight,sportTick,pnlTotal,FLOOR};
}
