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
    "// ===== 逻辑 =====\n" + core + "\n\n" + panel

# ---------- 2. 网关 ----------
gw_out = BANNER % ts + "// ===== 逻辑 =====\n" + core + "\n\n" + gw

# ---------- 3. 定时任务 ----------
cron_out = BANNER % ts + "// ===== 逻辑 =====\n" + core + "\n\n" + cron

def w(name, s):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)
    print('%-22s %7d bytes' % (name, len(s.encode('utf-8'))))

w('modelhub.js', panel_out)
w('modelhub-gw.js', gw_out)
w('modelhub-cron.js', cron_out)
print('OK')
