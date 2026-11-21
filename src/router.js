/* ==========================================================================
 * ModelHub router —— [rewrite_local] 路由层（不需要本地服务器）
 *
 *   ^https?://mh\.qx/mh            url script-echo-response   modelhub.js
 *   ^https?://mh\.qx/v1/models     url script-echo-response   modelhub.js
 *   ^https?://mh\.qx/v1/           url script-request-header  modelhub.js
 *
 * 请求头阶段：客户端打到 mh.qx，脚本把它改写成真实上游地址，并注入该家的 Key。
 * QX 会按改写后的地址原生转发 —— 所以流式是真的，不是拼出来的。
 * ========================================================================== */

function MH_ROUTER() {
  var st = MH.load();

  var url = String($request.url || '');
  var qi = url.indexOf('?');
  var fullPath = qi >= 0 ? url.slice(0, qi) : url;
  var schemeEnd = fullPath.indexOf('://');
  var slash = schemeEnd >= 0 ? fullPath.indexOf('/', schemeEnd + 3) : -1;
  var path = slash >= 0 ? fullPath.slice(slash) : '/';
  var query = qi >= 0 ? url.slice(qi) : '';

  var bodyStr = $request.body;
  var reqObj = MH.reqJson(bodyStr);
  var want = reqObj && reqObj.model ? String(reqObj.model) : '';

  // 只允许 openai 兼容通道参与流式路由（anthropic/gemini 响应格式不同，
  // request-header 转发无法在本地转换，会污染客户端）
  var pool = [], i;
  var t = MH.now();
  for (i = 0; i < st.models.length; i++) {
    var mm = st.models[i];
    if (!mm.enabled) continue;
    if (mm.cooldown && mm.cooldown > t) continue;
    var pp0 = MH.pOf(st, mm.pid);
    if (!pp0 || pp0.type !== 'openai' || !pp0.key) continue;
    pool.push(mm);
  }

  if (!pool.length) {
    // 没有可用通道 → 原样放行（让客户端自己报错，别假装成功）
    return $done({});
  }

  // 客户端指定了模型名，就在池子里精确匹配；匹配不到则退回最快可用
  var chosen = pool;
  if (want) {
    var wl = String(want).toLowerCase(), ex = [];
    for (i = 0; i < pool.length; i++) {
      var x = pool[i];
      if (x.name === want || (x.alias && x.alias === want) ||
        String(x.name).toLowerCase() === wl ||
        (x.alias && String(x.alias).toLowerCase() === wl)) ex.push(x);
    }
    if (ex.length) chosen = ex;
  }

  var m = MH.rank(st, chosen)[0];
  var p = MH.pOf(st, m.pid);
  var base = MH.trimBase(p.base);

  // ---- 目标地址 ----
  var tail = path.replace(/^\/v1/, '');
  var target;
  if (/\/chat\/completions$/.test(tail)) target = base + '/chat/completions' + query;
  else if (/\/completions$/.test(tail)) target = base + '/completions' + query;
  else if (/\/embeddings$/.test(tail)) target = base + '/embeddings' + query;
  else target = base + (tail || '/') + query;

  // ---- 请求头：清掉入口域的认证，换成目标通道的 ----
  var h = {};
  var src = $request.headers || {};
  for (var k in src) {
    var lk = String(k).toLowerCase();
    if (lk === 'host' || lk === 'authorization' || lk === 'x-api-key' ||
      lk === 'content-length' || lk === 'connection') continue;
    h[k] = src[k];
  }
  h['Authorization'] = 'Bearer ' + p.key;
  // 少数网关要 x-api-key
  if (p.headerStyle === 'x-api-key') {
    delete h['Authorization'];
    h['x-api-key'] = p.key;
  }

  // ---- body：尽量把 model 换成真实名（QX 若不支持改 body 会忽略，不影响转发） ----
  var out = { url: target, headers: h };
  if (reqObj && reqObj.model !== m.name) {
    reqObj.model = m.name;
    try { out.body = JSON.stringify(reqObj); } catch (e) { }
  }

  $done(out);
}

/* 模型清单（echo 阶段，客户端 GET /v1/models 时用） */
function MH_MODELS() {
  var st = MH.load();
  var data = [], seen = {};
  for (var i = 0; i < st.models.length; i++) {
    var m = st.models[i];
    if (!m.enabled) continue;
    var p = MH.pOf(st, m.pid);
    if (!p || p.type !== 'openai' || !p.key) continue;
    var id = MH.publicName(m);
    if (seen[id]) continue;
    seen[id] = 1;
    data.push({ id: id, object: 'model', created: 0, owned_by: p.name });
  }
  $done({
    status: 'HTTP/1.1 200 OK',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Connection': 'Close'
    },
    body: JSON.stringify({ object: 'list', data: data })
  });
}
