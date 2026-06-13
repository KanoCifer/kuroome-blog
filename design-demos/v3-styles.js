// v3 Outdoor Instrument styles - injected into v3-outdoor.html
const v3Styles = `
.iphone { display:inline-block; padding:10px; background:#1a1f1a; border-radius:50px; box-shadow:0 0 0 1.5px #2a2f2a, 0 18px 50px rgba(0,0,0,.5); }
.iphone .screen { position:relative; border-radius:40px; overflow:hidden; background:#0a0e0a; width:393px; height:852px; border:.5px solid rgba(232,237,229,.18); }
.iphone .status { position:absolute; top:0; left:0; right:0; height:54px; display:flex; align-items:center; justify-content:space-between; padding:0 32px; font-family:-apple-system,sans-serif; font-size:16px; font-weight:600; color:#e8ede5; z-index:20; pointer-events:none; }
.iphone .island { position:absolute; top:12px; left:50%; transform:translateX(-50%); width:124px; height:36px; background:#000; border-radius:999px; z-index:30; }
.iphone .content { position:absolute; top:54px; left:0; right:0; bottom:34px; overflow:hidden; }
.iphone .home { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); width:140px; height:5px; background:rgba(232,237,229,.5); border-radius:999px; z-index:10; }
.app { width:100%; height:100%; background:#0a0e0a; display:flex; flex-direction:column; }
.app-header { padding:12px 18px 10px; border-bottom:1px solid rgba(232,237,229,.18); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.app-header .title { display:flex; align-items:center; gap:8px; }
.app-header .title h1 { font-family:Inter,-apple-system,sans-serif; font-size:15px; font-weight:700; margin:0; letter-spacing:.04em; text-transform:uppercase; }
.app-header .title .sub { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#f0a830; border:1px solid #f0a830; padding:1px 4px; }
.app-header .ai-btn { display:inline-flex; align-items:center; gap:4px; padding:6px 10px; min-height:30px; border-radius:2px; background:transparent; color:#f0a830; font-family:JetBrains Mono,monospace; font-size:10px; font-weight:600; border:1px solid #f0a830; letter-spacing:.1em; cursor:pointer; text-transform:uppercase; }
.app-header .ai-btn .dot { width:5px; height:5px; border-radius:999px; background:#5fb872; }
.app-body { flex:1; overflow-y:auto; padding:0; }
.module { padding:14px 18px; border-bottom:1px solid rgba(232,237,229,.08); }
.module-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.module-head .label { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:#5a6357; }
.module-head .val { font-family:JetBrains Mono,monospace; font-size:10px; letter-spacing:.05em; color:#98a094; }
.module-head .val .num { color:#f0a830; }
.map-mod { position:relative; height:240px; background:linear-gradient(180deg,#0d1812,#0a130d); overflow:hidden; }
.map-mod .grid { position:absolute; inset:0; background-image:linear-gradient(rgba(240,168,48,.06) .5px,transparent .5px),linear-gradient(90deg,rgba(240,168,48,.06) .5px,transparent .5px); background-size:24px 24px; }
.map-mod .water { position:absolute; inset:0; background:linear-gradient(180deg,rgba(77,208,194,.12),rgba(77,208,194,.06) 50%,rgba(95,184,114,.08)); }
.map-mod .land { position:absolute; inset:0; background:radial-gradient(ellipse 40% 30% at 30% 80%,rgba(95,184,114,.18),transparent 60%),radial-gradient(ellipse 35% 25% at 75% 25%,rgba(95,184,114,.12),transparent 60%); }
.map-mod .coord { position:absolute; font-family:JetBrains Mono,monospace; font-size:9px; color:#5a6357; letter-spacing:.05em; }
.map-mod .coord.tl { top:8px; left:12px; } .map-mod .coord.tr { top:8px; right:12px; } .map-mod .coord.bl { bottom:8px; left:12px; } .map-mod .coord.br { bottom:8px; right:12px; }
.map-mod .compass { position:absolute; top:28px; left:12px; width:36px; height:36px; border-radius:50%; background:#131813; border:1px solid rgba(232,237,229,.18); display:flex; align-items:center; justify-content:center; font-family:JetBrains Mono,monospace; font-size:11px; font-weight:700; color:#f0a830; }
.map-mod .marker { position:absolute; width:14px; height:14px; transform:translate(-50%,-50%); }
.map-mod .marker::before { content:""; position:absolute; inset:0; border-radius:50%; border:1.5px solid currentColor; }
.map-mod .marker::after { content:""; position:absolute; width:4px; height:4px; border-radius:50%; background:currentColor; }
.map-mod .marker.amber { color:#f0a830; } .map-mod .marker.cyan { color:#4dd0c2; } .map-mod .marker.green { color:#5fb872; }
.map-mod .marker.active::before { width:28px; height:28px; animation:pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
.map-mod .route { position:absolute; top:50%; left:32%; width:50%; height:0; border-top:1px dashed #f0a830; transform:rotate(15deg); transform-origin:left center; }
.map-mod .ctrl { position:absolute; width:36px; height:36px; background:#131813; border:1px solid rgba(232,237,229,.18); display:flex; align-items:center; justify-content:center; font-family:JetBrains Mono,monospace; font-size:13px; color:#f0a830; cursor:pointer; }
.map-mod .full { top:28px; right:12px; } .map-mod .locate { bottom:36px; right:12px; }
.map-mod .route-pill { position:absolute; bottom:12px; left:12px; padding:6px 10px; background:#131813; border:1px solid #f0a830; font-family:JetBrains Mono,monospace; font-size:10px; letter-spacing:.05em; color:#f0a830; display:flex; align-items:center; gap:8px; }
.route-pill .num { font-size:14px; font-weight:700; } .route-pill .x { color:#98a094; cursor:pointer; }
.index-mod { padding:16px 18px 18px; background:linear-gradient(180deg,rgba(240,168,48,.04),transparent); }
.index-grid { display:grid; grid-template-columns:auto 1fr; gap:14px; align-items:center; margin-bottom:14px; }
.index-num { font-family:JetBrains Mono,monospace; font-size:64px; font-weight:700; line-height:.9; color:#f0a830; letter-spacing:-.05em; }
.index-side { display:flex; flex-direction:column; gap:4px; }
.index-side .verdict { font-family:JetBrains Mono,monospace; font-size:14px; font-weight:600; color:#5fb872; letter-spacing:.08em; text-transform:uppercase; }
.index-side .verdict::before { content:"▴ "; }
.index-side .stamp { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#5a6357; }
.index-side .desc { font-family:JetBrains Mono,monospace; font-size:10px; color:#98a094; line-height:1.4; margin-top:2px; }
.index-bar { display:flex; align-items:center; gap:8px; padding:6px 0; border-top:1px solid rgba(232,237,229,.08); }
.index-bar .k { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#5a6357; width:80px; }
.index-bar .bar { flex:1; height:4px; background:#1c221c; position:relative; }
.index-bar .bar div { position:absolute; left:0; top:0; height:100%; background:#f0a830; }
.index-bar .v { font-family:JetBrains Mono,monospace; font-size:11px; font-weight:600; color:#e8ede5; width:40px; text-align:right; }
.index-actions { display:flex; gap:8px; margin-top:12px; }
.index-actions button { flex:1; padding:14px; min-height:44px; font-family:JetBrains Mono,monospace; font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; }
.index-actions .primary { background:#f0a830; color:#0a0e0a; border:0; }
.index-actions .secondary { background:transparent; color:#f0a830; border:1px solid #f0a830; }
.wx-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; }
.wx-cell { padding:12px 14px; border:1px solid rgba(232,237,229,.08); }
.wx-cell .k { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#5a6357; }
.wx-cell .v { font-family:JetBrains Mono,monospace; font-size:22px; font-weight:700; color:#e8ede5; margin-top:2px; }
.wx-cell .v .u { font-size:12px; color:#98a094; margin-left:2px; }
.wx-cell .v .sub { font-size:10px; color:#98a094; margin-left:4px; font-weight:400; }
.wx-forecast { display:flex; border-top:1px solid rgba(232,237,229,.08); }
.wx-day { flex:1; padding:10px 4px; text-align:center; border-right:1px solid rgba(232,237,229,.08); }
.wx-day:last-child { border-right:0; }
.wx-day .when { font-family:JetBrains Mono,monospace; font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:#5a6357; }
.wx-day .ic { font-size:18px; margin:4px 0; }
.wx-day .t { font-family:JetBrains Mono,monospace; font-size:10px; }
.wx-day .t .h { color:#e8ede5; font-weight:600; }
.wx-day .t .l { color:#5a6357; }
.wx-day.active { background:rgba(240,168,48,.08); }
.wx-day.active .when { color:#f0a830; }
.chip-row { display:flex; gap:6px; padding:0 18px 8px; overflow-x:auto; }
.chip-row::-webkit-scrollbar { display:none; }
.chip { flex-shrink:0; padding:5px 10px; min-height:28px; font-family:JetBrains Mono,monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; background:#131813; color:#98a094; border:1px solid rgba(232,237,229,.18); border-radius:2px; cursor:pointer; }
.chip.active { background:#f0a830; color:#0a0e0a; border-color:#f0a830; }
.tide-chart { height:130px; background:#131813; margin:0 18px; border:1px solid rgba(232,237,229,.08); padding:10px 8px; }
.tide-chart svg { width:100%; height:100%; }
.tide-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; margin:10px 18px 0; border:1px solid rgba(232,237,229,.08); }
.tide-grid > div { padding:10px 12px; }
.tide-grid > div + div { border-left:1px solid rgba(232,237,229,.08); }
.tide-grid .k { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#5a6357; }
.tide-grid .v { font-family:JetBrains Mono,monospace; font-size:20px; font-weight:700; margin-top:2px; }
.tide-grid .v.up { color:#4dd0c2; }
.tide-grid .v.down { color:#98a094; }
.tide-grid .meta { font-family:JetBrains Mono,monospace; font-size:9px; color:#5a6357; margin-top:2px; }
.hour-legend { display:flex; gap:12px; font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#98a094; margin-bottom:6px; }
.hour-legend .sw { display:inline-block; width:8px; height:2px; margin-right:4px; vertical-align:middle; }
.hour-legend .sw.r { background:#4dd0c2; } .hour-legend .sw.t { background:#f0a830; }
.hour-chart { height:110px; background:#131813; border:1px solid rgba(232,237,229,.08); margin-top:8px; padding:8px 6px; }
.hour-chart svg { width:100%; height:100%; }
.sheet-backdrop { position:absolute; inset:0; background:rgba(5,8,5,.7); z-index:30; }
.sheet { position:absolute; left:0; right:0; bottom:0; z-index:40; background:#131813; border-top:1px solid #f0a830; max-height:88%; display:flex; flex-direction:column; }
.sheet-handle { width:32px; height:2px; background:#f0a830; margin:8px auto 4px; }
.sheet-head { padding:6px 18px 14px; border-bottom:1px solid rgba(232,237,229,.18); display:flex; align-items:center; justify-content:space-between; }
.sheet-head .l h2 { font-family:Inter,-apple-system,sans-serif; font-size:16px; font-weight:700; margin:0; letter-spacing:.05em; text-transform:uppercase; }
.sheet-head .l .sub { font-family:JetBrains Mono,monospace; font-size:10px; color:#98a094; margin-top:2px; letter-spacing:.05em; }
.sheet-head .close { width:32px; height:32px; background:transparent; border:1px solid rgba(232,237,229,.18); color:#98a094; display:flex; align-items:center; justify-content:center; font-family:JetBrains Mono,monospace; cursor:pointer; }
.sheet-body { flex:1; overflow-y:auto; padding:14px 18px 28px; }
.ai-status { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#5fb872; margin-bottom:10px; }
.ai-status::before { content:"● "; }
.ai-stream { background:#1c221c; border-left:2px solid #f0a830; padding:14px 16px; font-family:Noto Sans SC,-apple-system,sans-serif; font-size:13px; line-height:1.7; color:#e8ede5; white-space:pre-wrap; }
.ai-model { width:100%; padding:12px; min-height:42px; background:#1c221c; border:1px solid rgba(232,237,229,.18); color:#e8ede5; font-family:JetBrains Mono,monospace; font-size:11px; letter-spacing:.05em; margin-top:12px; }
.ai-cta { width:100%; padding:16px; min-height:48px; background:#f0a830; color:#0a0e0a; border:0; font-family:JetBrains Mono,monospace; font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; margin-top:12px; cursor:pointer; }
.ai-cta.cancel { background:#e8513f; }
.fb-info { background:#1c221c; border:1px solid rgba(232,237,229,.18); padding:12px 14px; margin-bottom:12px; }
.fb-info .row { display:flex; justify-content:space-between; font-family:JetBrains Mono,monospace; font-size:11px; padding:2px 0; }
.fb-info .row .k { color:#5a6357; letter-spacing:.1em; text-transform:uppercase; }
.fb-info .row .v { color:#e8ede5; font-weight:600; }
.fb-info .row .v.green { color:#5fb872; }
.fb-section { font-family:JetBrains Mono,monospace; font-size:10px; letter-spacing:.15em; text-transform:uppercase; color:#5a6357; margin-bottom:8px; }
.fb-choices { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:14px; }
.fb-choice { min-height:56px; background:#1c221c; border:1px solid rgba(232,237,229,.18); font-family:JetBrains Mono,monospace; font-size:11px; font-weight:600; color:#98a094; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
.fb-choice .ic { font-size:16px; }
.fb-choice.selected { background:#f0a830; color:#0a0e0a; border-color:#f0a830; }
.fb-actions { display:flex; gap:8px; }
.fb-actions button { flex:1; padding:14px; min-height:48px; font-family:JetBrains Mono,monospace; font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; }
.fb-actions .cancel { background:transparent; color:#98a094; border:1px solid rgba(232,237,229,.18); }
.fb-actions .submit { background:#f0a830; color:#0a0e0a; border:0; }
.feat-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid rgba(232,237,229,.18); }
.feat { padding:12px 14px; border-right:1px solid rgba(232,237,229,.08); border-bottom:1px solid rgba(232,237,229,.08); }
.feat:nth-child(2n) { border-right:0; } .feat:nth-last-child(-n+2) { border-bottom:0; }
.feat .k { font-family:JetBrains Mono,monospace; font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#5a6357; }
.feat .v { font-family:JetBrains Mono,monospace; font-size:18px; font-weight:700; color:#e8ede5; margin-top:2px; }
.feat .bar { height:2px; background:#1c221c; margin-top:6px; }
.feat .bar div { height:100%; background:#f0a830; }
.map-fs { position:absolute; inset:0; background:#0a0e0a; z-index:20; }
.map-fs .water { position:absolute; inset:0; background:linear-gradient(180deg,rgba(77,208,194,.15),rgba(77,208,194,.08) 50%,rgba(95,184,114,.1)); }
.map-fs .land { position:absolute; inset:0; background:radial-gradient(ellipse 40% 30% at 30% 80%,rgba(95,184,114,.2),transparent 60%),radial-gradient(ellipse 35% 25% at 75% 25%,rgba(95,184,114,.14),transparent 60%); }
.map-fs .grid { position:absolute; inset:0; background-image:linear-gradient(rgba(240,168,48,.08) .5px,transparent .5px),linear-gradient(90deg,rgba(240,168,48,.08) .5px,transparent .5px); background-size:28px 28px; }
.map-fs .pin { position:absolute; width:32px; height:32px; border-radius:50%; border:1.5px solid currentColor; display:flex; align-items:center; justify-content:center; font-family:JetBrains Mono,monospace; font-size:12px; font-weight:700; transform:translate(-50%,-50%); }
.map-fs .pin.amber { color:#f0a830; } .map-fs .pin.cyan { color:#4dd0c2; } .map-fs .pin.green { color:#5fb872; }
.map-fs .route { position:absolute; top:38%; left:32%; width:50%; height:0; border-top:1.5px dashed #f0a830; transform:rotate(15deg); transform-origin:left center; }
.map-fs .close-fs { position:absolute; top:64px; right:12px; width:38px; height:38px; background:#131813; border:1px solid #f0a830; color:#f0a830; display:flex; align-items:center; justify-content:center; font-family:JetBrains Mono,monospace; cursor:pointer; z-index:5; }
.map-fs .info { position:absolute; top:110px; left:12px; right:56px; background:#131813; border:1px solid #f0a830; padding:10px 14px; }
.map-fs .info .name { font-family:JetBrains Mono,monospace; font-size:13px; font-weight:700; color:#f0a830; letter-spacing:.05em; text-transform:uppercase; }
.map-fs .info .meta { font-family:JetBrains Mono,monospace; font-size:10px; color:#98a094; margin-top:4px; }
.map-fs .info .dist { font-family:JetBrains Mono,monospace; font-size:11px; color:#5fb872; margin-top:4px; font-weight:600; }
.map-fs .stats { position:absolute; bottom:40px; left:12px; right:12px; display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(232,237,229,.18); }
.map-fs .stats .cell { background:rgba(10,14,10,.85); padding:8px 10px; }
.map-fs .stats .k { font-family:JetBrains Mono,monospace; font-size:8px; letter-spacing:.15em; text-transform:uppercase; color:#5a6357; }
.map-fs .stats .v { font-family:JetBrains Mono,monospace; font-size:14px; font-weight:700; color:#f0a830; margin-top:2px; }
.footer-line { text-align:center; font-family:JetBrains Mono,monospace; font-size:9px; color:#5a6357; padding:16px 0; letter-spacing:.15em; text-transform:uppercase; border-top:1px solid rgba(232,237,229,.08); }
.footer-line::before, .footer-line::after { content:"·"; margin:0 8px; color:#f0a830; }
`;
const v3StyleEl = document.createElement("style");
v3StyleEl.id = "v3-styles";
v3StyleEl.textContent = v3Styles;
document.head.appendChild(v3StyleEl);
