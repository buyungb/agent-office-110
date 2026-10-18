// Team data and rules, shared by the browser and the bridge (no imports, no DOM).
// These are the defaults; when a bridge is deployed, people and roles are edited in ⚙️ → Tim and stored there.

// Desk seats registered in rooms.js. The seat decides a person's home room.
const SEAT_GROUPS={house:['house',3,'Ruang Direksi'],ailab:['trading',4,'AI Lab'],studio:['admin',8,'Product Studio'],dc:['dc',1,'Data Center'],compliance:['medical',1,'Compliance Lab'],war:['meeting',8,'War Room'],reception:['lobby',1,'Lobby']};
export const SEATS=Object.entries(SEAT_GROUPS).flatMap(([group,[room,n,name]])=>[...Array(n)].map((_,i)=>({key:`${group}:${i}`,room,label:`${name} · meja ${i+1}`})));
export const ROOM_NAMES=Object.fromEntries(Object.values(SEAT_GROUPS).map(([room,,name])=>[room,name]));
// Places that limit how many people a timetable block can hold.
export const CAPACITY={desks:SEATS.length,men:15,women:12,coffeeShift:12,lunch:{pantry:12,sport:4,lobby:4},war:8};

// Role catalog: defaults a person inherits unless they override emoji, colour or jobs.
export const DEFAULT_ROLES=[
  {id:'ceo',name:'CEO',emoji:'😎',color:'#1f2a44',room:'house',jobs:['🧭 Menyusun strategi & roadmap APLINDO','🤝 Review kemitraan dan klien enterprise','📈 Meninjau PnL produk SaaS']},
  {id:'coo',name:'COO',emoji:'🧭',color:'#2f5d50',room:'house',jobs:['⚙️ Memantau operasional & delivery proyek','📋 Review SLA dan kapasitas tim','🧾 Approve anggaran operasional']},
  {id:'cto',name:'CTO',emoji:'💻',color:'#34507a',room:'house',jobs:['🏗️ Review arsitektur multi-tenant','🔐 Audit keamanan & SOC 2 readiness','🤖 Mengarahkan riset applied AI']},
  {id:'ai-engineer',name:'AI Engineer',emoji:'🧠',color:'#2e8bc0',room:'trading',jobs:['🧠 Membangun pipeline RAG','🤖 Melatih agent & copilot','🧪 Menjalankan eval model']},
  {id:'qa-eval',name:'QA & Eval Engineer',emoji:'🧪',color:'#4b933c',room:'trading',jobs:['🧪 Menulis test otomatis','📊 Eval-driven QA rilis AI','🐞 Reproduksi bug produksi']},
  {id:'product-manager',name:'Product Manager',emoji:'🗂️',color:'#c0567a',room:'admin',jobs:['🗺️ Menyusun roadmap ApartmentERP','📝 Menulis PRD fitur baru','📞 Interview pengguna RTPintar']},
  {id:'backend',name:'Backend Engineer',emoji:'⚙️',color:'#505aa5',room:'admin',jobs:['⚙️ Membangun API SealRoute','🗄️ Optimasi query multi-tenant','🚀 Deploy ke staging']},
  {id:'uiux',name:'UI/UX Designer',emoji:'🎨',color:'#985e9e',room:'admin',jobs:['🎨 Desain dashboard Patuh.ai','🧩 Update design system','📱 Prototype mobile RTPintar']},
  {id:'finance',name:'Finance & Admin',emoji:'💰',color:'#7f9a3a',room:'admin',jobs:['🧾 Rekap invoice & billing','💰 Laporan PnL SaaS','📑 Administrasi kontrak klien']},
  {id:'devops',name:'DevOps / SRE',emoji:'🛰️',color:'#2f9aa6',room:'dc',jobs:['🛰️ Memantau uptime & alert','🐳 Upgrade cluster kontainer','💾 Verifikasi backup harian']},
  {id:'compliance',name:'Compliance Lead',emoji:'🛡️',color:'#c98a2b',room:'medical',jobs:['🛡️ Gap analysis ISO 27001','📂 Mengumpulkan evidence audit','⚖️ Review kepatuhan UU PDP']},
  {id:'sales',name:'Sales & Partnership',emoji:'🤝',color:'#c8463c',room:'meeting',jobs:['🤝 Demo produk ke calon klien','📈 Update pipeline penjualan','✉️ Follow-up proposal enterprise']},
  {id:'marketing',name:'Marketing & Konten',emoji:'📣',color:'#e07a5f',room:'meeting',jobs:['📣 Menyiapkan konten insight','🎬 Video demo BlastifyX','📊 Analisis kampanye']},
  {id:'customer-success',name:'Customer Success',emoji:'💬',color:'#903db0',room:'lobby',jobs:['💬 Membalas tiket via BlastifyX','📞 Onboarding klien baru','🙂 Survey kepuasan pelanggan']},
];
// People. seat: a key from SEATS. coffee: shift A/B or none. lunch: pantry | sport | lobby | desk. gender L/P sets prayer row and attire.
// emoji/color/jobs: null inherits from the role. hair (L) and hijab (P) are colours.
const person=(id,name,short,roleId,gender,seat,extra)=>({id,name,short,roleId,gender,seat,coffee:'A',lunch:'pantry',meeting:false,onCall:false,imam:false,offset:0,emoji:null,color:null,jobs:null,hair:'#24211f',hijab:'#6d4c7d',glasses:false,...extra});
export const DEFAULT_PEOPLE=[
  person('buyung','Buyung Bahari','Buyung','ceo','L','house:0',{hair:'#1d1f22',glasses:true,imam:true,meeting:true,offset:2}),
  person('muhammad','Muhammad','Muhammad','coo','L','house:1',{hair:'#2a2420',meeting:true,offset:5}),
  person('anggit','Anggit','Anggit','cto','L','house:2',{hair:'#22201e',coffee:'B',meeting:true,offset:8}),
  person('arka','Arka','Arka','ai-engineer','L','ailab:0',{hair:'#2b2622',lunch:'sport',offset:1}),
  person('satria','Satria','Satria','qa-eval','L','ailab:1',{hair:'#1e1b19',coffee:'B',lunch:'sport',offset:6}),
  person('sekar','Sekar','Sekar','product-manager','P','studio:0',{hijab:'#6d4c7d',meeting:true,offset:3}),
  person('damar','Damar','Damar','backend','L','studio:1',{coffee:'B',lunch:'sport',offset:9}),
  person('kirana','Kirana','Kirana','uiux','P','studio:2',{hijab:'#e3a6b9',lunch:'lobby',offset:4}),
  person('dewi','Dewi','Dewi','finance','P','studio:3',{hijab:'#3f6b5a',coffee:'B',offset:7}),
  person('bima','Bima','Bima','devops','L','dc:0',{hair:'#1f1c1a',onCall:true,offset:0}),
  person('laras','Laras','Laras','compliance','P','compliance:0',{hijab:'#8a5a2b',coffee:'B',lunch:'lobby',offset:5}),
  person('gilang','Gilang','Gilang','sales','L','war:0',{hair:'#2a2521',lunch:'sport',meeting:true,offset:10}),
  person('tara','Tara','Tara','marketing','P','war:1',{hijab:'#2f4f6f',coffee:'B',lunch:'lobby',meeting:true,offset:2}),
  person('wulan','Wulan','Wulan','customer-success','P','reception:0',{hijab:'#d8c3e8',coffee:'B',offset:0}),
];
export const DEFAULT_TEAM={roles:DEFAULT_ROLES,people:DEFAULT_PEOPLE};

const HEX=/^#[0-9a-f]{6}$/i,ID=/^[a-z0-9][a-z0-9-]{0,23}$/;
const num=c=>parseInt(String(c).slice(1),16);
const str=(v,max)=>String(v??'').trim().slice(0,max);
const bool=v=>v===true||v==='true'||v==='on';
// Coerces untrusted input into the stored shape (types, lengths, allowed values). Does not judge capacity.
export function normalizeTeam(data){
  const roles=(Array.isArray(data?.roles)?data.roles:[]).map(r=>({id:str(r.id,24).toLowerCase(),name:str(r.name,40),emoji:str(r.emoji,8),color:HEX.test(r.color)?r.color.toLowerCase():'#6688aa',room:ROOM_NAMES[r.room]?r.room:'admin',jobs:[0,1,2].map(i=>str(r.jobs?.[i],60))}));
  const people=(Array.isArray(data?.people)?data.people:[]).map(p=>({
    id:str(p.id,24).toLowerCase(),name:str(p.name,40),short:str(p.short||p.name,16),roleId:str(p.roleId,24),gender:p.gender==='P'?'P':'L',seat:str(p.seat,20),
    coffee:['A','B','none'].includes(p.coffee)?p.coffee:'A',lunch:['pantry','sport','lobby','desk'].includes(p.lunch)?p.lunch:'pantry',meeting:bool(p.meeting),onCall:bool(p.onCall),imam:bool(p.imam),
    offset:Math.max(0,Math.min(15,Math.round(Number(p.offset)||0))),emoji:str(p.emoji,8)||null,color:HEX.test(p.color)?p.color.toLowerCase():null,
    jobs:Array.isArray(p.jobs)&&p.jobs.some(j=>str(j,60))?[0,1,2].map(i=>str(p.jobs[i],60)):null,
    hair:HEX.test(p.hair)?p.hair.toLowerCase():'#24211f',hijab:HEX.test(p.hijab)?p.hijab.toLowerCase():'#6d4c7d',glasses:bool(p.glasses)}));
  return {roles,people};
}
// Returns a list of problems (empty when the team is usable).
export function validateTeam(data){
  const {roles,people}=data,errors=[],roleIds=new Set(),ids=new Set(),seats=new Map(),seatKeys=new Set(SEATS.map(s=>s.key));
  if(!roles.length)errors.push('Minimal harus ada satu peran.');
  for(const r of roles){if(!ID.test(r.id))errors.push(`ID peran "${r.id}" tidak valid (huruf kecil, angka, tanda minus).`);if(roleIds.has(r.id))errors.push(`ID peran "${r.id}" dipakai dua kali.`);roleIds.add(r.id);if(!r.name)errors.push(`Peran "${r.id}" belum diberi nama.`);if(r.jobs.some(j=>!j))errors.push(`Peran "${r.name||r.id}" butuh 3 pekerjaan.`);}
  if(!people.length)errors.push('Minimal harus ada satu orang.');
  if(people.length>CAPACITY.desks)errors.push(`Maksimal ${CAPACITY.desks} orang (jumlah meja).`);
  for(const p of people){
    const who=p.short||p.id;
    if(!ID.test(p.id))errors.push(`ID "${p.id}" tidak valid.`);if(ids.has(p.id))errors.push(`ID "${p.id}" dipakai dua kali.`);ids.add(p.id);
    if(!p.name)errors.push(`Orang "${p.id}" belum diberi nama.`);
    if(!roleIds.has(p.roleId))errors.push(`${who}: peran "${p.roleId}" tidak ada di katalog.`);
    if(!seatKeys.has(p.seat))errors.push(`${who}: meja "${p.seat}" tidak ada.`);else if(seats.has(p.seat))errors.push(`${who} dan ${seats.get(p.seat)} memakai meja yang sama.`);else seats.set(p.seat,who);
    if(p.imam&&p.gender!=='L')errors.push(`${who}: imam harus laki-laki.`);
  }
  const imams=people.filter(p=>p.imam);
  if(people.length&&imams.length!==1)errors.push(imams.length?`Hanya boleh satu imam (sekarang ${imams.map(p=>p.short).join(', ')}).`:'Pilih satu imam untuk sholat berjamaah.');
  const count=f=>people.filter(f).length,full=(n,max,what)=>{if(n>max)errors.push(`${what} penuh: ${n}/${max}.`);};
  full(count(p=>p.gender==='L'),CAPACITY.men,'Saf laki-laki');full(count(p=>p.gender==='P'),CAPACITY.women,'Saf perempuan');
  for(const s of ['A','B'])full(count(p=>p.coffee===s),CAPACITY.coffeeShift,`Pantry shift ngopi ${s}`);
  for(const [place,max] of Object.entries(CAPACITY.lunch))full(count(p=>p.lunch===place),max,`Makan siang di ${place==='pantry'?'Pantry':place==='sport'?'Sport Hall':'Lobby'}`);
  const warDesks=count(p=>p.seat.startsWith('war:'));
  full(count(p=>p.meeting&&!p.seat.startsWith('war:')),CAPACITY.war-warDesks,'Kursi rapat War Room');
  return errors;
}
// The shape the office code uses: role name, inherited emoji/colour/jobs, numeric colours, home room from the seat.
export function resolveTeam(data){
  const roles=new Map(data.roles.map(r=>[r.id,r]));
  return data.people.map(p=>{const r=roles.get(p.roleId)||data.roles[0]||{name:'',emoji:'🙂',color:'#6688aa',jobs:['','','']};const jobs=p.jobs||r.jobs;
    return {id:p.id,name:p.name,short:p.short||p.name,roleId:p.roleId,role:r.name,emoji:p.emoji||r.emoji,color:num(p.color||r.color),gender:p.gender,
      hair:num(p.hair),hijab:p.gender==='P'?num(p.hijab):null,glasses:p.glasses,imam:p.imam,seat:p.seat,home:SEATS.find(s=>s.key===p.seat)?.room||'admin',
      coffee:p.coffee,lunch:p.lunch,meeting:p.meeting,onCall:p.onCall,offset:p.offset,jobs:[0,1,2].map(i=>jobs[i]||r.jobs[i]||'💼 Bekerja')};});
}
export const TEAM=resolveTeam(DEFAULT_TEAM);

// Descriptions are quoted from https://aplindo.tech. PnL figures are sample data (juta rupiah), not real results.
export const PRODUCTS = [
  {id:'apartmenterp',name:'ApartmentERP',color:'#4fc3f7',pnl:128,desc:'All-in-one apartment facility management — units, residents, maintenance, billing, and operations.'},
  {id:'sealroute',name:'SealRoute',color:'#ffb74d',pnl:64,desc:'Self-hosted document signing — send, sign, and seal on your infrastructure.'},
  {id:'sealroutesign',name:'SealRoute Sign',color:'#ff8a65',pnl:52,desc:'Bulk document signing at scale — email, WhatsApp, and real-time tracking.'},
  {id:'patuh',name:'Patuh.ai',color:'#81c784',pnl:97,desc:'Multi-ISO compliance platform — one place for standards, evidence, and audit readiness.'},
  {id:'rtpintar',name:'RTPintar',color:'#ba68c8',pnl:41,desc:'Community billing and IPL management — automated collections via WhatsApp.'},
  {id:'blastifyx',name:'BlastifyX',color:'#4db6ac',pnl:86,desc:'WhatsApp engagement engine for sales and support — AI agents, humans, 24/7.'},
];
