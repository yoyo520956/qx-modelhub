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

      if (m2) { m2.ok = true; m2.err = ''; m2.fails = 0; m2.cooldown = 0; m2.lat = lat; m2.checkedAt = MH.now(); }
      MH.log(st2, '[gw] → ' + p0.name + '/' + useName + ' ' + lat + 'ms');
      bump(st2, m2);
      MH.save(st2);

      var payload = toOpenAI(p0, r.body, outModel, useName);
      if (!payload) return oaiErr('上游返回无法解析', 502, 'upstream_bad_body');

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
