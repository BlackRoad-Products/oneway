export interface Env { STORE: KVNamespace; DB: D1Database; SERVICE_NAME: string; VERSION: string; }
const SVC = "oneway";
function json(d: unknown, s = 200) { return new Response(JSON.stringify(d,null,2),{status:s,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","X-BlackRoad-Service":SVC}}); }
async function track(env: Env, req: Request, path: string) { const cf=(req as any).cf||{}; env.DB.prepare("INSERT INTO analytics(subdomain,path,country,ua,ts)VALUES(?,?,?,?,?)").bind(SVC,path,cf.country||"",req.headers.get("User-Agent")?.slice(0,150)||"",Date.now()).run().catch(()=>{}); }

async function getBroadcasts(env: Env, limit=20): Promise<any[]> {
  const list=await env.STORE.list({prefix:"broadcast:"});
  const sorted=list.keys.sort((a,b)=>b.name.localeCompare(a.name)).slice(0,limit);
  const items=await Promise.all(sorted.map(async k=>{const v=await env.STORE.get(k.name);return v?JSON.parse(v):null;}));
  return items.filter(Boolean);
}

function page(broadcasts: any[]): Response {
  const html=`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OneWay — Broadcast Channel</title>
<meta name="description" content="Sovereign signal routing and convoy notifications for BlackRoad OS.">
<link rel="canonical" href="https://oneway.blackroad.io/">
<meta property="og:title" content="OneWay — Broadcast Channel">
<meta property="og:description" content="Sovereign signal routing and convoy notifications for BlackRoad OS.">
<meta property="og:url" content="https://oneway.blackroad.io/">
<meta property="og:type" content="website">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"OneWay","url":"https://oneway.blackroad.io/","description":"Sovereign signal routing and convoy notifications for BlackRoad OS.","applicationCategory":"CommunicationApplication","publisher":{"@type":"Organization","name":"BlackRoad OS, Inc.","url":"https://blackroad.io"}}</script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#030303;--card:#0a0a0a;--border:#111;--text:#f0f0f0;--sub:#444;--purple:#7800FF;--grad:linear-gradient(135deg,#7800FF,#FF00D4,#FF2255)}
html,body{min-height:100vh;background:var(--bg);color:var(--text);font-family:'Space Grotesk',sans-serif}
.grad-bar{height:2px;background:var(--grad)}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px}
h1{font-size:2rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{font-size:.75rem;color:var(--sub);font-family:'JetBrains Mono',monospace;margin-bottom:28px}
.compose{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:24px}
.ct{font-size:.65rem;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;font-family:'JetBrains Mono',monospace;margin-bottom:12px}
textarea{width:100%;padding:12px;background:#0d0d0d;border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:.9rem;outline:none;min-height:80px;resize:vertical}
textarea:focus{border-color:var(--purple)}
.compose-footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.channel-select{display:flex;gap:6px}
.ch{padding:5px 12px;background:#0d0d0d;border:1px solid var(--border);border-radius:20px;font-size:.72rem;cursor:pointer;color:var(--sub);transition:all .15s;font-family:'JetBrains Mono',monospace;user-select:none}
.ch.on{border-color:var(--purple);color:var(--purple)}
.send-btn{padding:9px 22px;background:var(--purple);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:.85rem}
.send-btn:hover{opacity:.85}
.feed{display:flex;flex-direction:column;gap:10px}
.broadcast{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;animation:fadein .3s ease}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.bc-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.bc-from{font-weight:700;font-size:.85rem}
.bc-channel{padding:2px 8px;border-radius:4px;font-size:.62rem;font-family:'JetBrains Mono',monospace;border:1px solid;text-transform:uppercase}
.ch-all{color:#7800FF;border-color:#7800FF;background:rgba(136,68,255,.08)}
.ch-agents{color:#00E676;border-color:#00E676;background:rgba(0,230,118,.08)}
.ch-ops{color:#FF6B2B;border-color:#FF6B2B;background:rgba(255,107,53,.08)}
.bc-ts{font-size:.65rem;color:var(--sub);font-family:'JetBrains Mono',monospace;margin-left:auto}
.bc-body{font-size:.85rem;line-height:1.6;color:#ccc}
.live-dot{width:6px;height:6px;border-radius:50%;background:#00E676;box-shadow:0 0 6px #00E676;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.live-row{display:flex;align-items:center;gap:8px;font-size:.68rem;font-family:'JetBrains Mono',monospace;color:var(--sub);margin-bottom:14px}
</style></head><body>
<div class="grad-bar"></div>
<div class="wrap">
<h1>OneWay</h1>
<div class="sub">oneway.blackroad.io · broadcast channel · convoy notifications</div>
<div class="live-row"><div class="live-dot"></div><span id="live-status">connecting to stream...</span></div>
<div class="compose">
  <div class="ct">Broadcast to Convoy</div>
  <textarea id="msg" placeholder="Send a message to the entire convoy..."></textarea>
  <div class="compose-footer">
    <div class="channel-select">
      <div class="ch on" onclick="toggleCh(this,'all')">all</div>
      <div class="ch" onclick="toggleCh(this,'agents')">agents</div>
      <div class="ch" onclick="toggleCh(this,'ops')">ops</div>
    </div>
    <button class="send-btn" onclick="broadcast()">Broadcast</button>
  </div>
</div>
<div class="ct">Live Feed</div>
<div class="feed" id="feed">
${broadcasts.length?broadcasts.map(b=>`<div class="broadcast"><div class="bc-header"><div class="bc-from">${b.from||'convoy'}</div><div class="bc-channel ch-${b.channel||'all'}">${b.channel||'all'}</div><div class="bc-ts">${new Date(b.ts).toLocaleTimeString()}</div></div><div class="bc-body">${b.body}</div></div>`).join(''):`<div style="color:var(--sub);font-size:.85rem;padding:20px 0">No broadcasts yet. Send the first one above.</div>`}
</div>
</div>
<script src="https://cdn.blackroad.io/br.js"></script>
<script>
var selectedCh='all';
function toggleCh(el,ch){document.querySelectorAll('.ch').forEach(x=>{x.className='ch';});el.className='ch on';selectedCh=ch;}
async function broadcast(){
  var body=document.getElementById('msg').value.trim();if(!body)return;
  await fetch('/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body,channel:selectedCh,from:'alexa'})});
  document.getElementById('msg').value='';
  loadFeed();
}
async function loadFeed(){
  var r=await fetch('/api/broadcasts');var d=await r.json();
  var feed=document.getElementById('feed');
  if(!d.broadcasts?.length){feed.innerHTML='<div style="color:var(--sub);font-size:.85rem;padding:20px 0">No broadcasts yet.</div>';return;}
  feed.innerHTML=d.broadcasts.map(function(b){return'<div class="broadcast"><div class="bc-header"><div class="bc-from">'+(b.from||'convoy')+'</div><div class="bc-channel ch-'+(b.channel||'all')+'">'+(b.channel||'all')+'</div><div class="bc-ts">'+new Date(b.ts).toLocaleTimeString()+'</div></div><div class="bc-body">'+b.body+'</div></div>';}).join('');
}
// Connect to stream SSE
try{
  var es=new EventSource('https://stream.blackroad.io/events/platform');
  es.onopen=function(){document.getElementById('live-status').textContent='live · connected to stream';};
  es.onmessage=function(e){try{var d=JSON.parse(e.data);if(d.type==='ping'||d.type==='connected')return;var feed=document.getElementById('feed');var el=document.createElement('div');el.className='broadcast';el.innerHTML='<div class="bc-header"><div class="bc-from">stream</div><div class="bc-channel ch-ops">system</div><div class="bc-ts">'+new Date().toLocaleTimeString()+'</div></div><div class="bc-body">'+JSON.stringify(d).slice(0,120)+'</div>';feed.insertBefore(el,feed.firstChild);}catch{}};
  es.onerror=function(){document.getElementById('live-status').textContent='reconnecting...';};
}catch{}
</script>
</body></html>`;
  return new Response(html,{headers:{"Content-Type":"text/html;charset=UTF-8"}});
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*"}});
    const url=new URL(req.url);const path=url.pathname;
    track(env,req,path);
    if(path==="/health")return json({service:SVC,status:"ok",version:env.VERSION,ts:Date.now()});
    if(path==="/api/broadcast"&&req.method==="POST"){
      const b=await req.json() as any;
      const id=`broadcast:${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
      await env.STORE.put(id,JSON.stringify({id,body:b.body,channel:b.channel||"all",from:b.from||"anonymous",ts:Date.now()}),{expirationTtl:86400*30});
      return json({ok:true,id});
    }
    if(path==="/api/broadcasts"){
      const broadcasts=await getBroadcasts(env,30);
      return json({broadcasts});
    }
    const broadcasts=await getBroadcasts(env,20);
    return page(broadcasts);
  }
};
