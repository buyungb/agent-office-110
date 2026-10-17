import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createPrayerCharacter, samplePrayer, PRAYER_DURATION } from './prayer.js';

// All models and textures are generated locally. No original-site backend calls.
const $ = (q) => document.querySelector(q);
const rooms = [
  {id:'all',icon:'🗺️',name:'Semua',x:0,z:0,span:66},
  {id:'trading',icon:'📈',name:'Trading Room',x:-13,z:-5,w:11,d:9,span:18},
  {id:'meeting',icon:'👑',name:'Meeting Room',x:-1,z:-5,w:12,d:9,span:19},
  {id:'admin',icon:'🏢',name:'Administration Room',x:-13,z:5,w:11,d:10,span:19},
  {id:'lobby',icon:'🛋️',name:'Lobi',label:'LOBBY OFFICE',x:-1,z:5,w:12,d:10,span:20},
  {id:'medical',icon:'🏥',name:'Medis',label:'RUANG MEDIS',x:8,z:-5,w:5,d:9,span:14},
  {id:'house',icon:'🏠',name:'Rumah Bang Buyung',label:'RUMAH BANG BUYUNG',x:1,z:-18,w:10,d:8,span:18},
  {id:'gym',icon:'🏋️',name:'Gym',label:'GYM & RUANG MAKAN',x:-10,z:-18,w:10,d:8,span:18},
  {id:'mushola',icon:'🕌',name:'Mushalla',label:'MUSHALLA',x:14,z:-5,w:6,d:9,span:12},
  {id:'sport',icon:'🏀',name:'Sport Hall',label:'SPORT HALL',x:19,z:6,w:25,d:11,span:28},
  {id:'dc',icon:'🖥️',name:'Data Center',label:'DATA CENTER',x:10,z:-18,w:7,d:8,span:15},
  {id:'farm',icon:'🌾',name:'Kebun PnL',label:'LAHAN PnL SOROS',x:-12,z:20,span:23},
  {id:'mine',icon:'⛏️',name:'Tambang Emas',label:'TAMBANG EMAS XAUUSD',x:7,z:21,span:23},
];
const byId = Object.fromEntries(rooms.map(r => [r.id,r]));
const agents = [
  {name:'Nola',emoji:'🎯',role:'Koordinator',room:'trading',x:-15,z:-5,color:0xd4463c,job:'🧠 Membagi tugas dan memantau progres tim',status:'idle'},
  {name:'Soros',emoji:'📊',role:'Trader',room:'farm',x:-10,z:21,color:0x297bbb,job:'📈 Memantau chart, posisi, dan lahan PnL',status:'recent'},
  {name:'Wucing',emoji:'🐱',role:'Trader',room:'trading',x:-10.5,z:-5,color:0x4b933c,job:'🔎 Memindai momentum dan peluang pasar',status:'idle'},
  {name:'Chelsea',emoji:'💜',role:'Customer Service',room:'medical',x:8.7,z:-3.5,color:0x903db0,job:'💬 Membalas chat dan pertanyaan pelanggan',status:'recent'},
  {name:'Beru',emoji:'👑',role:'Orchestrator',room:'meeting',x:-2.5,z:-4,color:0xd99228,job:'📋 Menyusun prioritas dan koordinasi agent',status:'recent'},
  {name:'Norman',emoji:'💪',role:'Admin Gym',room:'gym',x:-7.5,z:-16,color:0x36a7b3,job:'💪 Memperbarui data member dan latihan',status:'idle'},
  {name:'Kamala',emoji:'👑',role:'CEO',room:'admin',x:-15.3,z:3,color:0xc92d6a,job:'🎯 Meninjau strategi dan progres kantor',status:'idle'},
  {name:'Gabrella',emoji:'🎨',role:'Social Media',room:'admin',x:-10.5,z:3,color:0x985e50,job:'🎬 Menyiapkan konten dan kalender sosial',status:'idle'},
  {name:'Nadine',emoji:'📅',role:'Admin Jadwal',room:'admin',x:-10.5,z:7,color:0x3e454a,job:'📅 Mengatur jadwal dan pengingat tim',status:'idle'},
  {name:'Indra',emoji:'💰',role:'Finance',room:'admin',x:-15.3,z:7,color:0x8caa40,job:'🧾 Merekap transaksi dan pengeluaran',status:'idle'},
  {name:'Raka',emoji:'⚡',role:'Teknisi',room:'admin',x:-8.5,z:6,color:0x505aa5,job:'🔧 Memeriksa log, server, dan sistem',status:'idle'},
];
let seed=317;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9ec9f5');
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
scene.add(new THREE.HemisphereLight(0xe8f2ff,0x6a5942,2.1));
const sun=new THREE.DirectionalLight(0xfff1db,2.15);
sun.position.set(-25,65,35);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-65,right:65,top:55,bottom:-55,near:1,far:170});
sun.shadow.normalBias=.045;scene.add(sun);
const materials=new Map();
function mat(color){if(color?.isMaterial)return color;if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);}
const unitBox=new THREE.BoxGeometry(1,1,1);
function box(parent,x,y,z,w,h,d,color,shadow=true){const m=new THREE.Mesh(unitBox,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
function cyl(parent,x,y,z,r,h,color,sides=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,sides),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function group(x=0,y=0,z=0,parent=scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function surface(parent,x,y,z,w,h,t,rotation=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;parent.add(m);return m;}
function line(parent,points,color=0xffffff){const geom=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Line(geom,new THREE.LineBasicMaterial({color}));parent.add(mesh);return mesh;}
const wood=texture(512,512,(c,w,h)=>{c.fillStyle='#c6a474';c.fillRect(0,0,w,h);for(let y=0;y<16;y++){for(let x=-1;x<5;x++){c.fillStyle=`hsl(35,${30+random()*8}%,${61+random()*10}%)`;c.fillRect(x*128+(y%2)*64+1,y*32+1,126,30);}}});
wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(3,3);
const woodMat=new THREE.MeshLambertMaterial({map:wood});
const grass=texture(256,256,(c,w,h)=>{c.fillStyle='#668d3d';c.fillRect(0,0,w,h);for(let i=0;i<18000;i++){c.fillStyle=random()>.5?'#89a753':'#567d35';c.globalAlpha=.45;c.fillRect(random()*w,random()*h,1+random()*2,1+random()*2);}});
grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(28,24);
const grassMat=new THREE.MeshLambertMaterial({map:grass});
const terrain=group();
box(terrain,0,-.5,0,90,1,74,0x725136);
box(terrain,0,.02,0,90,.12,74,grassMat,false);

// Sparse raised grass blocks and voxel trees form the same diorama silhouette.
const clumps=[];
for(let i=0;i<1750;i++){const x=(random()-.5)*88,z=(random()-.5)*72;if(x>-30&&x<34&&z>-24&&z<29)continue;clumps.push({x,z,s:.25+random()*.48});}
function instances(color,h,offset){const mesh=new THREE.InstancedMesh(unitBox,mat(color),clumps.length),dummy=new THREE.Object3D();clumps.forEach((p,i)=>{dummy.position.set(p.x,offset,p.z);dummy.scale.set(p.s,h,p.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.receiveShadow=true;terrain.add(mesh);}
instances(0x765535,.32,.2);instances(0x719549,.16,.44);
function tree(x,z,s=1){const g=group(x,0,z);box(g,0,.95*s,0,.4*s,1.9*s,.4*s,0x695034);box(g,0,2*s,0,1.65*s,1.1*s,1.55*s,0x3d702f);box(g,.12*s,2.65*s,-.08*s,1.2*s,.7*s,1.2*s,0x4b8138);box(g,-.55*s,1.9*s,.25*s,.9*s,.8*s,1.05*s,0x477b34);return g;}
for(let i=0;i<65;i++){const x=(random()-.5)*84,z=(random()-.5)*69;if(x>-30&&x<34&&z>-25&&z<30)continue;tree(x,z,.65+random()*.55);}
for(const p of [[-21,13],[-22,-13],[-18,25],[-3,24],[18,25],[33,14],[16,-20],[-17,-20]])tree(...p,.8);

// Reusable room furnishing primitives.
function plant(parent,x,z,s=1){cyl(parent,x,.24*s,z,.22*s,.45*s,0xb16d35,7);const p=new THREE.Mesh(new THREE.IcosahedronGeometry(.46*s,0),mat(0x4b9954));p.position.set(x,.85*s,z);p.castShadow=true;parent.add(p);}
function chair(parent,x,z,color=0x333c48,rot=0){const g=group(x,0,z,parent);g.rotation.y=rot;box(g,0,.55,0,.6,.16,.65,color);box(g,0,1,-.27,.6,.8,.12,color);cyl(g,0,.28,0,.065,.5,0x30363e);box(g,0,.08,0,.7,.07,.1,0x252a32);box(g,0,.08,0,.1,.07,.7,0x252a32);return g;}
function sofa(parent,x,z,rot=0,color=0x4e65ac){const g=group(x,0,z,parent);g.rotation.y=rot;box(g,0,.35,0,2.3,.5,.8,color);box(g,0,.8,-.38,2.3,.7,.2,color);for(const k of [-1,1])box(g,k*1.1,.62,0,.2,.55,.9,color);box(g,-.52,.64,.05,.9,.12,.64,0x637ac2);box(g,.52,.64,.05,.9,.12,.64,0x637ac2);return g;}
const chartTex=texture(512,280,(c,w,h)=>{c.fillStyle='#101a25';c.fillRect(0,0,w,h);c.strokeStyle='#213145';c.lineWidth=1;for(let y=40;y<h;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}let y=160;for(let x=15;x<500;x+=12){const change=(random()-.48)*45;c.strokeStyle=change>0?'#ef6c72':'#4bdfaa';c.fillStyle=c.strokeStyle;c.beginPath();c.moveTo(x,y-12);c.lineTo(x,y+change+12);c.stroke();c.fillRect(x-3,Math.min(y,y+change),6,Math.max(3,Math.abs(change)));y=Math.max(45,Math.min(240,y+change));}c.fillStyle='#e2e9f4';c.font='bold 17px monospace';c.fillText('MARKET OVERVIEW',16,24);});
const codeTex=texture(256,160,(c,w,h)=>{c.fillStyle='#111827';c.fillRect(0,0,w,h);const colors=['#91bcfa','#5ccda8','#b793dc','#d8ba78'];for(let i=0;i<17;i++){c.fillStyle=colors[i%4];c.fillRect(12+(i%3)*12,9+i*8,25+random()*150,3);}});
function monitor(parent,x,y,z,w=1.1,chart=false){box(parent,x,y,z,w,.69,.09,0x19212b);surface(parent,x,y,z+.05,w-.08,.59,chart?chartTex:codeTex);box(parent,x,y-.44,z,.06,.26,.06,0x252b34);box(parent,x,y-.55,z+.04,.45,.035,.28,0x252b34);}
function desk(parent,x,z,rot=0,double=false){const g=group(x,0,z,parent);g.rotation.y=rot;box(g,0,.91,0,2,.14,.95,0xd9cdb1);for(const xx of [-.83,.83])for(const zz of [-.36,.36])box(g,xx,.45,zz,.07,.87,.07,0xddd8c8);monitor(g,double?-.49:0,1.53,-.23,double?.9:1.15,true);if(double)monitor(g,.49,1.53,-.23,.9,false);box(g,0,1.0,.2,.7,.035,.23,0x363b42);box(g,.53,1.0,.25,.1,.04,.16,0x252a30);cyl(g,.8,1.08,.17,.065,.16,0xfaf3df);chair(g,0,1.02);return g;}
function coffeeTable(parent,x,z){box(parent,x,.48,z,1.4,.1,.8,0xcbb88f);for(const xx of [-.55,.55])box(parent,x+xx,.23,z,.07,.45,.6,0xc0a77e);cyl(parent,x+.25,.57,z,.065,.1,0xffffff);}
function board(parent,x,y,z,w=2.8,h=1.4,kind='schedule'){
  const t=texture(512,256,(c,cw,ch)=>{c.fillStyle='#edf0ef';c.fillRect(0,0,cw,ch);c.fillStyle='#43566b';c.font='bold 24px sans-serif';c.fillText(kind==='flow'?'TEAM WORKFLOW':'WEEKLY PLANNER',20,35);const palette=['#94b8d4','#dbb5c2','#b5c79e','#e3cc8c'];for(let i=0;i<4;i++){c.fillStyle=palette[i];c.fillRect(25+i*120,70,98,50);c.fillStyle=palette[(i+1)%4];c.fillRect(25+i*120,140,98,65);}c.strokeStyle='#8292a1';c.strokeRect(9,9,cw-18,ch-18);});
  box(parent,x,y,z,w+.1,h+.1,.12,0xa5aaab);surface(parent,x,y,z+.07,w,h,t);
}
function rug(parent,x,z,w,d,color=0x222637,edge=0x4b62ae){box(parent,x,.24,z,w+.12,.035,d+.12,edge,false);box(parent,x,.26,z,w,.035,d,color,false);}
function room(r,floor=woodMat){const g=group(r.x,.16,r.z);box(g,0,-.06,0,r.w,.3,r.d,0xd7d8d7);box(g,0,.11,0,r.w-.15,.09,r.d-.15,floor);const wall=0xe3ded2;
  box(g,0,1.3,-r.d/2,r.w,2.6,.17,wall);box(g,-r.w/2,1.3,0,.17,2.6,r.d,wall);
  box(g,r.w/2,.46,0,.15,.92,r.d,wall);box(g,0,.33,r.d/2,r.w,.66,.17,wall);
  box(g,0,2.63,-r.d/2,r.w+.1,.08,.26,0xf0eade);box(g,-r.w/2,2.63,0,.26,.08,r.d,0xf0eade);
  for(let x=-r.w/2+2;x<r.w/2;x+=3){box(g,x,1.65,-r.d/2+.12,1.2,.8,.08,0xf3f0df);box(g,x,1.65,-r.d/2+.17,1.03,.64,.025,0x92bfe0,false);}
  box(g,-r.w/2+.13,.95,r.d/2-1.6,.1,1.85,.95,0xc4b99c);plant(g,-r.w/2+.65,r.d/2-.7,.8);return g;}
const models={};
for(const id of ['trading','meeting','admin','lobby','medical','gym','house','dc','mushola']){
  const r=byId[id];models[id]=room(r,['dc','gym'].includes(id)?0x424b50:id==='medical'?0xdbe5e0:woodMat);
}
// Main office: trading, administration, conference, and lounge.
{const g=models.trading; rug(g,0,0,8,5);desk(g,-2,-1,0,true);desk(g,2.5,-1,0,true);sofa(g,-4,2.2,Math.PI/2);coffeeTable(g,-2.8,2.2);surface(g,-2,1.7,-4.37,2.4,1.35,chartTex);surface(g,2.8,1.7,-4.37,2.4,1.35,chartTex);plant(g,4.6,-3.7);board(g,0,1.7,-4.36,1.8,1.2);}
{const g=models.admin;rug(g,0,0,8,7);for(const x of [-2.3,2.5])for(const z of [-2,2])desk(g,x,z,0,true);board(g,0,1.7,-4.86);sofa(g,-4,3.5,Math.PI/2);plant(g,4.8,3.8);}
{const g=models.meeting;rug(g,0,0,8,6,0x8b7770,0x493b36);const table=cyl(g,0,.93,0,2.25,.18,0xd3c5a4,48);table.scale.z=.76;cyl(g,0,.46,0,.3,.85,0x7c7265);for(let i=0;i<6;i++){const a=i*Math.PI/3;chair(g,Math.sin(a)*2.7,Math.cos(a)*2.2,0x34404a,a+Math.PI);cyl(g,Math.sin(a)*1.3,1.1,Math.cos(a)*1,.055,.18,0xa4d0df);}board(g,0,1.7,-4.37,4.5,1.65,'flow');sofa(g,-4,2.4,Math.PI/2);plant(g,5,-3.5);}
{const g=models.lobby;rug(g,-1,1,5,3,0x394361,0xb59255);sofa(g,-1,2.2);sofa(g,-3.4,.3,Math.PI/2);coffeeTable(g,-1,.8);box(g,-1,1.45,-2,2.7,1.5,.13,0x1c2230);surface(g,-1,1.45,-1.92,2.5,1.3,chartTex);box(g,-1,.45,-2,3,.7,.55,0xc0ab84);box(g,4,.6,-2,2,1.1,1,0xe6ddd0);box(g,4,1.18,-2,2.15,.12,1.15,0x59605e);box(g,4,1.6,-2,.5,.7,.4,0x2c3135);cyl(g,4.6,1.37,-2,.14,.3,0xd6e7ec);plant(g,4.8,3.8);}
// Clinic beds, monitors, pharmacy cabinet and first-aid cross.
{const g=models.medical;for(const z of [-2,1.8]){box(g,.6,.5,z,1.5,.25,2.4,0x9faeb3);box(g,.6,.72,z,1.35,.18,2.25,0xf1f3e8);box(g,.6,.86,z-.3,1.38,.12,1.4,0x6dacb4);box(g,.6,.87,z+.7,1.05,.16,.48,0xffffff);for(const x of [0,1.2])box(g,x,.27,z,.08,.5,1.8,0x89989d);monitor(g,-1.2,1.6,z,1);box(g,-1.2,.65,z,.6,1,.5,0xc8d8d8);}box(g,0,1.85,-4.36,1,.25,.07,0xd64c4d);box(g,0,1.85,-4.34,.25,1,.08,0xd64c4d);}
// Annex connected through a paved rear walkway.
box(scene,-2,.12,-12,33,.1,3,0xc9c9bf);box(scene,-.8,.13,-10.6,2,.12,4,0xd5d3c7);
{const g=models.house; rug(g,-1,0,5,3,0x74618d,0xb69c64);sofa(g,-2,1.2,0,0x7859a9);coffeeTable(g,-2,0);desk(g,2.5,-2,0,true);box(g,-2,1.6,-3.84,2.8,1.5,.12,0x202838);surface(g,-2,1.6,-3.76,2.6,1.3,chartTex);box(g,3,.7,2,2.3,.6,2.7,0x755ea0);box(g,3,1.04,2,2.15,.13,2.6,0xf0eade);box(g,3,1.15,1.3,1.8,.22,.55,0xd6d8e0);plant(g,-4,2.8);}
{const g=models.gym;for(const x of [-3.2,-1.3]){box(g,x,.22,-1.9,1.1,.22,2.7,0x202830);box(g,x,.35,-1.9,.8,.06,2.3,0x363e43);for(const xx of [-.47,.47])box(g,x+xx,1,-2.9,.07,1.4,.07,0x9ba4ab);box(g,x,1.62,-2.9,1,.08,.08,0x9ba4ab);monitor(g,x,1.8,-2.95,.5);}box(g,2,.5,-2,2.6,.15,.9,0x2f333b);for(const x of [1,3]){box(g,x,.8,-2.8,.08,1.6,.08,0x8b9498);cyl(g,x,1.6,-2.8,.3,.18,0x24282b).rotation.z=Math.PI/2;}box(g,2,1.6,-2.8,2.4,.08,.08,0xb5bcc0);cyl(g,1.7,.9,2,1.25,.14,0xbfaa80,32);cyl(g,1.7,.44,2,.12,.8,0x51575c);chair(g,1.7,3.7);chair(g,3.4,2,0x333c48,Math.PI/2);for(const x of [-3,-1])box(g,x,.22,2,1.1,.06,2.3,0x8359aa);}
{const g=models.dc;for(const x of [-2,0,2])for(const z of [-2.4,.4]){box(g,x,1.25,z,1.25,2.3,.85,0x20262d);for(let y=.35;y<2.25;y+=.28){box(g,x,y,z+.44,1.1,.19,.03,0x323d47);box(g,x-.4,y,z+.465,.04,.04,.02,0x4cd3a1,false);box(g,x-.28,y,z+.465,.04,.04,.02,0x5fa2de,false);}}}
// Imam mat faces the mihrab; two makmum stand shoulder-to-shoulder behind him.
{const g=models.mushola;rug(g,0,.2,5,7.2,0x377b46,0xbea355);
  for(const [x,z] of [[0,-2.1],[-1.05,.7],[1.05,.7]]){rug(g,x,z,1.45,2.3,0x246d49,0xd5b96c);box(g,x,.30,z-.82,.9,.012,.045,0xe1c881,false);}
  box(g,0,1.3,-4.34,1.45,2.1,.12,0xc9b475);box(g,0,1.28,-4.25,1.1,1.8,.08,0x417758);
}

// Parking: marked bays, cars, lamps, entrance billboard.
const parking=group(-24,.12,0);box(parking,0,0,0,8,.18,22,0x424952);box(parking,-4.2,.06,0,.35,.3,22.4,0xdbd9cc);
function car(parent,x,z,color){const g=group(x,0,z,parent);box(g,0,.53,0,1.65,.5,3.3,color);box(g,0,.95,-.2,1.45,.48,1.8,color);box(g,0,1,-1.15,1.3,.32,.025,0x8fa6ad);box(g,0,1,.72,1.3,.32,.03,0x8fa6ad);for(const xx of [-.84,.84]){box(g,xx,.96,-.2,.02,.3,1.5,0x476174);for(const zz of [-1,1]){const wh=cyl(g,xx,.33,zz,.32,.18,0x1d2229);wh.rotation.z=Math.PI/2;}}for(const xx of [-.55,.55])box(g,xx,.56,1.66,.25,.15,.04,0xfff1c9);return g;}
for(let i=0;i<6;i++){const z=-8.5+i*3.35;box(parking,0,.105,z,7.2,.025,.06,0xe4e7e6,false);if(i<5)car(parking,i%2?-1.7:1.7,z+1.7,[0x4f8ac9,0xd7d9d7,0xd28a36,0x486f38,0x795f54][i]);}
function lamp(x,z){box(scene,x,1.85,z,.1,3.6,.1,0x55616a);box(scene,x+.2,3.6,z,.55,.12,.18,0x6f7c83);box(scene,x+.3,3.54,z,.3,.025,.15,0xfff3c5,false);}
for(const z of [-9,0,9])lamp(-28,z);
function billboard(x,z,title,sub,w=7){const g=group(x,0,z);for(const xx of [-w*.43,w*.43])box(g,xx,1.55,0,.14,3.1,.14,0x665634);box(g,0,3.1,0,w,2.05,.15,0x302d24);const t=texture(768,240,(c,cw,ch)=>{c.fillStyle='#172020';c.fillRect(0,0,cw,ch);c.strokeStyle='#bc9d43';c.lineWidth=4;c.strokeRect(10,10,cw-20,ch-20);c.strokeRect(20,20,cw-40,ch-40);c.textAlign='center';c.fillStyle='#e7cc76';c.font='bold 47px Georgia';c.fillText(title,cw/2,105);c.fillStyle='#f3ead0';c.font='bold 21px sans-serif';c.fillText(sub,cw/2,160);});surface(g,0,3.1,.09,w-.15,1.92,t);return g;}
billboard(-24,-11,'buyung.io','A I   A G E N T   O F F I C E',7);
// Sports hall: two full courts, transparent fencing and basketball hoops.
const sport=group(19,.19,6);box(sport,0,-.1,0,25,.35,11,0xc7ccca);
const courtTex=texture(1024,512,(c,w,h)=>{c.fillStyle='#ae9778';c.fillRect(0,0,w/2,h);c.fillStyle='#526e9c';c.fillRect(w/2,0,w/2,h);c.strokeStyle='#e9e5db';c.lineWidth=4;for(let k=0;k<2;k++){const ox=k*w/2;c.strokeRect(ox+30,24,w/2-60,h-48);c.beginPath();c.moveTo(ox+30,h/2);c.lineTo(ox+w/2-30,h/2);c.stroke();c.beginPath();c.arc(ox+w/4,h/2,52,0,Math.PI*2);c.stroke();if(!k){c.fillStyle='#a86354';c.fillRect(ox+164,25,180,100);c.fillRect(ox+164,h-125,180,100);c.strokeRect(ox+164,25,180,100);c.strokeRect(ox+164,h-125,180,100);}else{c.strokeRect(ox+100,24,312,h-48);for(const y of [142,h-142]){c.beginPath();c.moveTo(ox+100,y);c.lineTo(ox+412,y);c.stroke();}}}});
const court=surface(sport,0,.1,0,24.5,10.6,courtTex);court.rotation.x=-Math.PI/2;
const fenceMat=new THREE.MeshLambertMaterial({color:0xb2c9d4,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});
for(const z of [-5.5,5.5]){for(let x=-12.5;x<=12.5;x+=2.5)box(sport,x,1.8,z,.07,3.6,.07,0x6b7b82);box(sport,0,3.6,z,25,.06,.06,0x667985);const panel=new THREE.Mesh(new THREE.PlaneGeometry(25,3.6),fenceMat);panel.position.set(0,1.8,z);sport.add(panel);}
for(const x of [-12.5,0,12.5]){for(const z of [-5.5,0,5.5])box(sport,x,1.8,z,.07,3.6,.07,0x6b7b82);box(sport,x,3.6,0,.07,.07,11,0x6b7b82);}
for(const z of [-4.9,4.9]){box(sport,-6.2,1.6,z,.09,3.2,.09,0x63727d);box(sport,-6.2,2.8,z,1.6,.9,.09,0xf3f3ed);box(sport,-6.2,2.8,z+(z<0?.06:-.06),.65,.4,.025,0xe18669);const ring=new THREE.Mesh(new THREE.TorusGeometry(.27,.026,6,16),mat(0xc65e35));ring.rotation.x=Math.PI/2;ring.position.set(-6.2,2.45,z+(z<0?.5:-.5));sport.add(ring);}
for(let z=-4.8;z<=4.8;z+=.35)line(sport,[[6,.3,z],[6,1.4,z]],0xe0e4e0);for(let y=.3;y<=1.4;y+=.2)line(sport,[[6,y,-4.8],[6,y,4.8]],0xe0e4e0);

// Garden paths, fenced planting beds and small crop plants.
box(scene,-5,.11,14,43,.15,2,0xc8b98e);box(scene,-2,.12,11.5,2,.13,6,0xc8b98e);
const farm=group(-12,.12,21);box(farm,0,-.02,0,16,.1,11,0x788947);
for(const z of [-5.5,5.5])for(let x=-8;x<=8;x+=2){box(farm,x,.6,z,.1,1.1,.1,0x94754b);box(farm,x,.7,z,2,.09,.08,0xb29263);}
for(let x=-6;x<=6;x+=3)for(const z of [-2.5,1.5]){box(farm,x,.12,z,2.5,.18,2.7,0x735231);for(let dx=-.7;dx<=.7;dx+=.7)for(let dz=-.8;dz<=.8;dz+=.8){const s=.12+random()*.17;box(farm,x+dx,.3,z+dz,.07,.3,.07,0x49934e,false);box(farm,x+dx,.4,z+dz,s,.1,s*2,0x80ac55,false);if(random()>.6)box(farm,x+dx,.48,z+dz,.12,.12,.12,0xebc66d,false);}}
box(farm,6,1,-4.5,2,1.8,1.1,0x755137);box(farm,6,2,-4.5,2.4,.2,1.5,0x4e3329);billboard(-14,15,'CRYPTO FUTURES','PnL SOROS · +30.5%',7);
const mine=group(8,.12,22);box(mine,0,.02,0,16,.12,11,0xaa9370);
for(let i=0;i<14;i++){const a=i*.45;const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.6+random()*.7,0),mat(i%3?0x786953:0x92816a));rock.position.set(Math.cos(a)*3,random()*.7+.4,Math.sin(a)*2);rock.scale.y=.7+random();rock.castShadow=true;mine.add(rock);}
box(mine,0,.12,0,3,.03,2.5,0x2d2720);for(const x of [-1.3,1.3])box(mine,x,1.4,0,.3,2.8,.35,0x67482e);box(mine,0,2.7,0,3,.32,.35,0x805837);
for(const x of [-.52,.52])box(mine,x,.15,3,.08,.08,5.5,0x636263);for(let z=.4;z<6;z+=.55)box(mine,0,.12,z,1.45,.08,.14,0x6c4b31);
box(mine,0,.6,3.4,1.05,.7,1.25,0x544b3a);for(let i=0;i<8;i++)box(mine,(random()-.5)*.7,1+(random()*.15),3.4+(random()-.5)*.8,.25,.2,.2,0xe2b844);
box(mine,5,.9,1.5,2.4,1.6,2,0x9b7950);box(mine,5,1.8,1.5,2.7,.2,2.3,0x6b5036);
billboard(5,15,'1 JUTA → 100 JUTA','DISIPLIN  ·  TEKUN  ·  TERUKUR',7);
billboard(14,17,'PANTAU BERSAMA','XAUUSD  ·  TRADING JOURNAL',6);

// Block-built characters have articulated heads and arms for idle/work motion.
function character(x,z,color,index=0){const g=group(x,.3,z);box(g,-.14,.27,0,.2,.54,.25,0x253044);box(g,.14,.27,0,.2,.54,.25,0x253044);box(g,-.14,.045,.08,.23,.12,.38,0x252832);box(g,.14,.045,.08,.23,.12,.38,0x252832);box(g,0,.76,0,.55,.53,.32,color);const head=group(0,1.22,0,g);box(head,0,0,0,.43,.42,.4,0xddad7f);box(head,0,.18,-.03,.46,.14,.43,index%3?0x302d29:0x634534);box(head,0,.05,-.2,.45,.32,.07,0x302d29);for(const xx of [-.1,.1])box(head,xx,.015,.204,.047,.05,.015,0x272528,false);const arms=[];for(const s of [-1,1]){const arm=group(s*.36,.93,0,g);box(arm,0,-.16,0,.17,.35,.23,color);box(arm,0,-.37,0,.16,.14,.18,0xddad7f);arms.push(arm);}return {g,head,arms};}
agents.forEach((a,i)=>{a.model=character(a.x,a.z,a.color,i);a.model.g.rotation.y=Math.PI;});
const miner=character(7,23,0xd1a12c);box(miner.head,0,.28,0,.58,.16,.55,0xf4cc39);box(miner.head,0,.24,.3,.16,.13,.09,0xfff6ba);
const buyung=character(12.2,25,0x30424d);box(buyung.head,0,.04,.215,.4,.11,.035,0x1c2630);
const worshippers=[
  {name:'Buyung',role:'CEO',position:'Imam',x:14,z:-6.35,color:0xf2eee0,delay:0},
  {name:'Muhammad',role:'COO',position:'Makmum',x:12.95,z:-3.55,color:0x82b4a5,delay:1.05},
  {name:'Anggit',role:'CTO',position:'Makmum',x:15.05,z:-3.55,color:0x8baac7,delay:1.05},
];
for(const person of worshippers){person.model=createPrayerCharacter(person.color);person.model.root.position.set(person.x,.455,person.z);person.model.root.rotation.y=Math.PI;scene.add(person.model.root);}

// DOM labels track real world positions and remain accessible buttons.
const tracked=[];
function label(text,x,y,z,cls,roomId,subtitle=''){const el=document.createElement('button');el.className=`world-label room-label ${cls}`;const b=document.createElement('b');b.textContent=text;el.append(b);if(subtitle){const small=document.createElement('small');small.textContent=subtitle;el.append(small);}el.addEventListener('click',()=>focusRoom(roomId));$('#labels').append(el);tracked.push({el,point:new THREE.Vector3(x,y,z),room:roomId});return el;}
for(const r of rooms.slice(1)){let cls=r.id;if(r.id==='mushola')cls='religion';label(`${r.icon} ${r.label||r.name}`,r.x,3.3,r.z-(r.d||8)/2,cls,r.id,['trading','meeting','admin'].includes(r.id)?'● online · CPU 4% · RAM 54%':'');}
label('🅿️ PARKIR KANTOR',-25,1,9,'','all');label('🏠 PINTU BELAKANG',-.8,1,-11,'farm','house');label('🚪 PINTU KEBUN',-2,1,12,'farm','farm');
label('🤖 EA V3.01',7,2.8,23,'mine','mine');label('😎 Buyung',12.2,2.5,25,'mine','mine');
for(const person of worshippers){
  const el=label(`${person.name} · ${person.role}`,person.x,2.7,person.z,'religion prayer-label','mushola',person.position);
  el.dataset.person=person.name;el.setAttribute('aria-label',`${person.name}, ${person.role}, ${person.position}`);person.label=el;
}
for(const a of agents){const el=document.createElement('button');el.className='world-label agent-label';el.style.setProperty('--agent-color',`#${a.color.toString(16).padStart(6,'0')}`);el.setAttribute('aria-label',`${a.name}, ${a.role}, lihat detail`);el.innerHTML=`<span class="speech ${a.status==='idle'?'zz':''}">${a.status==='idle'?'zZ':a.job}</span><span class="agent-tag"><span class="name"><i class="dot ${a.status}"></i>${a.emoji} ${a.name}</span><span class="agent-role">${a.role}</span></span>`;el.addEventListener('click',()=>showAgent(a));$('#labels').append(el);a.el=el;tracked.push({el,point:new THREE.Vector3(a.x,2.2,a.z),room:a.room,agent:true});}
let selected='all',demo=false,transition=null,modalAgent=null;
for(const r of rooms){const b=document.createElement('button');b.className='tab';b.dataset.room=r.id;b.setAttribute('aria-pressed',r.id==='all');b.innerHTML=`<span class="ic">${r.icon}</span>${r.name}`;b.addEventListener('click',()=>focusRoom(r.id));$('#tabs').append(b);}
function baseSpan(){return innerWidth<760?86:66;}
function resize(){const w=innerWidth,h=innerHeight,aspect=w/h;const span=baseSpan();camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();renderer.setSize(w,h);if(selected==='all')focusRoom('all',true);}
function focusRoom(id,immediate=false){const r=byId[id];if(!r)return;selected=id;document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-pressed',b.dataset.room===id));const mobile=innerWidth<760;const span=id==='all'?baseSpan():r.span*(mobile?1.65:1);const zoom=id==='all'?(mobile?.72:.92):baseSpan()/span;const target=new THREE.Vector3(r.x,id==='all'?8:2,r.z);const offset=defaultOffset.clone();const pos=target.clone().add(offset);
  transition={from:camera.position.clone(),to:pos,start:controls.target.clone(),target,zoomFrom:camera.zoom,zoomTo:zoom,time:performance.now(),duration:750};
  if(immediate){camera.position.copy(pos);controls.target.copy(target);camera.zoom=zoom;camera.updateProjectionMatrix();transition=null;controls.update();}
  $('#stage').dataset.focus=id;
}
controls.addEventListener('start',()=>{transition=null;});
$('#stage').addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('resize',resize);
addEventListener('keydown',e=>{if($('#agentDialog').open||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();transition=null;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);const delta=(e.key==='ArrowLeft'?right.multiplyScalar(-1):e.key==='ArrowRight'?right:e.key==='ArrowDown'?up.multiplyScalar(-1):up).multiplyScalar(1.5/camera.zoom);camera.position.add(delta);controls.target.add(delta);});
$('#zoomIn').onclick=()=>{transition=null;camera.zoom=Math.min(8,camera.zoom*1.25);camera.updateProjectionMatrix();};
$('#zoomOut').onclick=()=>{transition=null;camera.zoom=Math.max(.45,camera.zoom/1.25);camera.updateProjectionMatrix();};
$('#rotate').onclick=()=>{transition=null;const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/6);camera.position.copy(controls.target).add(offset);};
$('#reset').onclick=()=>focusRoom('all');
document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>focusRoom(b.dataset.focus));
function updateDemo(){for(const a of agents){a.el.querySelector('.dot').className=`dot ${demo?'working':a.status}`;a.el.querySelector('.speech').className=`speech ${!demo&&a.status==='idle'?'zz':''}`;a.el.querySelector('.speech').textContent=demo?a.job:a.status==='idle'?'zZ':a.job;}$('#activeCount').textContent=demo?'11 / 11':'0 / 11';$('#demo').setAttribute('aria-pressed',demo);if($('#agentDialog').open&&modalAgent)fillModal(modalAgent);}
$('#demo').onclick=()=>{demo=!demo;updateDemo();};
function fillModal(a){$('#modalEmoji').textContent=a.emoji;$('#modalName').textContent=a.name;$('#modalRole').textContent=a.role;const status=demo?'Sedang kerja':a.status==='idle'?'Santai':'Baru selesai (ngopi)';$('#modalDetails').innerHTML=`<dt>Status</dt><dd>${status}</dd><dt>Ruangan</dt><dd>${byId[a.room].name}</dd><dt>Framework</dt><dd>${a.name==='Raka'?'Hermes':'AI Agent'}</dd><dt>Koneksi</dt><dd>Simulasi lokal</dd>`;$('#modalActivity').textContent=demo?a.job:a.status==='idle'?'☕ Siaga, menunggu tugas berikutnya.':a.job;}
function showAgent(a){modalAgent=a;fillModal(a);$('#agentDialog').showModal();}
$('#closeDialog').onclick=()=>$('#agentDialog').close();
$('#agentDialog').addEventListener('click',e=>{if(e.target===$('#agentDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#goToAgent').onclick=()=>{$('#agentDialog').close();focusRoom(modalAgent.room);};
const projected=new THREE.Vector3();let lastShadow=0,lastFrame=null,prayerTime=0,lastPrayerPhase='';
function frame(now){requestAnimationFrame(frame);if(document.hidden)return;
  // Do not skip postures when returning from a background tab.
  prayerTime+=lastFrame===null?0:Math.min((now-lastFrame)/1000,.1);lastFrame=now;
  const localPrayerTime=prayerTime%(PRAYER_DURATION+5);
  for(const person of worshippers){const state=samplePrayer(Math.max(0,localPrayerTime-person.delay));person.model.apply(state.pose);person.label.dataset.posture=state.id;}
  const leader=samplePrayer(localPrayerTime);
  if(leader.id!==lastPrayerPhase){lastPrayerPhase=leader.id;$('#prayerPhase').textContent=`${leader.rakaat?'Rakaat '+leader.rakaat+' · ':''}${leader.label}`;$('#prayerStatus').dataset.phase=leader.id;}
  $('#prayerStatus').hidden=selected!=='mushola';
  if(transition){const t=Math.min(1,(now-transition.time)/transition.duration),k=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,k);controls.target.lerpVectors(transition.start,transition.target,k);camera.zoom=THREE.MathUtils.lerp(transition.zoomFrom,transition.zoomTo,k);camera.updateProjectionMatrix();if(t===1)transition=null;}
  controls.update();
  const overview=camera.zoom<1.8;$('#labels').classList.toggle('overview',overview);
  for(let i=0;i<agents.length;i++){const a=agents[i],t=now*.001+i;a.model.head.rotation.y=Math.sin(t*.65)*.15;a.model.arms.forEach((arm,j)=>{arm.rotation.x=demo?-.7+Math.sin(t*5+j)*.16:Math.sin(t*.8+j)*.035;});a.model.g.position.y=.3+(demo?Math.sin(t*2)*.025:0);}
  for(const l of tracked){projected.copy(l.point).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;const outside=projected.z>1||x<-200||x>innerWidth+200||y<-100||y>innerHeight+100;l.el.hidden=outside;l.el.style.display=outside?'none':'';if(!outside){l.el.style.transform=`translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;l.el.style.zIndex=String(Math.round((1-projected.z)*1000)+(l.agent?2:0));l.el.classList.toggle('faded',selected!=='all'&&l.room!==selected);}}
  if(now-lastShadow>1000){renderer.shadowMap.needsUpdate=true;lastShadow=now;}renderer.render(scene,camera);
}
resize();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);$('#loading').remove();$('#stage').dataset.ready='true';requestAnimationFrame(frame);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#errorMessage').textContent='Koneksi grafis terputus. Muat ulang halaman untuk melanjutkan.';});
