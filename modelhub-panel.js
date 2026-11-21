/*!
 * ModelHub v1.2.1 — Quantumult X 本地模型路由（rewrite 架构，不需要本地服务器）
 * 生成时间: 2026-11-22 07:13
 * 本文件由 build.py 自动生成，请勿直接编辑；改 src/ 后重新构建。
 */
// ===== 版本 =====
var MH_VER_ = "1.2.1";
// ===== 面板 UI（内联 HTML）=====
var MH_HTML_ = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1\">\n<meta name=\"theme-color\" content=\"#0a0b0e\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<title>ModelHub · 本地模型路由</title>\n<style>\n:root{\n  --bg:#0a0b0e; --bg2:#111318; --card:#15181f; --card2:#1b1f28;\n  --line:#232833; --line2:#2e3542;\n  --tx:#e8ecf3; --tx2:#9aa4b5; --tx3:#5f6a7d;\n  --ac:#5b8cff; --ac2:#7aa2ff; --ok:#3ddc97; --bad:#ff5c5c; --warn:#ffb648;\n  --r:14px;\n}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--tx);\n  font:15px/1.5 -apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"PingFang SC\",\"Helvetica Neue\",sans-serif;\n  -webkit-font-smoothing:antialiased;overscroll-behavior-y:none}\nbody{padding-bottom:calc(72px + env(safe-area-inset-bottom))}\na{color:var(--ac);text-decoration:none}\n/* ---------- top ---------- */\n.top{position:sticky;top:0;z-index:50;background:rgba(10,11,14,.82);\n  backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);\n  border-bottom:1px solid var(--line);padding:calc(10px + env(safe-area-inset-top)) 16px 10px}\n.top-row{display:flex;align-items:center;gap:10px}\n.logo{font-weight:700;font-size:17px;letter-spacing:-.3px;display:flex;align-items:center;gap:8px}\n.logo i{width:9px;height:9px;border-radius:50%;background:var(--tx3);display:inline-block;\n  box-shadow:0 0 0 0 rgba(61,220,151,.5);transition:.3s}\n.logo i.on{background:var(--ok);box-shadow:0 0 0 4px rgba(61,220,151,.14)}\n.logo i.dead{background:var(--bad);box-shadow:0 0 0 4px rgba(255,92,92,.14)}\n.spacer{flex:1}\n.hint{font-size:11.5px;color:var(--tx3);margin-top:3px}\n/* ---------- buttons ---------- */\n.btn{appearance:none;border:1px solid var(--line2);background:var(--card2);color:var(--tx);\n  padding:8px 13px;border-radius:10px;font-size:13.5px;font-weight:500;cursor:pointer;\n  transition:.16s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}\n.btn:active{transform:scale(.97)}\n.btn:hover{border-color:#3b4454}\n.btn.pri{background:var(--ac);border-color:var(--ac);color:#fff;font-weight:600}\n.btn.pri:hover{background:var(--ac2);border-color:var(--ac2)}\n.btn.danger{color:var(--bad);border-color:rgba(255,92,92,.32)}\n.btn.danger:hover{background:rgba(255,92,92,.1)}\n.btn.sm{padding:6px 10px;font-size:12.5px;border-radius:8px}\n.btn.ghost{background:transparent}\n.btn:disabled{opacity:.42;cursor:not-allowed}\n.btn.busy{position:relative;color:transparent!important}\n.btn.busy::after{content:\"\";position:absolute;inset:0;margin:auto;width:14px;height:14px;\n  border:2px solid rgba(255,255,255,.32);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}\n@keyframes sp{to{transform:rotate(360deg)}}\n/* ---------- layout ---------- */\nmain{padding:16px;max-width:860px;margin:0 auto}\nsection{display:none;animation:fade .22s ease}\nsection.active{display:block}\n@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}\n.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px;margin-bottom:12px}\n.card.tight{padding:0;overflow:hidden}\n.card-h{font-size:12.5px;font-weight:600;letter-spacing:0;\n  color:var(--tx3);margin:0 0 10px}\n.row{display:flex;align-items:center;gap:10px}\n.wrap{flex-wrap:wrap}\n/* ---------- overview ---------- */\n.gw{background:linear-gradient(135deg,#17203a,#111827 60%,#15181f);\n  border:1px solid #26304a;border-radius:var(--r);padding:15px;margin-bottom:12px;position:relative;overflow:hidden}\n.gw::after{content:\"\";position:absolute;right:-40px;top:-40px;width:130px;height:130px;border-radius:50%;\n  background:radial-gradient(circle,rgba(91,140,255,.26),transparent 70%)}\n.gw .lbl{font-size:12px;color:#8ea0c8;letter-spacing:0;font-weight:600}\n.gw .url{font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:7px;\n  word-break:break-all;color:#dbe6ff;background:rgba(0,0,0,.28);padding:9px 11px;border-radius:9px;\n  border:1px solid rgba(255,255,255,.06)}\n.gw .tok{font-size:11.5px;color:#8ea0c8;margin-top:8px}\n.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px}\n.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 10px;text-align:center}\n.stat b{display:block;font-size:22px;font-weight:700;letter-spacing:-.5px;font-variant-numeric:tabular-nums}\n.stat span{font-size:11px;color:var(--tx3);display:block;margin-top:2px}\n/* ---------- list ---------- */\n.item{display:flex;align-items:center;gap:11px;padding:12px 14px;border-bottom:1px solid var(--line)}\n.item:last-child{border-bottom:0}\n.item .main{flex:1;min-width:0}\n.item .t{font-size:14.5px;font-weight:560;display:flex;align-items:center;gap:7px;flex-wrap:wrap}\n.item .s{font-size:12px;color:var(--tx3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}\n.tag{font-size:10.5px;padding:2px 7px;border-radius:20px;font-weight:600;letter-spacing:.02em;\n  background:var(--card2);color:var(--tx2);border:1px solid var(--line2)}\n.tag.ok{color:var(--ok);border-color:rgba(61,220,151,.3);background:rgba(61,220,151,.08)}\n.tag.bad{color:var(--bad);border-color:rgba(255,92,92,.3);background:rgba(255,92,92,.08)}\n.tag.warn{color:var(--warn);border-color:rgba(255,182,72,.3);background:rgba(255,182,72,.08)}\n.tag.ac{color:var(--ac2);border-color:rgba(91,140,255,.3);background:rgba(91,140,255,.08)}\n.dot{width:7px;height:7px;border-radius:50%;background:var(--tx3);flex:none}\n.dot.ok{background:var(--ok)}.dot.bad{background:var(--bad)}.dot.warn{background:var(--warn)}\n/* switch */\n.sw{width:44px;height:26px;border-radius:20px;background:#2a3040;position:relative;flex:none;\n  align-self:flex-start;margin-top:2px;\n  cursor:pointer;transition:.2s;border:1px solid transparent}\n.sw::after{content:\"\";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;\n  background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.4)}\n.sw.on{background:var(--ok)}\n.sw.on::after{transform:translateX(18px)}\n/* form */\nlabel.f{display:block;font-size:12px;color:var(--tx2);margin:0 0 6px;font-weight:500}\ninput[type=text],input[type=password],input[type=number],select,textarea{\n  width:100%;background:var(--bg2);border:1px solid var(--line2);color:var(--tx);\n  padding:10px 12px;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:.16s;\n  -webkit-appearance:none;appearance:none}\ninput:focus,select:focus,textarea:focus{border-color:var(--ac);background:#0e1118}\nselect{background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239aa4b5' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\");\n  background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}\n.fg{margin-bottom:11px}\n.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n.presets{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}\n.chip{font-size:12px;padding:5px 10px;border-radius:20px;background:var(--card2);\n  border:1px solid var(--line2);cursor:pointer;color:var(--tx2);transition:.15s;white-space:nowrap}\n.chip:hover{border-color:var(--ac);color:var(--tx)}\n.chip.on{background:rgba(91,140,255,.14);border-color:var(--ac);color:var(--ac2)}\n/* model picker */\n.picker{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.62);backdrop-filter:blur(6px);\n  -webkit-backdrop-filter:blur(6px);display:none;align-items:flex-end;justify-content:center}\n.picker.on{display:flex}\n.sheet{background:var(--bg2);width:100%;max-width:640px;max-height:86vh;border-radius:18px 18px 0 0;\n  display:flex;flex-direction:column;border:1px solid var(--line2);border-bottom:0;\n  animation:up .26s cubic-bezier(.22,1,.36,1);padding-bottom:env(safe-area-inset-bottom)}\n@keyframes up{from{transform:translateY(100%)}to{transform:none}}\n.sheet-h{padding:16px 16px 10px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}\n.sheet-b{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 0;flex:1;min-height:0}\n.sheet-f{padding:12px 16px;border-top:1px solid var(--line);display:flex;gap:9px;flex:none}\n.pk{display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer}\n.pk:hover{background:var(--card)}\n.pk .cb{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--line2);flex:none;\n  display:flex;align-items:center;justify-content:center;transition:.15s}\n.pk.on .cb{background:var(--ac);border-color:var(--ac)}\n.pk.on .cb::after{content:\"\";width:5px;height:9px;border:2px solid #fff;border-top:0;border-left:0;\n  transform:rotate(45deg) translateY(-1px)}\n/* toast */\n.toast{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translate(-50%,14px);\n  background:#232a36;color:#fff;padding:10px 17px;border-radius:11px;font-size:13.5px;z-index:400;\n  opacity:0;pointer-events:none;transition:.25s;max-width:88vw;text-align:center;\n  border:1px solid var(--line2);box-shadow:0 8px 30px rgba(0,0,0,.5)}\n.toast.on{opacity:1;transform:translate(-50%,0)}\n.toast.err{background:#3a1d1d;border-color:#5c2626}\n.toast.ok{background:#14342a;border-color:#1d5c46}\n/* tabbar */\n.tabs{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;\n  background:rgba(12,14,18,.9);backdrop-filter:blur(22px) saturate(180%);\n  -webkit-backdrop-filter:blur(22px) saturate(180%);border-top:1px solid var(--line);\n  padding-bottom:env(safe-area-inset-bottom)}\n.tabs button{flex:1;appearance:none;background:none;border:0;color:var(--tx3);font-size:10.5px;\n  padding:9px 0 7px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;\n  font-family:inherit;transition:.15s}\n.tabs button .ic{font-size:18px;line-height:1;filter:grayscale(1) opacity(.55);transition:.15s}\n.tabs button.on{color:var(--ac2)}\n.tabs button.on .ic{filter:none}\n.empty{text-align:center;padding:38px 20px;color:var(--tx3);font-size:13.5px;line-height:1.7}\n.empty b{display:block;font-size:15px;color:var(--tx2);margin-bottom:5px;font-weight:600}\npre.log{font:11.5px/1.55 ui-monospace,Menlo,monospace;color:var(--tx2);margin:0;\n  padding:12px 14px;max-height:64vh;overflow:auto;white-space:pre-wrap;word-break:break-all}\n.bars{display:flex;gap:3px;align-items:flex-end;height:46px;margin:10px 0 8px}\n.bars>div{flex:1;background:linear-gradient(180deg,#5b8cff,#33509e);border-radius:2px;\n  min-height:2px;transition:.25s;opacity:.9}\n.bars>div:hover{opacity:1;background:linear-gradient(180deg,#7aa2ff,#3d63c4)}\n.bar{height:3px;border-radius:3px;background:var(--line2);overflow:hidden;margin-top:7px}\n.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--ac),var(--ok));transition:.3s}\n.warnbox{background:rgba(255,182,72,.07);border:1px solid rgba(255,182,72,.22);border-radius:11px;\n  padding:11px 13px;font-size:12.5px;color:#e8c98c;line-height:1.65;margin-bottom:12px}\n.warnbox b{color:var(--warn)}\n</style>\n</head>\n<body>\n<div class=\"top\">\n  <div class=\"top-row\">\n    <div class=\"logo\"><i id=\"dot\"></i>ModelHub</div>\n    <div class=\"spacer\"></div>\n    <button class=\"btn sm\" id=\"btnCheck\">检测</button>\n    <button class=\"btn sm pri\" id=\"btnAdd\">+ 提供商</button>\n  </div>\n  <div class=\"hint\" id=\"sub\">本地模型路由 · 加载中…</div>\n</div>\n<main>\n  <section id=\"s-ov\" class=\"active\"></section>\n  <section id=\"s-pv\"></section>\n  <section id=\"s-md\"></section>\n  <section id=\"s-rt\"></section>\n  <section id=\"s-lg\"></section>\n</main>\n<div class=\"tabs\">\n  <button data-t=\"ov\" class=\"on\"><span class=\"ic\">◈</span>概览</button>\n  <button data-t=\"pv\"><span class=\"ic\">☁</span>提供商</button>\n  <button data-t=\"md\"><span class=\"ic\">▤</span>模型</button>\n  <button data-t=\"rt\"><span class=\"ic\">⇄</span>路由</button>\n  <button data-t=\"lg\"><span class=\"ic\">≡</span>日志</button>\n</div>\n<div class=\"picker\" id=\"picker\">\n  <div class=\"sheet\">\n    <div class=\"sheet-h\">\n      <div style=\"flex:1\">\n        <div style=\"font-weight:600;font-size:15px\" id=\"pkTitle\">发现模型</div>\n        <div style=\"font-size:12px;color:var(--tx3);margin-top:2px\" id=\"pkSub\"></div>\n      </div>\n      <button class=\"btn sm ghost\" id=\"pkAll\">全选</button>\n    </div>\n    <div class=\"sheet-b\" id=\"pkBody\"></div>\n    <div class=\"sheet-f\">\n      <button class=\"btn\" id=\"pkCancel\" style=\"flex:1\">取消</button>\n      <button class=\"btn pri\" id=\"pkOk\" style=\"flex:2\">添加所选</button>\n    </div>\n  </div>\n</div>\n<div class=\"toast\" id=\"toast\"></div>\n<script>\n/* ============ 基础 ============ */\nvar S = null, TAB = 'ov', PICK = [], PKPID = '';\nvar P = location.pathname; if(!/\\/$/.test(P)) P = P.replace(/[^/]*$/,'');\nvar API = (P.replace(/\\/$/,'')) + '/api/';\nvar MOCK = (location.protocol==='file:') || /[?&]mock=1/.test(location.search);\n\nfunction $(s){return document.querySelector(s)}\nfunction h(s){ // 转义\n  if(s===null||s===undefined) return '';\n  return String(s).replace(/[&<>\"']/g, function(c){\n    return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c];\n  });\n}\nfunction fmtNum(n){\n  n = n||0;\n  if(n>=1e9) return (n/1e9).toFixed(1)+'B';\n  if(n>=1e6) return (n/1e6).toFixed(1)+'M';\n  if(n>=1e3) return (n/1e3).toFixed(n>=1e4?0:1)+'k';\n  return String(n);\n}\nfunction ms(v){ if(!v||v<0) return '—'; return v<1000? v+'ms' : (v/1000).toFixed(v<10000?2:1)+'s'; }\nfunction ago(t){\n  if(!t) return '从未';\n  var d=Date.now()-t; if(d<0) d=0;\n  if(d<60000) return Math.max(1,Math.round(d/1000))+'s 前';\n  if(d<3600000) return Math.round(d/60000)+'m 前';\n  if(d<86400000) return Math.round(d/3600000)+'h 前';\n  return Math.round(d/86400000)+'d 前';\n}\nfunction toast(msg, kind){\n  var t=$('#toast'); t.textContent=msg; t.className='toast on'+(kind?' '+kind:'');\n  clearTimeout(t._t); t._t=setTimeout(function(){t.className='toast'}, 2600);\n}\n\n/* ============ API ============ */\nfunction api(path, body){\n  if(MOCK) return mockApi(path, body);\n  var q = '';\n  if(body){\n    var parts = [];\n    for(var k in body){\n      var v = body[k];\n      if(v === undefined || v === null) continue;\n      if(Object.prototype.toString.call(v) === '[object Array]') v = v.join('|');\n      parts.push(encodeURIComponent(k)+'='+encodeURIComponent(v));\n    }\n    if(parts.length) q = '?' + parts.join('&');\n  }\n  return fetch(API+path+q, {method:'GET', cache:'no-store'}).then(function(r){ return r.json(); })\n    .catch(function(e){ return {ok:false, err:'网络错误: '+e.message}; });\n}\n\n/* ============ 渲染 ============ */\nfunction load(){\n  api('state').then(function(d){\n    if(!d || !d.ok){ $('#sub').textContent = '读取失败：'+((d&&d.err)||'未知'); return; }\n    S = d; render();\n  });\n}\n\nfunction render(){\n  if(!S) return;\n  var st=S.stats||{};\n  $('#dot').className = st.healthy>0 ? 'on' : (st.enabled>0?'dead':'');\n  $('#sub').textContent = '可用 '+st.healthy+' / 已启用 '+st.enabled+' / 共 '+st.total+\n    ' · 最快 '+(st.fastest? st.fastest+' ('+ms(st.fastestMs)+')' : '—');\n  ({ov:renderOv, pv:renderPv, md:renderMd, rt:renderRt, lg:renderLg})[TAB]();\n  $('#s-ov').className = TAB==='ov'?'active':'';\n  $('#s-pv').className = TAB==='pv'?'active':'';\n  $('#s-md').className = TAB==='md'?'active':'';\n  $('#s-rt').className = TAB==='rt'?'active':'';\n  $('#s-lg').className = TAB==='lg'?'active':'';\n}\n\n/* ---------- 概览 ---------- */\nfunction renderOv(){\n  var st=S.stats||{}, cfg=S.cfg||{};\n  var gw = (S.gwBase||'');\n  var html = '';\n  html += '<div class=\"gw\">'\n    + '<div class=\"lbl\">网关地址 · OpenAI 兼容接口</div>'\n    + '<div class=\"url\" id=\"gwUrl\">'+h(gw)+'</div>'\n    + '<div class=\"tok\">API Key 填：'+(cfg.gwToken? '<span class=\"mono\">'+h(cfg.gwToken)+'</span>' : '<span style=\"color:#ffb648\">未设置（建议去路由页设一个）</span>')+'</div>'\n    + '<div class=\"row\" style=\"margin-top:11px;gap:8px\">'\n    +   '<button class=\"btn sm\" onclick=\"copyGw()\">复制地址</button>'\n    +   '<button class=\"btn sm\" onclick=\"copyKey()\">复制 Key</button>'\n    +   '<button class=\"btn sm ghost\" onclick=\"document.querySelector(\\'[data-t=rt]\\').click()\">路由设置</button>'\n    + '</div></div>';\n\n  html += '<div class=\"stats\">'\n    + '<div class=\"stat\"><b style=\"color:var(--ok)\">'+(st.healthy||0)+'</b><span>可用模型</span></div>'\n    + '<div class=\"stat\"><b>'+(st.enabled||0)+'</b><span>已启用</span></div>'\n    + '<div class=\"stat\"><b>'+(st.providers||0)+'</b><span>提供商</span></div>'\n    + '</div>';\n\n  // ---- Token 用量 ----\n  var us = S.usage || {today:{},week:{},month:{},byDay:[],tops:[],total:{}};\n  var maxT = 0;\n  (us.byDay||[]).forEach(function(x){ if(x.t>maxT) maxT=x.t; });\n  var bars = '';\n  (us.byDay||[]).forEach(function(x){\n    var hp = maxT ? Math.max(2, Math.round(x.t/maxT*100)) : 2;\n    bars += '<div title=\"'+h(x.d)+' · '+fmtNum(x.t)+' tokens · '+x.n+' 次\" style=\"height:'+hp+'%\"></div>';\n  });\n\n  html += '<div class=\"card\">'\n    + '<div class=\"row\" style=\"margin-bottom:10px\"><div class=\"card-h\" style=\"margin:0;flex:1\">Token 消耗</div>'\n    + '<button class=\"btn sm ghost\" onclick=\"resetUsage()\">重置</button></div>'\n    + '<div class=\"stats\" style=\"margin-bottom:0\">'\n    +   '<div class=\"stat\"><b>'+fmtNum(us.today&&us.today.t)+'</b><span>今日</span></div>'\n    +   '<div class=\"stat\"><b>'+fmtNum(us.week&&us.week.t)+'</b><span>近 7 天</span></div>'\n    +   '<div class=\"stat\"><b>'+fmtNum(us.month&&us.month.t)+'</b><span>近 30 天</span></div>'\n    + '</div>'\n    + '<div class=\"bars\">'+bars+'</div>'\n    + '<div class=\"row\" style=\"justify-content:space-between;font-size:11.5px;color:var(--tx3)\">'\n    +   '<span>14 天前</span><span>今日 · '+(us.today&&us.today.n||0)+' 次请求</span>'\n    + '</div>';\n\n  if(us.tops && us.tops.length){\n    html += '<div style=\"margin-top:12px;border-top:1px solid var(--line);padding-top:10px\">';\n    us.tops.slice(0,4).forEach(function(t){\n      html += '<div class=\"row\" style=\"justify-content:space-between;padding:3px 0\">'\n        + '<span style=\"font-size:12.5px;color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%\" class=\"mono\">'+h(t.name)+'</span>'\n        + '<span class=\"mono\" style=\"font-size:12px;color:var(--tx3)\">'+fmtNum(t.t)+' · '+t.n+'次</span>'\n        + '</div>';\n    });\n    html += '</div>';\n  }\n  html += '</div>';\n\n  var lastCheck = 0, anyEnabled=0;\n  (S.models||[]).forEach(function(m){ if(m.checkedAt>lastCheck) lastCheck=m.checkedAt; if(m.enabled) anyEnabled++; });\n\n  html += '<div class=\"card\">'\n    + '<div class=\"card-h\">状态</div>'\n    + '<div class=\"row\" style=\"justify-content:space-between;margin-bottom:9px\"><span style=\"font-size:13.5px;color:var(--tx2)\">最近检测</span><span class=\"mono\">'+ago(lastCheck)+'</span></div>'\n    + '<div class=\"row\" style=\"justify-content:space-between;margin-bottom:9px\"><span style=\"font-size:13.5px;color:var(--tx2)\">轮询间隔</span><span class=\"mono\">每 '+(S.cfg&&S.cfg.checkMin||10)+' 分钟</span></div>'\n    + '<div class=\"row\" style=\"justify-content:space-between\"><span style=\"font-size:13.5px;color:var(--tx2)\">路由策略</span><span class=\"mono\">'+h(stratName(S.cfg&&S.cfg.strategy))+'</span></div>'\n    + '</div>';\n\n  if(!(S.models||[]).length){\n    html += '<div class=\"card\"><div class=\"empty\"><b>还没有模型</b>先去「提供商」添加一个 API，输入 Key 后会自动拉取模型列表。</div></div>';\n  } else {\n    var top = (S.models||[]).filter(function(m){return m.enabled}).sort(function(a,b){\n      if((a.ok?0:1)!==(b.ok?0:1)) return (a.ok?0:1)-(b.ok?0:1);\n      return (a.lat||9e9)-(b.lat||9e9);\n    }).slice(0,3);\n    if(top.length){\n      html += '<div class=\"card tight\"><div class=\"card-h\" style=\"padding:13px 14px 8px;margin:0\">当前优先使用</div>';\n      top.forEach(function(m,i){\n        html += '<div class=\"item\"><div class=\"dot '+(m.ok===true?'ok':(m.ok===false?'bad':'warn'))+'\"></div>'\n          + '<div class=\"main\"><div class=\"t\">'+h(m.alias||m.name)+(i===0?' <span class=\"tag ac\">首选</span>':'')+'</div>'\n          + '<div class=\"s\">'+h(m.pname)+' · '+(m.ok===true?'正常':(m.ok===false?'失败':'未检测'))+'</div></div>'\n          + '<span class=\"mono\" style=\"color:var(--tx2)\">'+(m.ok===true?ms(m.lat):'—')+'</span></div>';\n      });\n      html += '</div>';\n    }\n  }\n\n  html += '<div class=\"warnbox\"><b>怎么用：</b>把任意 OpenAI 兼容客户端（ChatBox / OpenCat / NextChat / LobeChat / 自建脚本）的 Base URL 设成上面那个地址，Key 填网关 Key，模型选面板里添加过的名字即可。不管填哪个模型名，路由都会自动挑当前最快的可用线路。</div>';\n\n  $('#s-ov').innerHTML = html;\n}\n\nfunction resetUsage(){\n  if(!confirm('清零所有 Token 统计？模型和 Key 不受影响。')) return;\n  api('usage.reset',{}).then(function(d){ toast(d.ok?'已清零':'失败', d.ok?'ok':'err'); load(); });\n}\nfunction stratName(s){\n  return {latency:'最快可用', priority:'优先级', weight:'权重随机', rr:'轮询'}[s] || '最快可用';\n}\nfunction copyGw(){ copyText((S.gwBase||'')); }\nfunction copyKey(){ copyText((S.cfg&&S.cfg.gwToken)||''); }\nfunction copyText(t){\n  if(!t){ toast('没有内容可复制'); return; }\n  if(navigator.clipboard && navigator.clipboard.writeText){\n    navigator.clipboard.writeText(t).then(function(){toast('已复制','ok')},function(){fallbackCopy(t)});\n  } else fallbackCopy(t);\n}\nfunction fallbackCopy(t){\n  var a=document.createElement('textarea'); a.value=t; a.style.position='fixed'; a.style.opacity='0';\n  document.body.appendChild(a); a.select();\n  try{ document.execCommand('copy'); toast('已复制','ok'); }catch(e){ toast('复制失败，请手动选中'); }\n  document.body.removeChild(a);\n}\n\n/* ---------- 提供商 ---------- */\nvar PRESETS = [\n  {n:'OpenAI', t:'openai', b:'https://api.openai.com/v1'},\n  {n:'DeepSeek', t:'openai', b:'https://api.deepseek.com/v1'},\n  {n:'Kimi', t:'openai', b:'https://api.moonshot.cn/v1'},\n  {n:'智谱 GLM', t:'openai', b:'https://open.bigmodel.cn/api/paas/v4'},\n  {n:'通义', t:'openai', b:'https://dashscope.aliyuncs.com/compatible-mode/v1'},\n  {n:'硅基流动', t:'openai', b:'https://api.siliconflow.cn/v1'},\n  {n:'OpenRouter', t:'openai', b:'https://openrouter.ai/api/v1'},\n  {n:'Groq', t:'openai', b:'https://api.groq.com/openai/v1'},\n  {n:'Gemini', t:'gemini', b:'https://generativelanguage.googleapis.com/v1beta'},\n  {n:'Anthropic', t:'anthropic', b:'https://api.anthropic.com/v1'},\n  {n:'自定义', t:'openai', b:''}\n];\n\nvar FORM = {name:'', base:'', key:'', type:'openai', preset:-1};\n\nfunction renderPv(){\n  var html = '';\n  html += '<div class=\"card\" id=\"addCard\">'\n    + '<div class=\"card-h\">添加提供商</div>'\n    + '<div class=\"fg\"><label class=\"f\">预设</label><div class=\"presets\" id=\"presets\">';\n  PRESETS.forEach(function(p,i){\n    html += '<span class=\"chip'+(FORM.preset===i?' on':'')+'\" data-i=\"'+i+'\">'+h(p.n)+'</span>';\n  });\n  html += '</div></div>'\n    + '<div class=\"fg\"><label class=\"f\">名称</label><input type=\"text\" id=\"fName\" value=\"'+h(FORM.name)+'\" placeholder=\"例如 DeepSeek\"></div>'\n    + '<div class=\"fg\"><label class=\"f\">Base URL</label><input type=\"text\" id=\"fBase\" value=\"'+h(FORM.base)+'\" placeholder=\"https://api.deepseek.com/v1\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"></div>'\n    + '<div class=\"fg\"><label class=\"f\">API Key</label><input type=\"password\" id=\"fKey\" value=\"'+h(FORM.key)+'\" placeholder=\"sk-...\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"></div>'\n    + '<button class=\"btn pri\" id=\"btnSave\" style=\"width:100%;justify-content:center\">保存</button>'\n    + '<div style=\"font-size:11.5px;color:var(--tx3);margin-top:9px;line-height:1.6\">保存后自动拉取模型列表。Base URL 要填到版本号为止，例如 <span class=\"mono\">https://api.deepseek.com/v1</span></div>'\n    + '</div>';\n\n  var ps = S.providers||[];\n  if(!ps.length){\n    html += '<div class=\"card\"><div class=\"empty\"><b>暂无提供商</b>选个预设，填上 Key 就行。</div></div>';\n  } else {\n    html += '<div class=\"card tight\"><div class=\"card-h\" style=\"padding:13px 14px 8px;margin:0\">已添加 ('+ps.length+')</div>';\n    ps.forEach(function(p){\n      var n = (S.models||[]).filter(function(m){return m.pid===p.id}).length;\n      var en = (S.models||[]).filter(function(m){return m.pid===p.id&&m.enabled}).length;\n      html += '<div class=\"item\">'\n        + '<div class=\"dot '+(p.ok===true?'ok':(p.ok===false?'bad':''))+'\"></div>'\n        + '<div class=\"main\"><div class=\"t\">'+h(p.name)+' <span class=\"tag\">'+h(p.type)+'</span></div>'\n        + '<div class=\"s mono\">'+h(p.base)+'</div>'\n        + '<div class=\"s\">Key '+h(p.keyMask)+' · 模型 '+en+'/'+n+(p.lastErr?' · <span style=\"color:var(--bad)\">'+h(p.lastErr)+'</span>':'')+'</div></div>'\n        + '<div style=\"display:flex;flex-direction:column;gap:6px\">'\n        +   '<button class=\"btn sm\" onclick=\"syncP(\\''+p.id+'\\')\">拉取</button>'\n        +   '<button class=\"btn sm danger\" onclick=\"delP(\\''+p.id+'\\')\">删</button>'\n        + '</div></div>';\n    });\n    html += '</div>';\n  }\n  $('#s-pv').innerHTML = html;\n\n  // 表单状态：输入即存，重渲染自动回填\n  function syncForm(){\n    var n=$('#fName'), b=$('#fBase'), k=$('#fKey');\n    if(n) FORM.name = n.value;\n    if(b) FORM.base = b.value;\n    if(k) FORM.key  = k.value;\n  }\n  ['fName','fBase','fKey'].forEach(function(id){\n    var el=$('#'+id); if(el) el.addEventListener('input', syncForm);\n  });\n\n  $('#presets').addEventListener('click', function(e){\n    var c = e.target.closest('.chip'); if(!c) return;\n    var i = +c.dataset.i, pr = PRESETS[i];\n    Array.prototype.forEach.call($('#presets').children, function(x){x.classList.remove('on')});\n    c.classList.add('on');\n    FORM.preset = i; FORM.type = pr.t;\n    if(pr.b){ FORM.base = pr.b; if($('#fBase')) $('#fBase').value = pr.b; }\n    if(pr.n !== '自定义'){\n      FORM.name = pr.n;\n      if($('#fName')) $('#fName').value = pr.n;\n      if($('#fKey')) $('#fKey').focus();\n    }\n  });\n\n  $('#btnSave').addEventListener('click', function(){\n    syncForm();\n    var base = FORM.base.trim(), key = FORM.key.trim();\n    if(!base){ toast('先填 Base URL'); return; }\n    if(!key){ toast('先填 API Key'); return; }\n    var b = this; b.classList.add('busy'); b.disabled = true;\n    api('provider.add', {name: FORM.name.trim() || base, base: base, key: key, type: FORM.type}).then(function(d){\n      b.classList.remove('busy'); b.disabled = false;\n      if(!d.ok){ toast(d.err || '保存失败', 'err'); return; }\n      FORM.key = '';\n      toast('已保存，正在拉模型…', 'ok');\n      load();\n      api('provider.sync', {id: d.pid}).then(function(s2){\n        if(!s2.ok){ toast('拉取失败：' + (s2.err || '未知') + '｜可在列表里点「拉取」重试', 'err'); load(); return; }\n        if(s2.discovered && s2.discovered.length) openPicker(d.pid, s2.discovered, s2.models || []);\n        else toast('接口没返回模型列表', 'err');\n        load();\n      });\n    });\n  });\n}\n\nfunction syncP(id){\n  toast('正在拉取…');\n  api('provider.sync', {id:id}).then(function(d){\n    if(!d.ok){ toast(d.err||'拉取失败','err'); return; }\n    if(d.discovered && d.discovered.length) openPicker(id, d.discovered, d.models);\n    else toast('没有新模型');\n    load();\n  });\n}\nfunction delP(id){\n  if(!confirm('删除这个提供商和它的全部模型？')) return;\n  api('provider.del', {id:id}).then(function(d){ load(); toast(d.ok?'已删除':'失败', d.ok?'ok':'err'); });\n}\n\n/* ---------- 模型选择器 ---------- */\nfunction openPicker(pid, all, have){\n  PKPID = pid; PICK = [];\n  var exist = {}; (have||[]).forEach(function(m){ exist[m]=1 });\n  $('#pkTitle').textContent = '发现 '+all.length+' 个模型';\n  $('#pkSub').textContent = have&&have.length ? '已添加 '+have.length+' 个' : '全选后添加';\n  var html='';\n  all.forEach(function(n){\n    var on = !!exist[n];\n    html += '<div class=\"pk'+(on?' on':'')+'\" data-n=\"'+h(n)+'\"><div class=\"cb\"></div>'\n      + '<div style=\"flex:1;font-size:14px\" class=\"mono\">'+h(n)+'</div>'\n      + (on?'<span class=\"tag ok\">已有</span>':'')+'</div>';\n  });\n  $('#pkBody').innerHTML = html;\n  $('#picker').classList.add('on');\n  $('#pkBody').onclick = function(e){\n    var r = e.target.closest('.pk'); if(!r) return;\n    r.classList.toggle('on');\n  };\n}\n$('#pkAll').addEventListener('click', function(){\n  var all=Array.prototype.slice.call($('#pkBody').querySelectorAll('.pk'));\n  var anyOff=all.some(function(x){return !x.classList.contains('on')});\n  all.forEach(function(x){ x.classList.toggle('on', anyOff) });\n});\n$('#pkCancel').addEventListener('click', function(){ $('#picker').classList.remove('on') });\n$('#pkOk').addEventListener('click', function(){\n  var names = Array.prototype.slice.call($('#pkBody').querySelectorAll('.pk.on')).map(function(x){return x.dataset.n});\n  if(!names.length){ toast('没选任何模型'); return; }\n  var b=this; b.classList.add('busy');\n  api('model.add', {pid:PKPID, names:names}).then(function(d){\n    b.classList.remove('busy');\n    $('#picker').classList.remove('on');\n    toast(d.ok? ('已添加 '+names.length+' 个'):'失败', d.ok?'ok':'err');\n    load();\n  });\n});\n\n/* ---------- 模型列表 ---------- */\nvar MFILTER = '';\nfunction renderMd(){\n  var ms_ = S.models||[];\n  var html = '';\n  html += '<div class=\"card\" style=\"padding:11px 12px\">'\n    + '<input type=\"text\" id=\"mq\" placeholder=\"搜索模型 / 提供商\" value=\"'+h(MFILTER)+'\">'\n    + '<div class=\"row wrap\" style=\"margin-top:10px;gap:7px\">'\n    + '<button class=\"btn sm\" onclick=\"bulk(1)\">全启用</button>'\n    + '<button class=\"btn sm\" onclick=\"bulk(0)\">全停用</button>'\n    + '<button class=\"btn sm\" onclick=\"checkSel()\" style=\"margin-left:auto\">检测以上</button>'\n    + '</div></div>';\n  var list = ms_.filter(function(m){\n    if(!MFILTER) return true;\n    var q=MFILTER.toLowerCase();\n    return (m.name+' '+(m.alias||'')+' '+m.pname).toLowerCase().indexOf(q)>=0;\n  });\n  if(!list.length){\n    html += '<div class=\"card\"><div class=\"empty\"><b>'+(ms_.length?'没匹配到':'还没有模型')+'</b>'+(ms_.length?'换个关键词试试':'先去「提供商」添加')+'</div></div>';\n  } else {\n    html += '<div class=\"card tight\">';\n    list.forEach(function(m){\n      var cd = m.cooldown && m.cooldown>Date.now();\n      html += '<div class=\"item\">'\n        + '<div class=\"sw'+(m.enabled?' on':'')+'\" onclick=\"toggleM(\\''+esc(m.id)+'\\','+(!m.enabled)+')\"></div>'\n        + '<div class=\"main\"><div class=\"t\">'+h(m.alias||m.name)\n        +   (m.ok===true?' <span class=\"tag ok\">'+ms(m.lat)+'</span>':(m.ok===false?' <span class=\"tag bad\">失败</span>':' <span class=\"tag\">未测</span>'))\n        +   (cd?' <span class=\"tag warn\">冷却</span>':'')\n        + '</div>'\n        + '<div class=\"s mono\">'+h(m.name)+' · '+h(m.pname)+(m.err?' · <span style=\"color:var(--bad)\">'+h(m.err)+'</span>':'')+'</div>'\n        + '<div class=\"s\">'+(m.checkedAt?ago(m.checkedAt):'—')+' · 命中 '+(m.hits||0)+' · 失败 '+(m.fails||0)+'</div></div>'\n        + '<div style=\"display:flex;flex-direction:column;gap:5px\">'\n        +   '<button class=\"btn sm ghost\" onclick=\"editAlias(\\''+esc(m.id)+'\\')\">改名</button>'\n        +   '<button class=\"btn sm danger\" onclick=\"delM(\\''+esc(m.id)+'\\')\">删</button>'\n        + '</div></div>';\n    });\n    html += '</div>';\n  }\n  $('#s-md').innerHTML = html;\n  var q=$('#mq');\n  if(q){\n    q.addEventListener('input', function(){\n      MFILTER=this.value; var pos=this.selectionStart;\n      renderMd();\n      var n=$('#mq'); if(n){ n.focus(); n.setSelectionRange(pos,pos); }\n    });\n  }\n}\nfunction esc(s){ return String(s).replace(/'/g,\"\\\\'\"); }\nfunction toggleM(id, on){\n  api('model.patch', {id:id, enabled:on}).then(function(){ load(); });\n}\nfunction bulk(on){\n  var ids=(S.models||[]).map(function(m){return m.id});\n  if(!ids.length) return;\n  api('model.patch', {ids:ids, enabled:on}).then(function(){ load(); toast(on?'已全启用':'已全停用','ok'); });\n}\nfunction checkSel(){\n  toast('检测中…');\n  api('check', {}).then(function(d){\n    if(!d.ok){ toast(d.err||'检测失败','err'); return; }\n    toast('检测完成：'+d.healthy+' 可用','ok'); load();\n  });\n}\nfunction delM(id){\n  var m=(S.models||[]).filter(function(x){return x.id===id})[0];\n  if(!m) return;\n  if(!confirm('从池子里移除「'+(m.alias||m.name)+'」？\\n（不会删除提供商）')) return;\n  api('model.del', {ids:[id]}).then(function(d){\n    toast(d.ok?'已移除':'失败', d.ok?'ok':'err'); load();\n  });\n}\nfunction editAlias(id){\n  var m=(S.models||[]).filter(function(x){return x.id===id})[0]; if(!m) return;\n  var v = prompt('别名（客户端里选模型时显示的名字，留空用原名）', m.alias||'');\n  if(v===null) return;\n  api('model.patch', {id:id, alias:v.trim()}).then(function(){ load(); });\n}\n\n/* ---------- 路由 ---------- */\nfunction renderRt(){\n  var c = S.cfg||{};\n  var html = '';\n  html += '<div class=\"card\"><div class=\"card-h\">策略</div>'\n    + '<div class=\"fg\"><label class=\"f\">选择策略</label><select id=\"cStrategy\">'\n    + opt('latency','最快可用（推荐）',c.strategy)\n    + opt('priority','优先级（自定义权重高者优先）',c.strategy)\n    + opt('weight','权重随机（按权重分摊）',c.strategy)\n    + opt('rr','轮询（依次循环）',c.strategy)\n    + '</select></div>'\n    + '<div class=\"grid2\">'\n    + '<div class=\"fg\"><label class=\"f\">数据保鲜 (分钟)</label><input type=\"number\" id=\"cStale\" min=\"1\" max=\"240\" value=\"'+(c.staleMin||5)+'\"></div>'\n    + '<div class=\"fg\"><label class=\"f\">探活间隔 (分钟)</label><input type=\"number\" id=\"cCheck\" min=\"1\" max=\"1440\" value=\"'+(c.checkMin||10)+'\"></div>'\n    + '</div>'\n    + '<div class=\"fg\"><label class=\"f\">网关 API Key（客户端填这个）</label>'\n    + '<div class=\"row\"><input type=\"text\" id=\"cTok\" class=\"mono\" value=\"'+h(c.gwToken||'')+'\" placeholder=\"留空 = 不校验\">'\n    + '<button class=\"btn sm\" onclick=\"genTok()\">生成</button></div></div>'\n    + '<div class=\"fg\"><label class=\"f\">上游超时 (秒)</label><input type=\"number\" id=\"cTmo\" min=\"5\" max=\"300\" value=\"'+Math.round((c.timeoutMs||60000)/1000)+'\"></div>'\n    + '<div class=\"row\" style=\"justify-content:space-between;margin:14px 0 4px\">'\n    +   '<div><div style=\"font-size:13.5px\">覆盖请求里的 model</div><div style=\"font-size:11.5px;color:var(--tx3)\">客户端随便填模型名，路由强制用选中的</div></div>'\n    +   '<div class=\"sw'+((c.overrideModel!==false)?' on':'')+'\" onclick=\"this.classList.toggle(\\'on\\')\" id=\"swOv\"></div></div>'\n    + '<div class=\"row\" style=\"justify-content:space-between;margin:14px 0 4px\">'\n    +   '<div><div style=\"font-size:13.5px\">懒检测（缓存过期时现测）</div><div style=\"font-size:11.5px;color:var(--tx3)\">更准，但首个请求会多花 0.3~2 秒</div></div>'\n    +   '<div class=\"sw'+((c.slidingCheck)?' on':'')+'\" onclick=\"this.classList.toggle(\\'on\\')\" id=\"swSl\"></div></div>'\n    + '<button class=\"btn pri\" id=\"btnSaveCfg\" style=\"width:100%;justify-content:center;margin-top:16px\">保存</button>'\n    + '</div>';\n\n  html += '<div class=\"card\"><div class=\"card-h\">定时任务·需与上面间隔一致</div>'\n    + '<div class=\"gw\" style=\"padding:12px;margin:0\"><div class=\"url\" style=\"font-size:11.5px\" id=\"cronLine\">'+h(cronExpr(c.checkMin||10))+'</div>'\n    + '<div class=\"row\" style=\"margin-top:9px\"><button class=\"btn sm\" onclick=\"copyCron()\">复制这一行</button></div></div>'\n    + '<div style=\"font-size:11.5px;color:var(--tx3);margin-top:9px;line-height:1.6\">这是 QX 里 [task_local] 的那一行。改了探活间隔，记得同步改成上面表达式；不装定时任务也能用，只是可用性数据不会自动刷新。</div>'\n    + '</div>';\n\n  html += '<div class=\"card\"><div class=\"card-h\">工作方式</div>'\n    + '<div style=\"font-size:12.8px;color:var(--tx2);line-height:1.75\">'\n    + '① 面板把你所有已启用的模型汇总成一个虚拟池。<br>'\n    + '② 客户端只认网关地址，请求进来后，路由从池里按策略挑 1 个，<br>'\n    + '&nbsp;&nbsp;&nbsp;换成那家的 Base URL 和 Key 转发出去。<br>'\n    + '③ 「轮询」由 QX 的定时任务每 N 分钟探活一次，把延迟和成败写进本地，<br>'\n    + '&nbsp;&nbsp;&nbsp;所以真正选模型时只读本地缓存，<b style=\"color:var(--ok)\">零网络、微秒级</b>。<br>'\n    + '④ 某家失败会进冷却，冷却期内不再被选中，自动轮到下一家。'\n    + '</div></div>';\n  $('#s-rt').innerHTML = html;\n  $('#btnSaveCfg').addEventListener('click', function(){\n    var b=this; b.classList.add('busy'); b.disabled=true;\n    api('cfg.set', {\n      strategy: $('#cStrategy').value,\n      staleMin: +$('#cStale').value||5,\n      checkMin: +$('#cCheck').value||10,\n      gwToken: $('#cTok').value.trim(),\n      timeoutMs: (+$('#cTmo').value||60)*1000,\n      overrideModel: $('#swOv').classList.contains('on'),\n      slidingCheck: $('#swSl').classList.contains('on')\n    }).then(function(d){\n      b.classList.remove('busy'); b.disabled=false;\n      toast(d.ok?'已保存':'保存失败', d.ok?'ok':'err'); load();\n    });\n  });\n}\nfunction cronExpr(min){\n  if(min%60===0) return '0 */'+(min/60)+' * * * modelhub-cron.js';\n  return '*/'+min+' * * * * modelhub-cron.js';\n}\nfunction copyCron(){ copyText(cronExpr((S.cfg&&S.cfg.checkMin)||10)); }\nfunction opt(v,t,cur){ return '<option value=\"'+v+'\"'+(cur===v?' selected':'')+'>'+t+'</option>'; }\nfunction genTok(){\n  var s='sk-mh-'; var c='abcdef0123456789';\n  for(var i=0;i<28;i++) s+=c[Math.floor(Math.random()*16)];\n  $('#cTok').value=s;\n}\n\n/* ---------- 日志 ---------- */\nfunction renderLg(){\n  var lg = (S.logs||[]).slice().reverse();\n  var html='<div class=\"card tight\"><div class=\"card-h\" style=\"padding:13px 14px 8px;margin:0\">最近 '+lg.length+' 条</div>';\n  if(!lg.length) html+='<div class=\"empty\">暂无日志</div>';\n  else { html+='<pre class=\"log\">'; lg.forEach(function(x){ html+=h(fmtTime(x.t))+'  '+h(x.m)+'\\n' }); html+='</pre>' }\n  html += '</div><div class=\"row\"><button class=\"btn sm danger\" onclick=\"clearLog()\">清空日志</button></div>';\n  $('#s-lg').innerHTML = html;\n}\nfunction fmtTime(t){ var d=new Date(t); function p(n){return n<10?'0'+n:n} return p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }\nfunction clearLog(){ api('log.clear',{}).then(function(){ load(); }); }\n\n/* ---------- 交互绑定 ---------- */\ndocument.querySelector('.tabs').addEventListener('click', function(e){\n  var b=e.target.closest('button[data-t]'); if(!b) return;\n  Array.prototype.forEach.call(this.children, function(x){x.classList.remove('on')});\n  b.classList.add('on'); TAB=b.dataset.t;\n  window.scrollTo(0,0); render();\n});\n$('#btnCheck').addEventListener('click', function(){\n  var b=this; b.classList.add('busy'); b.disabled=true;\n  api('check', {}).then(function(d){\n    b.classList.remove('busy'); b.disabled=false;\n    toast(d.ok? ('完成：'+d.healthy+'/'+d.total+' 可用') : (d.err||'失败'), d.ok?'ok':'err');\n    load();\n  });\n});\n$('#btnAdd').addEventListener('click', function(){\n  if(TAB!=='pv'){ document.querySelector('[data-t=pv]').click(); }\n  setTimeout(function(){ var n=$('#fName'); if(n){n.focus(); n.scrollIntoView({block:'center',behavior:'smooth'})} }, 60);\n});\n\n/* ============ Mock（浏览器预览用） ============ */\nfunction mockState(){\n  var now=Date.now();\n  return {ok:true, gwBase:'http://127.0.0.1:9999', cfg:{strategy:'latency',staleMin:5,checkMin:10,gwToken:'sk-mh-8f3a91c4e77b2d06',timeoutMs:60000,overrideModel:true,slidingCheck:false},\n    providers:[\n      {id:'p1',name:'DeepSeek',type:'openai',base:'https://api.deepseek.com',keyMask:'sk-••••7f2a',ok:true,models:2,lastErr:''},\n      {id:'p2',name:'硅基流动',type:'openai',base:'https://api.siliconflow.cn',keyMask:'sk-••••91cd',ok:true,models:3,lastErr:''},\n      {id:'p3',name:'Groq',type:'openai',base:'https://api.groq.com/openai',keyMask:'gsk-••••k2m9',ok:false,models:1,lastErr:'401 Unauthorized'}\n    ],\n    models:[\n      {id:'p1::deepseek-chat',pid:'p1',pname:'DeepSeek',name:'deepseek-chat',alias:'',enabled:true,ok:true,lat:412,checkedAt:now-120000,hits:184,fails:2,err:''},\n      {id:'p1::deepseek-reasoner',pid:'p1',pname:'DeepSeek',name:'deepseek-reasoner',alias:'慢思考',enabled:true,ok:true,lat:1580,checkedAt:now-120000,hits:23,fails:0,err:''},\n      {id:'p2::Qwen/Qwen3-235B',pid:'p2',pname:'硅基流动',name:'Qwen/Qwen3-235B',alias:'qwen',enabled:true,ok:true,lat:366,checkedAt:now-180000,hits:96,fails:1,err:''},\n      {id:'p2::deepseek-ai/DeepSeek-V3',pid:'p2',pname:'硅基流动',name:'deepseek-ai/DeepSeek-V3',alias:'',enabled:true,ok:true,lat:890,checkedAt:now-180000,hits:41,fails:0,err:''},\n      {id:'p2::moonshotai/Kimi-K2',pid:'p2',pname:'硅基流动',name:'moonshotai/Kimi-K2',alias:'',enabled:false,ok:null,lat:0,checkedAt:0,hits:0,fails:0,err:''},\n      {id:'p3::llama-3.3-70b',pid:'p3',pname:'Groq',name:'llama-3.3-70b-versatile',alias:'',enabled:true,ok:false,lat:0,checkedAt:now-300000,hits:5,fails:9,err:'401 Unauthorized',cooldown:now+600000}\n    ],\n    stats:{total:6,enabled:5,healthy:4,providers:3,fastest:'qwen',fastestMs:366},\n    usage:{today:{p:3120,c:4180,t:7300,n:7},week:{p:41200,c:53100,t:94300,n:96},\n      month:{p:186000,c:241000,t:427000,n:412},total:{p:520000,c:680000,t:1200000,n:1180},\n      byDay:[{d:'11-09',t:21000,n:22},{d:'11-10',t:34000,n:31},{d:'11-11',t:18000,n:19},{d:'11-12',t:52000,n:48},\n             {d:'11-13',t:61000,n:55},{d:'11-14',t:28000,n:26},{d:'11-15',t:12000,n:11},{d:'11-16',t:44000,n:40},\n             {d:'11-17',t:73000,n:66},{d:'11-18',t:39000,n:35},{d:'11-19',t:25000,n:23},{d:'11-20',t:58000,n:52},\n             {d:'11-21',t:67000,n:60},{d:'11-22',t:7300,n:7}],\n      tops:[{id:'p2::Qwen/Qwen3-235B',name:'Qwen/Qwen3-235B',t:420000,n:380},\n            {id:'p1::deepseek-chat',name:'deepseek-chat',t:310000,n:290},\n            {id:'p1::deepseek-reasoner',name:'deepseek-reasoner',t:180000,n:150}]},\n    logs:[{t:now-60000,m:'[check] 6 个模型检测完成，4 可用'},{t:now-120000,m:'[route] 选中 p2::Qwen/Qwen3-235B 412ms'},{t:now-300000,m:'[check] p3::llama-3.3-70b 失败：401 Unauthorized'},{t:now-3600000,m:'[init] 面板启动'}]\n  };\n}\nfunction mockApi(path, body){\n  return new Promise(function(res){\n    setTimeout(function(){\n      var st = mockState();\n      if(path==='state') return res(st);\n      if(path==='model.patch'){ return res({ok:true}); }\n      if(path==='check'){ return res({ok:true,healthy:4,total:6}); }\n      if(path==='provider.add'){ return res({ok:true,pid:'p9',discovered:['deepseek-chat','deepseek-reasoner','deepseek-coder'],models:[]}); }\n      if(path==='provider.sync'){ return res({ok:true,discovered:['deepseek-chat','deepseek-reasoner','deepseek-coder','deepseek-v3'],models:['deepseek-chat']}); }\n      if(path==='model.add'){ return res({ok:true}); }\n      if(path==='cfg.set'){ return res({ok:true}); }\n      res({ok:true});\n    }, 220);\n  });\n}\n\n/* ============ 启动 ============ */\nload();\nsetInterval(function(){\n  var a = document.activeElement;\n  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;  // 正在填表，不要刷\n  if ($('#picker') && $('#picker').classList.contains('on')) return;\n  load();\n}, 20000);\n</script>\n</body>\n</html>\n";

// ===== 公共逻辑 =====
/* ==========================================================================
 * ModelHub core —— 共享逻辑（被 panel / gateway / cron 三端复用）
 * 运行环境：Quantumult X 脚本引擎（JavaScriptCore）
 * 持久化：$prefs 单个 JSON 字符串
 * ========================================================================== */
var MH = (function () {
  var KEY = 'modelhub.state.v1';
  var MAXLOG = 200;

  function now() { return Date.now(); }

  function dflt() {
    return {
      v: 1, t: 0,
      providers: [],
      models: [],
      cfg: {
        strategy: 'latency', staleMin: 5, checkMin: 10,
        gwToken: '', timeoutMs: 60000, overrideModel: true, slidingCheck: false,
        checkMode: 'ping'
      },
      usage: null,
      logs: []
    };
  }

  function migrate(o) {
    var d = dflt();
    o = o || {};
    o.v = o.v || 1;
    o.providers = o.providers || [];
    o.models = o.models || [];
    o.logs = o.logs || [];
    o.t = o.t || 0;
    var c = o.cfg || {};
    for (var k in d.cfg) if (c[k] === undefined) c[k] = d.cfg[k];
    o.cfg = c;
    if (!o.usage || !o.usage.days) o.usage = { days: {}, models: {}, total: { p: 0, c: 0, t: 0, n: 0 } };
    return o;
  }

  function load() {
    try {
      var s = $prefs.valueForKey(KEY);
      if (!s) return dflt();
      return migrate(JSON.parse(s));
    } catch (e) {
      return dflt();
    }
  }

  function save(st) {
    try {
      if (st.logs && st.logs.length > MAXLOG) st.logs = st.logs.slice(-MAXLOG);
      return $prefs.setValueForKey(JSON.stringify(st), KEY);
    } catch (e) { return false; }
  }

  function log(st, msg) {
    st.logs = st.logs || [];
    st.logs.push({ t: now(), m: String(msg) });
    if (st.logs.length > MAXLOG) st.logs = st.logs.slice(-MAXLOG);
  }

  function uid(pfx) {
    return pfx + Math.random().toString(36).slice(2, 8) + now().toString(36).slice(-3);
  }

  function mask(k) {
    if (!k) return '—';
    if (k.length <= 8) return k.slice(0, 2) + '••••';
    return k.slice(0, 4) + '••••' + k.slice(-4);
  }

  function trimBase(b) {
    return String(b || '').trim().replace(/\/+$/, '');
  }

  function pOf(st, pid) {
    for (var i = 0; i < st.providers.length; i++) if (st.providers[i].id === pid) return st.providers[i];
    return null;
  }

  /* ---------- URL 构造 ---------- */
  function urlModels(p) {
    var b = trimBase(p.base);
    if (p.type === 'gemini') return b + '/models?key=' + encodeURIComponent(p.key);
    return b + '/models';
  }

  function urlChat(p) {
    var b = trimBase(p.base);
    if (p.type === 'anthropic') return b + '/messages';
    if (p.type === 'gemini') return b; // 单独拼
    return b + '/chat/completions';
  }

  function urlGemini(p, model) {
    return trimBase(p.base) + '/models/' + encodeURIComponent(model) +
      ':generateContent?key=' + encodeURIComponent(p.key);
  }

  /* ---------- 请求头 ---------- */
  function authHeaders(p) {
    var h = { 'Content-Type': 'application/json' };
    if (p.type === 'anthropic') {
      h['x-api-key'] = p.key;
      h['anthropic-version'] = '2023-06-01';
    } else if (p.type === 'gemini') {
      h['x-goog-api-key'] = p.key;
    } else {
      h['Authorization'] = 'Bearer ' + p.key;
    }
    return h;
  }

  /* ---------- 请求体 ---------- */
  function bodyChat(p, model, promptTxt, maxTok) {
    if (p.type === 'anthropic') {
      return JSON.stringify({
        model: model, max_tokens: maxTok || 1,
        messages: [{ role: 'user', content: promptTxt || 'hi' }]
      });
    }
    if (p.type === 'gemini') {
      return JSON.stringify({
        contents: [{ parts: [{ text: promptTxt || 'hi' }] }],
        generationConfig: { maxOutputTokens: maxTok || 1 }
      });
    }
    return JSON.stringify({
      model: model, max_tokens: maxTok || 1, stream: false,
      messages: [{ role: 'user', content: promptTxt || 'hi' }]
    });
  }

  /* ---------- 轻量 base64 ---------- */
  var B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function fromB64(s) {
    s = String(s).replace(/[\r\n\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
    var out = '', i = 0;
    while (i < s.length) {
      var e1 = B64C.indexOf(s.charAt(i++));
      var e2 = B64C.indexOf(s.charAt(i++));
      var e3 = B64C.indexOf(s.charAt(i++));
      var e4 = B64C.indexOf(s.charAt(i++));
      out += String.fromCharCode((e1 << 2) | (e2 >> 4));
      if (e3 > -1) out += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
      if (e4 > -1) out += String.fromCharCode(((e3 & 3) << 6) | e4);
    }
    // UTF-8 -> string
    try { return decodeURIComponent(escape(out)); } catch (e) { return out; }
  }

  // 从 $request 里拿 JSON 对象（兼容明文 / base64）
  function reqJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (e) { }
    try { return JSON.parse(fromB64(raw)); } catch (e) { }
    return null;
  }

  /* ---------- 解析上游响应 ---------- */
  function parseModels(p, body) {
    var out = [];
    try {
      var j = JSON.parse(body);
      if (p.type === 'gemini') {
        var arr = j.models || [];
        for (var i = 0; i < arr.length; i++) {
          var n = arr[i].name || '';
          n = n.replace(/^models\//, '');
          var methods = arr[i].supportedGenerationMethods || [];
          if (methods.length && methods.indexOf('generateContent') < 0) continue;
          if (n) out.push(n);
        }
      } else {
        var d = j.data || j.models || j;
        if (Array.isArray(d)) {
          for (var k = 0; k < d.length; k++) {
            var id = d[k].id || d[k].name || d[k].model;
            if (id) out.push(String(id).replace(/^models\//, ''));
          }
        }
      }
    } catch (e) { }
    return out;
  }

  /* ---------- 结果提取（统一成文本） ---------- */
  function extractText(p, j) {
    if (!j) return '';
    if (p.type === 'anthropic') {
      var c = j.content || [];
      var s = '';
      for (var i = 0; i < c.length; i++) if (c[i].text) s += c[i].text;
      return s;
    }
    if (p.type === 'gemini') {
      var cands = j.candidates || [];
      if (!cands.length) return '';
      var parts = (cands[0].content || {}).parts || [];
      var t = '';
      for (var k = 0; k < parts.length; k++) if (parts[k].text) t += parts[k].text;
      return t;
    }
    var ch = j.choices || [];
    if (ch.length && ch[0].message) return ch[0].message.content || '';
    return '';
  }

  function errText(status, body) {
    var t = '';
    try {
      var j = JSON.parse(body);
      t = (j.error && (j.error.message || j.error.code)) || j.message || j.msg || '';
    } catch (e) { t = ''; }
    if (!t) t = String(body || '').slice(0, 120);
    return 'HTTP ' + status + (t ? ' · ' + t : '');
  }

  /* ---------- 模型发现 ---------- */
  // cb(err, models[])
  function discover(p, cb) {
    var req = { url: urlModels(p), method: 'GET', headers: authHeaders(p) };
    $task.fetch(req).then(function (r) {
      if (r.statusCode !== 200) return cb(errText(r.statusCode, r.body));
      var ms = parseModels(p, r.body);
      if (!ms.length) return cb('接口返回 200 但没有模型字段');
      cb(null, ms);
    }, function (e) { cb('连接失败: ' + ((e && e.error) || '未知')); });
  }

  /* ---------- 健康探测 ---------- */
  // cb(err, latencyMs)
  function probe(p, model, mode, cb) {
    var t0 = now();
    if (mode === 'models') {
      var req0 = { url: urlModels(p), method: 'GET', headers: authHeaders(p) };
      $task.fetch(req0).then(function (r) {
        if (r.statusCode !== 200) return cb(errText(r.statusCode, r.body), 0);
        var ms = parseModels(p, r.body);
        if (ms.length && ms.indexOf(model) < 0) return cb('列表里没有这个模型', 0);
        cb(null, now() - t0);
      }, function (e) { cb('连接失败: ' + ((e && e.error) || '未知'), 0); });
      return;
    }
    var url = (p.type === 'gemini') ? urlGemini(p, model) : urlChat(p);
    var req = { url: url, method: 'POST', headers: authHeaders(p), body: bodyChat(p, model, 'hi', 1) };
    $task.fetch(req).then(function (r) {
      var lat = now() - t0;
      if (r.statusCode >= 200 && r.statusCode < 300) return cb(null, lat);
      cb(errText(r.statusCode, r.body), lat);
    }, function (e) { cb('连接失败: ' + ((e && e.error) || '未知'), now() - t0); });
  }

  /* ---------- 记录探测结果 ---------- */
  function applyProbe(st, m, err, lat) {
    m.checkedAt = now();
    if (err) {
      m.ok = false; m.err = err; m.fails = (m.fails || 0) + 1;
      m.lat = 999999; // 失败模型排到最后，避免"全坏"时又被优先"
      m.failAt = now();
      // 首次失败即冷却，指数退避 30s→60s→120s…上限 30 分钟
      var cool = Math.min(1800000, 30000 * Math.pow(2, Math.min(6, m.fails - 1)));
      m.cooldown = now() + cool;
    } else {
      m.ok = true; m.err = ''; m.fails = 0; m.cooldown = 0; m.lat = lat || 0;
    }
  }

  /* ---------- Token 用量统计 ---------- */
  function zero() { return { p: 0, c: 0, t: 0, n: 0 }; }

  function dayKey(t) {
    var d = new Date(t === undefined ? now() : t);
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }

  function addU(a, b) {
    a.p += b.p || 0; a.c += b.c || 0; a.t += b.t || 0; a.n += b.n || 0;
    return a;
  }

  // 一次请求记一笔
  function recordUsage(st, mid, u) {
    if (!st.usage || !st.usage.days) st.usage = { days: {}, models: {}, total: zero() };
    u = u || {};
    var p = u.prompt_tokens || 0, c = u.completion_tokens || 0;
    var t = u.total_tokens || (p + c);
    if (!p && !c && !t) return false;
    var rec = { p: p, c: c, t: t, n: 1 };
    var k = dayKey();
    st.usage.days[k] = addU(st.usage.days[k] || zero(), rec);
    if (mid) st.usage.models[mid] = addU(st.usage.models[mid] || zero(), rec);
    st.usage.total = addU(st.usage.total || zero(), rec);
    // 只留最近 120 天
    var keys = Object.keys(st.usage.days).sort();
    while (keys.length > 120) delete st.usage.days[keys.shift()];
    return true;
  }

  function sumDays(st, n) {
    var out = zero(), days = (st.usage && st.usage.days) || {};
    for (var i = 0; i < n; i++) {
      var d = days[dayKey(now() - i * 86400000)];
      if (d) addU(out, d);
    }
    return out;
  }

  function usageStats(st) {
    var u = st.usage || { days: {}, models: {}, total: zero() };
    var byDay = [];
    for (var i = 13; i >= 0; i--) {
      var k = dayKey(now() - i * 86400000);
      var d = u.days[k] || zero();
      byDay.push({ d: k.slice(5), t: d.t, n: d.n });
    }
    var tops = [];
    for (var id in (u.models || {})) {
      var mm = u.models[id];
      tops.push({ id: id, name: id.indexOf('::') >= 0 ? id.split('::')[1] : id, t: mm.t, n: mm.n });
    }
    tops.sort(function (a, b) { return b.t - a.t; });
    return {
      today: u.days[dayKey()] || zero(),
      week: sumDays(st, 7),
      month: sumDays(st, 30),
      total: u.total || zero(),
      byDay: byDay,
      tops: tops.slice(0, 6)
    };
  }

  /* ---------- 路由：纯内存计算，零网络 ---------- */
  // 排序用延迟：失败的最差；未测量的视为"未知"，排在已测量之后但优于失败
  function latOf(m) {
    if (m.ok === false) return 999999;
    var l = m.lat | 0;
    return l > 0 ? l : 999998;
  }

  // 统一比较：健康优先 → 失败次数少优先 → 延迟低优先
  function cmp(a, b) {
    var ao = a.ok === true ? 0 : 1, bo = b.ok === true ? 0 : 1;
    if (ao !== bo) return ao - bo;
    if (ao === 1) {
      var af = a.fails || 0, bf = b.fails || 0;
      if (af !== bf) return af - bf;
    }
    return latOf(a) - latOf(b);
  }

  function rank(st, pool) {
    var s = st.cfg.strategy || 'latency';
    var healthy = [], others = [];
    for (var i = 0; i < pool.length; i++) (pool[i].ok === true ? healthy : others).push(pool[i]);
    var list = healthy.length ? healthy : others;

    if (s === 'priority') {
      list.sort(function (a, b) { return (b.p || 0) - (a.p || 0) || cmp(a, b); });
    } else if (s === 'weight') {
      var tot = 0, i2;
      for (i2 = 0; i2 < list.length; i2++) tot += Math.max(1, list[i2].w || 1);
      var r = Math.random() * tot, acc = 0;
      for (i2 = 0; i2 < list.length; i2++) {
        acc += Math.max(1, list[i2].w || 1);
        if (r <= acc) return [list[i2]].concat(list.slice(0, i2), list.slice(i2 + 1));
      }
    } else if (s === 'rr') {
      // 用 hits 做游标；时间兜底保证长时间无写入也能轮换
      list.sort(function (a, b) {
        return ((a.hits || 0) % 997) - ((b.hits || 0) % 997) ||
          (Math.floor(now() / 3000) % 2 ? -1 : 1) * (cmp(a, b));
      });
    } else {
      list.sort(function (a, b) {
        return cmp(a, b);
      });
    }
    return list;
  }

  function candidates(st, want) {
    var t = now(), out = [];
    for (var i = 0; i < st.models.length; i++) {
      var m = st.models[i];
      if (!m.enabled) continue;
      if (m.cooldown && m.cooldown > t) continue;
      if (!pOf(st, m.pid)) continue;
      out.push(m);
    }
    if (want) {
      var exact = [];
      var wl = String(want).toLowerCase();
      for (var k = 0; k < out.length; k++) {
        var mm = out[k];
        if (mm.name === want || (mm.alias && mm.alias === want) ||
          String(mm.name).toLowerCase() === wl || (mm.alias && String(mm.alias).toLowerCase() === wl)) exact.push(mm);
      }
      if (exact.length) return exact;
    }
    return out;
  }

  function pick(st, want) {
    var c = candidates(st, want);
    if (!c.length) return null;
    var r = rank(st, c);
    return r.length ? r[0] : null;
  }

  function isStale(st, m) {
    var lim = (st.cfg.staleMin || 5) * 60000;
    return !m.checkedAt || (now() - m.checkedAt) > lim;
  }

  /* ---------- 对外暴露的名字（客户端可见） ---------- */
  function publicName(m) { return m.alias || m.name; }

  function enabledModels(st) {
    var out = [];
    for (var i = 0; i < st.models.length; i++) if (st.models[i].enabled) out.push(st.models[i]);
    return out;
  }

  function stats(st) {
    var total = st.models.length, en = 0, ok = 0, fastest = '', fm = 0;
    for (var i = 0; i < st.models.length; i++) {
      var m = st.models[i];
      if (!m.enabled) continue;
      en++;
      if (m.ok === true) {
        ok++;
        if (!fm || (m.lat && m.lat < fm)) { fm = m.lat || 0; fastest = publicName(m); }
      }
    }
    return { total: total, enabled: en, healthy: ok, providers: st.providers.length, fastest: fastest, fastestMs: fm };
  }

  /* ---------- 面板视图 ---------- */
  function view(st) {
    var t = now();
    return {
      ok: true,
      cfg: st.cfg,
      gwBase: gwBase(),
      stats: stats(st),
      providers: st.providers.map(function (p) {
        var n = 0, en = 0;
        for (var i = 0; i < st.models.length; i++) {
          if (st.models[i].pid === p.id) { n++; if (st.models[i].enabled) en++; }
        }
        return {
          id: p.id, name: p.name, type: p.type, base: p.base,
          keyMask: mask(p.key), ok: p.ok, lastErr: p.lastErr || '',
          models: n, enabled: en, lastSync: p.lastSync || 0
        };
      }),
      models: st.models.map(function (m) {
        var p = pOf(st, m.pid);
        return {
          id: m.id, pid: m.pid, pname: p ? p.name : '(已删除)',
          name: m.name, alias: m.alias || '', enabled: !!m.enabled,
          ok: m.ok, lat: m.lat || 0, checkedAt: m.checkedAt || 0,
          err: m.err || '', cooldown: m.cooldown || 0,
          hits: m.hits || 0, fails: m.fails || 0, w: m.w || 1, p: m.p || 0
        };
      }),
      usage: usageStats(st),
      logs: st.logs || [],
      now: t
    };
  }

  function gwBase() {
    try {
      var u = String($request.url || '');
      var m = /^(https?:\/\/[^\/]+)/.exec(u);
      if (m) return m[1] + '/v1';
    } catch (e) { }
    return 'https://mh.qx/v1';
  }

  return {
    KEY: KEY, now: now, dflt: dflt, load: load, save: save, log: log, uid: uid,
    mask: mask, trimBase: trimBase, pOf: pOf,
    urlModels: urlModels, urlChat: urlChat, urlGemini: urlGemini,
    authHeaders: authHeaders, bodyChat: bodyChat, reqJson: reqJson, fromB64: fromB64,
    parseModels: parseModels, extractText: extractText, errText: errText,
    discover: discover, probe: probe, applyProbe: applyProbe,
    recordUsage: recordUsage, usageStats: usageStats, dayKey: dayKey,
    rank: rank, candidates: candidates, pick: pick, isStale: isStale,
    publicName: publicName, enabledModels: enabledModels, stats: stats,
    view: view, gwBase: gwBase
  };
})();


// ===== 面板 =====
/* ==========================================================================
 * ModelHub panel —— Quantumult X [http_backend] 处理器
 * 路径前缀 /mh/   →   http://127.0.0.1:9999/mh/
 *   GET  /mh/            面板 UI
 *   GET  /mh/api/state   全量状态
 *   POST /mh/api/*       面板操作
 * ========================================================================== */

function MH_PANEL() {
  var answered = false;

  function reply(obj) {
    if (answered) return;
    answered = true;
    $done(obj);
  }
  function H(extra) {
    var h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'Close' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function json(o) { reply({ status: 'HTTP/1.1 200 OK', headers: H(), body: JSON.stringify(o) }); }
  function html(s) {
    reply({
      status: 'HTTP/1.1 200 OK',
      headers: H({ 'Content-Type': 'text/html; charset=utf-8' }),
      body: s
    });
  }
  function fail(msg) { json({ ok: false, err: String(msg) }); }

  // 兜底：脚本引擎超时前主动返回，避免浏览器空白
  setTimeout(function () {
    if (!answered) reply({ status: 'HTTP/1.1 504 Gateway Timeout', headers: H(), body: JSON.stringify({ ok: false, err: '脚本超时' }) });
  }, 120000);

  function parseQS(qs) {
    var out = {};
    if (!qs) return out;
    var parts = String(qs).split('&');
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var eq = parts[i].indexOf('=');
      var k = eq >= 0 ? parts[i].slice(0, eq) : parts[i];
      var v = eq >= 0 ? parts[i].slice(eq + 1) : '';
      try { k = decodeURIComponent(k); v = decodeURIComponent(v); } catch (e) { }
      out[k] = v;
    }
    return out;
  }

  var fullUrl = String($request.url || '');
  var uq = fullUrl.indexOf('?');
  var query = uq >= 0 ? fullUrl.slice(uq + 1) : '';

  var rawPath = String($request.path || '');
  var qi = rawPath.indexOf('?');
  var path = qi >= 0 ? rawPath.slice(0, qi) : rawPath;
  if (!path) {
    var se = fullUrl.indexOf('://');
    var sl = se >= 0 ? fullUrl.indexOf('/', se + 3) : -1;
    path = sl >= 0 ? fullUrl.slice(sl, uq >= 0 ? uq : undefined) : '/';
  }
  try { path = decodeURIComponent(path); } catch (e) { }

  // 去掉 /mh 前缀（/mh、/mh/、/mh/xxx 都兼容）
  var rel = path.replace(/^\/mh(?=\/|$)/, '');
  if (rel === '') rel = '/';

  if (rel === '/favicon.ico') {
    return reply({ status: 'HTTP/1.1 204 No Content', headers: H(), body: '' });
  }

  // 诊断：一眼看出 $prefs 能不能写、$request 里有什么
  if (rel === '/api/diag') {
    var probeVal = 'p' + MH.now();
    var wrote = false, got = null;
    try { wrote = !!$prefs.setValueForKey(probeVal, 'modelhub.diag'); } catch (e) { }
    try { got = $prefs.valueForKey('modelhub.diag'); } catch (e) { }
    var st0 = MH.load();
    return json({
      ok: true, v: MH_VER_,
      has: {
        prefs: typeof $prefs !== 'undefined',
        task: typeof $task !== 'undefined',
        notify: typeof $notify !== 'undefined',
        response: typeof $response !== 'undefined'
      },
      req: {
        url: fullUrl.slice(0, 140), path: path, method: $request.method,
        bodyType: typeof $request.body,
        bodyLen: String($request.body || '').length,
        headerKeys: Object.keys($request.headers || {}).slice(0, 14)
      },
      queryLen: query.length, queryKeys: Object.keys(parseQS(query)),
      prefsTest: { write: wrote, readBack: got === probeVal },
      store: { providers: (st0.providers || []).length, models: (st0.models || []).length },
      now: MH.now()
    });
  }

  if (rel === '/api/ping') {
    return json({ ok: true, pong: 1, name: 'ModelHub', v: MH_VER_, at: MH.now() });
  }

  // 非 API 路径一律返回面板，避免 404 让人误判
  if (rel.indexOf('/api/') !== 0) {
    return html(MH_HTML_);
  }

  var action = rel.slice(5);

  // 参数优先从 query 取（echo-response 下 body 不一定可用），再用 body 覆盖
  var params = parseQS(query);
  var bodyJson = null;
  try { bodyJson = MH.reqJson($request.body); } catch (e) { }
  if (bodyJson && typeof bodyJson === 'object') {
    for (var bk in bodyJson) params[bk] = bodyJson[bk];
  }

  function arr(v) {
    if (v === undefined || v === null) return [];
    if (Object.prototype.toString.call(v) === '[object Array]') return v;
    var t = String(v);
    if (!t) return [];
    return t.indexOf('|') >= 0 ? t.split('|') : t.split(',');
  }
  function bool(v) {
    if (typeof v === 'boolean') return v;
    return v === 'true' || v === '1' || v === 1;
  }

  var st = MH.load();

  /* ---------------- 读 ---------------- */
  if (action === 'state') {
    return json(MH.view(st));
  }

  if (action === 'log.clear') {
    st.logs = [];
    MH.save(st);
    return json({ ok: true });
  }

  if (action === 'usage.reset') {
    st.usage = { days: {}, models: {}, total: { p: 0, c: 0, t: 0, n: 0 } };
    MH.log(st, '[usage] 用量统计已清零');
    MH.save(st);
    return json({ ok: true });
  }

  /* ---------------- 提供商 ---------------- */
  if (action === 'provider.add') {
    var base = MH.trimBase(params.base)
      .replace(/\/(chat\/completions|completions|models|messages)$/i, '')
      .replace(/\/+$/, '');
    var key = String(params.key || '').trim();
    if (!base || !key) return fail('Base URL 和 Key 都不能为空');
    if (!/^https?:\/\//.test(base)) return fail('Base URL 需要以 http:// 或 https:// 开头');

    var p = {
      id: MH.uid('p_'),
      name: String(params.name || '').trim() || base.replace(/^https?:\/\//, '').split('/')[0],
      type: params.type || 'openai',
      base: base, key: key,
      ok: null, lastErr: '', lastSync: 0, added: MH.now()
    };
    st.providers.push(p);
    MH.log(st, '[provider] 添加 ' + p.name + ' (' + p.base + ')');
    var saved = MH.save(st);
    if (!saved) return fail('写入失败：$prefs 不可用（面板无法保存配置）');
    // 立即返回，模型列表由前端再调 provider.sync 拉取
    return json({ ok: true, pid: p.id, saved: true });
  }

  if (action === 'provider.sync') {
    var p3 = MH.pOf(st, params.id);
    if (!p3) return fail('提供商不存在');
    return MH.discover(p3, function (err, list) {
      var st2 = MH.load();
      var p4 = MH.pOf(st2, params.id);
      if (p4) { p4.ok = !err; p4.lastErr = err || ''; p4.lastSync = MH.now(); }
      if (err) {
        MH.log(st2, '[provider] ' + params.id + ' 同步失败: ' + err);
        MH.save(st2);
        return json({ ok: false, err: err });
      }
      MH.log(st2, '[provider] ' + p4.name + ' 同步到 ' + list.length + ' 个模型');
      MH.save(st2);
      var have = [];
      for (var i = 0; i < st2.models.length; i++) if (st2.models[i].pid === params.id) have.push(st2.models[i].name);
      json({ ok: true, discovered: list, models: have });
    });
  }

  if (action === 'provider.del') {
    var pid = params.id;
    st.providers = st.providers.filter(function (x) { return x.id !== pid; });
    var before = st.models.length;
    st.models = st.models.filter(function (m) { return m.pid !== pid; });
    MH.log(st, '[provider] 删除 ' + pid + '，连带移除 ' + (before - st.models.length) + ' 个模型');
    MH.save(st);
    return json({ ok: true });
  }

  /* ---------------- 模型 ---------------- */
  if (action === 'model.add') {
    var pid2 = params.pid, names = arr(params.names);
    var pr = MH.pOf(st, pid2);
    if (!pr) return fail('提供商不存在');
    var added = 0;
    for (var i = 0; i < names.length; i++) {
      var nm = String(names[i]).trim();
      if (!nm) continue;
      var id = pid2 + '::' + nm;
      var dup = false;
      for (var k = 0; k < st.models.length; k++) if (st.models[k].id === id) { dup = true; break; }
      if (dup) continue;
      st.models.push({
        id: id, pid: pid2, name: nm, alias: '', enabled: true,
        ok: null, lat: 0, checkedAt: 0, err: '', cooldown: 0,
        hits: 0, fails: 0, w: 1, p: 0, added: MH.now()
      });
      added++;
    }
    MH.log(st, '[model] 从 ' + pr.name + ' 添加 ' + added + ' 个模型');
    MH.save(st);
    return json({ ok: true, added: added });
  }

  if (action === 'model.patch') {
    var ids = arr(params.ids); if (!ids.length && params.id) ids = [params.id];
    var n = 0;
    for (var i = 0; i < st.models.length; i++) {
      var m = st.models[i];
      if (ids.length && ids.indexOf(m.id) < 0) continue;
      if (params.enabled !== undefined) m.enabled = bool(params.enabled);
      if (params.alias !== undefined) m.alias = String(params.alias || '').trim();
      if (params.w !== undefined) m.w = Math.max(1, parseInt(params.w) || 1);
      if (params.p !== undefined) m.p = parseInt(params.p) || 0;
      if (bool(params.reset)) { m.ok = null; m.err = ''; m.fails = 0; m.cooldown = 0; m.lat = 0; m.checkedAt = 0; }
      n++;
    }
    MH.save(st);
    return json({ ok: true, n: n });
  }

  if (action === 'model.del') {
    var ids2 = arr(params.ids); if (!ids2.length && params.id) ids2 = [params.id];
    var b4 = st.models.length;
    st.models = st.models.filter(function (m) { return ids2.indexOf(m.id) < 0; });
    MH.log(st, '[model] 删除 ' + (b4 - st.models.length) + ' 个模型');
    MH.save(st);
    return json({ ok: true });
  }

  /* ---------------- 配置 ---------------- */
  if (action === 'cfg.set') {
    var allow = ['strategy', 'staleMin', 'checkMin', 'gwToken', 'timeoutMs', 'overrideModel', 'slidingCheck', 'checkMode'];
    for (var i = 0; i < allow.length; i++) {
      var k = allow[i];
      if (params[k] !== undefined) st.cfg[k] = params[k];
    }
    st.cfg.overrideModel = bool(st.cfg.overrideModel);
    st.cfg.slidingCheck = bool(st.cfg.slidingCheck);
    st.cfg.staleMin = Math.max(1, parseInt(st.cfg.staleMin) || 5);
    st.cfg.checkMin = Math.max(1, parseInt(st.cfg.checkMin) || 10);
    st.cfg.timeoutMs = Math.max(5000, parseInt(st.cfg.timeoutMs) || 60000);
    MH.log(st, '[cfg] 策略=' + st.cfg.strategy + ' 保鲜=' + st.cfg.staleMin + 'm 轮询=' + st.cfg.checkMin + 'm');
    MH.save(st);
    return json({ ok: true });
  }

  /* ---------------- 探测 ---------------- */
  if (action === 'check') {
    var only = arr(params.ids); if (!only.length) only = null;
    var list = [];
    for (var i = 0; i < st.models.length; i++) {
      var m = st.models[i];
      if (!m.enabled) continue;
      if (only && only.indexOf(m.id) < 0) continue;
      if (MH.pOf(st, m.pid)) list.push({ id: m.id, pid: m.pid, name: m.name });
    }
    if (!list.length) return json({ ok: true, healthy: 0, total: 0, warn: '没有已启用的模型' });

    var results = {};
    var idx = 0, running = 0, doneN = 0, LIMIT = 5;
    var mode = st.cfg.checkMode || 'ping';

    function next() {
      if (doneN >= list.length) {
        // 合并结果
        var st2 = MH.load();
        for (var j = 0; j < st2.models.length; j++) {
          var mm = st2.models[j];
          var r = results[mm.id];
          if (!r) continue;
          MH.applyProbe(st2, mm, r.err, r.lat);
        }
        var s2 = MH.stats(st2);
        var bad = [];
        for (var key in results) if (results[key].err) bad.push(key.split('::')[1] || key);
        MH.log(st2, '[check] ' + list.length + ' 个模型检测完成，' + s2.healthy + ' 可用' +
          (bad.length ? '，失败: ' + bad.slice(0, 4).join(', ') : ''));
        MH.save(st2);
        return json({ ok: true, healthy: s2.healthy, total: list.length, bad: bad });
      }
      if (running >= LIMIT || idx >= list.length) return;
      var task = list[idx++]; running++;
      (function (task) {
        var p = MH.pOf(st, task.pid);
        if (!p) { results[task.id] = { err: '提供商已删除', lat: 0 }; running--; doneN++; return next(); }
        MH.probe(p, task.name, mode, function (err, lat) {
          results[task.id] = { err: err || '', lat: lat || 0 };
          running--; doneN++;
          next();
        });
      })(task);
      next();
    }
    return next();
  }

  return fail('未知操作 ' + action);
}


MH_PANEL();
