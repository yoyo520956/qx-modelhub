# ModelHub · Quantumult X 本地 LLM 模型路由

把 **Quantumult X 变成一个本地 LLM 路由**。手机上开一个网页，填 API Key，自动拉模型列表，点选加入池子；之后任意 OpenAI 兼容客户端只连一个地址，路由自动挑当前最快、还活着的通道，换 Base URL、换 Key 全在本地完成。

不需要服务器、不需要 Docker、不需要电脑。**没有一行代码跑在云端。**

> **v1.2.0 换了架构**：不再依赖 `http_backend`（实测在部分设备上 9999 端口起不来），改为纯 `rewrite` 实现——面板用 `script-echo-response` 本地应答，路由用 `script-request-header` 改写 upstream。副作用是好的：**流式是真的了**，QX 按改写后的地址原生转发，不是攒完再吐。

---

## 它和 one-api / new-api / LiteLLM 有什么不同

那几个都是「部署一台服务器」的方案：Docker + 数据库 + 管理后台，适合给一个团队或一堆人用。

ModelHub 是把同样的核心能力塞进 **QX 的 `[http_backend]`**——那是 QX 在 iPhone 本机起的 HTTP 服务器（默认 `127.0.0.1:9999`）。所以：

| | one-api / LiteLLM | ModelHub |
|---|---|---|
| 运行位置 | VPS / NAS / 容器 | iPhone 本机，QX 内 |
| 部署 | Docker + 数据库 | 粘 3 行配置 |
| 数据存放 | 服务端数据库 | 本机 `$prefs` |
| 断网 | 内网可用 | 设备离线不可用 |
| 多用户/额度计费 | 有 | **没有**（单机自用） |
| 真实流式 | 有 | **受限**（见下） |
| 上手成本 | 高 | 打开网页就能用 |

---

## 装

### 1. 三段配置

```ini
[rewrite_local]
^https?://example\.com/mh url script-echo-response https://raw.githubusercontent.com/yoyo520956/qx-modelhub/main/modelhub.js
^https?://example\.com/v1/models url script-echo-response https://raw.githubusercontent.com/yoyo520956/qx-modelhub/main/modelhub.js
^https?://example\.com/v1/ url script-request-header https://raw.githubusercontent.com/yoyo520956/qx-modelhub/main/modelhub.js

[task_local]
*/10 * * * * https://raw.githubusercontent.com/yoyo520956/qx-modelhub/main/modelhub.js, tag=ModelHub-Cron, enabled=true

[mitm]
hostname = example.com
```

`example.com` 是 IANA 保留的文档域名，全球有 A 记录。QX 在 MITM 阶段就把它拦下来本地应答，请求不会真的发出去——所以不用改 DNS、不用开端口。

想换入口域名：三条 rewrite 和 mitm hostname 一起改。

### 2. 证书

`[mitm]` 里加了 `example.com`，QX 需要解密这条连接。去广告用过 MITM 的话根证书已经在信任链里了；如果 Safari 打开面板报证书错误，去 QX「设置 → MitM」重新生成并安装一次根证书，然后在系统「设置 → 通用 → 关于本机 → 证书信任设置」里信任。

### 3. 最稳：脚本放本地

把 `modelhub.js` 放进「iCloud Drive → Quantumult X → Scripts」，三条 rewrite 和 task 里的 URL 换成裸文件名 `modelhub.js`。不联网、不依赖 CDN、不受 QX 资源缓存影响。

---

## 用

**添加模型**：`提供商` 页 → 点一个预设（OpenAI / DeepSeek / Kimi / 智谱 / 通义 / 硅基流动 / OpenRouter / Groq / Gemini / Anthropic）→ 填 Key → `保存并拉取模型`。会自动请求 `{Base}/models`，把返回的模型列出来让你勾选。

**Base URL 要填到版本号为止**：`https://api.deepseek.com/v1`，不要只填域名。

**让路由知道谁活着**：`模型` 页开关控制参与路由的模型；点顶部 `检测` 或等定时任务跑一轮，每个模型会得到延迟和成败。

**接到客户端**：任意 OpenAI 兼容客户端（ChatBox / OpenCat / NextChat / LobeChat / Chatwise / 自写脚本）填：

```
Base URL: http://127.0.0.1:9999/v1
API Key : 面板「路由」页里那个网关 Key
模型    : 面板里添加过的任意名字（或者随便填，见下）
```

`GET /v1/models` 会返回池子里所有已启用模型，所以客户端的下拉列表能直接选。

---

## 路由怎么工作

1. 面板把所有已启用模型汇总成一个虚拟池。
2. 请求进来 → 从 `$prefs` 读缓存 → 按策略排序 → 取第一个 → 换成那家的 `Base URL` 和 `Key` 发出去。
3. 排序发生在**纯内存**，不发起任何网络请求，所以选模型这一步是微秒级。
4. 选中的模型失败 → 记一次失败并进冷却（30s 起，指数退避，最长 30 分钟）→ 下次自动跳过。
5. 定时任务每 N 分钟探活一次，刷新延迟和成败，这就是「自动轮询」的数据来源。

### 策略

| 策略 | 行为 |
|---|---|
| `最快可用`（默认） | 健康的模型里延迟最低 |
| `优先级` | 自定义 `p` 值大的优先，相同再比延迟 |
| `权重随机` | 按 `w` 权重随机分摊 |
| `轮询` | 依次循环 |

### 覆盖 model

默认开启。客户端里写 `gpt-4o`、写 `随便什么`、甚至写空，都会被换成路由选中的真实模型名发给上游；响应里再把 `model` 字段还原成客户端请求的名字，客户端不会察觉到被换了。

关掉这个开关，就是「客户端请求什么模型就用什么模型」，只在请求的名字命中池子里某个模型时才路由。

---

## 支持的协议

| 上游类型 | 模型发现 | 对话 | 认证头 |
|---|---|---|---|
| OpenAI 兼容 | `GET {base}/models` | `POST {base}/chat/completions` | `Authorization: Bearer` |
| Anthropic | `GET {base}/models` | `POST {base}/messages` | `x-api-key` |
| Gemini | `GET {base}/models?key=` | `POST {base}/models/{m}:generateContent` | `x-goog-api-key` |

后两种会在本地做双向格式转换：客户端永远只看到 OpenAI 格式，上游收到的是自己的原生格式。

---

## 已知限制（重要，别踩）

1. **流式只在 OpenAI 兼容通道上有。**
   路由走 `script-request-header` 改写地址，QX 原生转发，所以 `stream: true` 是真的逐字返回。
   但 Anthropic / Gemini 的响应格式不是 OpenAI 格式，`request-header` 阶段没地方做转换，所以这两类通道不参与路由，也不会出现在客户端的 `/v1/models` 里（面板里照样能管理、探活）。

2. **上游必须是非流式。**
   网关永远用 `stream:false` 请求上游，避免上游长连接挂住导致超时。

3. **长回复可能撞脚本超时。**
   QX 脚本引擎和 `$task.fetch` 都有默认超时。如果你的回复经常超过 10 秒，在 `[http_backend]` 的资源地址后面加 `#force-timeout=180000`（毫秒）：

   ```
   https://raw.githubusercontent.com/.../modelhub-gw.js#force-timeout=180000, tag=ModelHub网关, path=^/v1/, enabled=true
   ```

4. **NE 内存限制。**
   官方文档明确说 Network Extension 有内存上限，`http_backend` 脚本要尽量小。面板脚本里内联了整个 UI（约 64KB），实测可用；但别往里塞图片之类的大东西。

5. **网关能监听局域网。**
   QX 的 HTTP 服务不止 127.0.0.1 可达。**一定要在「路由」页生成一个网关 Key**，否则同一 WiFi 下任何人扫到 9999 端口都能白嫖你的 API 额度。

6. **单机自用，没有多用户、没有额度、没有计费。** 需要这些请上 new-api。

---

## 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| 面板打不开 | 脚本没加载 / 端口不对 | 先打 `/mh/api/ping`，按上面「30 秒自检」走 |
| 面板能开但一直 0 个模型 | Cron 没跑 / 没点检测 | 点顶部「检测」，或检查 `[task_local]` |
| 拉模型报 401 | Key 错 / 账号没权限 | 用 `provider` 的「拉取」重试，看面板上的错误文案 |
| 拉模型报 404 | Base URL 少了版本段 | 改成 `.../v1` 这种形式 |
| 客户端连不上 | 客户端不允许明文 HTTP | 换用支持自定义 http 的客户端；或者试 `http://quantumult-x:9999/v1` |
| 回复很慢才出来 | 没有真流式（见限制 1） | 无解，或改用直连客户端 |
| 所有模型都失败 | Key 全过期 / QX 被墙 | 看 `日志` 页的具体报错 |

---

## 开发

```
src/
  core.js      状态、探测、路由算法、Token 统计（三端共用）
  panel.js     面板 API 处理器
  gateway.js   OpenAI 兼容网关
  cron.js      定时探活
  ui.html      面板前端（单独写，构建时内联）
build.py       生成 out/modelhub.js（合并单文件）+ 三个分体版
test/run.js    Node 端到端沙盒（模拟 QX 环境 + 假上游）
```

```bash
python3 build.py      # 构建
node test/run.js      # 44 项断言，覆盖面板/网关/协议转换/冷却
```

改前端时的预览技巧：Safari 打开 `src/ui.html?mock=1`，用的是内置假数据，不需要 QX。

---

## 许可

MIT
