import * as THREE from 'three';

// Jointed person rig, 1 unit = 1 m (~1.78 m tall). Local +Z is forward; feet rest on y=0.
// A pose stores joint positions; segments are stretched between joints every frame.
export const STANDING = {
  hip:[0,.83,0], bend:0, neck:0, turn:0,
  knees:[[-.16,.43,.015],[.16,.43,.015]],
  ankles:[[-.16,.10,0],[.16,.10,0]],
  feet:[[-.16,.055,.09],[.16,.055,.09]], footTilt:[0,0], footTurn:[0,0],
  elbows:[[-.33,1.15,.04],[.33,1.15,.04]],
  wrists:[[-.33,.98,.07],[.33,.98,.07]], palms:[0,0], finger:0, cup:0, phone:0,
};
export const pose=(base,changes)=>({...base,...changes});
export function mix(a,b,t){if(Array.isArray(a))return a.map((v,i)=>mix(v,b[i],t));return a+(b-a)*t;}
export function mixPose(a,b,t){const out={};for(const key of Object.keys(b))out[key]=key in a?mix(a[key],b[key],t):b[key];return out;}

// Seat top 0.42 m, desk top 0.72 m: thighs horizontal, shins vertical, hands forward over the desk.
const SIT = pose(STANDING,{
  hip:[0,.52,-.02], neck:.05,
  knees:[[-.13,.47,.40],[.13,.47,.40]],
  ankles:[[-.13,.10,.44],[.13,.10,.44]],
  feet:[[-.13,.055,.53],[.13,.055,.53]],
  elbows:[[-.31,.82,.18],[.31,.82,.18]],
  wrists:[[-.2,.68,.38],[.2,.68,.38]],
});
export const POSES_DAILY = {
  stand:STANDING,
  sit:SIT,
  typing:pose(SIT,{neck:.16,elbows:[[-.3,.86,.24],[.3,.86,.24]],wrists:[[-.17,.79,.56],[.17,.79,.56]]}),
  sitCup:pose(SIT,{cup:1,elbows:[[-.3,.86,.24],[.3,.86,.2]],wrists:[[-.17,.78,.5],[.2,.86,.42]]}),
  drink:pose(SIT,{cup:1,neck:-.12,elbows:[[-.3,.86,.24],[.32,.98,.2]],wrists:[[-.17,.78,.5],[.12,1.26,.24]]}),
  play:pose(STANDING,{hip:[0,.8,.02],knees:[[-.18,.42,.08],[.18,.42,.08]],elbows:[[-.36,1.08,.14],[.36,1.08,.18]],wrists:[[-.3,.92,.3],[.28,.86,.38]]}),
  // Holding a phone in front of the chest (WhatsApp activity).
  sitPhone:pose(SIT,{phone:1,neck:.32,elbows:[[-.27,.84,.16],[.27,.84,.16]],wrists:[[-.07,1,.34],[.07,1,.34]]}),
  standPhone:pose(STANDING,{phone:1,neck:.32,elbows:[[-.28,1.14,.12],[.28,1.14,.12]],wrists:[[-.07,1.3,.3],[.07,1.3,.3]]}),
};
// Procedural walk cycle; phase advances with distance walked.
export function walkPose(phase){
  const p=pose(STANDING,{});const s=Math.sin(phase),c=Math.cos(phase);
  p.hip=[0,.83+Math.abs(c)*.025,0];
  p.knees=[0,1].map(i=>{const k=i?-s:s;return [i?.16:-.16,.43+Math.max(0,k)*.05,.015+k*.13];});
  p.ankles=[0,1].map(i=>{const k=i?-s:s,lift=Math.max(0,i?c:-c)*.09;return [i?.16:-.16,.10+lift,k*.2];});
  p.feet=p.ankles.map(a=>[a[0],a[1]-.045,a[2]+.09]);
  p.elbows=[0,1].map(i=>{const k=i?s:-s;return [i?.33:-.33,1.15,.04+k*.1];});
  p.wrists=[0,1].map(i=>{const k=i?s:-s;return [i?.33:-.33,.98,.07+k*.17];});
  return p;
}

const cube=new THREE.BoxGeometry(1,1,1);
const Y=new THREE.Vector3(0,1,0);
const matCache=new Map();
const lambert=c=>{if(!matCache.has(c))matCache.set(c,new THREE.MeshLambertMaterial({color:c}));return matCache.get(c);};
// options: color (shirt), trousers, skin, hair, hijab (scarf color, implies female), glasses, scale.
export function createPerson({color=0x6688aa,trousers=0x37414a,skin=0xd5ab87,hair=0x293331,hijab=null,glasses=false,scale=1}={}){
  const root=new THREE.Group();root.scale.setScalar(scale);
  const white=lambert(0xf6f3ea),fabric=lambert(color),pants=lambert(trousers),skinMat=lambert(skin),hairMat=lambert(hair),dark=lambert(0x262a2e);
  const parts=[];
  function part(parent,w,h,d,material,role){const m=new THREE.Mesh(cube,material);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;m.userData.base=material;m.userData.role=role;parent.add(m);parts.push(m);return m;}
  const torso=new THREE.Group();root.add(torso);
  const shirt=part(torso,.50,.55,.28,fabric,'cloth');shirt.position.y=.28;
  const collar=part(torso,.17,.045,.29,hijab?lambert(hijab):white,hijab?'scarf':'collar');collar.position.y=.555;
  const head=new THREE.Group();head.position.y=.76;torso.add(head);
  part(head,.34,.35,.32,skinMat,'skin');
  for(const x of [-.08,.08]){const eye=part(head,.04,.018,.013,dark,'eye');eye.position.set(x,0,.162);}
  const nose=part(head,.06,.075,.06,skinMat,'skin');nose.position.set(0,-.055,.181);
  if(glasses){const lens=part(head,.3,.06,.02,lambert(0x14181d),'glasses');lens.position.set(0,.01,.172);}
  // Everyday head: hair for men, an open-face hijab for women.
  const everyday=new THREE.Group();head.add(everyday);
  if(hijab){const scarf=lambert(hijab);
    part(everyday,.39,.09,.37,scarf,'scarf').position.set(0,.19,-.01);
    part(everyday,.39,.42,.07,scarf,'scarf').position.set(0,-.02,-.18);
    for(const x of [-.185,.185])part(everyday,.035,.42,.34,scarf,'scarf').position.set(x,-.02,-.005);
    part(everyday,.46,.1,.34,scarf,'scarf').position.set(0,-.2,-.02);
  }else{part(everyday,.36,.08,.34,hairMat,'hair').position.set(0,.19,-.01);part(everyday,.35,.2,.05,hairMat,'hair').position.set(0,.06,-.165);}
  // Prayer attire: kopiah for men, white mukena hood for women.
  const prayerHead=new THREE.Group();prayerHead.visible=false;head.add(prayerHead);
  if(hijab){part(prayerHead,.41,.1,.39,white,'mukena').position.set(0,.19,-.01);part(prayerHead,.41,.46,.08,white,'mukena').position.set(0,-.02,-.19);for(const x of [-.195,.195])part(prayerHead,.04,.46,.36,white,'mukena').position.set(x,-.02,-.005);part(prayerHead,.62,.16,.4,white,'mukena').position.set(0,-.22,-.02);}
  else{part(prayerHead,.365,.105,.28,white,'cap').position.set(0,.18,-.04);part(prayerHead,.37,.025,.30,hairMat,'cap').position.set(0,.135,-.04);}
  const limb=(material,width,depth,role)=>part(root,width,1,depth,material,role);
  const arms=[-1,1].map(()=>({upper:limb(fabric,.16,.19,'cloth'),lower:limb(fabric,.14,.16,'cloth'),hand:part(root,.14,.07,.20,skinMat,'skin')}));
  const legs=[-1,1].map(()=>({upper:limb(pants,.19,.23,'pants'),lower:limb(pants,.17,.20,'pants'),foot:part(root,.18,.10,.30,skinMat,'skin')}));
  const finger=part(root,.026,.028,.12,skinMat,'skin');
  const cup=part(root,.09,.11,.09,white,'cup');
  const phone=part(root,.08,.15,.018,lambert(0x14181f),'phone');const screenGlow=part(phone,.8,.82,1.2,new THREE.MeshBasicMaterial({color:0x52e0ff}),'screen');screenGlow.position.z=.3;
  const shoulder=new THREE.Vector3(),hip=new THREE.Vector3(),temp=new THREE.Vector3(),elbow=new THREE.Vector3(),wrist=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3();
  const bend=new THREE.Quaternion(),X=new THREE.Vector3(1,0,0);
  function segment(mesh,a,b){temp.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=Math.max(.001,temp.length());mesh.quaternion.setFromUnitVectors(Y,temp.normalize());}
  function apply(p){
    torso.position.fromArray(p.hip);torso.rotation.x=p.bend;head.rotation.set(p.neck,p.turn,0);
    bend.setFromAxisAngle(X,p.bend);
    for(let i=0;i<2;i++){
      const s=i?1:-1,arm=arms[i],leg=legs[i];
      shoulder.set(s*.29,.51,0).applyQuaternion(bend).add(torso.position);
      elbow.fromArray(p.elbows[i]);wrist.fromArray(p.wrists[i]);
      segment(arm.upper,shoulder,elbow);segment(arm.lower,elbow,wrist);
      arm.hand.position.copy(wrist);arm.hand.rotation.set(p.palms[i],0,0);
      hip.set(s*.16,0,0).add(torso.position);
      knee.fromArray(p.knees[i]);ankle.fromArray(p.ankles[i]);
      segment(leg.upper,hip,knee);segment(leg.lower,knee,ankle);
      leg.foot.position.fromArray(p.feet[i]);leg.foot.rotation.set(p.footTilt[i],p.footTurn[i],0);
    }
    finger.visible=p.finger>.5;
    finger.position.set(p.wrists[1][0]-.025,p.wrists[1][1]+.065,p.wrists[1][2]+.09);finger.rotation.x=-.55;
    cup.visible=(p.cup||0)>.5;cup.position.set(p.wrists[1][0],p.wrists[1][1]+.08,p.wrists[1][2]+.02);
    phone.visible=(p.phone||0)>.5;phone.position.set((p.wrists[0][0]+p.wrists[1][0])/2,(p.wrists[0][1]+p.wrists[1][1])/2+.07,(p.wrists[0][2]+p.wrists[1][2])/2+.02);phone.rotation.x=-.5;
  }
  // Women wear a white mukena over everything while praying; men add a kopiah.
  let attire=false;
  function setPrayerAttire(on){
    if(on===attire)return;attire=on;everyday.visible=!on;prayerHead.visible=on;
    if(hijab)for(const m of parts)if(['cloth','pants','scarf'].includes(m.userData.role))m.material=on?white:m.userData.base;
  }
  apply(STANDING);
  return {root,apply,head,torso,setPrayerAttire};
}
