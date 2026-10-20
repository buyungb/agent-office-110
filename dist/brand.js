// Brand shown on the office's signage and HUD. Pick a preset with ?brand=<id>; APLINDO is the default.
// To white-label the office, add a preset here (name, one-letter mark, tagline, welcome lines, accent colour).
export const BRANDS={
  aplindo:{id:'aplindo',name:'APLINDO',mark:'A',title:'APLINDO AI Agent Office',hud:'APLINDO AI AGENT OFFICE',tagline:'SHIP SCALABLE SOFTWARE & APPLIED AI',
    welcome:['SaaS · Applied AI · Consultancy','Fractional CTO · Compliance'],by:'',color:'#52e0ff',soft:'#bff4ff',font:'Georgia'},
  orangpinter:{id:'orangpinter',name:'OrangPinter',mark:'O',title:'OrangPinter — Kantor AI 3D',hud:'ORANGPINTER AI OFFICE',tagline:'KANTOR AI YANG HIDUP 24 JAM',
    welcome:['Kantor 3D dari grup WhatsApp tim','by APLINDO'],by:'by APLINDO',color:'#ff7a1a',soft:'#ffd2a8',font:'Georgia'},
};
export function pickBrand(search=globalThis.location?.search||''){return BRANDS[new URLSearchParams(search).get('brand')]||BRANDS.aplindo;}
