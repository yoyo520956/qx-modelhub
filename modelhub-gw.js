/*!
 * ModelHub — Quantumult X 本地模型路由
 * 生成时间: 2026-11-22 02:28
 * 本文件由 build.py 自动生成，请勿直接编辑；改 src/ 后重新构建。
 */
// ===== 逻辑 =====
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
    // 从请求 Host 推导，用户改了 QX 端口也不会错
    try {
      var hd = $request.headers || {};
      var h = hd.Host || hd.host || hd[':authority'] || '';
      if (h) return 'http://' + h;
    } catch (e) { }
    return 'http://127.0.0.1:9999';
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


/* ==========================================================================
 * ModelHub gateway —— OpenAI 兼容网关
 * 路径前缀 /v1/  →  http://127.0.0.1:9999/v1
 *   GET  /v1/models             模型清单（别名优先）
 *   POST /v1/chat/completions   对话（自动路由）
 *   POST /v1/completions        兼容旧接口
 *   GET  /v1/health             运行状态
 * ========================================================================== */

(function () {
  var answered = false;
  function reply(obj) { if (answered) return; answered = true; $done(obj); }

  function H(c) {
    var h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'Close', 'Access-Control-Allow-Origin': '*' };
    if (c) for (var k in c) h[k] = c[k];
    return h;
  }
  function json(o, code) {
    reply({ status: 'HTTP/1.1 ' + (code || 200) + ' OK', headers: H(), body: JSON.stringify(o) });
  }
  function oaiErr(msg, code, type) {
    json({ error: { message: String(msg), type: type || 'gateway_error', code: code || null } }, code || 500);
  }

  setTimeout(function () {
    if (!answered) oaiErr('网关超时（上游未在限定时间内返回）', 504, 'timeout');
  }, 130000);

  var rawPath = ($request.path || '/');
  var qi = rawPath.indexOf('?');
  var path = (qi >= 0 ? rawPath.slice(0, qi) : rawPath).replace(/\/+$/, '');
  path = path.replace(/^\/v1(?=\/|$)/, '') || '/';
  var method = ($request.method || 'GET').toUpperCase();

  var st = MH.load();

  /* ---------------- 鉴权 ---------------- */
  var tok = String(st.cfg.gwToken || '').trim();
  if (tok) {
    var hd = $request.headers || {};
    var got = hd['Authorization'] || hd['authorization'] || hd['x-api-key'] || hd['X-Api-Key'] || '';
    got = String(got).replace(/^Bearer\s+/i, '').trim();
    if (got !== tok) return oaiErr('Invalid API key', 401, 'invalid_request_error');
  }

  /* ---------------- 健康 ---------------- */
  if (path === '/health' || path === '') {
    var s = MH.stats(st);
    return json({
      ok: true, healthy: s.healthy, enabled: s.enabled, total: s.total,
      strategy: st.cfg.strategy, fastest: s.fastest, fastestMs: s.fastestMs,
      at: MH.now()
    });
  }

  /* ---------------- 模型清单 ---------------- */
  if (path === '/models' && method === 'GET') {
    var data = [];
    var seen = {};
    for (var i = 0; i < st.models.length; i++) {
      var m = st.models[i];
      if (!m.enabled) continue;
      if (!MH.pOf(st, m.pid)) continue;
      var id = MH.publicName(m);
      if (seen[id]) continue;
      seen[id] = 1;
      var p = MH.pOf(st, m.pid);
      data.push({ id: id, object: 'model', created: 0, owned_by: p ? p.name : 'modelhub' });
    }
    return json({ object: 'list', data: data });
  }

  /* ---------------- 路由核心 ---------------- */
  if (method === 'POST' && (path === '/chat/completions' || path === '/completions' || path === '/messages')) {
    var reqObj = MH.reqJson($request.body);
    if (!reqObj) return oaiErr('请求体不是合法 JSON', 400, 'invalid_request_error');

    var want = reqObj.model || '';
    var cands = MH.candidates(st, want);
    if (!cands.length) {
      return oaiErr('没有可用的模型：请先在 ModelHub 面板添加并启用模型', 503, 'no_available_model');
    }

    var ranked = MH.rank(st, cands);
    var first = ranked[0];
    var p0 = MH.pOf(st, first.pid);

    // 覆盖 model：客户端随便填，统一用选中的真实模型名
    var useName = first.name;
    var outModel = want || MH.publicName(first);

    var up = buildUpstream(p0, first, reqObj, useName);
    if (up.err) return oaiErr(up.err, 400, 'invalid_request_error');

    var t0 = MH.now();

    $task.fetch({ url: up.url, method: 'POST', headers: MH.authHeaders(p0), body: up.body }).then(function (r) {
      var lat = MH.now() - t0;
      var st2 = MH.load();
      var m2 = findModel(st2, first.id);

      if (r.statusCode < 200 || r.statusCode >= 300) {
        if (m2) { MH.applyProbe(st2, m2, 'HTTP ' + r.statusCode, lat); }
        MH.log(st2, '[gw] ' + p0.name + '/' + useName + ' 失败 HTTP ' + r.statusCode + ' (' + lat + 'ms)');
        bump(st2, m2);
        MH.save(st2);
        return oaiErr(MH.errText(r.statusCode, r.body), r.statusCode, 'upstream_error');
      }

      var payload = toOpenAI(p0, r.body, outModel, useName);
      if (!payload) {
        if (m2) MH.applyProbe(st2, m2, '上游返回无法解析', lat);
        MH.log(st2, '[gw] ' + p0.name + '/' + useName + ' 返回无法解析');
        bump(st2, m2);
        MH.save(st2);
        return oaiErr('上游返回无法解析', 502, 'upstream_bad_body');
      }

      // 记一笔 token 用量
      var tk = (payload.usage && payload.usage.total_tokens) || 0;
      MH.recordUsage(st2, first.id, payload.usage || {});

      if (m2) { m2.ok = true; m2.err = ''; m2.fails = 0; m2.cooldown = 0; m2.lat = lat; m2.checkedAt = MH.now(); }
      MH.log(st2, '[gw] → ' + p0.name + '/' + useName + ' ' + lat + 'ms · ' + tk + 'tk');
      bump(st2, m2);
      MH.save(st2);

      if (reqObj.stream) return sse(payload, outModel);
      json(payload);
    }, function (e) {
      var st3 = MH.load();
      var m3 = findModel(st3, first.id);
      var msg = (e && e.error) || '网络错误';
      if (m3) MH.applyProbe(st3, m3, msg, MH.now() - t0);
      MH.log(st3, '[gw] ' + p0.name + '/' + useName + ' 异常: ' + msg);
      bump(st3, m3);
      MH.save(st3);
      oaiErr('上游连接失败：' + msg, 502, 'upstream_unreachable');
    });
    return;
  }

  return oaiErr('Not found: ' + path, 404, 'invalid_request_path');

  /* ==================== 工具 ==================== */

  function findModel(s, id) {
    for (var i = 0; i < s.models.length; i++) if (s.models[i].id === id) return s.models[i];
    return null;
  }
  function bump(s, m) {
    if (!m) return;
    if (MH.now() - (s.t || 0) > 20000) { m.hits = (m.hits || 0) + 1; s.t = MH.now(); }
  }

  /* 把 OpenAI 风格请求体转换成目标提供商格式 */
  function buildUpstream(p, m, src, modelName) {
    var msgs = src.messages || [];
    if (src.prompt && !msgs.length) msgs = [{ role: 'user', content: src.prompt }];
    if (!msgs.length) return { err: 'messages 为空' };

    var maxTok = src.max_tokens || src.max_completion_tokens || 1024;
    var temp = (src.temperature === undefined) ? undefined : src.temperature;

    if (p.type === 'anthropic') {
      var sys = '';
      var am = [];
      for (var i = 0; i < msgs.length; i++) {
        var r = msgs[i].role;
        var c = flatten(msgs[i].content);
        if (r === 'system') { sys += (sys ? '\n' : '') + c; continue; }
        am.push({ role: r === 'assistant' ? 'assistant' : 'user', content: c });
      }
      var ab = { model: modelName, max_tokens: maxTok, messages: am };
      if (sys) ab.system = sys;
      if (temp !== undefined) ab.temperature = temp;
      return { url: MH.urlChat(p), body: JSON.stringify(ab) };
    }

    if (p.type === 'gemini') {
      var contents = [], gsys = '';
      for (var j = 0; j < msgs.length; j++) {
        var r2 = msgs[j].role;
        var c2 = flatten(msgs[j].content);
        if (r2 === 'system') { gsys += (gsys ? '\n' : '') + c2; continue; }
        contents.push({ role: r2 === 'assistant' ? 'model' : 'user', parts: [{ text: c2 }] });
      }
      var gb = { contents: contents, generationConfig: { maxOutputTokens: maxTok } };
      if (gsys) gb.systemInstruction = { parts: [{ text: gsys }] };
      if (temp !== undefined) gb.generationConfig.temperature = temp;
      return { url: MH.urlGemini(p, modelName), body: JSON.stringify(gb) };
    }

    // openai 兼容：原样透传，只换 model / 关流
    var ob = {};
    for (var k in src) ob[k] = src[k];
    ob.model = modelName;
    ob.stream = false;
    if (!ob.max_tokens && !ob.max_completion_tokens) ob.max_tokens = maxTok;
    delete ob.stream_options;
    return { url: MH.urlChat(p), body: JSON.stringify(ob) };
  }

  function flatten(c) {
    if (c === null || c === undefined) return '';
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) {
      var s = '';
      for (var i = 0; i < c.length; i++) {
        var x = c[i];
        if (typeof x === 'string') s += x;
        else if (x && x.text) s += x.text;
        else if (x && x.type === 'image_url') s += '[image]';
      }
      return s;
    }
    if (c.text) return c.text;
    return String(c);
  }

  /* 上游响应 → OpenAI 格式 */
  function toOpenAI(p, body, outModel, realName) {
    var j;
    try { j = JSON.parse(body); } catch (e) { return null; }

    var text = MH.extractText(p, j);
    var usage = j.usage || {};

    var mapped = {
      provider: p.type === 'gemini' ? 'google' : (p.type === 'anthropic' ? 'anthropic' : 'openai'),
      client_id: 'modelhub',
      upstream: p.name
    };

    var outUsage = {
      prompt_tokens: usage.prompt_tokens || usage.input_tokens || 0,
      completion_tokens: usage.completion_tokens || usage.output_tokens || 0,
      total_tokens: usage.total_tokens ||
        ((usage.prompt_tokens || usage.input_tokens || 0) + (usage.completion_tokens || usage.output_tokens || 0))
    };

    if (p.type === 'openai') {
      // 原样返回，仅统一 model 字段
      if (j.model !== undefined) j.model = outModel;
      if (!j.usage) j.usage = outUsage;
      j['x_modelhub'] = mapped;
      return j;
    }

    var finish = 'stop';
    if (p.type === 'anthropic') {
      if (j.stop_reason === 'max_tokens') finish = 'length';
    } else if (p.type === 'gemini') {
      var fr = ((j.candidates || [])[0] || {}).finishReason;
      if (fr === 'MAX_TOKENS') finish = 'length';
      else if (fr === 'SAFETY') finish = 'content_filter';
    }

    var id = 'chatcmpl-mh-' + Math.random().toString(36).slice(2, 12);
    return {
      id: id,
      object: 'chat.completion',
      created: Math.floor(MH.now() / 1000),
      model: outModel,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: finish
      }],
      usage: outUsage,
      'x_modelhub': mapped
    };
  }

  /* 非流式结果 → 一次 SSE 输出（客户端仍按流式解析，不会报错） */
  function sse(payload, outModel) {
    var ch = (payload.choices || [{}])[0] || {};
    var msg = ch.message || {};
    var content = msg.content || '';
    var id = payload.id || ('chatcmpl-mh-' + Math.random().toString(36).slice(2, 12));
    var created = payload.created || Math.floor(MH.now() / 1000);

    function chunk(delta, finish) {
      return 'data: ' + JSON.stringify({
        id: id, object: 'chat.completion.chunk', created: created, model: outModel,
        choices: [{ index: 0, delta: delta, finish_reason: finish || null }]
      }) + '\n\n';
    }

    var body = chunk({ role: 'assistant', content: '' });
    // 分段发出，避免个别客户端对超长单块处理异常
    var STEP = 480;
    for (var i = 0; i < content.length; i += STEP) {
      body += chunk({ content: content.slice(i, i + STEP) });
    }
    body += chunk({}, ch.finish_reason || 'stop');
    body += 'data: [DONE]\n\n';

    reply({
      status: 'HTTP/1.1 200 OK',
      headers: H({ 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' }),
      body: body
    });
  }
})();
