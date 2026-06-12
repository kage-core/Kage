🌐 [English](../README.md) · 简体中文 · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### 为编码代理提供经过验证的仓库知识

每一条结论都以你当前的代码为引用依据 —— 而且你能清楚看到它为你节省了什么。
Kage 会拒绝引用不存在文件的记忆，扣留证据已被删除的记忆，并在你的改动
让团队既有认知失效的那一刻向你发出警告。记忆以纯文本文件的形式存放在
你的仓库里，与代码在同一个 PR 中接受评审。无需 API key、无需数据库、
无需守护进程。

<p>
  <a href="https://kage-core.github.io/Kage/">官网</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">文档</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">查看器</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**支持** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · 任意 MCP 客户端

</div>

---

## 看看你的仓库在隐瞒什么 —— 60 秒，零配置

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

**Truth Report**（真相报告）能找出重复实现、幽灵导出、bus factor 为 1 的
热点文件、知识空洞和文档谎言。在一份全新克隆的 Express 仓库上：

```text
Kage Truth Report — express
Scanned 142 files, 3160 symbols, 1 doc file(s)

■ KNOWLEDGE VOID — high churn, zero memory (7, showing top 4)
  • lib/response.js — knowledge void
    390 commits of accumulated decisions, 149 graph edge(s) depending on it —
    and zero memory packets or doc mentions. Agents and new hires fly blind here.
  • lib/application.js — 179 commits x 77 edges, memory packets citing it: 0
  • lib/request.js     — 175 commits x 58 edges, memory packets citing it: 0
  • lib/utils.js       — 107 commits x 35 edges, memory packets citing it: 0
```

每一条发现都引用来自*你自己*代码的 `file:line` 证据 —— 没有任何内容是凭空生成的。

## 30 秒信任演示

```bash
npx -y @kage-core/kage-graph-mcp demo
```

```text
1. Hallucinated citation — REJECTED on write:
   ✗ "Use the helper in src/ghost.ts"
     Citation validation failed: none of the referenced paths exist in this repo.

2. Stale memory (cited file deleted) — WITHHELD from recall:
   ⊘ Legacy retry helper is the fallback
     all cited files deleted since capture: src/legacy-retry.ts

3. Recall returns only grounded, current memory:
   ✓ Payments must be idempotent
   ✓ Auth uses jose, not jsonwebtoken
```

## 用回执说话，而不是凭感觉

Kage 为每个仓库维护一份价值账本，让你看到记忆系统实际做了什么。
`kage gains --project .`：

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

代理在每次召回之后会转达同样的回执，查看器也以由同一份账本驱动的
Gains 标签页开场 —— 每一个数字都能追溯到一条已记录的事件。

## 信任机制

依据错误记忆行动的代理，比没有记忆的代理更糟糕。Kage 在三个环节强制执行信任：

1. **写入时拒绝** —— 引用仓库中不存在文件的记忆会被直接拒收。
   幻觉引用永远不会进入存储。
2. **召回时扣留** —— 每次召回都会重新验证被引用的文件。如果证据已被删除、
   TTL 已过期、或该记忆已被报告为过期，它就会被抑制（并在查看器中展示给你，
   绝不会被悄悄丢弃）。
3. **变更时捕捉过期** —— `kage pr check`（以及作为 pre-commit 钩子的
   `kage staleguard`）会首先列出你的 diff 刚刚破坏了什么：

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

在此之上还有一层隐私保证：把任何内容包进 `<private>…</private>`，
Kage 就永远不会存储它 —— 在任何 packet 或观察记录落盘之前，
该片段都会被替换为 `[private]`。

会话循环可以自我维护：如果代理整个会话什么都没捕获，会话的观察记录会在
会话结束时**自动蒸馏为待审草稿**（由你评审，绝不盲目信任）；下一个会话以一份
**"前情提要"摘要**开场（`kage resume`）；查看器**实时**流式展示正在发生的
记忆事件；当任何环节出了问题，**`kage repair`** 一条命令完成备份、修复和重建。

在你自己的仓库上验证：`kage benchmark --trust --project .` 测量幻觉拒绝、
过期排除和实时落地 —— 100/100。

## 数据说话

- 在真实的代码导航任务上，**正确率相同的前提下比 grep 快 18%**
  （N=3 任务套件，同一代理、同一模型；可用
  `kage benchmark --project . --compare --task "<task>"` 复现）。
- 经过感知 import 的调用解析后，**Express 上 524 条幽灵调用边降为 0**：
  被调用方先依次通过本地作用域 → import → 包来解析，然后才允许仅按名称匹配，
  并且来自外部包的 import 不会产生仓库内的边。
- 通过 tree-sitter 层（纯 WASM，零原生依赖）为 Python、Go、Rust、Java 和
  Ruby 提供**真正的 AST 提取** —— 在 Click 上正确分类了 466 个方法，
  而正则提取找到的是 0 个。
- **LongMemEval-S 检索**：96.17% R@5 / 98.72% R@10，零依赖。

方法论、命令与注意事项：[docs/BENCHMARKS.md](../docs/BENCHMARKS.md)。

## 已经有记忆工具了，为什么还要 Kage

全量捕获式记忆（[claude-mem](https://github.com/thedotmack/claude-mem)、
mem0、Zep）解决的是*记住*这件事。Kage 解决的是*信任所记住的内容*：
每条记忆都会与它所引用的代码进行核对 —— 在写入时、在召回时、
以及在你的 diff 改动其底层代码时。

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| 自动捕获 + 会话开始时召回 | ✓ | ✓ | 通过 SDK |
| 幻觉引用**在写入时被拒绝** | ✓ | — | — |
| 过期记忆**在召回时被扣留**（证据已变更/删除） | ✓ | — | — |
| **diff 时过期捕捉** —— 你的改动让某条记忆失效，在 PR 之前就收到警告 | ✓ | — | — |
| 记忆在 git 中评审，与代码同一个 PR（纯文本文件，无数据库） | ✓ | SQLite + 云端 | 托管 API |
| 节省回执（每次召回的 token 数 + 美元，价值账本） | ✓ | token 索引 | — |
| 任意仓库上的 Truth Report，零配置 | ✓ | — | — |
| 需要账号 / API key | 不需要 | 云端可选 | 需要 |

一个从不重新验证自身结论的记忆系统，用得越久就*越*不可信。
Kage 是那个历久弥坚的。

## 快速开始

需要 Node.js 18+。在你的仓库内执行一条命令：

```bash
npx -y @kage-core/kage-graph-mcp install
```

这会创建 `.agent_memory/`、构建代码图、自动检测你的代理
（Claude Code、Codex、Cursor、Windsurf、Gemini CLI、OpenCode、Goose、Aider）
并完成接线。也可以全局安装，逐个接入代理：

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

或者手动连接某个代理（一条命令写入 MCP + hooks 配置）：

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Claude Code / Codex 用户也可以改为安装插件：

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

重启一次代理，然后确认记忆系统已经生效：

```bash
kage setup verify-agent --agent claude-code --project .
```

从这里开始一切都是环境式的：代理在任务开始时召回有据可依的记忆
（`kage_context`），在工作中捕获值得沉淀的经验（`kage_learn`），
而你在与代码相同的 PR 中评审记忆。`kage refresh` 在合并后重新落地；
`kage viewer` 展示收益、信任状况，以及哪些记忆被扣留。

## packet 的生命周期

每条学习成果是一个 **packet**：存放在 `.agent_memory/packets/` 中的
可评审 JSON，纳入 git 跟踪、可以 diff。

**捕获 → 引用检查**（拒绝不存在的路径）**→ 落地**
（为被引用文件生成指纹）**→ 召回**（排除过期记忆）**→ 刷新**
（随代码变化重新验证落地状态）**→ 更新 / 取代 / 退役**。

当被引用的文件缺失或自验证以来发生了变化、TTL（365 天）已过期、
或它被报告/弃用时，packet 即视为过期。软过期（关联代码发生变化）会被
标记以供评审；硬过期（证据消失）则会从召回中扣留。`kage compact`
清理失效引用并暴露重复项；`kage supersede` 在一条记忆取代另一条时
记录传承关系。

## 日常命令

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

完整的 CLI 与 MCP 参考：[文档](https://kage-core.github.io/Kage/guide.html)。

## 存储

所有内容都位于 `.agent_memory/` 中：`packets/` 是持久的仓库记忆
（git 跟踪的 JSON）；`graph/`、`code_graph/`、`structural/` 和 `indexes/`
可用 `kage refresh` 重建；`reports/` 存放价值账本和健康报告。
捕获在写入前会扫描密钥和个人隐私信息（PII）。

## 开发

```bash
cd mcp
npm install
npm test
npm run build
```

## 许可证

GPL-3.0-only。见 [LICENSE](../LICENSE)。切换到 GPL 之前的发布版本为 MIT。
