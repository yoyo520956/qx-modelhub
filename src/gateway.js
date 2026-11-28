/* ==========================================================================
 * ModelHub gateway —— OpenAI 兼容网关
 * 路径前缀 /v1/  →  http://127.0.0.1:9999/v1
 *   GET  /v1/models             模型清单（别名优先）
 *   POST /v1/chat/completions   对话（自动路由）
 *   POST /v1/completions        兼容旧接口
 *   GET  /v1/health             运行状态
 * ========================================================================== */

function MH_GW() {
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

  var rawPath = ($request.path || '/');
  var qi = rawPath.indexOf('?');
  var path = (qi >= 0 ? rawPath.slice(0, qi) : rawPath).replace(/\/+$/, '');
  path = path.replace(/^\/mh\/v1(?=\/|$)/, '').replace(/^\/v1(?=\/|$)/, '') || '/';
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
    var outModel0 = want || '';

    var cands0 = MH.candidates(st, want);
    if (!cands0.length) {
      // 无任何可用通道：友好 200（绝不返回错误码给 App）
      var sN = MH.load();
      MH.recordUsage(sN, null, {}, { ms: 0, retries: 0, ok: false });
      MH.log(sN, '[gw] 无可用通道 → 友好提示(200)');
      MH.save(sN);
      return friendly('no_channel',
        '(ModelHub 本地网关) 当前没有可用通道：请在面板「提供商」页确认至少有一个 openai 兼容提供商已启用且 Key 有效。');
    }

    var autoRetry = st.cfg.autoRetry !== false;
    var baseMs = Math.max(300, parseInt(st.cfg.retryBaseMs) || 1500);
    var capMs = Math.max(2000, (parseFloat(st.cfg.retryMaxMin) || 10) * 60000);
    var t0 = MH.now();
    var attempts = 0;
    var tried = {};

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function friendly(mapped, text) {
      var payload = {
        id: 'mh-gw-' + Math.random().toString(36).slice(2, 10),
        object: 'chat.completion', created: Math.floor(MH.now() / 1000),
        model: outModel0 || 'modelhub',
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        'x_modelhub': { mapped: mapped }
      };
      if (reqObj.stream) sse(payload, outModel0 || 'modelhub'); else json(payload);
    }

    function giveUp(reason) {
      var s9 = MH.load();
      MH.recordUsage(s9, null, {}, { ms: MH.now() - t0, retries: attempts, ok: false });
      MH.log(s9, '[gw] 放弃：' + reason + '（自动重试 ' + attempts + ' 次，错误未返回 App）');
      MH.save(s9);
      friendly('retry_exhausted',
        '(ModelHub 本地网关) 上游持续失败，已自动重试 ' + attempts + ' 次（含自动换模型），全部错误已在网关层消化。' +
        '请稍等 1-2 分钟后直接重发消息即可自动续上，无需手动点重试。');
    }

    function scheduleNext() {
      var backoff = autoRetry ? Math.min(60000, baseMs * Math.pow(2, Math.min(6, attempts))) : 0;
      wait(backoff + Math.floor(Math.random() * 300)).then(run);
    }

    function fetchUp(p0, up, pick, outModel, t1) {
      var pDone = false;
      $task.fetch({ url: up.url, method: 'POST', headers: MH.authHeaders(p0), body: up.body }).then(function (r) {
        if (pDone) return; pDone = true;
        var lat = MH.now() - t1;
        var st2 = MH.load();
        var m2 = findModel(st2, pick.id);
        if (r.statusCode < 200 || r.statusCode >= 300) {
          if (m2) MH.applyProbe(st2, m2, 'HTTP ' + r.statusCode, lat);
          m2.cooldown = MH.now() + Math.min(15000, baseMs * Math.pow(2, Math.min(3, Math.max(0, (m2.fails || 1) - 1))));
          tried[pick.id] = (tried[pick.id] || 0) + 1;
          MH.log(st2, '[gw] ' + p0.name + '/' + pick.name + ' HTTP ' + r.statusCode + ' → 自动重试（第 ' + attempts + ' 次，错误不返回 App）');
          bump(st2, m2); MH.save(st2);
          scheduleNext();
        } else {
          var payload = toOpenAI(p0, r.body, outModel, pick.name);
          if (!payload) {
            if (m2) MH.applyProbe(st2, m2, '上游返回无法解析', lat);
          m2.cooldown = MH.now() + Math.min(15000, baseMs * Math.pow(2, Math.min(3, Math.max(0, (m2.fails || 1) - 1))));
            tried[pick.id] = (tried[pick.id] || 0) + 1;
            MH.log(st2, '[gw] ' + p0.name + '/' + pick.name + ' 返回无法解析 → 自动重试');
            bump(st2, m2); MH.save(st2);
            scheduleNext();
            return;
          }
          st2 = MH.load(); m2 = findModel(st2, pick.id);
          var usage = payload.usage || {};
          MH.recordUsage(st2, pick.id, usage, { ms: MH.now() - t0, retries: Math.max(0, attempts - 1), ok: true });
          if (m2) { m2.ok = true; m2.err = ''; m2.fails = 0; m2.cooldown = 0; m2.lat = lat; m2.checkedAt = MH.now(); }
          MH.log(st2, '[gw] → ' + p0.name + '/' + pick.name + ' ' + lat + 'ms · ' + (usage.total_tokens || 0) + 'tk' +
            ((attempts - 1) > 0 ? ' · 自动重试 ' + (attempts - 1) + ' 次后成功' : ''));
          bump(st2, m2); MH.save(st2);
          if (reqObj.stream) sse(payload, outModel); else json(payload);
        }
      }, function (e) {
        if (pDone) return; pDone = true;
        var st3 = MH.load();
        var m3 = findModel(st3, pick.id);
        var msg = (e && e.error) || '网络错误';
        if (m3) MH.applyProbe(st3, m3, msg, MH.now() - t1);
          m3.cooldown = MH.now() + Math.min(15000, baseMs * Math.pow(2, Math.min(3, Math.max(0, (m3.fails || 1) - 1))));
        tried[pick.id] = (tried[pick.id] || 0) + 1;
        MH.log(st3, '[gw] ' + p0.name + '/' + pick.name + ' 异常 ' + msg + ' → 自动重试');
        bump(st3, m3); MH.save(st3);
        scheduleNext();
      });
    }

    function run() {
      if (MH.now() - t0 > capMs) { giveUp('达到最大等待时间'); return; }
      var s2 = MH.load();
      var cands = MH.candidates(s2, want);
      if (!cands.length) {
        // 全部通道在冷却 → 等到最早解冻再继续（仍然不返回错误）
        var minCool = 0, i;
        for (i = 0; i < s2.models.length; i++) {
          var mm = s2.models[i];
          if (mm.enabled && mm.cooldown && mm.cooldown > MH.now() && (!minCool || mm.cooldown < minCool)) minCool = mm.cooldown;
        }
        var wms = minCool ? Math.min(20000, Math.max(500, minCool - MH.now())) : 2000;
        if (!autoRetry || MH.now() - t0 + wms > capMs) { giveUp('所有通道冷却中'); return; }
        wait(wms).then(run);
        return;
      }
      var ranked = MH.rank(s2, cands);
      var pick = null;
      for (var j = 0; j < ranked.length; j++) if ((tried[ranked[j].id] || 0) < 3) { pick = ranked[j]; break; }
      if (!pick) pick = ranked[0];
      attempts++;
      var p0 = MH.pOf(s2, pick.pid);
      // overrideModel（默认开）：响应里一律显示真实模型名；客户端填的随便名不外泄
      var outModel = s2.cfg.overrideModel === false ? (want || MH.publicName(pick)) : MH.publicName(pick);
      var up = buildUpstream(p0, pick, reqObj, pick.name);
      if (up.err) { giveUp('请求体无效'); return; }
      fetchUp(p0, up, pick, outModel, MH.now());
    }

    run();
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
}
