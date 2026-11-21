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

  var rawPath = ($request.path || '/');
  var qi = rawPath.indexOf('?');
  var path = qi >= 0 ? rawPath.slice(0, qi) : rawPath;
  var query = qi >= 0 ? rawPath.slice(qi + 1) : '';

  try { path = decodeURIComponent(path); } catch (e) { }

  // 去掉 /mh 前缀（/mh、/mh/、/mh/xxx 都兼容）
  var rel = path.replace(/^\/mh(?=\/|$)/, '');
  if (rel === '') rel = '/';

  if (rel === '/favicon.ico') {
    return reply({ status: 'HTTP/1.1 204 No Content', headers: H(), body: '' });
  }

  // 诊断用：能拿到 pong 说明脚本已被 QX 正常加载
  if (rel === '/api/ping') {
    return json({ ok: true, pong: 1, name: 'ModelHub', v: MH_VER_, path: path, at: MH.now() });
  }

  // 非 API 路径一律返回面板，避免 404 让人误判
  if (rel.indexOf('/api/') !== 0) {
    return html(MH_HTML_);
  }

  var action = rel.slice(5);
  var body = {};
  try { body = MH.reqJson($request.body) || {}; } catch (e) { body = {}; }

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
    var base = MH.trimBase(body.base)
      .replace(/\/(chat\/completions|completions|models|messages)$/i, '')
      .replace(/\/+$/, '');
    var key = String(body.key || '').trim();
    if (!base || !key) return fail('Base URL 和 Key 都不能为空');
    if (!/^https?:\/\//.test(base)) return fail('Base URL 需要以 http:// 或 https:// 开头');

    var p = {
      id: MH.uid('p_'),
      name: String(body.name || '').trim() || base.replace(/^https?:\/\//, '').split('/')[0],
      type: body.type || 'openai',
      base: base, key: key,
      ok: null, lastErr: '', lastSync: 0, added: MH.now()
    };
    st.providers.push(p);
    MH.log(st, '[provider] 添加 ' + p.name + ' (' + p.base + ')');
    MH.save(st);

    return MH.discover(p, function (err, list) {
      var st2 = MH.load();
      var p2 = MH.pOf(st2, p.id) || p;
      if (err) {
        p2.ok = false; p2.lastErr = err; p2.lastSync = MH.now();
        MH.log(st2, '[provider] ' + p2.name + ' 拉取失败: ' + err);
        MH.save(st2);
        return json({ ok: true, pid: p.id, discovered: [], models: [], warn: '已保存，但拉取模型失败：' + err });
      }
      p2.ok = true; p2.lastErr = ''; p2.lastSync = MH.now();
      MH.log(st2, '[provider] ' + p2.name + ' 发现 ' + list.length + ' 个模型');
      MH.save(st2);
      var have = [];
      for (var i = 0; i < st2.models.length; i++) if (st2.models[i].pid === p.id) have.push(st2.models[i].name);
      json({ ok: true, pid: p.id, discovered: list, models: have });
    });
  }

  if (action === 'provider.sync') {
    var p3 = MH.pOf(st, body.id);
    if (!p3) return fail('提供商不存在');
    return MH.discover(p3, function (err, list) {
      var st2 = MH.load();
      var p4 = MH.pOf(st2, body.id);
      if (p4) { p4.ok = !err; p4.lastErr = err || ''; p4.lastSync = MH.now(); }
      if (err) {
        MH.log(st2, '[provider] ' + body.id + ' 同步失败: ' + err);
        MH.save(st2);
        return json({ ok: false, err: err });
      }
      MH.log(st2, '[provider] ' + p4.name + ' 同步到 ' + list.length + ' 个模型');
      MH.save(st2);
      var have = [];
      for (var i = 0; i < st2.models.length; i++) if (st2.models[i].pid === body.id) have.push(st2.models[i].name);
      json({ ok: true, discovered: list, models: have });
    });
  }

  if (action === 'provider.del') {
    var pid = body.id;
    st.providers = st.providers.filter(function (x) { return x.id !== pid; });
    var before = st.models.length;
    st.models = st.models.filter(function (m) { return m.pid !== pid; });
    MH.log(st, '[provider] 删除 ' + pid + '，连带移除 ' + (before - st.models.length) + ' 个模型');
    MH.save(st);
    return json({ ok: true });
  }

  /* ---------------- 模型 ---------------- */
  if (action === 'model.add') {
    var pid2 = body.pid, names = body.names || [];
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
    var ids = body.ids && body.ids.length ? body.ids : (body.id ? [body.id] : []);
    var n = 0;
    for (var i = 0; i < st.models.length; i++) {
      var m = st.models[i];
      if (ids.length && ids.indexOf(m.id) < 0) continue;
      if (body.enabled !== undefined) m.enabled = !!body.enabled;
      if (body.alias !== undefined) m.alias = String(body.alias || '').trim();
      if (body.w !== undefined) m.w = Math.max(1, parseInt(body.w) || 1);
      if (body.p !== undefined) m.p = parseInt(body.p) || 0;
      if (body.reset) { m.ok = null; m.err = ''; m.fails = 0; m.cooldown = 0; m.lat = 0; m.checkedAt = 0; }
      n++;
    }
    MH.save(st);
    return json({ ok: true, n: n });
  }

  if (action === 'model.del') {
    var ids2 = body.ids || (body.id ? [body.id] : []);
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
      if (body[k] !== undefined) st.cfg[k] = body[k];
    }
    st.cfg.staleMin = Math.max(1, parseInt(st.cfg.staleMin) || 5);
    st.cfg.checkMin = Math.max(1, parseInt(st.cfg.checkMin) || 10);
    st.cfg.timeoutMs = Math.max(5000, parseInt(st.cfg.timeoutMs) || 60000);
    MH.log(st, '[cfg] 策略=' + st.cfg.strategy + ' 保鲜=' + st.cfg.staleMin + 'm 轮询=' + st.cfg.checkMin + 'm');
    MH.save(st);
    return json({ ok: true });
  }

  /* ---------------- 探测 ---------------- */
  if (action === 'check') {
    var only = body.ids && body.ids.length ? body.ids : null;
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
