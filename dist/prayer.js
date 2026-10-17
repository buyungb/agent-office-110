import * as THREE from 'three';

// Local +Z faces the qibla. The parent is rotated toward the room's mihrab.
// Pose holds include stillness; movements are interpolated only on entry.
const standing = {
  hip:[0,.83,0], bend:0, neck:0, turn:0,
  knees:[[-.16,.43,.015],[.16,.43,.015]],
  ankles:[[-.16,.10,0],[.16,.10,0]],
  feet:[[-.16,.055,.09],[.16,.055,.09]], footTilt:[0,0], footTurn:[0,0],
  elbows:[[-.33,1.15,.04],[.33,1.15,.04]],
  wrists:[[-.33,.98,.07],[.33,.98,.07]], palms:[0,0], finger:0,
};
const pose=(base,changes)=>({...base,...changes});
export const POSES = {
  stand:standing,
  takbir:pose(standing,{
    elbows:[[-.44,1.18,.06],[.44,1.18,.06]],
    wrists:[[-.34,1.58,.09],[.34,1.58,.09]],palms:[Math.PI/2,Math.PI/2],
  }),
  qiyam:pose(standing,{
    elbows:[[-.34,1.14,.1],[.34,1.14,.1]],
    // Right palm lies over the left hand on the chest.
    wrists:[[.055,1.26,.23],[-.035,1.285,.285]],palms:[0,0],neck:.09,
  }),
  ruku:pose(standing,{
    hip:[0,.83,-.13],bend:Math.PI/2,
    elbows:[[-.29,.69,.33],[.29,.69,.33]],
    wrists:[[-.17,.46,.055],[.17,.46,.055]],palms:[.3,.3],
  }),
  kneel:pose(standing,{
    hip:[0,.46,.10],bend:.22,
    knees:[[-.16,.105,.46],[.16,.105,.46]],
    ankles:[[-.16,.105,-.03],[.16,.105,-.03]],
    feet:[[-.16,.16,-.04],[.16,.16,-.04]],footTilt:[1.1,1.1],
    elbows:[[-.33,.72,.24],[.33,.72,.24]],
    wrists:[[-.18,.30,.48],[.18,.30,.48]],
  }),
  sujud:pose(standing,{
    hip:[0,.51,.32],bend:1.97,
    knees:[[-.18,.105,.5],[.18,.105,.5]],
    ankles:[[-.16,.11,-.03],[.16,.11,-.03]],
    feet:[[-.16,.16,-.04],[.16,.16,-.04]],footTilt:[1.1,1.1],
    // Forehead/nose, both palms, knees and toes reach the mat.
    // Elbows remain lifted and away from the torso.
    elbows:[[-.43,.37,.73],[.43,.37,.73]],
    wrists:[[-.31,.052,1.015],[.31,.052,1.015]],palms:[0,0],
  }),
  sit:pose(standing,{
    hip:[0,.32,-.09],bend:0,neck:.05,
    knees:[[-.18,.115,.41],[.18,.115,.41]],
    ankles:[[-.15,.13,-.15],[.17,.13,-.11]],
    feet:[[-.12,.06,-.14],[.17,.16,-.11]],footTilt:[0,1.1],footTurn:[-.55,0],
    elbows:[[-.31,.64,.06],[.31,.64,.06]],
    wrists:[[-.18,.235,.31],[.18,.235,.31]],palms:[0,0],
  }),
};
POSES.tashahhud=pose(POSES.sit,{
  hip:[-.12,.29,-.12],
  // Tawarruk: seat lowered to the left, left foot passing under right leg.
  ankles:[[.18,.15,-.12],[.22,.15,-.10]],
  feet:[[.29,.055,-.08],[.22,.16,-.10]],footTilt:[0,1.1],footTurn:[Math.PI/2,0],finger:1,
});
POSES.salamRight=pose(POSES.tashahhud,{neck:0,turn:-1.15,finger:0});
POSES.salamLeft=pose(POSES.tashahhud,{neck:0,turn:1.15,finger:0});
POSES.finish=pose(POSES.tashahhud,{neck:0,turn:0,finger:0});

export const PRAYER_STEPS=[];
function step(id,label,key,hold,transition=1,rakaat=0){PRAYER_STEPS.push({id,label,key,hold,transition,rakaat});}
step('prepare','Persiapan','stand',2,.6);
step('takbir','Takbiratul ihram','takbir',2,.8,1);
function rakaat(n){
  step(`qiyam-${n}`,'Berdiri bersedekap','qiyam',9,1,n);
  step(`raise-ruku-${n}`,'Takbir menuju rukuk','takbir',.6,.65,n);
  step(`ruku-${n}`,'Rukuk','ruku',5,1.3,n);
  step(`rise-${n}`,'Bangkit dari rukuk','takbir',.6,1.3,n);
  step(`itidal-${n}`,'Iktidal','stand',3.8,.7,n);
  step(`kneel-${n}`,'Turun menuju sujud','kneel',.2,1.25,n);
  step(`sujud-first-${n}`,'Sujud pertama','sujud',5,1.2,n);
  step(`sit-${n}`,'Duduk di antara dua sujud','sit',4,1.2,n);
  step(`sujud-second-${n}`,'Sujud kedua','sujud',5,1.2,n);
}
rakaat(1);
step('rest-1','Duduk sebelum berdiri','sit',.6,1,1);
step('stand-2','Berdiri rakaat kedua','stand',.5,1.4,2);
rakaat(2);
step('tashahhud','Tasyahud akhir','tashahhud',9,1.5,2);
step('salam-right','Salam ke kanan','salamRight',2,1,2);
step('salam-left','Salam ke kiri','salamLeft',2,1,2);
step('finish','Selesai salat','finish',4,1);
step('return','Kembali berdiri','stand',2,1.8);
let cursor=0;
for(const s of PRAYER_STEPS){s.start=cursor;s.end=cursor+s.transition+s.hold;cursor=s.end;}
export const PRAYER_DURATION=cursor;

function mix(a,b,t){if(Array.isArray(a))return a.map((v,i)=>mix(v,b[i],t));return a+(b-a)*t;}
export function samplePrayer(seconds){
  const time=Math.max(0,seconds);
  const index=PRAYER_STEPS.findIndex(s=>time<s.end);
  const i=index<0?PRAYER_STEPS.length-1:index,s=PRAYER_STEPS[i];
  const from=POSES[i?PRAYER_STEPS[i-1].key:'stand'],to=POSES[s.key];
  const progress=Math.max(0,Math.min(1,(time-s.start)/s.transition));
  const t=progress*progress*(3-2*progress);
  const result={};for(const key of Object.keys(to))result[key]=mix(from[key],to[key],t);
  return {id:s.id,label:s.label,rakaat:s.rakaat,pose:result};
}

const cube=new THREE.BoxGeometry(1,1,1);
const Y=new THREE.Vector3(0,1,0);
export function createPrayerCharacter(color){
  const root=new THREE.Group();
  const skin=new THREE.MeshLambertMaterial({color:0xd5ab87});
  const fabric=new THREE.MeshLambertMaterial({color});
  const trousers=new THREE.MeshLambertMaterial({color:0x435451});
  const capMaterial=new THREE.MeshLambertMaterial({color:0xf9f5e7});
  const hair=new THREE.MeshLambertMaterial({color:0x293331});
  function part(parent,w,h,d,material){const m=new THREE.Mesh(cube,material);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const torso=new THREE.Group();root.add(torso);
  const shirt=part(torso,.50,.55,.28,fabric);shirt.position.y=.28;
  const collar=part(torso,.17,.045,.29,capMaterial);collar.position.y=.555;
  const head=new THREE.Group();head.position.y=.76;torso.add(head);
  part(head,.34,.35,.32,skin);
  const cap=part(head,.365,.105,.28,capMaterial);cap.position.set(0,.18,-.04);
  const capBand=part(head,.37,.025,.30,hair);capBand.position.set(0,.135,-.04);
  for(const x of [-.08,.08]){const eye=part(head,.04,.018,.013,hair);eye.position.set(x,0,.162);}
  const nose=part(head,.06,.075,.06,skin);nose.position.set(0,-.055,.181);
  const limb=(material,width,depth)=>part(root,width,1,depth,material);
  const arms=[-1,1].map(()=>({upper:limb(fabric,.16,.19),lower:limb(fabric,.14,.16),hand:part(root,.14,.07,.20,skin)}));
  const legs=[-1,1].map(()=>({upper:limb(trousers,.19,.23),lower:limb(trousers,.17,.20),foot:part(root,.18,.10,.30,skin)}));
  const finger=part(root,.026,.028,.12,skin);
  const shoulder=new THREE.Vector3(),hip=new THREE.Vector3(),temp=new THREE.Vector3();
  function segment(mesh,a,b){temp.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=temp.length();mesh.quaternion.setFromUnitVectors(Y,temp.normalize());}
  function apply(p){
    torso.position.fromArray(p.hip);torso.rotation.x=p.bend;head.rotation.set(p.neck,p.turn,0);
    const bend=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),p.bend);
    for(let i=0;i<2;i++){
      const s=i?1:-1,arm=arms[i],leg=legs[i];
      shoulder.set(s*.29,.51,0).applyQuaternion(bend).add(torso.position);
      const elbow=new THREE.Vector3(...p.elbows[i]),wrist=new THREE.Vector3(...p.wrists[i]);
      segment(arm.upper,shoulder,elbow);segment(arm.lower,elbow,wrist);
      arm.hand.position.copy(wrist);arm.hand.rotation.set(p.palms[i],0,0);
      hip.set(s*.16,0,0).add(torso.position);
      const knee=new THREE.Vector3(...p.knees[i]),ankle=new THREE.Vector3(...p.ankles[i]);
      segment(leg.upper,hip,knee);segment(leg.lower,knee,ankle);
      leg.foot.position.fromArray(p.feet[i]);leg.foot.rotation.set(p.footTilt[i],p.footTurn[i],0);
    }
    finger.visible=p.finger>.5;
    finger.position.set(p.wrists[1][0]-.025,p.wrists[1][1]+.065,p.wrists[1][2]+.09);
    finger.rotation.x=-.55;
  }
  apply(POSES.stand);
  return {root,apply,head,torso};
}
