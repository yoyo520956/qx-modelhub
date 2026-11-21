#!/usr/bin/env python3
# 构建 ModelHub 的三个 QX 脚本
import json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'out')
os.makedirs(OUT, exist_ok=True)

def rd(n):
    with open(os.path.join(SRC, n), encoding='utf-8') as f:
        return f.read()

core = rd('core.js')
ui = rd('ui.html')
panel = rd('panel.js')
gw = rd('gateway.js')
cron = rd('cron.js')

VER = '1.1.0'
BANNER = """/*!
 * ModelHub — Quantumult X 本地模型路由
 * 生成时间: %s
 * 本文件由 build.py 自动生成，请勿直接编辑；改 src/ 后重新构建。
 */
"""

import datetime
ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

# ---------- 1. 面板 ----------
panel_out = BANNER % ts + \
    "// ===== 面板 UI（内联 HTML）=====\n" \
    "var MH_VER_ = " + json.dumps(VER) + ";\n" \
    "var MH_HTML_ = " + json.dumps(ui, ensure_ascii=False) + ";\n\n" \
    "// ===== 逻辑 =====\n" + core + "\n\n" + panel + "\n\nMH_PANEL();\n"

# ---------- 2. 网关 ----------
gw_out = BANNER % ts + "// ===== 逻辑 =====\n" + core + "\n\n" + gw + "\n\nMH_GW();\n"

# ---------- 3. 定时任务 ----------
cron_out = BANNER % ts + "// ===== 逻辑 =====\n" + core + "\n\n" + cron + "\n\nMH_CRON();\n"

def w(name, s):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)
    print('%-22s %7d bytes' % (name, len(s.encode('utf-8'))))

w('modelhub-panel.js', panel_out)
w('modelhub-gw.js', gw_out)
w('modelhub-cron.js', cron_out)

dispatch = '''
// ===== 分发：面板 / 网关 / 定时任务共用一个文件 =====
(function () {
  var hasReq = (typeof $request !== 'undefined') && $request && $request.path;
  if (!hasReq) { return MH_CRON(); }
  var p = String($request.path || '');
  if (/^\\/mh\\/v1(\\/|$)/.test(p) || /^\\/v1(\\/|$)/.test(p)) return MH_GW();
  return MH_PANEL();
})();
'''
all_out = BANNER % ts + \
    "// ===== 面板 UI（内联 HTML）=====\n" \
    "var MH_VER_ = " + json.dumps(VER) + ";\n" \
    "var MH_HTML_ = " + json.dumps(ui, ensure_ascii=False) + ";\n\n" \
    "// ===== 公共逻辑 =====\n" + core + "\n\n" \
    "// ===== 面板 =====\n" + panel + "\n\n" \
    "// ===== 网关 =====\n" + gw + "\n\n" \
    "// ===== 探活 =====\n" + cron + dispatch
w('modelhub.js', all_out)
print('OK')
