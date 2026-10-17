// Walking routes: corridor graph between room doors, then straight segments inside rooms.
export function createNav(){
  const nodes=new Map(),edges=new Map();
  function node(id,x,z){nodes.set(id,[x,z]);if(!edges.has(id))edges.set(id,new Set());return id;}
  function link(a,b){edges.get(a).add(b);edges.get(b).add(a);}
  // Nodes sharing a corridor line are chained in order along it.
  function corridor(ids,axis='x'){const k=axis==='x'?0:1;const sorted=[...ids].sort((a,b)=>nodes.get(a)[k]-nodes.get(b)[k]);for(let i=1;i<sorted.length;i++)link(sorted[i-1],sorted[i]);}
  const dist=(a,b)=>Math.hypot(nodes.get(a)[0]-nodes.get(b)[0],nodes.get(a)[1]-nodes.get(b)[1]);
  function shortest(from,to){
    if(from===to)return [from];
    const best=new Map([[from,0]]),prev=new Map(),open=new Set([from]);
    while(open.size){
      let cur=null;for(const id of open)if(cur===null||best.get(id)<best.get(cur))cur=id;
      open.delete(cur);if(cur===to)break;
      for(const next of edges.get(cur)){const d=best.get(cur)+dist(cur,next);if(d<(best.get(next)??Infinity)){best.set(next,d);prev.set(next,cur);open.add(next);}}
    }
    const path=[to];while(path[0]!==from){const p=prev.get(path[0]);if(p===undefined)return [from,to];path.unshift(p);}
    return path;
  }
  // A spot is {x,z,room,via}; a room is {doorIn:[x,z], doorOut:nodeId}.
  const cache=new Map();
  function route(a,b){
    const key=a.key+'>'+b.key;if(cache.has(key))return cache.get(key);
    const pts=[[a.x,a.z],...[...a.via].reverse()];
    if(a.room!==b.room){
      pts.push(a.room.doorIn);
      for(const id of shortest(a.room.doorOut,b.room.doorOut))pts.push(nodes.get(id));
      pts.push(b.room.doorIn);
    }
    pts.push(...b.via,[b.x,b.z]);
    const clean=pts.filter((p,i)=>!i||Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])>.01);
    const cum=[0];for(let i=1;i<clean.length;i++)cum.push(cum[i-1]+Math.hypot(clean[i][0]-clean[i-1][0],clean[i][1]-clean[i-1][1]));
    const result={points:clean,cum,length:cum[cum.length-1]};cache.set(key,result);return result;
  }
  return {node,link,corridor,route,nodes,edges};
}
// Position and heading (rotation.y for a +Z-forward model) at a distance along a route.
export function sampleRoute(r,d){
  const pts=r.points;if(pts.length<2)return {x:pts[0][0],z:pts[0][1],heading:null};
  let i=1;while(i<pts.length-1&&r.cum[i]<d)i++;
  const a=pts[i-1],b=pts[i],len=r.cum[i]-r.cum[i-1]||1,t=Math.max(0,Math.min(1,(d-r.cum[i-1])/len));
  return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,heading:Math.atan2(b[0]-a[0],b[1]-a[1])};
}
