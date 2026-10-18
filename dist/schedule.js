// Daily timetable for every person. Pure data/logic so tests/schedule-preview.html can load it without Three.js.
import { TEAM } from './team.js';

const at=(h,m=0)=>h*60+m;
// Approximate Jakarta prayer times; iqamah is when the congregation starts.
export const PRAYERS={
  dzuhur:{id:'dzuhur',name:'Dzuhur',iqamah:at(12),rakaat:4,start:at(11,51)},
  ashar:{id:'ashar',name:'Ashar',iqamah:at(15,20),rakaat:4,start:at(15,11)},
};
export const LUNCH_LABELS={pantry:'🍱 Makan siang di Pantry',sport:'🏀 Main basket di Sport Hall',lobby:'🛋️ Santai di Lobby',desk:'🥡 Makan siang di meja'};
export const KIND_LABELS={work:'Sedang kerja',coffee:'Ngopi',prayer:'Sholat',lunch:'Istirahat',meeting:'Rapat',off:'Di luar kantor',oncall:'On-call'};

// Blocks run from start to the next block's start. place: desk | pantry | mushola | sport | lobby | meeting | parking.
export function dayPlan(p,weekend=false){
  const blocks=[];const add=(start,kind,place,label,extra={})=>blocks.push({start,kind,place,label,...extra});
  const night=p.onCall?['oncall','desk','📟 On-call · memantau server']:['off','parking','🌙 Di luar jam kerja'];
  if(weekend){add(0,...night);return close(blocks);}
  const o=p.offset,small=(o%3)/2,coffeeA=p.coffee==='A',coffee=p.coffee==='A'||p.coffee==='B';
  add(0,...night);
  add(at(7,30)+o,'work','desk',p.jobs[0]);
  if(coffee)add((coffeeA?at(10):at(10,18))+small,'coffee','pantry','☕ Ngopi di Pantry');
  add((coffeeA?at(10,15):at(10,33))+small,'work','desk',p.jobs[1]);
  add(PRAYERS.dzuhur.start+small,'prayer','mushola','🕌 Sholat Dzuhur berjamaah',{prayer:'dzuhur'});
  add(at(12,18),'lunch',p.lunch,LUNCH_LABELS[p.lunch]);
  add(at(13)+small,'work','desk',p.jobs[2]);
  if(p.meeting){add(at(14),'meeting','meeting','📊 Rapat mingguan di War Room');add(at(14,45),'work','desk',p.jobs[0]);}
  add(PRAYERS.ashar.start+small,'prayer','mushola','🕌 Sholat Ashar berjamaah',{prayer:'ashar'});
  if(!coffee)add(at(15,36),'work','desk',p.jobs[1]);
  else if(coffeeA){add(at(15,36),'coffee','pantry','☕ Ngopi sore di Pantry');add(at(15,51),'work','desk',p.jobs[1]);}
  else{add(at(15,36),'work','desk',p.jobs[1]);add(at(15,51)+small,'coffee','pantry','☕ Ngopi sore di Pantry');add(at(16,6)+small,'work','desk',p.jobs[2]);}
  if(p.onCall)add(at(17)+o,'oncall','desk','📟 On-call · memantau server');
  else add(at(17)+o,'off','parking','🏠 Sudah pulang');
  return close(blocks);
}
function close(blocks){blocks.forEach((b,i)=>b.end=blocks[i+1]?.start??1440);return blocks;}

// Seat keys (registered in rooms.js) for every place in each person's timetable.
export function seatPlan(team=TEAM){
  const men=team.filter(p=>!p.hijab&&!p.imam),women=team.filter(p=>p.hijab);
  const lunchSeat={pantry:i=>`pantry:${i}`,sport:i=>`sport:${i}`,lobby:i=>`sofa:${i}`,desk:()=>null};
  // Meeting seats: War Room chairs nobody uses as a desk.
  const meetingFree=[0,1,2,3,4,5,6,7].filter(i=>!team.some(p=>p.seat===`war:${i}`));
  return new Map(team.map((p,i)=>[p.id,{
    desk:p.seat,parking:`parking:${i}`,
    coffee:`pantry:${team.filter(q=>q.coffee===p.coffee).indexOf(p)}`,
    lunch:lunchSeat[p.lunch](team.filter(q=>q.lunch===p.lunch).indexOf(p))||p.seat,
    mushola:p.imam?'mushola:imam':p.hijab?`mushola:w${women.indexOf(p)}`:`mushola:m${men.indexOf(p)}`,
    meeting:p.seat.startsWith('war:')?p.seat:p.meeting?`war:${meetingFree.shift()}`:p.seat,
  }]));
}
export function seatKey(seats,block){
  if(block.place==='desk'||block.place==='parking'||block.place==='mushola'||block.place==='meeting')return seats[block.place];
  return block.kind==='coffee'?seats.coffee:seats.lunch;
}

const plans=new Map();
export function planFor(p,weekend=false){const key=p.id+(weekend?':we':'');if(!plans.has(key))plans.set(key,dayPlan(p,weekend));return plans.get(key);}
// Current block, previous block (where the person walks from) and the next one.
export function activityAt(p,minute,weekend=false){
  const plan=planFor(p,weekend),m=((minute%1440)+1440)%1440;
  let i=plan.findIndex(b=>m<b.end);if(i<0)i=plan.length-1;
  return {block:plan[i],prev:plan[i-1]||plan[i],next:plan[i+1]||null,index:i};
}

// Simulation speed in simulated minutes per real second.
const changeTimes=team=>[...new Set(team.flatMap(p=>planFor(p).slice(1).map(b=>b.start)))].sort((a,b)=>a-b);
let changes=changeTimes(TEAM);
// Call after people or roles change: plans are cached per person id.
export function setTeam(team){plans.clear();changes=changeTimes(team);}
export function simRate(minute,prayerMinutes){
  const m=((minute%1440)+1440)%1440;
  for(const pr of Object.values(PRAYERS))if(m>=pr.iqamah&&m<pr.iqamah+prayerMinutes)return 1/60;// prayers play in real time
  if(m<at(7,20)||m>at(17,30))return 10;// quiet night: ~600x
  if(changes.some(t=>m>=t&&m<t+6))return 1/6;// people walking: 10x
  return 1;// working: 60x
}

const wibFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function wibNow(date=new Date()){
  const parts=Object.fromEntries(wibFormat.formatToParts(date).map(x=>[x.type,x.value]));
  return {minute:+parts.hour*60+ +parts.minute+ +parts.second/60,weekend:parts.weekday==='Sat'||parts.weekday==='Sun',weekday:parts.weekday};
}
export const fmt=m=>{const v=((Math.floor(m)%1440)+1440)%1440;return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;};
export function parseTime(text){const match=/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/.exec(text||'');return match?Math.min(1439.99,+match[1]*60+ +match[2]+(+match[3]||0)/60):null;}
