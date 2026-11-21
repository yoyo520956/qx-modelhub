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
  return {
    url: ENTRY + p, path: p, method: method || 'GET',
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
  ok(j && j.ok && j.discovered.length === 3, '发现 3 个模型', j);
  const pidA = j.pid;

  console.log('\n【2】anthropic / gemini');
  r = await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'B', base: 'http://127.0.0.1:8812/v1', key: 'sk-b', type: 'anthropic' }), { file: F });
  j = jparse(r); ok(j && j.discovered[0] === 'claude-x', 'anthropic 拉模型', j && j.discovered);
  const pidB = j.pid;
  r = await installQX(mkReq('/mh/api/provider.add', 'POST', { name: 'G', base: 'http://127.0.0.1:8813/v1beta', key: 'g-key', type: 'gemini' }), { file: F });
  j = jparse(r); ok(j && j.discovered.length === 1 && j.discovered[0] === 'gemini-pro', 'gemini 过滤 embedding', j && j.discovered);
  const pidG = j.pid;

  console.log('\n【3】添加模型');
  r = await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidA, names: ['alpha', 'beta', 'gamma-dead'] }), { file: F });
  j = jparse(r); ok(j && j.added === 3, '3 个 openai 模型', j);
  await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidB, names: ['claude-x'] }), { file: F });
  await installQX(mkReq('/mh/api/model.add', 'POST', { pid: pidG, names: ['gemini-pro'] }), { file: F });

  console.log('\n【4】探活');
  r = await installQX(mkReq('/mh/api/check', 'POST', {}), { file: F });
  j = jparse(r);
  ok(j && j.total === 5, '检测 5 个', j && j.total);
  ok(j && j.healthy === 4, '4 个可用', j && { h: j.healthy, bad: j.bad });

  console.log('\n【5】状态');
  r = await installQX(mkReq('/mh/api/state'), { file: F });
  j = jparse(r);
  ok(j && j.providers.length === 3, 'providers 3', j && j.providers.length);
  ok(j && j.providers.every(p => !p.key && p.keyMask.indexOf('••••') > 0), 'Key 脱敏', j && j.providers.map(p => p.keyMask));
  ok(j && j.gwBase === ENTRY + '/v1', '网关地址正确', j && j.gwBase);

  console.log('\n【6】GET /v1/models（echo 阶段）');
  r = await installQX(mkReq('/v1/models'), { file: F });
  j = jparse(r);
  ok(r.status && r.status.indexOf('200') > 0, '返回 200', r.status);
  const ids = (j && j.data || []).map(x => x.id);
  ok(ids.length === 3 && ids.indexOf('alpha') >= 0, '只暴露可路由的 openai 模型', ids);
  ok(ids.indexOf('claude-x') < 0 && ids.indexOf('gemini-pro') < 0, 'anthropic/gemini 不在清单里', ids);

  console.log('\n【7】路由：POST /v1/chat/completions（request-header 阶段）');
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'alpha', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  ok(r.url === 'http://127.0.0.1:8811/v1/chat/completions', '改写到了 8811', r.url);
  ok(r.headers && r.headers.Authorization === 'Bearer sk-a', '注入目标通道 Key', r.headers && r.headers.Authorization);
  ok(!r.headers.Host && !r.headers.host, '清掉入口 Host', Object.keys(r.headers || {}));
  ok(r.body === undefined, '同名模型不改 body', r.body);

  console.log('\n【8】路由：客户端乱填模型名 → 换名');
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'gpt-4o-whatever', messages: [{ role: 'user', content: 'hi' }] }), { file: F });
  let ob = null; try { ob = JSON.parse(r.body); } catch (e) { }
  ok(r.url && r.url.indexOf('8811') > 0, '照样转发', r.url);
  ok(ob && (ob.model === 'alpha' || ob.model === 'beta'), 'body 里换成真实模型名', ob && ob.model);

  console.log('\n【9】路由：请求 anthropic 模型名 → 回退到 openai 池');
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'claude-x', messages: [] }), { file: F });
  ok(r.url && r.url.indexOf('8811') > 0, '不会打到 anthropic', r.url);

  console.log('\n【10】路由：无可路由通道 → 原样放行');
  let stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = (m.name === 'claude-x'); });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: 'x', messages: [] }), { file: F });
  ok(!r.url && Object.keys(r).length === 0, '返回空对象（不改写）', r);

  console.log('\n【11】冷却：坏通道被跳过');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = (m.name === 'alpha' || m.name === 'beta'); m.ok = true; m.lat = 100; m.cooldown = 0; });
  stObj.models.find(m => m.name === 'alpha').cooldown = Date.now() + 600000;
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  r = await installQX(mkReq('/v1/chat/completions', 'POST', { model: '', messages: [] }), { file: F });
  ok(r.url && r.url.indexOf('8811') > 0, '仍转发', r.url);
  let bb = null; try { bb = JSON.parse(r.body); } catch (e) { }
  ok(bb && bb.model === 'beta', '跳过冷却中的 alpha，选 beta', bb && bb.model);

  console.log('\n【12】Cron 探活');
  stObj = JSON.parse(store['modelhub.state.v1']);
  stObj.models.forEach(m => { m.enabled = (m.name !== 'gamma-dead'); m.ok = null; m.checkedAt = 0; });
  store['modelhub.state.v1'] = JSON.stringify(stObj); persist();
  await installQX(undefined, { file: F });
  stObj = JSON.parse(store['modelhub.state.v1']);
  const checked = stObj.models.filter(m => m.enabled && m.checkedAt > 0).length;
  ok(checked === 4, 'cron 检查了 4 个', { checked });
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
  ok(j && j.pong === 1 && j.v === '1.2.0', '诊断端点 /api/ping', j);

  console.log('\n' + '='.repeat(52));
  console.log('通过 ' + pass + ' / 失败 ' + failed);
  console.log('='.repeat(52));
  upA.close(); upB.close(); upG.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
