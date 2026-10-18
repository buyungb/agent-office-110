// ⚙️ Settings drawer: admin login, WhatsApp (QR login, groups, people), keyword rules, privacy and mode.
// Group and contact names come from WhatsApp, so everything shown is escaped.
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TABS=[['connect','Koneksi'],['people','Orang'],['groups','Grup WA'],['rules','Aturan'],['privacy','Privasi']];
const PLACES=[['','Tetap di tempat'],['meeting','War Room (rapat)'],['pantry','Pantry (ngopi)'],['parking','Pulang / izin'],['desk','Meja kerja']];

export function initSettings({live,team,rooms,onModeDefault}){
  const drawer=$('#settings'),btn=$('#settingsBtn');btn.hidden=false;
  const st={admin:false,enabled:true,data:null,tab:'connect',msg:'',busy:false,qr:null,pair:null,suggestions:{},timer:null};
  async function api(method,path,body){
    const res=await fetch(path,{method,credentials:'same-origin',headers:{'content-type':'application/json','x-office-admin':'1'},body:body&&JSON.stringify(body)});
    const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error||`HTTP ${res.status}`);return json;
  }
  async function load(){st.data=await api('GET','/api/settings');}
  async function run(fn,ok=''){st.busy=true;st.msg='';render();try{await fn();if(ok)st.msg=`✅ ${ok}`;}catch(e){st.msg=`⚠️ ${e.message}`;}st.busy=false;render();}
  async function open(){drawer.hidden=false;btn.setAttribute('aria-expanded','true');await run(async()=>{const me=await api('GET','/api/admin/me');st.admin=me.admin;st.enabled=me.enabled;if(st.admin)await load();});}
  function close(){drawer.hidden=true;btn.setAttribute('aria-expanded','false');stopQr();}
  btn.onclick=()=>drawer.hidden?open():close();
  live.onChange=(prev=>(type,data)=>{prev(type,data);if(type==='status'&&st.data){st.data.status=data;if(!drawer.hidden&&st.tab==='connect')render();if(data.whatsapp?.loggedIn&&st.qr){stopQr();run(sync,'WhatsApp terhubung. Grup disinkronkan.');}}})(live.onChange);

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
    const persons=team.map(p=>`<option value="${p.id}">${esc(p.short)} · ${esc(p.role)}</option>`).join('');
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
    const rows=team.map(p=>{const m=d.people[p.id]||{},s=st.suggestions[p.id];return `<tr><td><b>${esc(p.short)}</b><br><small>${esc(p.role)}</small></td>
      <td><input data-person="${p.id}" data-field="waPhone" value="${esc(m.waPhone)}" placeholder="62812…" inputmode="tel"><input data-person="${p.id}" data-field="waLid" value="${esc(m.waLid)}" placeholder="LID (opsional)">${s?`<button type="button" class="link" data-act="use-suggestion" data-id="${p.id}">Pakai saran: ${esc(s.name)} (${esc(s.waPhone)})</button>`:''}</td>
      <td><input data-person="${p.id}" data-field="email" value="${esc(m.email)}" placeholder="nama@aplindo.tech" type="email"></td></tr>`;}).join('');
    const unmapped=(d.unmapped||[]).slice(0,10).map(u=>`<li>${esc(u.name||'(tanpa nama)')} · ${esc(u.jid||u.lid)} · ${esc(u.group)}</li>`).join('');
    return `<p class="note">Cocokkan setiap orang dengan nomor WhatsApp-nya. Di grup, WhatsApp kadang hanya mengirim LID — tombol "Sinkronkan grup" di tab Koneksi mengisinya otomatis.</p>
      <table class="map"><thead><tr><th>Orang</th><th>WhatsApp</th><th>Email (kalender/Jira)</th></tr></thead><tbody>${rows}</tbody></table>
      ${unmapped?`<h3>Pengirim belum dikenali</h3><ul class="plain">${unmapped}</ul>`:''}<button class="primary" data-act="save-people">Simpan</button>`;
  }
  function viewGroups(){
    const groups=Object.entries(st.data.groups);
    const rows=groups.map(([jid,g])=>`<tr><td><label class="check"><input type="checkbox" data-group="${esc(jid)}" data-field="enabled" ${g.enabled?'checked':''}> ${esc(g.name)}</label></td><td><select data-group="${esc(jid)}" data-field="room">${roomOptions(g.room)}</select></td></tr>`).join('');
    return `<p class="note">Hanya grup yang dicentang yang dibaca. Ruangan yang dipilih menyala saat ada diskusi aktif (≥3 orang dalam 10 menit).</p>
      ${groups.length?`<table class="map"><thead><tr><th>Grup</th><th>Ruangan</th></tr></thead><tbody>${rows}</tbody></table><button class="primary" data-act="save-groups">Simpan</button>`:'<p class="note">Belum ada grup. Login WhatsApp lalu klik "Sinkronkan grup".</p>'}`;
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
    return `<form class="stack" data-form="privacy"><label class="check"><input type="checkbox" name="showText" ${p.showText?'checked':''}> Tampilkan potongan isi pesan di gelembung (default mati)</label>
      <label class="check"><input type="checkbox" name="maskNumbers" ${p.maskNumbers?'checked':''}> Samarkan nomor di daftar pengirim</label>
      <label>Simpan aktivitas selama (jam)<input name="retentionHours" type="number" min="1" max="720" value="${p.retentionHours}"></label>
      <label>Mode default untuk pengunjung<select name="mode"><option value="live" ${st.data.mode.default==='live'?'selected':''}>🟢 Live</option><option value="sim" ${st.data.mode.default==='sim'?'selected':''}>⏩ Simulasi</option></select></label>
      <button class="primary">Simpan</button></form><p class="note">Isi pesan tidak pernah disimpan; yang disimpan hanya aktivitas turunan (siapa, grup, jenis, waktu). Relevan untuk UU PDP.</p>
      <h3>Riwayat perubahan</h3><ul class="plain" data-audit><li>…</li></ul>`;
  }
  function render(){
    const body=!st.admin?viewLogin():{connect:viewConnect,people:viewPeople,groups:viewGroups,rules:viewRules,privacy:viewPrivacy}[st.tab]();
    drawer.innerHTML=`<header><h2>⚙️ Setting kantor</h2>${st.admin?'<button data-act="logout-admin" class="small">Keluar</button>':''}<button data-act="close" aria-label="Tutup setting">×</button></header>
      ${st.admin?`<nav class="drawer-tabs">${TABS.map(([id,n])=>`<button data-tab="${id}" aria-pressed="${id===st.tab}">${n}</button>`).join('')}</nav>`:''}
      ${st.msg?`<p class="msg">${esc(st.msg)}</p>`:''}<div class="drawer-body ${st.busy?'busy':''}">${body}</div>`;
    if(st.admin&&st.tab==='privacy')api('GET','/api/admin/audit').then(rows=>{const el=drawer.querySelector('[data-audit]');if(el)el.innerHTML=rows.slice(0,20).map(r=>`<li>${new Date(r.at).toLocaleString('id-ID')} · ${esc(r.action)} ${esc(r.detail)}</li>`).join('')||'<li>—</li>';}).catch(()=>{});
  }
  const collectRules=()=>[...drawer.querySelectorAll('[data-rule]')].map(el=>{const f=n=>el.querySelector(`[data-field="${n}"]`);return {id:f('id').value,kind:f('kind').value,enabled:f('enabled').checked,label:f('label').value,pattern:f('pattern').value,place:f('place').value||null,room:f('room').value||null,minutes:f('endOfDay').checked?'endOfDay':Number(f('minutes').value)};});

  drawer.addEventListener('click',e=>{
    const t=e.target.closest('[data-act],[data-tab]');if(!t)return;
    if(t.dataset.tab){st.tab=t.dataset.tab;st.msg='';return render();}
    const act=t.dataset.act;
    if(act==='close')return close();
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
