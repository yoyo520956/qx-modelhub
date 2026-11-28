#!/usr/bin/env node
/* 模拟 Quantumult X 脚本环境，端到端验证 ModelHub（rewrite 架构） */
const http = require('http');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const OUT = path.join(__dirname, '..', 'out');
const STATE = path.join(__dirname, 'state.json');
const ENTRY = 'https://mh.qx';

/* ---------------- 假上游 ---------------- */
function startUpstream(port, kind) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const u = new URL(req.url, 'http://x');
        if (kind === 'openai') {
          if (u.pathname.endsWith('/models')) {
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({ object: 'list', data: [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma-dead' }] }));
          }
          let j = {}; try { j = JSON.parse(body); } catch (e) { }
          if (j.model === 'gamma-dead') {
            rsp.writeHead(500, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({ error: { message: 'model overloaded' } }));
          }
          rsp.writeHead(200, { 'Content-Type': 'application/json' });
          return rsp.end(JSON.stringify({
            id: 'chatcmpl-x', object: 'chat.completion', model: j.model,
            choices: [{ index: 0, message: { role: 'assistant', content: 'hi from ' + j.model }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 12, completion_tokens: 9, total_tokens: 21 }
          }));
        }
        if (kind === 'anthropic') {
          if (u.pathname.endsWith('/models')) {
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({ data: [{ id: 'claude-x' }] }));
          }
          rsp.writeHead(200, { 'Content-Type': 'application/json' });
          return rsp.end(JSON.stringify({ content: [{ type: 'text', text: 'claude' }], usage: { input_tokens: 7, output_tokens: 5 } }));
        }
        if (kind === 'gemini') {
          if (u.pathname.endsWith('/models')) {
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({ models: [
              { name: 'models/gemini-pro', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }
            ] }));
          }
          rsp.writeHead(200, { 'Content-Type': 'application/json' });
          return rsp.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'gemini' }] }, finishReason: 'STOP' }] }));
        }
        rsp.writeHead(404); rsp.end('{}');
      });
    });
    srv.listen(port, '127.0.0.1', () => res(srv));
  });
}

/* ---------------- QX 环境 ---------------- */
const ROOT = require('path').dirname(__dirname);
let store = {};
if (fs.existsSync(STATE)) { try { store = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { } }
function persist() { fs.writeFileSync(STATE, JSON.stringify(store)); }

function installQX(request, opts) {
  return new Promise(resolve => {
    let finished = false;
    global.$prefs = {
      valueForKey: k => store[k],
      setValueForKey: (v, k) => { store[k] = v; persist(); return true; },
      removeValueForKey: k => { delete store[k]; return true; },
      removeAllValues: () => { store = {}; persist(); return true; }
    };
    global.$task = {
      fetch: (req) => new Promise((ok, bad) => {
        const u = new URL(req.url);
        const payload = req.body ? Buffer.from(req.body) : null;
        const r = http.request({
          hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search,
          method: req.method || 'GET', headers: req.headers || {}
        }, res => {
          let cs = [];
          res.on('data', c => cs.push(c));
          res.on('end', () => ok({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(cs).toString('utf8') }));
        });
        r.on('error', e => bad({ error: e.message }));
        if (payload) r.write(payload);
        r.end();
      })
    };
    if (request === undefined) { delete global.$request; } else { global.$request = request; }
    global.$notify = () => { };
    global.$done = (r) => {
      if (finished) { console.log('  !! $done twice'); return; }
      finished = true; resolve(r || {});
    };
    vm.runInThisContext(fs.readFileSync(opts.file, 'utf8'), { filename: opts.file });
  });
}

function mkReq(p, method, body, headers) {
  const qi = p.indexOf('?');
  return {
    url: ENTRY + p,
    path: qi >= 0 ? p.slice(0, qi) : p,   // QX 的 $request.path 通常不含 query
    method: method || 'GET',
    headers: Object.assign({ Host: 'mh.qx', Authorization: 'Bearer client-key' }, headers || {}),
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
  };
}

/* ---------------- 断言 ---------------- */
let pass = 0, failed = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { failed++; console.log('  ✗ ' + label + (extra !== undefined ? '  →  ' + JSON.stringify(extra).slice(0, 260) : '')); }
}
function jparse(r) { try { return JSON.parse(r.body); } catch (e) { return null; } }

(async () => {
  const upA = await startUpstream(8811, 'openai');
  const upB = await startUpstream(8812, 'anthropic');
  const upG = await startUpstream(8813, 'gemini');

  store = {}; persist();
  const F = path.join(OUT, 'modelhub.js');
  let r, j;

  console.log('\n【1】面板：添加提供商 + 自动拉模型');
  r = await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'A', base: 'http://127.0.0.1:8811/v1', key: 'sk-a', type: 'openai' }), { file: F });
  j = jparse(r);
  ok(j && j.ok && j.pid, '添加提供商（立即返回）', j);
  const pidA = j.pid;
  r = await installQX(mkReq('/mh/api/provider.sync', 'POST', { id: pidA }), { file: F });
  j = jparse(r);
  ok(j && j.ok && j.discovered.length === 3, '拉取到 3 个模型', j && j.discovered);

  console.log('\n【2】anthropic / gemini');
  r = await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'B', base: 'http://127.0.0.1:8812/v1', key: 'sk-b', type: 'anthropic' }), { file: F });
  j = jparse(r); const pidB = j.pid; ok(j && j.ok && j.pid, '添加 anthropic', j);
  r = await installQX(mkReq('/mh/api/provider.sync', 'POST', { id: pidB }), { file: F });
  j = jparse(r); ok(j && j.discovered[0] === 'claude-x', 'anthropic 拉模型', j && j.discovered);
  r = await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'G', base: 'http://127.0.0.1:8813/v1beta', key: 'g-key', type: 'gemini' }), { file: F });
  j = jparse(r); const pidG = j.pid; ok(j && j.ok && j.pid, '添加 gemini', j);
  r = await installQX(mkReq('/mh/api/provider.sync', 'POST', { id: pidG }), { file: F });
  j = jparse(r); ok(j && j.discovered.length === 1 && j.discovered[0] === 'gemini-pro', 'gemini 过滤 embedding', j && j.discovered);

  console.log('\n【3】添加模型');
  r = await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidA, names: ['alpha', 'beta', 'gamma-dead'] }), { file: F });
  j = jparse(r); ok(j && j.added === 3, '3 个 openai 模型', j);
  await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidB, names: ['claude-x'] }), { file: F });
  await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidG, names: ['gemini-pro'] }), { file: F });

  console.log('\n【4】探活');
  r = await installQX(mkReq('/mh/api/check', 'POST', {}), { file: F });
  j = jparse(r);
  ok(j && j.total === 9, '检测 9 个(含4个Agnes预置)', j && j.total);
  ok(j && j.healthy === 4, '4 个可用', j && { h: j.healthy, bad: j.bad });

  console.log('\n【5】状态');
  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  ok(j && j.providers.length === 4, 'providers 4(含Agnes)', j && j.providers.length);
  ok(j && j.providers.every(p => !p.key && p.keyMask.indexOf('••••') > 0), 'Key 脱敏', j && j.providers.map(p => p.keyMask));
  ok(j && j.gwBase === ENTRY + '/v1', '网关地址正确', j && j.gwBase);

  console.log('\n【6】GET /v1/models（网关代答）');
  r = await installQX(mkReq('/v1/models'), { file: F });
  j = jparse(r);
  ok(r.status && r.status.indexOf('200') > 0, '返回 200', r.status);
  const ids = (j && j.data || []).map(x => x.id);
  ok(ids.length === 9 && ids.indexOf('alpha') >= 0, '暴露全部启用模型(含4 Agnes)', ids);
  ok(ids.indexOf('claude-x') >= 0 && ids.indexOf('gemini-pro') >= 0, 'anthropic/gemini 也在清单(网关可转换)', ids);

  console.log('\n【7】网关代答：POST /v1/chat/completions');
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'alpha', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  let rb = null; try { rb = JSON.parse(r.body); } catch (e) { }
  ok(r.status && r.status.indexOf('200') > 0, '200（代答）', r.status);
  ok(rb && rb.model === 'alpha' && /hi from alpha/.test(JSON.stringify(rb)), '上游 alpha 应答(网关转换)', rb && rb.model);

  console.log('\n【8】网关：客户端乱填模型名 → 自动换名');
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'gpt-4o-whatever', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  let ob = null; try { ob = JSON.parse(r.body); } catch (e) { }
  ok(ob && ob.model && ob.model !== 'gpt-4o-whatever', '响应里换成真实模型名', ob && ob.model);
  ok(ob && ob.choices && ob.choices[0].message.content, '内容来自真实上游', ob && ob.choices && ob.choices[0].message.content);

  console.log('\n【9】网关：请求 anthropic 模型名 → 网关直接转换');
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'claude-x', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  let ob9 = null; try { ob9 = JSON.parse(r.body); } catch (e) { }
  ok(ob9 && ob9.model === 'claude-x' && ob9.x_modelhub && ob9.x_modelhub.provider === 'anthropic',
     'anthropic 走网关转换（不再是回退池）', ob9 && ob9.model);
  ok(ob9 && ob9.choices && /claude/.test(ob9.choices[0].message.content), '内容来自上游 B', ob9 && ob9.choices && ob9.choices[0].message.content);

  console.log('\n【10】网关：无可路由通道 → 友好 200（不返回错误码）');
  let stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = false; });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'x', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  let ob10 = null; try { ob10 = JSON.parse(r.body); } catch (e) { }
  ok(r.status && r.status.indexOf('200') > 0, '仍返回 200（永不报错）', r.status);
  ok(ob10 && ob10.x_modelhub && ob10.x_modelhub.mapped === 'no_channel', '友好提示 no_channel', ob10 && ob10.x_modelhub && ob10.x_modelhub.mapped);

  console.log('\n【11】冷却：坏通道被跳过');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = (m.name === 'alpha' || m.name === 'beta'); m.ok = true; m.lat = 100; m.cooldown = 0; });
  stObj.models.find(m => m.name === 'alpha').cooldown = Date.now() + 600000;
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: '', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  let bb = null; try { bb = JSON.parse(r.body); } catch (e) { }
  ok(r.status && r.status.indexOf('200') > 0, '仍 200', r.status);
  ok(bb && bb.model === 'beta', '跳过冷却中的 alpha，选 beta', bb && bb.model);

  console.log('\n【12】Cron 探活');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = (m.name !== 'gamma-dead'); m.ok = null; m.checkedAt = 0; });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  await installQX(undefined, { file: F });
  stObj = JSON.parse(store['modelhub.state.v1']);
  const checked = stObj.models.filter(m => m.enabled && m.checkedAt > 0).length;
  ok(checked === 8, 'cron 检查了 8 个(含4 Agnes)', { checked });
  ok(stObj.logs.some(l => l.m.indexOf('[cron]') === 0), '写入 cron 日志');

  console.log('\n【13】Token 用量');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.usage = { days: {}, models: {}, total: { p: 0, c: 0, t: 0, n: 0 } };
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  // 直接调 core 记账（rewrite 架构下 token 由上游响应决定，这里验证记账函数与统计口径）
  await installQX(mkReq('/mh/api/state'), { file: F });
  j = JSON.parse(fs.readFileSync(STATE, 'utf8'))['modelhub.state.v1'];
  ok(!!JSON.parse(j).usage, 'usage 字段存在');
  r = await installQX(mkReq('/mh/api/usage.reset', 'POST', {}), { file: F });
  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  ok(j && j.usage.today.t === 0 && j.usage.byDay.length === 14, '统计结构完整（14 天序列）', j && j.usage && j.usage.byDay.length);

  console.log('\n【14】面板');
  r = await installQX(mkReq('/mh/'), { file: F });
  ok(r.status && r.status.indexOf('200') > 0 && r.body.indexOf('ModelHub') > 0, 'GET /mh/ 出面板', r.status);
  r = await installQX(mkReq('/mh'), { file: F });
  ok(r.body && r.body.indexOf('ModelHub') > 0, 'GET /mh 也出面板');
  r = await installQX(mkReq('/mh/api/ping'), { file: F });
  j = jparse(r);
  ok(j && j.pong === 1 && /^1\.2\./.test(j.v), '诊断端点 /api/ping', j);

  console.log('\n【15】面板实际路径：GET + query 参数');
  store = {}; persist();
  r = await installQX(mkReq('/mh/api/provider.add?name=GetA&base=' + encodeURIComponent('http://127.0.0.1:8811/v1') + '&key=sk-get&type=openai'), { file: F });
  j = jparse(r);
  ok(j && j.ok && j.pid, 'GET 添加提供商立即返回', j);
  ok(j && !j.discovered, '同一请求里不再拉模型（避免超时）', j && j.discovered);
  const pidGet = j.pid;

  r = await installQX(mkReq('/mh/api/provider.sync?id=' + pidGet), { file: F });
  j = jparse(r);
  ok(j && j.ok && j.discovered.length === 3, 'GET 拉模型', j && j.discovered);

  r = await installQX(mkReq('/mh/api/model.add?pid=' + pidGet + '&names=' + encodeURIComponent('alpha|beta|gamma-dead')), { file: F });
  j = jparse(r);
  ok(j && j.added === 3, 'GET 批量添加（| 分隔）', j);

  r = await installQX(mkReq('/mh/api/model.patch?id=' + encodeURIComponent(pidGet + '::beta') + '&enabled=false'), { file: F });
  j = jparse(r);
  ok(j && j.ok, 'GET 关闭单个模型', j);

  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  ok(j && j.providers.length === 2 && j.models.length === 7, 'GET 状态读回(含Agnes)', j && { p: j.providers.length, m: j.models.length });
  const betaM = (j.models || []).find(m => m.name === 'beta');
  ok(betaM && betaM.enabled === false, '字符串 "false" 解析成布尔', betaM && betaM.enabled);

  r = await installQX(mkReq('/mh/api/cfg.set?strategy=priority&checkMin=15&overrideModel=false'), { file: F });
  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  ok(j && j.cfg.strategy === 'priority', 'GET 保存策略', j && j.cfg.strategy);
  ok(j && j.cfg.checkMin === 15, '数字参数解析', j && j.cfg.checkMin);
  ok(j && j.cfg.overrideModel === false, '布尔参数解析', j && j.cfg.overrideModel);

  console.log('\n【16】诊断端点 diag');
  r = await installQX(mkReq('/mh/api/diag'), { file: F });
  j = jparse(r);
  ok(j && j.has && j.has.prefs === true, 'diag: $prefs 可用', j && j.has);
  ok(j && j.prefsTest && j.prefsTest.write && j.prefsTest.readBack, 'diag: 写入并回读成功', j && j.prefsTest);
  ok(j && j.req && j.req.path === '/mh/api/diag', 'diag: 请求路径正确', j && j.req);
  console.log('    diag 摘要: ' + JSON.stringify({ has: j && j.has, prefsTest: j && j.prefsTest, bodyType: j && j.req && j.req.bodyType, store: j && j.store }));

  console.log('\n【18】用量：每日/每周/每天 + usage 端点 + 日报脚本');
  {
    // 造一份带已知用量的 state
    function dk(offset) {
      var d = new Date(Date.now() - offset * 86400000);
      return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
    }
    const stx = { v:1, t:0, providers:[], models:[], cfg:{strategy:'latency',staleMin:5,checkMin:10,gwToken:'',timeoutMs:60000,overrideModel:true,slidingCheck:false,checkMode:'ping'},
      usage:{ days:{}, models:{}, total:{p:0,c:0,t:0,n:0} }, logs:[] };
    stx.usage.days[dk(0)] = {p:30,c:273,t:303,n:2};
    stx.usage.days[dk(1)] = {p:90,c:11,t:101,n:1};
    stx.usage.days[dk(2)] = {p:900,c:101,t:1001,n:5};
    stx.usage.days[dk(4)] = {p:3604,c:400,t:4004,n:9};
    stx.usage.total = {p:4624,c:515,t:5409,n:17};
    store['modelhub.state.v1'] = JSON.stringify(stx); persist();

    r = await installQX(mkReq('/mh/api/usage'), { file: F });
    j = jparse(r);
    ok(j && j.ok && j.u && j.u.today.t === 303, '每日(今日)=303', j && j.u && j.u.today);
    ok(j.u.yesterday.t === 101, '昨日=101', j.u.yesterday);
    ok(j.u.week.t === 5409, '近7天=5409', j.u.week);
    ok(j.u.weekISO.t >= 303, '本周(周一)包含今日', j.u.weekISO);
    ok(j.u.byDay.length === 14, '每天明细 14 行', j.u.byDay.length);
    ok(j.copy.indexOf('5409') >= 0 && j.copy.indexOf('303') >= 0, '可复制报告含数字', j.copy && j.copy.slice(0, 80));

    // 日报任务脚本（modelhub-usage.js）冒烟：用全局 mock（贴合 QX 运行时）
    let notified = null;
    global.$prefs = { valueForKey: k => store[k] || null, setValueForKey: (v,k) => { store[k]=v; return true; } };
    global.$notify = (t1,t2,b) => { notified = [t1,t2,b]; };
    global.$done = () => {};
    (0,eval)(fs.readFileSync(ROOT + '/out/modelhub-usage.js', 'utf8'));
    ok(notified && /用量/.test(notified[0]), '通知标题含"用量"', notified && notified[0]);
    ok(notified && /今日: 303/.test(notified[2]), '报告含今日数字', notified && notified[2].slice(0,80));
    ok(notified && /5409/.test(notified[2]), '报告含近7天数字', notified && notified[2].slice(0,80));
    ok(notified && /每5小时/.test(notified[2]), '报告含5小时窗口', notified && notified[2].slice(0,80));
    delete global.$prefs; delete global.$notify; delete global.$done;
  }


  console.log('\n【19】永不中断重试引擎：上游失败自动重试 + 自动换模型 + 永不返回错误码');
  {
    // 造一个「先失败 2 次再成功」的上游
    const FLAKY_PORT = 8821;
    let failLeft = 2, hitCount = 0;
    const upF = await new Promise(res => {
      const srv = http.createServer((req, rsp) => {
        let cs = []; req.on('data', c => cs.push(c));
        req.on('end', () => {
          hitCount++;
          if (failLeft > 0) { failLeft--; rsp.writeHead(503, { 'Content-Type': 'application/json' }); return rsp.end('{"error":{"message":"overloaded"}}'); }
          let j = {}; try { j = JSON.parse(Buffer.concat(cs).toString('utf8')); } catch (e) { }
          rsp.writeHead(200, { 'Content-Type': 'application/json' });
          rsp.end(JSON.stringify({ id: 'c-flaky', object: 'chat.completion', model: j.model,
            choices: [{ index: 0, message: { role: 'assistant', content: 'flaky ok after ' + hitCount }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } }));
        });
      });
      srv.listen(FLAKY_PORT, '127.0.0.1', () => res(srv));
    });

    store = {}; persist();
    // provider F（openai）+ 模型 flaky
    r = await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'F', base: 'http://127.0.0.1:' + FLAKY_PORT + '/v1', key: 'sk-f', type: 'openai' }), { file: F });
    j = jparse(r);
    const pidF = j && j.pid;
    ok(pidF, '新增 provider F', pidF);
    await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidF, names: ['flaky'] }), { file: F });
    // 关掉自动重试的等待时间（测试用短退避）
    await installQX(mkReq('/mh/api/cfg.set', 'POST', { retryBaseMs: 300, retryMaxMin: 1 }), { file: F });
    // 只留 flaky 一个模型
    let stf = JSON.parse(store['modelhub.state.v1']);
    stf.models.forEach(m => { m.enabled = (m.name === 'flaky'); m.ok = true; m.cooldown = 0; m.checkedAt = Date.now(); });
    store['modelhub.state.v1'] = JSON.stringify(stf); persist();

    r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'flaky', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
    let fb = null; try { fb = JSON.parse(r.body); } catch (e) { }
    ok(r.status && r.status.indexOf('200') > 0, '重试后仍 200（不返回错误码）', r.status);
    ok(fb && /flaky ok after 3/.test(JSON.stringify(fb)), '失败 2 次后自动重试成功', fb && fb.choices && fb.choices[0].message.content);
    ok(hitCount >= 3, '确实重试了（上游被打了 ' + hitCount + ' 次）', hitCount);

    // 调用流水：记录了重试次数
    r = await installQX(mkReq('/mh/api/usage'), { file: F });
    j = jparse(r);
    const rc = j.calls || [];
    ok(rc.length >= 1, '调用流水有记录', rc.length);
    ok(rc.length >= 1 && rc[rc.length - 1].r >= 2, '流水记录重试次数 r=' + (rc.length ? rc[rc.length - 1].r : '-'), rc.length ? rc[rc.length - 1] : null);
    ok(rc.length >= 1 && rc[rc.length - 1].tok === 7, '流水记录 token 数', rc.length ? rc[rc.length - 1] : null);

    // 全部模型永久失败 → 友好 200（不是 5xx）
    failLeft = 9999;
    let stf2 = JSON.parse(store['modelhub.state.v1']);
    stf2.cfg.retryMaxMin = 0.02;   // ~1.2s 上限
    stf2.cfg.retryBaseMs = 300;
    stf2.models.forEach(m => { m.enabled = (m.name === 'flaky'); m.ok = true; m.cooldown = 0; });
    store['modelhub.state.v1'] = JSON.stringify(stf2); persist();
    r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'flaky', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
    let gb = null; try { gb = JSON.parse(r.body); } catch (e) { }
    ok(r.status && r.status.indexOf('200') > 0, '持续失败也返回 200（绝不 5xx）', r.status);
    ok(gb && gb.x_modelhub && gb.x_modelhub.mapped === 'retry_exhausted', '友好提示 retry_exhausted', gb && gb.x_modelhub);
    ok(gb && gb.choices && /自动重试/.test(gb.choices[0].message.content), '提示文案含"自动重试"', gb && gb.choices && gb.choices[0].message.content);

    upF.close();
  }

  console.log('\n【20】用量永久保留：5小时桶 / 月汇总 / 调用流水 / 不裁剪');
  {
    store = {}; persist();
    function dk2(offset) {
      var d = new Date(Date.now() - offset * 86400000);
      return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
    }
    const stp = { v:1, t:0, providers:[], models:[], cfg:{strategy:'latency',staleMin:5,checkMin:10,gwToken:'',timeoutMs:60000,overrideModel:true,slidingCheck:false,checkMode:'ping',autoRetry:true,retryMaxMin:10,retryBaseMs:1500},
      usage:{ days:{}, models:{}, total:{p:0,c:0,t:0,n:0}, months:{}, h5:{}, calls:[] }, logs:[] };
    // 200 天历史（验证不裁剪）
    for (var q = 0; q < 200; q++) stp.usage.days[dk2(q)] = { p:1, c:2, t:3, n:1 };
    stp.usage.months[dk2(0).slice(0,7)] = { p:10, c:20, t:30, n:5 };
    stp.usage.h5[Math.floor(Date.now()/18000000)] = { p:1, c:1, t:2, n:1 };
    stp.usage.total = { p:10, c:20, t:30, n:5 };
    stp.usage.calls = [{ t: Date.now()-1000, m:'m1', tok:11, ms:120, r:0, ok:1 }];
    store['modelhub.state.v1'] = JSON.stringify(stp); persist();

    r = await installQX(mkReq('/mh/api/usage'), { file: F });
    j = jparse(r);
    ok(j && j.u && j.u.activeDays >= 200, '活跃天数 >= 200（历史不裁剪）', j && j.u && j.u.activeDays);
    ok(j.u.w5h && j.u.w5h.t === 2, '5 小时窗口统计正确', j.u.w5h);
    ok(Array.isArray(j.u.by5h) && j.u.by5h.length === 24, '5 小时桶 24 段', j.u.by5h && j.u.by5h.length);
    ok(j.u.monthCal && j.u.monthCal.t === 30, '本月汇总正确', j.u.monthCal);
    ok(Array.isArray(j.u.grid) && j.u.grid.length === 105, '热力网格 105 天', j.u.grid && j.u.grid.length);
    ok(Array.isArray(j.calls) && j.calls.length === 1 && j.calls[0].tok === 11, '调用流水返回', j.calls);
    ok(j.copy.indexOf('每5小时') >= 0 && j.copy.indexOf('总共') >= 0 && j.copy.indexOf('本月') >= 0, '报告含全部窗口', j.copy && j.copy.slice(0,120));

    // 调用一次后：流水新增 + 5h 桶 + 月汇总累加
    await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'A', base: 'http://127.0.0.1:8811/v1', key: 'sk-a', type: 'openai' }), { file: F });
    let stp2 = JSON.parse(store['modelhub.state.v1']);
    const pidA2 = (stp2.providers.find(p => p.name === 'A') || {}).id;
    await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidA2, names: ['alpha'] }), { file: F });
    stp2 = JSON.parse(store['modelhub.state.v1']);
    stp2.models.forEach(m => { m.enabled = (m.name === 'alpha'); m.ok = true; m.cooldown = 0; m.checkedAt = Date.now(); });
    store['modelhub.state.v1'] = JSON.stringify(stp2); persist();
    r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'alpha', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
    ok(r.status && r.status.indexOf('200') > 0, '网关成功应答', r.status);
    r = await installQX(mkReq('/mh/api/usage'), { file: F });
    j = jparse(r);
    ok(j.calls.length === 2, '流水新增一条（共 2 条）', j.calls.length);
    ok(j.calls[j.calls.length-1].ok === 1 && j.calls[j.calls.length-1].tok === 21, '新流水含 token=21', j.calls[j.calls.length-1]);
    ok(j.u.today.t === 24, '今日总量累加（3+21）', j.u.today);
  }

  console.log('\n【17】Agnes 预置种子（load 自动注入，幂等）');
  store = {}; persist();
  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  const agP = (j.providers || []).find(p => p.id === 'p_agnes');
  ok(agP, 'p_agnes 提供商自动注入', agP && { base: agP.base, type: agP.type });
  ok(agP && agP.base === 'https://api.agnes-ai.cn/v1', 'Agnes base 正确(/v1)', agP && agP.base);
  const agM = (j.models || []).filter(m => m.pid === 'p_agnes');
  ok(agM.length === 4, '预置 4 个 chat 模型', agM.map(m => m.name));
  ok(agM.every(m => m.enabled === true), '4 个模型默认启用', null);
  ok((agM.map(m => m.name)).includes('agnes-3.0-flash'), '含 agnes-3.0-flash', null);
  // 幂等：再次 load 不应重复注入
  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  ok((j.providers || []).filter(p => p.id === 'p_agnes').length === 1, '重复 load 不重复注入', null);
  ok((j.models || []).filter(m => m.pid === 'p_agnes').length === 4, '重复 load 模型数不变', null);

  console.log('\n' + '='.repeat(52));
  console.log('通过 ' + pass + ' / 失败 ' + failed);
  console.log('='.repeat(52));
  upA.close(); upB.close(); upG.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
