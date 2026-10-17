import { STANDING as standing, pose, mix, createPerson } from './people.js';

// Local +Z faces the qibla. The parent is rotated toward the room's mihrab.
// Pose holds include stillness; movements are interpolated only on entry.
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
// Tasyahud awal: iftirasy sitting with the index finger raised.
POSES.tashahhudAwal=pose(POSES.sit,{finger:1});
POSES.tashahhud=pose(POSES.sit,{
  hip:[-.12,.29,-.12],
  // Tawarruk: seat lowered to the left, left foot passing under right leg.
  ankles:[[.18,.15,-.12],[.22,.15,-.10]],
  feet:[[.29,.055,-.08],[.22,.16,-.10]],footTilt:[0,1.1],footTurn:[Math.PI/2,0],finger:1,
});
POSES.salamRight=pose(POSES.tashahhud,{neck:0,turn:-1.15,finger:0});
POSES.salamLeft=pose(POSES.tashahhud,{neck:0,turn:1.15,finger:0});
POSES.finish=pose(POSES.tashahhud,{neck:0,turn:0,finger:0});

// Builds the step list for a prayer of 2, 3 or 4 rakaat. Rakaat 3-4 recite only Al-Fatihah, so standing is shorter.
export function buildPrayer(count=2){
  const steps=[];
  const step=(id,label,key,hold,transition=1,rakaat=0)=>steps.push({id,label,key,hold,transition,rakaat});
  const rakaat=n=>{
    step(`qiyam-${n}`,'Berdiri bersedekap','qiyam',n<=2?9:6,1,n);
    step(`raise-ruku-${n}`,'Takbir menuju rukuk','takbir',.6,.65,n);
    step(`ruku-${n}`,'Rukuk','ruku',5,1.3,n);
    step(`rise-${n}`,'Bangkit dari rukuk','takbir',.6,1.3,n);
    step(`itidal-${n}`,'Iktidal','stand',3.8,.7,n);
    step(`kneel-${n}`,'Turun menuju sujud','kneel',.2,1.25,n);
    step(`sujud-first-${n}`,'Sujud pertama','sujud',5,1.2,n);
    step(`sit-${n}`,'Duduk di antara dua sujud','sit',4,1.2,n);
    step(`sujud-second-${n}`,'Sujud kedua','sujud',5,1.2,n);
  };
  step('prepare','Persiapan','stand',2,.6);
  step('takbir','Takbiratul ihram','takbir',2,.8,1);
  for(let n=1;n<=count;n++){
    rakaat(n);
    if(n===count)break;
    if(n===2){
      step('tashahhud-awal','Tasyahud awal','tashahhudAwal',7,1.2,2);
      step('raise-3','Takbir berdiri rakaat ketiga','takbir',.6,1.6,3);
    }else{
      step(`rest-${n}`,'Duduk sebelum berdiri','sit',.6,1,n);
      step(`stand-${n+1}`,`Berdiri rakaat ${['','','kedua','ketiga','keempat'][n+1]}`,'stand',.5,1.4,n+1);
    }
  }
  step('tashahhud','Tasyahud akhir','tashahhud',9,1.5,count);
  step('salam-right','Salam ke kanan','salamRight',2,1,count);
  step('salam-left','Salam ke kiri','salamLeft',2,1,count);
  step('finish','Selesai salat','finish',4,1);
  step('return','Kembali berdiri','stand',2,1.8);
  let cursor=0;
  for(const s of steps){s.start=cursor;s.end=cursor+s.transition+s.hold;cursor=s.end;}
  return {steps,duration:cursor,rakaat:count};
}
const twoRakaat=buildPrayer(2);
export const PRAYER_STEPS=twoRakaat.steps;
export const PRAYER_DURATION=twoRakaat.duration;

export function samplePrayer(seconds,steps=PRAYER_STEPS){
  const time=Math.max(0,seconds);
  const index=steps.findIndex(s=>time<s.end);
  const i=index<0?steps.length-1:index,s=steps[i];
  const from=POSES[i?steps[i-1].key:'stand'],to=POSES[s.key];
  const progress=Math.max(0,Math.min(1,(time-s.start)/s.transition));
  const t=progress*progress*(3-2*progress);
  const result={};for(const key of Object.keys(to))result[key]=mix(from[key],to[key],t);
  return {id:s.id,label:s.label,rakaat:s.rakaat,pose:result};
}

// Kept for tests/prayer-preview.html: a person already dressed for prayer.
export function createPrayerCharacter(color){const person=createPerson({color});person.setPrayerAttire(true);return person;}
