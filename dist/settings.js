// ⚙️ Settings drawer: admin login, team & roles, WhatsApp (QR login, groups, contacts), keyword rules, privacy and mode.
// Group and contact names come from WhatsApp and team fields are user input, so everything shown is escaped.
import { SEATS, ROOM_NAMES, CAPACITY, normalizeTeam, validateTeam } from './team.js';
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TABS=[['team','Tim'],['connect','Koneksi'],['people','Kontak WA'],['groups','Grup WA'],['rules','Aturan'],['privacy','Privasi']];
const PLACES=[['','Tetap di tempat'],['meeting','War Room (rapat)'],['pantry','Pantry (ngopi)'],['parking','Pulang / izin'],['desk','Meja kerja']];

export function initSettings({live,team,rooms,onModeDefault}){
  const drawer=$('#settings'),btn=$('#settingsBtn');btn.hidden=false;
  const st={admin:false,enabled:true,data:null,tab:'team',edit:null,errors:[],msg:'',busy:false,qr:null,pair:null,suggestions:{},timer:null};
  async function api(method,path,body){
    const res=await fetch(path,{method,credentials:'same-origin',headers:{'content-type':'application/json','x-office-admin':'1'},body:body&&JSON.stringify(body)});
    const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error||`HTTP ${res.status}`);return json;
  }
  async function load(){st.data=await api('GET','/api/settings');}
  async function run(fn,ok=''){st.busy=true;st.msg='';render();try{await fn();if(ok)st.msg=`✅ ${ok}`;}catch(e){st.msg=`⚠️ ${e.message}`;}st.busy=false;render();}
  async function open(){drawer.hidden=false;btn.setAttribute('aria-expanded','true');await run(async()=>{const me=await api('GET','/api/admin/me');st.admin=me.admin;st.enabled=me.enabled;if(st.admin)await load();});}
  function close(){drawer.hidden=true;btn.setAttribute('aria-expanded','false');stopQr();}
  btn.onclick=()=>drawer.hidden?open():close();
  live.onChange=(prev=>(type,data)=>{prev(type,data);if(type==='team'&&!drawer.hidden&&st.tab==='team'&&!st.edit)render();if(type==='status'&&st.data){st.data.status=data;if(!drawer.hidden&&st.tab==='connect')render();if(data.whatsapp?.loggedIn&&st.qr){stopQr();run(sync,'WhatsApp terhubung. Grup disinkronkan.');}}})(live.onChange);

  function stopQr(){clearInterval(st.timer);st.timer=null;st.qr=null;}
  async function sync(){const r=await api('POST','/api/admin/whatsapp/sync',{});st.suggestions=r.suggestions||{};await load();}
  const roomOptions=sel=>`<option value="">— tidak ada —</option>${rooms.map(r=>`<option value="${r.id}" ${r.id===sel?'selected':''}>${esc(r.icon+' '+r.name)}</option>`).join('')}`;
  const placeOptions=sel=>PLACES.map(([v,n])=>`<option value="${v}" ${v===(sel||'')?'selected':''}>${n}</option>`).join('');

  function viewLogin(){
    if(!st.enabled)return `<p class="note">Setting dikunci: atur <code>ADMIN_PASSCODE</code> di environment service <b>bridge</b> (Dokploy → Environment), lalu deploy ulang.</p>`;
    return `<form class="stack" data-form="login"><label>Passcode admin<input name="passcode" type="password" autocomplete="current-password" required></label><button class="primary">Masuk</button></form><p class="note">Pengunjung lain tetap bisa melihat kantor; hanya admin yang bisa mengubah setting.</p>`;
  }
  function viewConnect(){
    const wa=st.data.status.whatsapp||{};
    const state=!wa.configured?['warn','Secret webhook belum diatur (WHATSAPP_WEBHOOK_SECRET)']:wa.reachable===false?['bad','GOWA tidak bisa dihubungi']:wa.loggedIn?['ok','Terhubung']:['warn','Belum login'];
    const persons=team().map(p=>`<option value="${p.id}">${esc(p.short)} · ${esc(p.role)}</option>`).join('');
    return `<section class="card"><h3>💬 WhatsApp (GOWA)</h3><p class="pill ${state[0]}">${state[1]}${wa.lastEventAt?` · event terakhir ${new Date(wa.lastEventAt).toLocaleTimeString('id-ID')}`:''}</p>
      ${wa.needsSync?'<p class="note">Anggota grup berubah — sinkronkan ulang.</p>':''}
      ${st.qr?`<div class="qr"><img src="${esc(st.qr.src)}" alt="QR login WhatsApp"><p>Buka WhatsApp di HP nomor kantor → <b>Perangkat tertaut</b> → <b>Tautkan perangkat</b>, lalu scan. <span data-countdown>${st.qr.left}</span> dtk</p></div>`:''}
      ${st.pair?`<p class="pair">Kode pairing: <b>${esc(st.pair)}</b><br><small>WhatsApp → Perangkat tertaut → Tautkan dengan nomor telepon.</small></p>`:''}
      <div class="row">${wa.loggedIn?'<button data-act="sync">🔄 Sinkronkan grup</button><button data-act="reconnect">Reconnect</button><button data-act="logout" class="danger">Logout</button>':'<button class="primary" data-act="qr">📷 Tampilkan QR</button><button data-act="reconnect">Reconnect</button>'}</div>
      ${wa.loggedIn?'':`<form class="row" data-form="pair"><input name="phone" placeholder="atau kode pairing: 0812…" inputmode="tel"><button>Minta kode</button></form>`}</section>
      <section class="card"><h3>🧪 Event uji</h3><form class="stack" data-form="test"><div class="row"><select name="person">${persons}</select><select name="place">${placeOptions('')}</select></div><div class="row"><input name="label" value="🧪 Event uji dari setting" maxlength="60"><input name="minutes" type="number" min="1" max="120" value="2" title="menit"></div><div class="row"><button class="primary">Kirim</button><button type="button" data-act="clear-test">Hapus</button></div></form></section>
      <section class="card muted"><h3>📅 Google Calendar · 🛠️ Jira · 🤖 AI agent</h3><p class="note">Menyusul di fase berikutnya (Google Workspace, Jira Cloud, Hermes + Claude Agent SDK).</p></section>`;
  }
  function viewPeople(){
    const d=st.data;
    const rows=team().map(p=>{const m=d.people[p.id]||{},s=st.suggestions[p.id];return `<tr><td><b>${esc(p.short)}</b><br><small>${esc(p.role)}</small></td>
      <td><input data-person="${p.id}" data-field="waPhone" value="${esc(m.waPhone)}" placeholder="62812…" inputmode="tel"><input data-person="${p.id}" data-field="waLid" value="${esc(m.waLid)}" placeholder="LID (opsional)">${s?`<button type="button" class="link" data-act="use-suggestion" data-id="${p.id}">Pakai saran: ${esc(s.name)} (${esc(s.waPhone)})</button>`:''}</td>
      <td><input data-person="${p.id}" data-field="email" value="${esc(m.email)}" placeholder="nama@aplindo.tech" type="email"></td></tr>`;}).join('');
    const unmapped=(d.unmapped||[]).slice(0,10).map(u=>`<li>${esc(u.name||'(tanpa nama)')} · ${esc(u.jid||u.lid)} · ${esc(u.group)}</li>`).join('');
    return `<p class="note">Cocokkan setiap orang dengan nomor WhatsApp-nya. Di grup, WhatsApp kadang hanya mengirim LID — tombol "Sinkronkan grup" di tab Koneksi mengisinya otomatis.</p>
      <table class="map"><thead><tr><th>Orang</th><th>WhatsApp</th><th>Email (kalender/Jira)</th></tr></thead><tbody>${rows}</tbody></table>
      ${unmapped?`<h3>Pengirim belum dikenali</h3><ul class="plain">${unmapped}</ul>`:''}<button class="primary" data-act="save-people">Simpan</button>`;
  }
  function viewGroups(){
    const groups=Object.entries(st.data.groups);
    const rows=groups.map(([jid,g])=>`<tr><td><label class="check"><input type="checkbox" data-group="${esc(jid)}" data-field="enabled" ${g.enabled?'checked':''}> ${esc(g.name)}</label></td><td><select data-group="${esc(jid)}" data-field="room">${roomOptions(g.room)}</select></td><td><input type="checkbox" data-group="${esc(jid)}" data-field="showText" ${g.showText!==false?'checked':''} aria-label="Tampilkan isi pesan ${esc(g.name)}"></td></tr>`).join('');
    return `<p class="note">Hanya grup yang dicentang yang dibaca. Ruangan yang dipilih menyala saat ada diskusi aktif (≥3 orang dalam 10 menit), dan menjadi tempat bubble pesan dari anggota yang belum dipetakan. "Isi pesan" menampilkan potongan pesan di bubble.</p>
      ${groups.length?`<table class="map"><thead><tr><th>Grup</th><th>Ruangan</th><th>Isi pesan</th></tr></thead><tbody>${rows}</tbody></table><button class="primary" data-act="save-groups">Simpan</button>`:'<p class="note">Belum ada grup. Login WhatsApp lalu klik "Sinkronkan grup".</p>'}`;
  }
  function viewRules(){
    const rows=st.data.rules.map((r,i)=>`<div class="rule" data-rule="${i}"><div class="row"><label class="check"><input type="checkbox" data-field="enabled" ${r.enabled?'checked':''}> aktif</label><input data-field="label" value="${esc(r.label)}" maxlength="60" aria-label="Label"><button type="button" class="danger small" data-act="del-rule" data-id="${i}">✕</button></div>
      <input data-field="pattern" value="${esc(r.pattern)}" class="mono" aria-label="Pola regex" spellcheck="false">
      <div class="row"><select data-field="place">${placeOptions(r.place)}</select><select data-field="room">${roomOptions(r.room)}</select><label class="check"><input type="checkbox" data-field="endOfDay" ${r.minutes==='endOfDay'?'checked':''}> s.d. akhir hari</label><input data-field="minutes" type="number" min="1" max="480" value="${r.minutes==='endOfDay'?60:r.minutes}" title="menit"></div><input type="hidden" data-field="id" value="${esc(r.id)}"><input type="hidden" data-field="kind" value="${esc(r.kind)}"></div>`).join('');
    return `<p class="note">Pesan grup yang cocok dengan pola (regex, tidak peka huruf besar) menjadi aktivitas selama durasi yang ditentukan. Pola pertama yang cocok yang dipakai.</p>${rows}
      <div class="row"><button type="button" data-act="add-rule">+ Aturan</button><button class="primary" data-act="save-rules">Simpan</button></div>
      <section class="card"><h3>Coba pesan</h3><input data-act-input="test-rule" placeholder="contoh: otw ngopi dulu gaes"><p class="note" data-rule-result>—</p></section>`;
  }
  function viewPrivacy(){
    const p=st.data.privacy;
    return `<form class="stack" data-form="privacy"><label class="check"><input type="checkbox" name="showText" ${p.showText?'checked':''}> Tampilkan isi pesan di bubble (bisa dimatikan per grup; teks tidak disimpan)</label>
      <label class="check"><input type="checkbox" name="maskNumbers" ${p.maskNumbers?'checked':''}> Samarkan nomor di daftar pengirim</label>
      <label>Simpan aktivitas selama (jam)<input name="retentionHours" type="number" min="1" max="720" value="${p.retentionHours}"></label>
      <label>Mode default untuk pengunjung<select name="mode"><option value="live" ${st.data.mode.default==='live'?'selected':''}>🟢 Live</option><option value="sim" ${st.data.mode.default==='sim'?'selected':''}>⏩ Simulasi</option></select></label>
      <button class="primary">Simpan</button></form><p class="note">Isi pesan tidak pernah disimpan; yang disimpan hanya aktivitas turunan (siapa, grup, jenis, waktu). Relevan untuk UU PDP.</p>
      <h3>Riwayat perubahan</h3><ul class="plain" data-audit><li>…</li></ul>`;
  }
  // ---- Tim: people and the role catalog ----
  const draft=()=>JSON.parse(JSON.stringify(live.team));
  const hexColor=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'#6688aa';
  function capacity(team){
    const n=f=>team.people.filter(f).length,warDesks=n(p=>p.seat.startsWith('war:'));
    return [[`${team.people.length}/${CAPACITY.desks}`,'meja'],[`${n(p=>p.gender==='L')}/${CAPACITY.men}`,'saf L'],[`${n(p=>p.gender==='P')}/${CAPACITY.women}`,'saf P'],[`${n(p=>p.meeting&&!p.seat.startsWith('war:'))}/${CAPACITY.war-warDesks}`,'rapat'],[`${n(p=>p.lunch==='sport')}/${CAPACITY.lunch.sport}`,'basket']];
  }
  function viewTeam(){
    const team=live.team;if(!team)return '<p class="note">Tim belum dimuat.</p>';
    if(st.edit?.type==='person')return viewPersonEditor(team);
    if(st.edit?.type==='role')return viewRoleEditor(team);
    const roles=new Map(team.roles.map(r=>[r.id,r])),seat=k=>SEATS.find(s=>s.key===k)?.label||k;
    const cards=team.people.map(p=>{const r=roles.get(p.roleId)||{};return `<button class="person-card" data-act="edit-person" data-id="${esc(p.id)}" style="--c:${hexColor(p.color||r.color)}"><span class="swatch"></span><b>${esc(p.emoji||r.emoji)} ${esc(p.short)}</b><small>${esc(r.name||p.roleId)}${p.imam?' · imam':''}${p.onCall?' · on-call':''}</small><small>${esc(seat(p.seat))}</small></button>`;}).join('');
    const roleCards=team.roles.map(r=>{const used=team.people.filter(p=>p.roleId===r.id).length;return `<button class="person-card" data-act="edit-role" data-id="${esc(r.id)}" style="--c:${hexColor(r.color)}"><span class="swatch"></span><b>${esc(r.emoji)} ${esc(r.name)}</b><small>${esc(ROOM_NAMES[r.room]||r.room)} · ${used} orang</small></button>`;}).join('');
    return `<div class="capacity">${capacity(team).map(([v,k])=>`<span><b>${v}</b>${k}</span>`).join('')}</div>
      <div class="row"><button class="primary" data-act="new-person">+ Tambah orang</button><button data-act="new-role">+ Tambah peran</button><button class="danger" data-act="reset-team">Kembalikan default</button></div>
      <h3>Orang (${team.people.length})</h3><div class="team-grid">${cards}</div>
      <h3>Katalog peran (${team.roles.length})</h3><p class="note">Peran memberi emoji, warna, ruangan dan 3 pekerjaan default. Ganti nama peran → semua pemegangnya ikut berubah.</p><div class="team-grid">${roleCards}</div>`;
  }
  const errorList=()=>st.errors.length?`<ul class="errors">${st.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:'';
  const options=(list,sel)=>list.map(([v,n,dis])=>`<option value="${esc(v)}" ${v===sel?'selected':''} ${dis?'disabled':''}>${esc(n)}</option>`).join('');
  function viewPersonEditor(team){
    const p=st.edit.value,r=team.roles.find(x=>x.id===p.roleId)||team.roles[0]||{jobs:[]},owners=new Map(team.people.filter(q=>q.id!==st.edit.id).map(q=>[q.seat,q.short]));
    const seatOptions=Object.entries(ROOM_NAMES).map(([room,name])=>`<optgroup label="${esc(name)}">${options(SEATS.filter(s=>s.room===room).map(s=>[s.key,owners.has(s.key)?`${s.label} — dipakai ${owners.get(s.key)}`:s.label,owners.has(s.key)]),p.seat)}</optgroup>`).join('');
    return `<form class="stack editor" data-form="person"><h3>${st.edit.id?`Edit ${esc(p.short)}`:'Orang baru'}</h3>${errorList()}
      <div class="row"><label>Nama lengkap<input name="name" value="${esc(p.name)}" maxlength="40" required></label><label>Panggilan (label)<input name="short" value="${esc(p.short)}" maxlength="16" required></label></div>
      <div class="row"><label>Peran<select name="roleId">${options(team.roles.map(x=>[x.id,`${x.emoji} ${x.name}`]),p.roleId)}</select></label><label>Emoji<input name="emoji" value="${esc(p.emoji||'')}" placeholder="${esc(r.emoji)} (dari peran)" maxlength="8"></label></div>
      <div class="row"><label class="check"><input type="checkbox" name="ownColor" ${p.color?'checked':''}> Warna baju sendiri</label><input type="color" name="color" value="${hexColor(p.color||r.color)}" aria-label="Warna baju"></div>
      <fieldset><legend>Penampilan</legend><div class="row"><label class="check"><input type="radio" name="gender" value="L" ${p.gender==='L'?'checked':''}> Laki-laki</label><label class="check"><input type="radio" name="gender" value="P" ${p.gender==='P'?'checked':''}> Perempuan (berhijab)</label></div>
        <div class="row"><label class="check">Rambut <input type="color" name="hair" value="${hexColor(p.hair)}"></label><label class="check">Hijab <input type="color" name="hijab" value="${hexColor(p.hijab)}"></label><label class="check"><input type="checkbox" name="glasses" ${p.glasses?'checked':''}> Kacamata</label></div></fieldset>
      <label>Meja<select name="seat">${seatOptions}</select></label>
      <fieldset><legend>Jadwal</legend><div class="row"><label>Shift ngopi<select name="coffee">${options([['A','A · 10:00 & 15:36'],['B','B · 10:18 & 15:51'],['none','Tidak ngopi']],p.coffee)}</select></label><label>Makan siang<select name="lunch">${options([['pantry','🍱 Pantry'],['sport','🏀 Sport Hall'],['lobby','🛋️ Lobby'],['desk','🥡 Di meja']],p.lunch)}</select></label><label>Datang +menit<input type="number" name="offset" min="0" max="15" value="${p.offset}"></label></div>
        <div class="row"><label class="check"><input type="checkbox" name="meeting" ${p.meeting?'checked':''}> Ikut rapat 14:00</label><label class="check"><input type="checkbox" name="onCall" ${p.onCall?'checked':''}> On-call malam</label><label class="check"><input type="checkbox" name="imam" ${p.imam?'checked':''}> Imam sholat</label></div></fieldset>
      <fieldset><legend>Pekerjaan (kosong = dari peran)</legend>${[0,1,2].map(i=>`<input name="job${i}" value="${esc(p.jobs?.[i]||'')}" placeholder="${esc(r.jobs[i]||'')}" maxlength="60">`).join('')}</fieldset>
      <div class="row"><button class="primary">Simpan</button><button type="button" data-act="cancel-edit">Batal</button>${st.edit.id?'<button type="button" class="danger" data-act="delete-person">Hapus orang</button>':''}</div></form>`;
  }
  function viewRoleEditor(team){
    const r=st.edit.value,used=team.people.filter(p=>p.roleId===st.edit.id).length;
    return `<form class="stack editor" data-form="role"><h3>${st.edit.id?`Edit peran ${esc(r.name)}`:'Peran baru'}</h3>${errorList()}
      <div class="row"><label>Nama peran<input name="name" value="${esc(r.name)}" maxlength="40" required></label><label>Emoji<input name="emoji" value="${esc(r.emoji)}" maxlength="8" required></label><label>Warna<input type="color" name="color" value="${hexColor(r.color)}"></label></div>
      <label>Ruangan default (untuk orang baru)<select name="room">${options(Object.entries(ROOM_NAMES),r.room)}</select></label>
      <fieldset><legend>Pekerjaan default</legend>${[0,1,2].map(i=>`<input name="job${i}" value="${esc(r.jobs[i]||'')}" maxlength="60" required>`).join('')}</fieldset>
      <div class="row"><button class="primary">Simpan</button><button type="button" data-act="cancel-edit">Batal</button>${st.edit.id?`<button type="button" class="danger" data-act="delete-role" ${used?`disabled title="Masih dipakai ${used} orang"`:''}>Hapus peran</button>`:''}</div>
      ${used?`<p class="note">Dipakai ${used} orang; perubahan langsung berlaku untuk mereka.</p>`:''}</form>`;
  }
  const slug=(s,taken)=>{let base=String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,20)||'orang',id=base,i=2;while(taken.has(id))id=`${base}-${i++}`;return id;};
  // Validates in the browser first (same rules as the bridge), then saves; the bridge broadcasts the new team.
  async function saveTeam(next){
    const errors=validateTeam(normalizeTeam(next));if(errors.length){st.errors=errors;st.msg='';render();return;}
    await run(async()=>{try{const r=await api('PUT','/api/team',next);live.team=r.team;st.edit=null;st.errors=[];}catch(e){st.errors=[e.message];throw e;}},'Tim disimpan.');
  }
  function newPerson(){
    const team=live.team,taken=new Set(team.people.map(p=>p.seat)),role=team.roles[0];
    const seat=SEATS.find(s=>s.room===role.room&&!taken.has(s.key))||SEATS.find(s=>!taken.has(s.key));
    return {id:'',name:'',short:'',roleId:role.id,gender:'L',seat:seat?.key||'',coffee:'A',lunch:'pantry',meeting:false,onCall:false,imam:false,offset:0,emoji:null,color:null,jobs:null,hair:'#24211f',hijab:'#6d4c7d',glasses:false};
  }
  function render(){
    const body=!st.admin?viewLogin():{team:viewTeam,connect:viewConnect,people:viewPeople,groups:viewGroups,rules:viewRules,privacy:viewPrivacy}[st.tab]();
    drawer.innerHTML=`<header><h2>⚙️ Setting kantor</h2>${st.admin?'<button data-act="logout-admin" class="small">Keluar</button>':''}<button data-act="close" aria-label="Tutup setting">×</button></header>
      ${st.admin?`<nav class="drawer-tabs">${TABS.map(([id,n])=>`<button data-tab="${id}" aria-pressed="${id===st.tab}">${n}</button>`).join('')}</nav>`:''}
      ${st.msg?`<p class="msg">${esc(st.msg)}</p>`:''}<div class="drawer-body ${st.busy?'busy':''}">${body}</div>`;
    if(st.admin&&st.tab==='privacy')api('GET','/api/admin/audit').then(rows=>{const el=drawer.querySelector('[data-audit]');if(el)el.innerHTML=rows.slice(0,20).map(r=>`<li>${new Date(r.at).toLocaleString('id-ID')} · ${esc(r.action)} ${esc(r.detail)}</li>`).join('')||'<li>—</li>';}).catch(()=>{});
  }
  const collectRules=()=>[...drawer.querySelectorAll('[data-rule]')].map(el=>{const f=n=>el.querySelector(`[data-field="${n}"]`);return {id:f('id').value,kind:f('kind').value,enabled:f('enabled').checked,label:f('label').value,pattern:f('pattern').value,place:f('place').value||null,room:f('room').value||null,minutes:f('endOfDay').checked?'endOfDay':Number(f('minutes').value)};});

  drawer.addEventListener('click',e=>{
    const t=e.target.closest('[data-act],[data-tab]');if(!t)return;
    if(t.dataset.tab){st.tab=t.dataset.tab;st.msg='';st.edit=null;st.errors=[];return render();}
    const act=t.dataset.act;
    if(/^(edit|new|cancel)-/.test(act))st.msg='';
    if(act==='close')return close();
    if(act==='edit-person'){const p=live.team.people.find(x=>x.id===t.dataset.id);st.edit={type:'person',id:p.id,value:JSON.parse(JSON.stringify(p))};st.errors=[];return render();}
    if(act==='edit-role'){const r=live.team.roles.find(x=>x.id===t.dataset.id);st.edit={type:'role',id:r.id,value:JSON.parse(JSON.stringify(r))};st.errors=[];return render();}
    if(act==='new-person'){if(live.team.people.length>=CAPACITY.desks){st.msg=`⚠️ Semua ${CAPACITY.desks} meja terisi.`;return render();}st.edit={type:'person',id:null,value:newPerson()};st.errors=[];return render();}
    if(act==='new-role'){st.edit={type:'role',id:null,value:{id:'',name:'',emoji:'✨',color:'#5c7cfa',room:'admin',jobs:['','','']}};st.errors=[];return render();}
    if(act==='cancel-edit'){st.edit=null;st.errors=[];return render();}
    if(act==='delete-person'){const p=st.edit.value;if(!confirm(`Hapus ${p.short} dari kantor? Pemetaan WhatsApp-nya ikut terhapus.`))return;const next=draft();next.people=next.people.filter(x=>x.id!==st.edit.id);return saveTeam(next);}
    if(act==='delete-role'){const next=draft();next.roles=next.roles.filter(x=>x.id!==st.edit.id);return saveTeam(next);}
    if(act==='reset-team')return confirm('Kembalikan tim dan katalog peran ke 14 orang default? Orang tambahan dan perubahan akan hilang.')&&run(async()=>{const r=await api('POST','/api/team/reset',{});live.team=r.team;st.edit=null;},'Tim dikembalikan ke default.');
    if(act==='logout-admin')return run(async()=>{await api('POST','/api/admin/logout',{});st.admin=false;st.data=null;});
    if(act==='qr')return run(async()=>{const r=await api('POST','/api/admin/whatsapp/login',{});st.pair=null;st.qr={src:r.qr,left:r.duration};clearInterval(st.timer);
      st.timer=setInterval(async()=>{if(!st.qr)return;st.qr.left--;const el=drawer.querySelector('[data-countdown]');if(el)el.textContent=st.qr.left;
        if(st.qr.left%3===0){const s=await api('GET','/api/admin/whatsapp/status').catch(()=>null);if(s?.loggedIn){stopQr();await run(sync,'WhatsApp terhubung. Grup disinkronkan.');return;}}
        if(st.qr.left<=0){stopQr();st.msg='QR kedaluwarsa. Klik "Tampilkan QR" lagi.';render();}},1000);});
    if(act==='sync')return run(sync,'Grup dan anggota disinkronkan.');
    if(act==='reconnect')return run(async()=>{await api('POST','/api/admin/whatsapp/reconnect',{});await load();},'Reconnect dikirim.');
    if(act==='logout')return confirm('Putuskan WhatsApp dari kantor?')&&run(async()=>{await api('POST','/api/admin/whatsapp/logout',{});await load();},'WhatsApp diputus.');
    if(act==='clear-test')return run(()=>api('DELETE','/api/admin/test-event',{person:drawer.querySelector('[name=person]').value}),'Event uji dihapus.');
    if(act==='use-suggestion'){const s=st.suggestions[t.dataset.id];drawer.querySelector(`[data-person="${t.dataset.id}"][data-field="waPhone"]`).value=s.waPhone;drawer.querySelector(`[data-person="${t.dataset.id}"][data-field="waLid"]`).value=s.waLid||'';t.remove();return;}
    if(act==='save-people'){const people={};drawer.querySelectorAll('[data-person]').forEach(i=>{(people[i.dataset.person]??={})[i.dataset.field]=i.value;});return run(async()=>{await api('PUT','/api/settings',{people});await load();},'Pemetaan orang disimpan.');}
    if(act==='save-groups'){const groups={};drawer.querySelectorAll('[data-group]').forEach(i=>{const g=(groups[i.dataset.group]??={name:st.data.groups[i.dataset.group].name});g[i.dataset.field]=i.type==='checkbox'?i.checked:i.value||null;});return run(async()=>{await api('PUT','/api/settings',{groups});await load();},'Grup disimpan.');}
    if(act==='add-rule'){st.data.rules=[...collectRules(),{id:`rule-${Date.now()}`,kind:'intent',enabled:true,label:'✨ Aktivitas baru',pattern:'\\bkata kunci\\b',place:null,room:null,minutes:15}];return render();}
    if(act==='del-rule'){const r=collectRules();r.splice(Number(t.dataset.id),1);st.data.rules=r;return render();}
    if(act==='save-rules')return run(async()=>{await api('PUT','/api/settings',{rules:collectRules()});await load();},'Aturan disimpan.');
  });
  drawer.addEventListener('submit',e=>{
    e.preventDefault();const f=new FormData(e.target),form=e.target.dataset.form;
    if(form==='person'){
      const next=draft(),v=st.edit.value,role=next.roles.find(r=>r.id===f.get('roleId'));
      const jobs=[0,1,2].map(i=>String(f.get(`job${i}`)||'').trim());
      const person={...v,name:f.get('name').trim(),short:f.get('short').trim(),roleId:f.get('roleId'),emoji:String(f.get('emoji')||'').trim()||null,color:f.has('ownColor')?f.get('color'):null,
        gender:f.get('gender')==='P'?'P':'L',hair:f.get('hair'),hijab:f.get('hijab'),glasses:f.has('glasses'),seat:f.get('seat'),coffee:f.get('coffee'),lunch:f.get('lunch'),offset:Number(f.get('offset')),
        meeting:f.has('meeting'),onCall:f.has('onCall'),imam:f.has('imam'),jobs:jobs.some(Boolean)?jobs.map((j,i)=>j||role?.jobs[i]||''):null};
      if(!st.edit.id)person.id=slug(person.short||person.name,new Set(next.people.map(p=>p.id)));
      if(person.imam)next.people.forEach(p=>{p.imam=false;});// one imam: choosing a new one replaces the old
      const i=next.people.findIndex(p=>p.id===st.edit.id);if(i<0)next.people.push(person);else next.people[i]=person;
      st.edit.value=person;return saveTeam(next);
    }
    if(form==='role'){
      const next=draft(),role={id:st.edit.id||slug(f.get('name'),new Set(next.roles.map(r=>r.id))),name:f.get('name').trim(),emoji:f.get('emoji').trim(),color:f.get('color'),room:f.get('room'),jobs:[0,1,2].map(i=>String(f.get(`job${i}`)||'').trim())};
      const i=next.roles.findIndex(r=>r.id===st.edit.id);if(i<0)next.roles.push(role);else next.roles[i]=role;
      st.edit.value=role;return saveTeam(next);
    }
    if(form==='login')return run(async()=>{await api('POST','/api/admin/login',{passcode:f.get('passcode')});st.admin=true;await load();});
    if(form==='pair')return run(async()=>{const r=await api('POST','/api/admin/whatsapp/login-code',{phone:f.get('phone')});st.qr=null;st.pair=r.pairCode;});
    if(form==='test')return run(()=>api('POST','/api/admin/test-event',{person:f.get('person'),place:f.get('place')||null,label:f.get('label'),minutes:Number(f.get('minutes')),kind:f.get('place')==='parking'?'leave':'intent'}),'Event uji dikirim — lihat orangnya di kantor.');
    if(form==='privacy')return run(async()=>{const mode=f.get('mode');await api('PUT','/api/settings',{privacy:{showText:f.has('showText'),maskNumbers:f.has('maskNumbers'),retentionHours:Number(f.get('retentionHours'))},mode:{default:mode}});await load();onModeDefault(mode);},'Privasi disimpan.');
  });
  drawer.addEventListener('input',e=>{
    if(e.target.dataset.actInput!=='test-rule')return;
    const text=e.target.value,out=drawer.querySelector('[data-rule-result]');
    const hit=collectRules().find(r=>{if(!r.enabled)return false;try{return new RegExp(r.pattern,'i').test(text);}catch{return false;}});
    out.textContent=!text?'—':hit?`✅ Cocok: ${hit.label} (${PLACES.find(p=>p[0]===(hit.place||''))[1]}, ${hit.minutes==='endOfDay'?'s.d. akhir hari':hit.minutes+' menit'})`:'Tidak cocok dengan aturan mana pun.';
  });
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)close();});
}
