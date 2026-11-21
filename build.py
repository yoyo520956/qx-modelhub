#!/usr/bin/env python3
# 构建 ModelHub 脚本
import json, os, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'out')
os.makedirs(OUT, exist_ok=True)

VER = '1.2.0'

def rd(n):
    with open(os.path.join(SRC, n), encoding='utf-8') as f:
        return f.read()

core = rd('core.js')
ui = rd('ui.html')
panel = rd('panel.js')
gw = rd('gateway.js')
cron = rd('cron.js')
router = rd('router.js')

ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

BANNER = """/*!
 * ModelHub v%s — Quantumult X 本地模型路由（rewrite 架构，不需要本地服务器）
 * 生成时间: %s
 * 本文件由 build.py 自动生成，请勿直接编辑；改 src/ 后重新构建。
 */
""" % (VER, ts)

PRELUDE = (
    "// ===== 版本 =====\n"
    "var MH_VER_ = " + json.dumps(VER) + ";\n"
    "// ===== 面板 UI（内联 HTML）=====\n"
    "var MH_HTML_ = " + json.dumps(ui, ensure_ascii=False) + ";\n\n"
    "// ===== 公共逻辑 =====\n" + core + "\n\n"
)

DISPATCH = r"""
// ===== 分发：面板 / 模型清单 / 路由 / 定时任务共用一个文件 =====
(function () {
  var u = String((typeof $request !== 'undefined' && $request && $request.url) || '');
  if (!u) { return MH_CRON(); }
  var se = u.indexOf('://');
  var sl = se >= 0 ? u.indexOf('/', se + 3) : -1;
  var p = sl >= 0 ? u.slice(sl) : '/';
  var qi = p.indexOf('?'); if (qi >= 0) p = p.slice(0, qi);
  if (p === '/v1/models' || p === '/v1/models/') return MH_MODELS();
  if (/^\/mh(\/|$)/.test(p)) return MH_PANEL();
  return MH_ROUTER();
})();
"""

combined = (
    BANNER + PRELUDE +
    "// ===== 面板 =====\n" + panel + "\n\n"
    "// ===== 网关（http_backend 旧路径，保留兼容）=====\n" + gw + "\n\n"
    "// ===== 路由层（rewrite）=====\n" + router + "\n\n"
    "// ===== 探活 =====\n" + cron + DISPATCH
)

panel_only = BANNER + PRELUDE + "// ===== 面板 =====\n" + panel + "\n\nMH_PANEL();\n"
gw_only = BANNER + "var MH_VER_ = " + json.dumps(VER) + ";\n" + "// ===== 公共逻辑 =====\n" + core + "\n\n// ===== 网关 =====\n" + gw + "\n\nMH_GW();\n"
cron_only = BANNER + "var MH_VER_ = " + json.dumps(VER) + ";\n" + "// ===== 公共逻辑 =====\n" + core + "\n\n// ===== 探活 =====\n" + cron + "\n\nMH_CRON();\n"

def w(name, s):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)
    print('%-22s %7d bytes' % (name, len(s.encode('utf-8'))))

w('modelhub.js', combined)
w('modelhub-panel.js', panel_only)
w('modelhub-gw.js', gw_only)
w('modelhub-cron.js', cron_only)
print('OK  v' + VER)
