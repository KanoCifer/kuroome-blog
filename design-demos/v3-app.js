const { useState } = React;
const LOC = "黄埔港 · GUANGZHOU";
const TIDE_SPOTS = ["黄埔港", "大亚湾", "舟山", "青岛", "厦门", "三亚"];
const DATES = ["TODAY", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "MON"];
const FEEDBACK = [{v:"爆护",ic:"★★"},{v:"好",ic:"★"},{v:"一般",ic:"○"},{v:"差",ic:"△"},{v:"空军",ic:"✕"}];
const FEATURES = [{k:"气温",v:24,max:30},{k:"湿度",v:65,max:100},{k:"气压",v:1012,max:1030},{k:"风速",v:8,max:25},{k:"降水",v:2,max:30},{k:"涨潮",v:18,max:24},{k:"距潮",v:12,max:24},{k:"潮差",v:14,max:30},{k:"指数",v:87,max:100}];
const FORECAST_ICONS = ["☀","⛅","🌧","🌤","☁","⛅","☀"];

function IPhone({ children }) {
  return (
    <div className="iphone">
      <div className="screen">
        <div className="status">
          <span>9:41</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:2,height:12}}>
              <div style={{width:3,height:4,background:"currentColor",borderRadius:1}}/>
              <div style={{width:3,height:6,background:"currentColor",borderRadius:1}}/>
              <div style={{width:3,height:9,background:"currentColor",borderRadius:1}}/>
              <div style={{width:3,height:11,background:"currentColor",borderRadius:1}}/>
            </div>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M8 11.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
              <path d="M3 7.5a7 7 0 0110 0" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
              <path d="M1 4.5a11 11 0 0114 0" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7"/>
            </svg>
            <div style={{width:26,height:12,border:"1.5px solid currentColor",borderRadius:3,padding:1,position:"relative",opacity:0.8}}>
              <div style={{width:"85%",height:"100%",background:"currentColor",borderRadius:1,opacity:0.9}}/>
            </div>
          </div>
        </div>
        <div className="island"/>
        <div className="content">{children}</div>
        <div className="home"/>
      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <div className="app-header">
      <div className="title"><h1>钓鱼地图</h1><span className="sub">FISH</span></div>
      <button className="ai-btn"><span className="dot"/>AI <span style={{fontSize:11,marginLeft:2}}>↗</span></button>
    </div>
  );
}

function ScreenMainTop() {
  return (
    <div className="app">
      <AppHeader/>
      <div className="app-body">
        <div className="map-mod module" style={{padding:0,borderBottom:0}}>
          <div className="grid"/><div className="water"/><div className="land"/>
          <div className="coord tl">23.0501°N</div>
          <div className="coord tr">113.3895°E</div>
          <div className="coord bl">SCALE 1:5000</div>
          <div className="coord br">ZOOM 13</div>
          <div className="compass">N</div>
          <div className="marker amber active" style={{top:"55%",left:"30%"}}/>
          <div className="marker cyan" style={{top:"32%",left:"62%"}}/>
          <div className="marker green" style={{top:"70%",left:"80%"}}/>
          <div className="route"/>
          <div className="ctrl full">⤢</div>
          <div className="ctrl locate">◉</div>
          <div className="route-pill"><span className="num">3.2</span> KM <span className="x">✕</span></div>
        </div>
        <div className="index-mod">
          <div className="module-head"><div className="label">// FISHING INDEX · NOW</div><div className="val"><span className="num">+5</span> vs 24H</div></div>
          <div className="index-grid">
            <div className="index-num">87</div>
            <div className="index-side">
              <div className="verdict">爆护</div>
              <div className="stamp">EXCELLENT</div>
              <div className="desc">气压上升通道, 鱼口活跃</div>
            </div>
          </div>
          <div className="index-bar"><div className="k">EXPERT</div><div className="bar"><div style={{width:"82%"}}/></div><div className="v">82</div></div>
          <div className="index-bar"><div className="k">RESIDUAL</div><div className="bar"><div style={{width:"5%",background:"#5fb872"}}/></div><div className="v">+5</div></div>
          <div className="index-bar"><div className="k">FINAL</div><div className="bar"><div style={{width:"87%"}}/></div><div className="v">87</div></div>
          <div className="index-actions">
            <button className="primary">SUBMIT FEEDBACK</button>
            <button className="secondary">DETAIL</button>
          </div>
        </div>
        <div className="footer-line">在出钓与阅读之间 · 留一片安静</div>
      </div>
    </div>
  );
}

function ScreenMainScrolled() {
  return (
    <div className="app">
      <AppHeader/>
      <div className="app-body">
        <div className="module">
          <div className="module-head"><div className="label">// WEATHER · LIVE</div><div className="val">{LOC}</div></div>
          <div className="wx-grid">
            <div className="wx-cell"><div className="k">TEMP</div><div className="v">24<span className="u">°C</span></div></div>
            <div className="wx-cell"><div className="k">FEELS</div><div className="v">22<span className="u">°C</span></div></div>
            <div className="wx-cell"><div className="k">WIND</div><div className="v">3.2<span className="u">m/s</span><span className="sub">SE</span></div></div>
            <div className="wx-cell"><div className="k">VIS</div><div className="v">15<span className="u">km</span></div></div>
            <div className="wx-cell"><div className="k">HUM</div><div className="v">65<span className="u">%</span></div></div>
            <div className="wx-cell"><div className="k">PRES</div><div className="v">1012<span className="u">hPa</span></div></div>
            <div className="wx-cell"><div className="k">UV</div><div className="v">5<span className="sub">MOD</span></div></div>
            <div className="wx-cell"><div className="k">DEW</div><div className="v">17<span className="u">°C</span></div></div>
          </div>
          <div className="wx-forecast">
            {["MON","TUE","WED","THU","FRI","SAT","SUN"].map((d,i)=>(
              <div className={`wx-day ${i===0?"active":""}`} key={d}>
                <div className="when">{d}</div>
                <div className="ic">{FORECAST_ICONS[i]}</div>
                <div className="t"><span className="h">{26-i}°</span> <span className="l">{19+(i%2)}°</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="module" style={{paddingTop:14}}>
          <div className="module-head"><div className="label">// TIDE · 24H</div><div className="val">黄埔港 · 13 JUN</div></div>
          <div className="chip-row">{TIDE_SPOTS.map((s,i)=><button className={`chip ${i===0?"active":""}`} key={s}>{s}</button>)}</div>
          <div className="chip-row" style={{paddingTop:0}}>{DATES.map((d,i)=><button className={`chip ${i===0?"active":""}`} key={d}>{d}</button>)}</div>
          <div className="tide-chart">
            <svg viewBox="0 0 320 110" preserveAspectRatio="none">
              <defs><linearGradient id="tg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4dd0c2" stopOpacity="0.25"/><stop offset="1" stopColor="#4dd0c2" stopOpacity="0"/></linearGradient></defs>
              {(()=>{
                const data = Array.from({length:24},(_,i)=>1.4+Math.sin((i/12)*Math.PI)*1.0);
                const min=0.3,max=2.5,pad=4,W=320,H=110;
                const pts = data.map((v,i)=>[pad+(i/23)*(W-pad*2),H-pad-((v-min)/(max-min))*(H-pad*2)]);
                const path = pts.map((p,i)=>(i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
                return <>
                  <path d={path+` L${pts[23][0]},${H-pad} L${pts[0][0]},${H-pad} Z`} fill="url(#tg3)"/>
                  <path d={path} fill="none" stroke="#4dd0c2" strokeWidth="1.5"/>
                  <line x1={pts[0][0]} x2={pts[0][0]} y1={pad} y2={H-pad} stroke="#f0a830" strokeWidth="0.8" strokeDasharray="2 2"/>
                  <text x={pts[0][0]+4} y={pad+8} fontSize="8" fill="#f0a830" fontFamily="JetBrains Mono" fontWeight="600">NOW</text>
                </>;
              })()}
            </svg>
          </div>
          <div className="tide-grid">
            <div><div className="k">↑ HIGH · 18:24</div><div className="v up">2.4 m</div><div className="meta">RISE PHASE</div></div>
            <div><div className="k">↓ LOW · 02:15</div><div className="v down">0.3 m</div><div className="meta">FALL PHASE</div></div>
          </div>
        </div>

        <div className="module">
          <div className="module-head"><div className="label">// 24H FORECAST</div><div className="val">TEMP + PRECIP</div></div>
          <div className="hour-legend"><span><span className="sw r"/>PRECIP mm</span><span><span className="sw t"/>TEMP °C</span></div>
          <div className="hour-chart">
            <svg viewBox="0 0 320 110" preserveAspectRatio="none">
              {(()=>{
                const pad=4,W=320,H=110;
                const data = Array.from({length:24},(_,i)=>({rain: i>12&&i<18?Math.random()*5:0.4}));
                const barW=(W-pad*2)/24*0.55, gap=(W-pad*2)/24;
                return data.map((d,i)=>{const x=pad+i*gap+(gap-barW)/2; const h=(d.rain/6)*(H-pad*2)*0.45; const y=H-pad-h; return <rect key={i} x={x} y={y} width={barW} height={h} fill="#4dd0c2" rx="0.5"/>;});
              })()}
              {(()=>{
                const pad=4,W=320,H=110;
                const data = Array.from({length:24},(_,i)=>22+Math.sin((i/24)*Math.PI)*6);
                const minT=16,maxT=32;
                const pts = data.map((v,i)=>{const x=pad+i*((W-pad*2)/24)+((W-pad*2)/24)/2; const y=H-pad-((v-minT)/(maxT-minT))*(H-pad*2)*0.85; return [x,y];});
                const path = pts.map((p,i)=>(i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
                return <path d={path} fill="none" stroke="#f0a830" strokeWidth="1.5"/>;
              })()}
            </svg>
          </div>
        </div>
        <div className="footer-line">在出钓与阅读之间 · 留一片安静</div>
      </div>
    </div>
  );
}

function ScreenMapFS() {
  return (
    <div className="app">
      <AppHeader/>
      <div className="app-body" style={{padding:0}}>
        <div className="map-fs">
          <div className="grid"/><div className="water"/><div className="land"/>
          <div className="pin amber" style={{top:"30%",left:"30%"}}>1</div>
          <div className="pin cyan" style={{top:"52%",left:"62%"}}>2</div>
          <div className="pin green" style={{top:"70%",left:"20%"}}>3</div>
          <div className="route"/>
          <div className="close-fs">✕</div>
          <div className="info">
            <div className="name">▸ SPOT 02 · 黄埔港</div>
            <div className="meta">23.05°N · 113.39°E · 鲈鱼 鲷鱼</div>
            <div className="dist">3.2 KM · ETA 8 MIN</div>
          </div>
          <div className="stats">
            <div className="cell"><div className="k">DIST</div><div className="v">3.2</div></div>
            <div className="cell"><div className="k">TEMP</div><div className="v">24°</div></div>
            <div className="cell"><div className="k">WIND</div><div className="v">3.2</div></div>
            <div className="cell"><div className="k">TIDE</div><div className="v">2.4m</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetFrame({ title, sub, children }) {
  return (
    <div className="app" style={{position:"relative"}}>
      <AppHeader/>
      <div className="app-body" style={{opacity:0.25}}><div style={{height:600}}/></div>
      <div className="sheet-backdrop"/>
      <div className="sheet">
        <div className="sheet-handle"/>
        <div className="sheet-head"><div className="l"><h2>{title}</h2><div className="sub">{sub}</div></div><div className="close">✕</div></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function ScreenAISheet() {
  return (
    <SheetFrame title="AI 分析" sub="LIVING 2.6 · STREAMING">
      <div className="ai-status">GENERATING · 1.8s</div>
      <div className="ai-stream">今日适合出钓。

气温 24°C 体感舒适，东南风 3.2 m/s，水面波纹细腻。气压 1012 hPa 处于上升通道，鱼口活跃。

建议时段：05:30-08:00 / 17:30-19:30。

潮汐：18:24 达最高潮 2.4m，涨潮前 1.5h 最佳。

装备：2.1m 路亚竿，铅头钩 7g，米诺 9cm。</div>
      <select className="ai-model"><option>LING 2.6</option><option>LING 2.6 FLASH</option><option>RING 2.5</option></select>
      <button className="ai-cta">RE-GENERATE</button>
    </SheetFrame>
  );
}

function ScreenFeedback() {
  const [picked,setPicked] = useState("爆护");
  return (
    <SheetFrame title="SUBMIT FEEDBACK" sub="钓完了？告诉我们今天实际如何">
      <div className="fb-info">
        <div className="row"><span className="k">LOCATION</span><span className="v">黄埔港</span></div>
        <div className="row"><span className="k">INDEX</span><span className="v green">87 · 爆护</span></div>
        <div className="row"><span className="k">TIME</span><span className="v">2026-06-13 15:24</span></div>
      </div>
      <div className="fb-section">// YOUR RESULT</div>
      <div className="fb-choices">
        {FEEDBACK.map(l=>(
          <button key={l.v} className={`fb-choice ${picked===l.v?"selected":""}`} onClick={()=>setPicked(l.v)}>
            <span className="ic">{l.ic}</span>{l.v}
          </button>
        ))}
      </div>
      <div className="fb-actions">
        <button className="cancel">CANCEL</button>
        <button className="submit">SUBMIT</button>
      </div>
    </SheetFrame>
  );
}

function ScreenFeatures() {
  return (
    <SheetFrame title="FEATURE DETAIL" sub="9 SUB-FEATURES · LIVE">
      <div className="feat-grid">
        {FEATURES.map(f=>{
          const pct = Math.min(100,(f.v/f.max)*100);
          return <div className="feat" key={f.k}><div className="k">{f.k}</div><div className="v">{f.v}</div><div className="bar"><div style={{width:pct+"%"}}/></div></div>;
        })}
      </div>
    </SheetFrame>
  );
}

function Slot({num,label,children}){return <div className="phone-slot"><div className="phone-label"><span className="num">[{num}]</span>{label}</div><IPhone>{children}</IPhone></div>;}

function App() {
  return (
    <div className="row">
      <Slot num="01" label="主屏顶部 — 地图 + 指数仪表"><ScreenMainTop/></Slot>
      <Slot num="02" label="主屏下滑 — 8 项 weather + 潮汐 + 24h"><ScreenMainScrolled/></Slot>
      <Slot num="03" label="地图全屏 — 底部 stats bar"><ScreenMapFS/></Slot>
      <Slot num="04" label="AI 分析底部 sheet"><ScreenAISheet/></Slot>
      <Slot num="05" label="反馈表单底部 sheet"><ScreenFeedback/></Slot>
      <Slot num="06" label="指数特征详情 sheet"><ScreenFeatures/></Slot>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
