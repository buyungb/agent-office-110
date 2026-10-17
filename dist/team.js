// Team and product data. Edit names, roles and jobs here; everything else reads from these arrays.
// seat: '<seat group>:<index>' registered by rooms.js. coffee: shift A/B. lunch: pantry | sport | lobby.
export const TEAM = [
  {id:'buyung',name:'Buyung Bahari',short:'Buyung',emoji:'😎',role:'CEO',home:'house',seat:'house:0',color:0x1f2a44,hair:0x1d1f22,glasses:true,imam:true,coffee:'A',lunch:'pantry',meeting:true,offset:2,
    jobs:['🧭 Menyusun strategi & roadmap APLINDO','🤝 Review kemitraan dan klien enterprise','📈 Meninjau PnL produk SaaS']},
  {id:'muhammad',name:'Muhammad',short:'Muhammad',emoji:'🧭',role:'COO',home:'house',seat:'house:1',color:0x2f5d50,hair:0x2a2420,coffee:'A',lunch:'pantry',meeting:true,offset:5,
    jobs:['⚙️ Memantau operasional & delivery proyek','📋 Review SLA dan kapasitas tim','🧾 Approve anggaran operasional']},
  {id:'anggit',name:'Anggit',short:'Anggit',emoji:'💻',role:'CTO',home:'house',seat:'house:2',color:0x34507a,hair:0x22201e,coffee:'B',lunch:'pantry',meeting:true,offset:8,
    jobs:['🏗️ Review arsitektur multi-tenant','🔐 Audit keamanan & SOC 2 readiness','🤖 Mengarahkan riset applied AI']},
  {id:'arka',name:'Arka',short:'Arka',emoji:'🧠',role:'AI Engineer',home:'trading',seat:'ailab:0',color:0x2e8bc0,hair:0x2b2622,coffee:'A',lunch:'sport',offset:1,
    jobs:['🧠 Membangun pipeline RAG','🤖 Melatih agent & copilot','🧪 Menjalankan eval model']},
  {id:'satria',name:'Satria',short:'Satria',emoji:'🧪',role:'QA & Eval Engineer',home:'trading',seat:'ailab:1',color:0x4b933c,hair:0x1e1b19,coffee:'B',lunch:'sport',offset:6,
    jobs:['🧪 Menulis test otomatis','📊 Eval-driven QA rilis AI','🐞 Reproduksi bug produksi']},
  {id:'sekar',name:'Sekar',short:'Sekar',emoji:'🗂️',role:'Product Manager',home:'admin',seat:'studio:0',color:0xc0567a,hijab:0x6d4c7d,female:true,coffee:'A',lunch:'pantry',meeting:true,offset:3,
    jobs:['🗺️ Menyusun roadmap ApartmentERP','📝 Menulis PRD fitur baru','📞 Interview pengguna RTPintar']},
  {id:'damar',name:'Damar',short:'Damar',emoji:'⚙️',role:'Backend Engineer',home:'admin',seat:'studio:1',color:0x505aa5,hair:0x24211f,coffee:'B',lunch:'sport',offset:9,
    jobs:['⚙️ Membangun API SealRoute','🗄️ Optimasi query multi-tenant','🚀 Deploy ke staging']},
  {id:'kirana',name:'Kirana',short:'Kirana',emoji:'🎨',role:'UI/UX Designer',home:'admin',seat:'studio:2',color:0x985e9e,hijab:0xe3a6b9,female:true,coffee:'A',lunch:'lobby',offset:4,
    jobs:['🎨 Desain dashboard Patuh.ai','🧩 Update design system','📱 Prototype mobile RTPintar']},
  {id:'dewi',name:'Dewi',short:'Dewi',emoji:'💰',role:'Finance & Admin',home:'admin',seat:'studio:3',color:0x7f9a3a,hijab:0x3f6b5a,female:true,coffee:'B',lunch:'pantry',offset:7,
    jobs:['🧾 Rekap invoice & billing','💰 Laporan PnL SaaS','📑 Administrasi kontrak klien']},
  {id:'bima',name:'Bima',short:'Bima',emoji:'🛰️',role:'DevOps / SRE',home:'dc',seat:'dc:0',color:0x2f9aa6,hair:0x1f1c1a,onCall:true,coffee:'A',lunch:'pantry',offset:0,
    jobs:['🛰️ Memantau uptime & alert','🐳 Upgrade cluster kontainer','💾 Verifikasi backup harian']},
  {id:'laras',name:'Laras',short:'Laras',emoji:'🛡️',role:'Compliance Lead',home:'medical',seat:'compliance:0',color:0xc98a2b,hijab:0x8a5a2b,female:true,coffee:'B',lunch:'lobby',offset:5,
    jobs:['🛡️ Gap analysis ISO 27001','📂 Mengumpulkan evidence audit','⚖️ Review kepatuhan UU PDP']},
  {id:'gilang',name:'Gilang',short:'Gilang',emoji:'🤝',role:'Sales & Partnership',home:'meeting',seat:'war:0',color:0xc8463c,hair:0x2a2521,coffee:'A',lunch:'sport',meeting:true,offset:10,
    jobs:['🤝 Demo produk ke calon klien','📈 Update pipeline penjualan','✉️ Follow-up proposal enterprise']},
  {id:'tara',name:'Tara',short:'Tara',emoji:'📣',role:'Marketing & Konten',home:'meeting',seat:'war:1',color:0xe07a5f,hijab:0x2f4f6f,female:true,coffee:'B',lunch:'lobby',meeting:true,offset:2,
    jobs:['📣 Menyiapkan konten insight','🎬 Video demo BlastifyX','📊 Analisis kampanye']},
  {id:'wulan',name:'Wulan',short:'Wulan',emoji:'💬',role:'Customer Success',home:'lobby',seat:'reception:0',color:0x903db0,hijab:0xd8c3e8,female:true,coffee:'B',lunch:'pantry',offset:0,
    jobs:['💬 Membalas tiket via BlastifyX','📞 Onboarding klien baru','🙂 Survey kepuasan pelanggan']},
];

// Descriptions are quoted from https://aplindo.tech. PnL figures are sample data (juta rupiah), not real results.
export const PRODUCTS = [
  {id:'apartmenterp',name:'ApartmentERP',color:'#4fc3f7',pnl:128,desc:'All-in-one apartment facility management — units, residents, maintenance, billing, and operations.'},
  {id:'sealroute',name:'SealRoute',color:'#ffb74d',pnl:64,desc:'Self-hosted document signing — send, sign, and seal on your infrastructure.'},
  {id:'sealroutesign',name:'SealRoute Sign',color:'#ff8a65',pnl:52,desc:'Bulk document signing at scale — email, WhatsApp, and real-time tracking.'},
  {id:'patuh',name:'Patuh.ai',color:'#81c784',pnl:97,desc:'Multi-ISO compliance platform — one place for standards, evidence, and audit readiness.'},
  {id:'rtpintar',name:'RTPintar',color:'#ba68c8',pnl:41,desc:'Community billing and IPL management — automated collections via WhatsApp.'},
  {id:'blastifyx',name:'BlastifyX',color:'#4db6ac',pnl:86,desc:'WhatsApp engagement engine for sales and support — AI agents, humans, 24/7.'},
];
