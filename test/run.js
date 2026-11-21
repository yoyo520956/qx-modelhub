#!/usr/bin/env node
/* 模拟 Quantumult X 脚本环境，端到端验证 ModelHub 三个脚本 */
const http = require('http');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const OUT = path.join(__dirname, '..', 'out');
const STATE = path.join(__dirname, 'state.json');

/* ---------------- 假上游 ---------------- */
let upstreamCalls = [];
function startUpstream(port, kind) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const u = new URL(req.url, 'http://x');
        upstreamCalls.push({ kind, path: u.pathname, method: req.method, body, headers: req.headers });

        if (kind === 'openai') {
          if (u.pathname.endsWith('/models')) {
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({ object: 'list', data: [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma-dead' }] }));
          }
          if (u.pathname.endsWith('/chat/completions')) {
            let j = {};
            try { j = JSON.parse(body); } catch (e) { }
            if (j.model === 'gamma-dead') {
              rsp.writeHead(500, { 'Content-Type': 'application/json' });
              return rsp.end(JSON.stringify({ error: { message: 'model overloaded' } }));
            }
            const txt = '你好，我是 ' + j.model + '。收到 ' + ((j.messages || []).length) + ' 条消息。';
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({
              id: 'chatcmpl-x', object: 'chat.completion', model: j.model,
              choices: [{ index: 0, message: { role: 'assistant', content: txt }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 12, completion_tokens: 9, total_tokens: 21 }
            }));
          }
        }
        if (kind === 'anthropic') {
          if (u.pathname.endsWith('/models')) {
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({ data: [{ id: 'claude-x' }] }));
          }
          rsp.writeHead(200, { 'Content-Type': 'application/json' });
          return rsp.end(JSON.stringify({
            id: 'msg_1', type: 'message', role: 'assistant',
            content: [{ type: 'text', text: '我是 Claude（模拟）' }],
            stop_reason: 'end_turn', usage: { input_tokens: 7, output_tokens: 5 }
          }));
        }
        if (kind === 'gemini') {
          if (u.pathname.endsWith('/models')) {
            rsp.writeHead(200, { 'Content-Type': 'application/json' });
            return rsp.end(JSON.stringify({
              models: [
                { name: 'models/gemini-pro', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }
              ]
            }));
          }
          rsp.writeHead(200, { 'Content-Type': 'application/json' });
          return rsp.end(JSON.stringify({
            candidates: [{ content: { parts: [{ text: '我是 Gemini（模拟）' }] }, finishReason: 'STOP' }],
            usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 6, totalTokenCount: 10 }
          }));
        }
        rsp.writeHead(404); rsp.end('{}');
      });
    });
    srv.listen(port, '127.0.0.1', () => res(srv));
  });
}

/* ---------------- QX 环境 ---------------- */
let store = {};
if (fs.existsSync(STATE)) { try { store = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { } }
function persist() { fs.writeFileSync(STATE, JSON.stringify(store)); }

function installQX(request, opts) {
  opts = opts || {};
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
    global.$request = request;
    global.$notify = (...a) => { if (opts.verbose) console.log('  [notify]', a.join(' | ')); };
    global.$iCloud = undefined;
    global.$done = (r) => {
      if (finished) { console.log('  !! $done called twice'); return; }
      finished = true;
      resolve(r || { status: '(no response)' });
    };
    vm.runInThisContext(fs.readFileSync(opts.file, 'utf8'), { filename: opts.file });
  });
}

function mkReq(p, method, body) {
  const q = p.indexOf('?');
  return {
    url: 'http://127.0.0.1:9999' + p,
    path: p, method: method || 'GET',
    headers: { Authorization: 'Bearer sk-mh-test' },
    body: body ? JSON.stringify(body) : undefined
  };
}

/* ---------------- 断言 ---------------- */
let pass = 0, failed = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { failed++; console.log('  ✗ ' + label + (extra !== undefined ? '  →  ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
function jparse(r) { try { return JSON.parse(r.body); } catch (e) { return null; } }

/* ---------------- 主流程 ---------------- */
(async () => {
  const upA = await startUpstream(8811, 'openai');
  const upB = await startUpstream(8812, 'anthropic');
  const upG = await startUpstream(8813, 'gemini');

  store = {}; persist();
  // 全部用「合并单文件」测试，验证分发器
  const ALL = path.join(OUT, 'modelhub.js');
  const PANEL = ALL, GW = ALL, CRON = ALL;

  console.log('\n【1】面板：添加提供商 + 自动拉模型');
  let r = await installQX(mkReq('/mh/api/provider.add', 'POST', {
    name: 'LocalA', base: 'http://127.0.0.1:8811/v1', key: 'sk-test-a', type: 'openai'
  }), { file: PANEL });
  let j = jparse(r);
  ok(r.status.indexOf('200') > 0, 'HTTP 200', r.status);
  ok(j && j.ok && j.discovered && j.discovered.length === 3, '发现 3 个模型', j);
  const pidA = j && j.pid;

  console.log('\n【2】添加 anthropic / gemini 提供商');
  r = await installQX(mkReq('/mh/api/provider.add', 'POST', {
    name: 'LocalB', base: 'http://127.0.0.1:8812/v1', key: 'sk-ant', type: 'anthropic'
  }), { file: PANEL });
  j = jparse(r); ok(j && j.ok && j.discovered[0] === 'claude-x', 'anthropic 拉模型', j);
  const pidB = j && j.pid;

  r = await installQX(mkReq('/mh/api/provider.add', 'POST', {
    name: 'LocalG', base: 'http://127.0.0.1:8813/v1beta', key: 'g-key', type: 'gemini'
  }), { file: PANEL });
  j = jparse(r);
  ok(j && j.ok && j.discovered.length === 1 && j.discovered[0] === 'gemini-pro', 'gemini 过滤掉 embedding', j && j.discovered);
  const pidG = j && j.pid;

  console.log('\n【3】选中模型加入池');
  r = await installQX(mkReq('/mh/api/model.add', 'POST', {
    pid: pidA, names: ['alpha', 'beta', 'gamma-dead']
  }), { file: PANEL });
  j = jparse(r); ok(j && j.ok && j.added === 3, '添加 3 个 openai 模型', j);
  r = await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidB, names: ['claude-x'] }), { file: PANEL });
  r = await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidG, names: ['gemini-pro'] }), { file: PANEL });

  console.log('\n【4】立即检测（探活）');
  r = await installQX(mkReq('/mh/api/check', 'POST', {}), { file: PANEL });
  j = jparse(r);
  ok(j && j.ok, 'check 返回 ok', j);
  ok(j && j.total === 5, '检测了 5 个模型', j && j.total);
  ok(j && j.healthy === 4, '4 个可用（gamma-dead 失败）', j && { healthy: j.healthy, bad: j.bad });

  console.log('\n【5】状态接口');
  r = await installQX(mkReq('/mh/api/state'), { file: PANEL });
  j = jparse(r);
  ok(j && j.ok && j.models.length === 5, 'models 5 条', j && j.models.length);
  ok(j && j.providers.length === 3, 'providers 3 条', j && j.providers.length);
  ok(j && j.providers.every(p => !p.key && p.keyMask.indexOf('••••') > 0), 'Key 已脱敏', j && j.providers.map(p => p.keyMask));
  ok(j && typeof j.gwBase === 'string' && j.gwBase.indexOf('9999') > 0, '网关地址', j && j.gwBase);

  console.log('\n【6】网关：模型清单（不含已失败/未启用）');
  r = await installQX(mkReq('/mh/v1/models'), { file: GW });
  j = jparse(r);
  ok(j && j.object === 'list' && j.data.length === 5, '5 个模型对外可见', j && j.data && j.data.map(x => x.id));

  console.log('\n【7】网关：鉴权');
  global.$prefs.setValueForKey(JSON.stringify(Object.assign(JSON.parse(store['modelhub.state.v1']), {})), 'modelhub.state.v1');
  let stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.cfg.gwToken = 'sk-mh-secret';
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/mh/v1/models'), { file: GW });
  ok(r.status.indexOf('401') > 0 || r.status.indexOf('403') > 0, '错误 Key 被拒', r.status);
  r = await installQX({ url: 'http://127.0.0.1:9999/v1/models', path: '/mh/v1/models', method: 'GET', headers: { Authorization: 'Bearer sk-mh-secret' } }, { file: GW });
  ok(r.status.indexOf('200') > 0, '正确 Key 通过', r.status);
  // 复位 token，后续用例用无鉴权模式
  stObj = JSON.parse(store['modelhub.state.v1']); stObj.cfg.gwToken = '';
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();

  console.log('\n【8】网关：对话路由（选最快的 alpha）');
  upstreamCalls = [];
  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', {
    model: 'alpha', messages: [{ role: 'user', content: '你好' }]
  }), { file: GW });
  j = jparse(r);
  ok(j && j.choices && j.choices[0].message.content.indexOf('alpha') > 0, '返回 alpha 的回复', j && j.choices && j.choices[0].message.content);
  ok(j && j.usage && j.usage.total_tokens === 21, 'usage 透传', j && j.usage);
  const lastUp = upstreamCalls[upstreamCalls.length - 1];
  ok(lastUp && lastUp.headers.authorization === 'Bearer sk-test-a', '上游收到正确 Key', lastUp && lastUp.headers.authorization);
  const sent = lastUp && JSON.parse(lastUp.body);
  ok(sent && sent.stream === false, '上游请求 stream=false', sent && sent.stream);

  console.log('\n【9】网关：客户端乱填模型名也能用');
  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', {
    model: 'gpt-4o-whatever', messages: [{ role: 'user', content: 'hi' }]
  }), { file: GW });
  j = jparse(r);
  ok(j && j.choices && j.choices[0].message.content.length > 0, '未知模型名照样路由成功', j && j.error);
  ok(j && j.model === 'gpt-4o-whatever', '响应里保留客户端请求的 model 名', j && j.model);

  console.log('\n【10】网关：流式请求合成 SSE');
  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', {
    model: 'alpha', stream: true, messages: [{ role: 'user', content: 'hi' }]
  }), { file: GW });
  const ct = (r.headers || {})['Content-Type'] || (r.headers || {})['content-type'] || '';
  ok(ct.indexOf('event-stream') >= 0, 'Content-Type 是 SSE', ct);
  ok(r.body.indexOf('data: [DONE]') > 0, '有 [DONE] 结尾', r.body.slice(-60));
  const lines = r.body.split('\n\n').filter(x => x.indexOf('data: {') === 0);
  ok(lines.length >= 2, '至少 2 个 chunk', lines.length);
  let joined = '';
  lines.forEach(l => { try { const o = JSON.parse(l.slice(6)); joined += (o.choices[0].delta.content || ''); } catch (e) { } });
  ok(joined.indexOf('alpha') > 0, 'SSE 拼接回完整文本', joined);

  console.log('\n【11】网关：Anthropic 格式转换');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { if (m.name !== 'claude-x') m.enabled = false; });
  stObj.cfg.overrideModel = true;
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  upstreamCalls = [];
  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', {
    model: 'claude-x', messages: [
      { role: 'system', content: '你是助手' },
      { role: 'user', content: '你好' }
    ]
  }), { file: GW });
  j = jparse(r);
  ok(j && j.choices && j.choices[0].message.content.indexOf('Claude') > 0, 'Anthropic → OpenAI 响应转换', j && j.choices && j.choices[0].message.content);
  const upA2 = upstreamCalls[upstreamCalls.length - 1];
  const sentA = upA2 && JSON.parse(upA2.body);
  ok(upA2 && upA2.path.indexOf('/messages') > 0, '打到 /messages', upA2 && upA2.path);
  ok(sentA && sentA.system === '你是助手', 'system 抽成顶层字段', sentA && sentA.system);
  ok(upA2.headers['x-api-key'] === 'sk-ant' && !upA2.headers.authorization, '用 x-api-key 认证', upA2.headers['x-api-key']);
  ok(j && j.usage && j.usage.prompt_tokens === 7, 'input_tokens → prompt_tokens', j && j.usage);

  console.log('\n【12】网关：Gemini 格式转换');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = (m.name === 'gemini-pro'); });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  upstreamCalls = [];
  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', {
    model: 'gemini-pro', messages: [{ role: 'user', content: '你好' }]
  }), { file: GW });
  j = jparse(r);
  ok(j && j.choices && j.choices[0].message.content.indexOf('Gemini') > 0, 'Gemini → OpenAI 响应转换', j && j.choices && j.choices[0].message.content);
  const upG2 = upstreamCalls[upstreamCalls.length - 1];
  ok(upG2 && upG2.path.indexOf(':generateContent') > 0, 'generateContent 路径', upG2 && upG2.path);
  ok(upG2 && upG2.headers['x-goog-api-key'] === 'g-key', 'x-goog-api-key 认证', upG2 && upG2.headers['x-goog-api-key']);
  const sentG = upG2 && JSON.parse(upG2.body);
  ok(sentG && sentG.contents && sentG.contents[0].parts[0].text === '你好', 'contents 结构正确', sentG);

  console.log('\n【13】冷却：连续失败的模型被跳过');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.cfg.strategy = 'latency';
  stObj.models.forEach(m => {
    m.enabled = (m.name === 'gamma-dead' || m.name === 'alpha');
    m.ok = (m.name === 'alpha') ? false : null;
    m.fails = 0; m.cooldown = 0; m.checkedAt = 0;
    m.lat = (m.name === 'alpha') ? 5000 : 0;   // 让 gamma-dead 排第一
  });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();

  let sawFail = false;
  for (let i = 0; i < 3; i++) {
    r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', { model: '', messages: [{ role: 'user', content: 'hi' }] }), { file: GW });
    const jj = jparse(r);
    if (!jj || !jj.choices) sawFail = true;
    if (i === 0) ok(!jj || !jj.choices || jj.error, '第一次打到了坏模型并失败', jj && (jj.error || jj.choices));
  }
  stObj = JSON.parse(store['modelhub.state.v1']);
  const dead = stObj.models.find(m => m.name === 'gamma-dead');
  ok(dead.fails >= 1, 'gamma-dead 记录失败次数', { fails: dead.fails });
  ok(dead.cooldown > Date.now(), '进入冷却期', { cooldown: dead.cooldown - Date.now() });
  ok(sawFail, '过程中确实出现过失败响应');

  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', { model: '', messages: [{ role: 'user', content: 'hi' }] }), { file: GW });
  j = jparse(r);
  ok(j && j.choices && j.choices[0].message.content.indexOf('alpha') > 0, '冷却后改走 alpha', j && j.choices && j.choices[0].message.content);

  console.log('\n【14】Cron 探活');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = true; m.ok = null; m.checkedAt = 0; });
  stObj.models.forEach(m => { if (m.name === 'gamma-dead') m.enabled = false; });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  // 定时任务里 QX 不提供 $request，传 undefined 模拟真实环境
  r = await installQX(undefined, { file: CRON });
  stObj = JSON.parse(store['modelhub.state.v1']);
  const checked = stObj.models.filter(m => m.checkedAt > 0).length;
  ok(checked === 4, 'cron 检查了 4 个启用模型', { checked });
  ok(stObj.logs.some(l => l.m.indexOf('[cron]') === 0), '写入了 cron 日志', stObj.logs.slice(-2));

  console.log('\n【15】路由策略：priority');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.cfg.strategy = 'priority';
  stObj.models.forEach(m => { m.enabled = true; m.ok = true; m.lat = 100; m.p = 0; m.cooldown = 0; });
  stObj.models.find(m => m.name === 'claude-x').p = 10;
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/mh/v1/chat/completions', 'POST', { model: '', messages: [{ role: 'user', content: 'x' }] }), { file: GW });
  j = jparse(r);
  ok(j && j.choices && j.choices[0].message.content.indexOf('Claude') > 0, 'priority 生效选中 claude-x', j && j.choices && j.choices[0].message.content);

  console.log('\n【16】面板 HTML 可访问');
  r = await installQX(mkReq('/mh/'), { file: PANEL });
  ok(r.status.indexOf('200') > 0 && r.body.indexOf('ModelHub') > 0, 'GET /mh/ 返回面板', { status: r.status, len: (r.body || '').length });
  ok(r.body.indexOf('__HTML__') < 0, 'HTML 无占位符残留');

  r = await installQX(mkReq('/mh'), { file: PANEL });
  ok(r.status.indexOf('200') > 0 && r.body.indexOf('ModelHub') > 0, 'GET /mh（无斜杠）也能开', r.status);

  r = await installQX(mkReq('/mh/api/ping'), { file: PANEL });
  j = jparse(r);
  ok(j && j.pong === 1 && j.v, '诊断端点 /api/ping', j);

  r = await installQX(mkReq('/'), { file: PANEL });
  ok(r.status.indexOf('200') > 0 && r.body.indexOf('ModelHub') > 0, '根路径也回面板', r.status);

  console.log('\n【17】Token 用量统计');
  r = await installQX(mkReq('/mh/api/state'), { file: PANEL });
  j = jparse(r);
  ok(j && j.usage && j.usage.today.t > 0, '今日用量已记录', j && j.usage && j.usage.today);
  ok(j && j.usage.byDay.length === 14, '14 天序列', j && j.usage.byDay && j.usage.byDay.length);
  ok(j && j.usage.tops.length > 0, '分模型排行', j && j.usage.tops);
  ok(j && j.usage.week.t >= j.usage.today.t, '近7天 >= 今日');

  const dk = (n) => { const d = new Date(Date.now() - n * 86400000); const m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd); };
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.usage.days[dk(1)] = { p: 100, c: 200, t: 300, n: 3 };
  stObj.usage.days[dk(20)] = { p: 1000, c: 2000, t: 3000, n: 30 };
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/mh/api/state'), { file: PANEL });
  j = jparse(r);
  ok(j && j.usage.week.t >= 300, '近7天含昨天', j && j.usage.week);
  ok(j && j.usage.month.t >= 3300, '近30天含20天前', j && j.usage.month);
  ok(j && j.usage.month.t > j.usage.week.t, '月度 > 周度');

  r = await installQX(mkReq('/mh/api/usage.reset', 'POST', {}), { file: PANEL });
  r = await installQX(mkReq('/mh/api/state'), { file: PANEL });
  j = jparse(r);
  ok(j && j.usage.today.t === 0 && j.usage.total.t === 0, '重置后归零', j && j.usage && j.usage.total);

  console.log('\n' + '='.repeat(52));
  console.log('通过 ' + pass + ' / 失败 ' + failed);
  console.log('='.repeat(52));

  upA.close(); upB.close(); upG.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
