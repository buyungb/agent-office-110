// Live activity from the office bridge (/api). Without a bridge (plain static hosting) the office stays simulated.
export function createLive(){
  const events=new Map();
  const live={available:false,connected:false,status:{},mode:{default:'sim'},team:null,events,onChange:()=>{}};
  const put=e=>events.set(e.id,e);
  function apply(type,data){
    if(type==='snapshot'){events.clear();data.events.forEach(put);live.status=data.status;live.mode=data.mode||live.mode;if(data.team)live.team=data.team;}
    else if(type==='activity')put(data);
    else if(type==='remove')events.delete(data.id);
    else if(type==='status')live.status=data;
    else if(type==='mode')live.mode=data;
    else if(type==='team')live.team=data;
    live.onChange(type,data);
  }
  live.start=async()=>{
    try{
      const res=await fetch('/api/state',{cache:'no-store'});
      if(!res.ok||!res.headers.get('content-type')?.includes('json'))return live;
      apply('snapshot',await res.json());live.available=true;
    }catch{return live;}
    const source=new EventSource('/api/stream');
    for(const type of ['snapshot','activity','remove','status','mode','team'])source.addEventListener(type,e=>apply(type,JSON.parse(e.data)));
    source.onopen=()=>{live.connected=true;live.onChange('connection');};
    source.onerror=()=>{live.connected=false;live.onChange('connection');};
    return live;
  };
  // Active events for one person, newest first; expired ones are dropped on read.
  live.forPerson=id=>{const now=Date.now(),out=[];for(const e of events.values()){if(e.until<=now){events.delete(e.id);continue;}if(e.person===id)out.push(e);}return out.sort((a,b)=>b.start-a.start);};
  live.byKind=kind=>{const now=Date.now();return [...events.values()].filter(e=>e.kind===kind&&e.until>now);};
  return live;
}
// Which live event moves a person (place) and which only changes the bubble (overlay).
const MOVE_RANK={leave:4,meeting:3,intent:2};
export function pickOverride(list){return list.filter(e=>MOVE_RANK[e.kind]&&(e.kind!=='intent'||e.place)).sort((a,b)=>MOVE_RANK[b.kind]-MOVE_RANK[a.kind]||b.start-a.start)[0]||null;}
export function pickOverlay(list){return list.find(e=>e.kind==='typing')||list.find(e=>e.kind==='chat')||list.find(e=>e.kind==='intent'&&!e.place)||null;}
