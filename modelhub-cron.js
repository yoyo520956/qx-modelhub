/*!
 * ModelHub — Quantumult X 本地模型路由
 * 生成时间: 2026-11-22 02:43
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
 * ModelHub cron —— 定时探活（[task_local]）
 * 把每个已启用模型的延迟/成败写进 $prefs，供网关零网络秒选。
 * ========================================================================== */

function MH_CRON() {
  function done() { try { $done(); } catch (e) { } }

  var st = MH.load();
  var mode = st.cfg.checkMode || 'ping';

  var list = [];
  for (var i = 0; i < st.models.length; i++) {
    var m = st.models[i];
    if (!m.enabled) continue;
    if (!MH.pOf(st, m.pid)) continue;
    list.push({ id: m.id, pid: m.pid, name: m.name });
  }

  if (!list.length) {
    MH.log(st, '[cron] 没有已启用的模型，跳过');
    MH.save(st);
    return done();
  }

  var results = {};
  var idx = 0, running = 0, doneN = 0;
  var LIMIT = 4;
  var before = MH.stats(st);

  function finish() {
    var s2 = MH.load();
    for (var j = 0; j < s2.models.length; j++) {
      var mm = s2.models[j];
      var r = results[mm.id];
      if (!r) continue;
      MH.applyProbe(s2, mm, r.err, r.lat);
    }
    var after = MH.stats(s2);
    MH.log(s2, '[cron] ' + list.length + ' 个模型探活完成，' + after.healthy + ' 可用');

    // 全部挂掉才通知，避免打扰
    if (after.healthy === 0 && before.healthy > 0) {
      try { $notify('ModelHub', '所有模型都不可用', '请打开面板检查 Key 或网络'); } catch (e) { }
    }
    MH.save(s2);
    done();
  }

  function next() {
    if (doneN >= list.length) return finish();
    if (running >= LIMIT || idx >= list.length) return;
    var task = list[idx++];
    running++;
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

  next();
}


MH_CRON();
