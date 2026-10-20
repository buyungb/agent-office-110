"""Timelines for the OrangPinter promo videos (1080x1920, 30 fps).

Times are seconds into the video. Camera keyframes: (t, room id or 'all', angle in radians, zoom factor).
Minute keyframes: (t, simulated minute of the day), linear in between. Captions: (start, end, kind, text, y)
with y in CSS px of the 540x960 viewport; text stays inside the safe zone (y 115-740, right margin 64).
All chat messages are made-up demo content.
"""

M = lambda h, m=0, s=0: h * 60 + m + s / 60

# Live events for V2: WhatsApp group "Tim Produk" (fictional messages).
V2_CHAT = [
    (1.6, 'Arka', 'Eval RAG semalam naik 4% 🚀', 'arka'),
    (3.2, 'Satria', 'Mantap, aku cek regresinya', 'satria'),
    (4.8, 'Damar', 'API SealRoute udah di staging', 'damar'),
    (6.6, 'Sekar', 'otw ngopi dulu yaa ☕', 'sekar'),
]

def v2_actions():
    acts = []
    first = None
    for t, who, text, pid in V2_CHAT:
        meta = "{group:'120363000000000001@g.us',groupName:'Tim Produk'}"
        acts.append((t, f"__promo.activity({{id:'b-{pid}',person:'{pid}',kind:'bubble',label:{text!r},room:null,meta:{meta},ttl:7000}});"
                        f"__promo.activity({{id:'wa:chat:{pid}',person:'{pid}',kind:'chat',label:'💬 Chat di Tim Produk',room:'trading',ttl:120000}});"))
        if first is None:
            first = pid
        elif pid in ('satria', 'damar'):
            acts.append((t + .1, f"__promo.activity({{id:'r-{pid}',person:'{pid}',kind:'reply',label:'',meta:{{to:'arka'}},ttl:5000}});"))
    acts.append((5.0, "__promo.activity({id:'wa:room:trading',person:null,kind:'room_hot',room:'trading',label:'🔥 Diskusi aktif · Tim Produk',ttl:600000});"))
    acts.append((7.0, "__promo.activity({id:'wa:intent:sekar',person:'sekar',kind:'intent',place:'pantry',room:'gym',label:'☕ Ngopi (dari WhatsApp)',ttl:900000});"))
    return acts

def type_into(t0, selector, text, per=.07):
    """Types text into an input, one character per `per` seconds."""
    return [(t0 + i * per, f"(()=>{{const i=document.querySelector({selector!r});i.value={text[:i + 1]!r};i.dispatchEvent(new Event('input',{{bubbles:true}}));}})();") for i in range(len(text))]

SCENES = {
    'v1': dict(
        file='op-v1-kantor-hidup.mp4', seconds=15, live=False, query='t=09:06&labels=name',
        minute=[(0, M(9, 6)), (15, M(9, 21))],
        camera=[(0, 'all', 0, 1), (2.4, 'all', .35, 1.05), (3.4, 'lobby', .05, 1.05), (5.6, 'lobby', .2, 1.12), (6.6, 'trading', 0, 1), (8.8, 'trading', -.15, 1.1), (9.8, 'mine', 0, 1.05), (12.2, 'mine', .2, 1.12)],
        captions=[(0.2, 3.1, 'hook', 'Kantor kamu,\n**versi 3D**,\nhidup 24 jam', 140),
                  (3.4, 6.3, 'sub', 'Setiap ruangan\n**bergerak sendiri**', 150),
                  (6.6, 9.5, 'sub', 'Siapa **kerja**, siapa **ngopi**,\nsiapa **rapat** — kelihatan', 150),
                  (9.8, 12.6, 'sub', 'Produk SaaS-mu jadi\n**tambang PnL** 💎', 150)],
        labels=[(0, 'off'), (3.2, 'name')],
        end=12.9),
    'v2': dict(
        file='op-v2-whatsapp.mp4', seconds=20, live=True, query='t=10:42&labels=name', travel=5.5,
        minute=[(0, M(10, 42)), (20, M(10, 42))],
        # The camera follows Sekar from Product Studio along the west corridor to the pantry (about 41 m).
        camera=[(0, 'trading', -.1, 1.25), (6.8, 'trading', .05, 1.3), (8.0, 'admin', .1, 1.0), (10.2, ('pt', -19.6, -4), 0, 1.1), (12.4, 'gym', 0, 1.05), (15.5, 'gym', .05, 1.1), (16.4, 'all', .25, 1.15)],
        chat=dict(title='Tim Produk', start=.8, end=8.0, messages=[(t, who, text) for t, who, text, _ in V2_CHAT]),
        actions=v2_actions(),
        captions=[(8.2, 12.2, 'sub', 'Ketik **"otw ngopi"**…\norangnya beneran jalan\nke pantry ☕', 150),
                  (12.5, 17.5, 'sub', 'Chat grup jadi **bubble**.\nIsi pesan **tidak disimpan**.', 150)],
        hook=(0, .8, 'Grup WhatsApp tim\njadi **kantor yang hidup**'),
        labels=[(0, 'name'), (15.3, 'off')],
        end=17.8),
    'v3': dict(
        file='op-v3-sehari.mp4', seconds=30, live=False, query='t=07:20&labels=name', clock=True,
        minute=[(0, M(7, 20)), (3, M(7, 50)), (5, M(9, 58)), (8, M(10, 12)), (9.5, M(11, 57)), (10.5, M(12, 0)), (14.5, M(12, 0, 50)), (15.5, M(12, 25)), (18, M(12, 45)), (19, M(14, 2)), (21.5, M(14, 20)), (22.5, M(17, 4)), (24.5, M(17, 25)), (26.5, M(20, 30))],
        camera=[(0, 'all', 0, 1.1), (3, 'all', .1, 1.15), (4.6, 'gym', 0, 1.05), (8, 'gym', .1, 1.1), (9.3, 'mushola', 0, 1.1), (14.5, 'mushola', .05, 1.15), (15.4, 'sport', 0, 1.0), (18, 'sport', .1, 1.05), (19, 'meeting', 0, 1.05), (21.5, 'meeting', .1, 1.1), (22.5, 'all', .15, 1.1), (26.5, 'all', .4, 1.15)],
        captions=[(0.2, 2.9, 'hook', 'Sehari di kantor\n**dalam 30 detik**', 150),
                  (3.1, 4.8, 'pill', '07.30 · datang', 210),
                  (5.0, 8.2, 'pill', '10.00 · ngopi ☕', 210),
                  (9.6, 14.6, 'pill', '12.00 · sholat berjamaah 🕌', 210),
                  (15.5, 18.3, 'pill', '12.20 · makan & main basket 🏀', 210),
                  (19.0, 21.8, 'pill', '14.00 · rapat di War Room', 210),
                  (22.5, 24.5, 'pill', '17.00 · pulang 🚗', 210),
                  (24.7, 26.6, 'pill', 'malam · on-call jaga server 🌙', 210)],
        labels=[(0, 'off')],
        end=27.0),
    'v4': dict(
        file='op-v4-tim.mp4', seconds=15, live=True, query='t=09:30&labels=name', travel=4.2,
        minute=[(0, M(9, 30)), (15, M(9, 31))],
        camera=[(0, 'admin', 0, .9), (8.6, 'admin', 0, .9), (9.0, 'admin', .1, .95), (12.6, 'admin', .25, 1.1)],
        actions=[(1.6, "document.querySelector('#settingsBtn').click();"),
                 (2.4, "document.querySelector('[data-act=new-person]')?.click();"),
                 *type_into(2.8, '[data-form=person] [name=name]', 'Nadia Putri'),
                 *type_into(3.8, '[data-form=person] [name=short]', 'Nadia'),
                 (4.4, "(()=>{const f=document.querySelector('[data-form=person]');f.roleId.value='backend';f.querySelector('[name=gender][value=P]').checked=true;f.seat.value='studio:4';f.scrollIntoView();})();"),
                 (6.6, "document.querySelector('[data-form=person] button.primary').click();"),
                 (8.4, "document.querySelector('[data-act=close]')?.click();")],
        captions=[(0.2, 1.5, 'hook', 'Karyawan baru?\n**Tanpa coding.**', 150),
                  (8.8, 12.7, 'sub', 'Simpan… dia langsung\n**jalan masuk** dari parkiran', 150)],
        end=12.9),
    'v5': dict(
        file='op-v5-sholat.mp4', seconds=15, live=False, query='t=11:56&labels=name',
        minute=[(0, M(11, 56)), (3, M(11, 59, 30)), (3.2, M(12, 0)), (12.2, M(12, 0, 38))],
        camera=[(0, 'all', .1, 1.05), (2.6, 'mushola', 0, 1.0), (12.2, 'mushola', .15, 1.2)],
        captions=[(0.2, 2.9, 'hook', 'Waktunya Dzuhur,\nsatu kantor **bergerak**', 150),
                  (3.4, 7.6, 'sub', 'Imam di depan,\n**saf rapi** otomatis', 150),
                  (7.8, 12.2, 'sub', 'Kantor yang ngerti\n**budaya kerja kita** 🤲', 150)],
        labels=[(0, 'off')],
        end=12.5),
}
