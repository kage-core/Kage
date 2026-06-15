🌐 [English](../README.md) · 简体中文 · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### 永不丢失的编码代理团队记忆

<img src="../docs/kage-viewer.jpg" alt="kage viewer：团队捕获的决策、运行手册与缺陷修复，连到它们所涉及的代码" width="760">

<sub>`kage viewer`：你团队的决策、运行手册与缺陷修复（紫色），保存在仓库里，并连到它们所涉及的代码（蓝色）。</sub>

代码背后的决策、棘手部署的运行手册、讨厌 bug 的根因：这些知识只存在于人们的脑子里，
在聊天记录中一划而过，然后就丢失了。**Kage** 在你的编码代理工作时把它捕获下来，以纯文本
文件的形式存放在你的仓库里，并通过 git 与整个团队共享。下一次会话（你的或队友的）一开始
就已经知道这些。每一条记忆还会与真实代码对照核验，因此共享出去的内容始终为真。
无需账号、无需数据库、无需 API key。

```bash
npx -y @kage-core/kage-graph-mcp install
```

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/deps-0-41ff8f" alt="zero dependencies">
  <img src="https://img.shields.io/badge/account-not%20required-41ff8f" alt="no account">
</p>

<p>
  <a href="https://kage-core.com/">官网</a> ·
  <a href="https://kage-core.com/guide.html">文档</a> ·
  <a href="https://kage-core.com/viewer/">在线查看器</a> ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a> ·
  <a href="https://kage-core.com/demo.html"><b>预约演示</b></a>
</p>

**适配** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline · Goose ·
Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · 任何 MCP 客户端

</div>

---

## 安装

**在你的仓库里执行一条命令，然后重启代理。** 这就是全部设置。

```bash
npx -y @kage-core/kage-graph-mcp install
```

它会创建 `.agent_memory/`、构建代码图谱、写入告诉代理使用 Kage 的
`AGENTS.md` / `CLAUDE.md` 策略文件、自动检测并接入你的代理，并配置
`.gitignore` 与 packet 合并驱动。需要 Node.js 18+。无需账号、无需 API key。

**或者直接让代理替你完成。** 把下面这段粘贴给 Claude Code、Cursor 或任何编码代理：

> 在这个仓库里安装 Kage（面向编码代理的可信记忆，https://github.com/kage-core/Kage）：
> 运行 `npx -y @kage-core/kage-graph-mcp install`，然后提示我重启你。

<details><summary>其他方式（插件 · 单个代理 · 仅记忆库）</summary>

```bash
# Claude Code / Codex 插件
/plugin marketplace add kage-core/Kage      # 然后：/plugin install kage@kage

# 接入单个代理（运行 kage setup list 查看全部支持项）
kage setup claude-code --project . --write

# 仅记忆库，不接入代理
kage init --project .

# 确认 harness 已生效
kage setup verify-agent --agent claude-code --project .
```
</details>

## Kage 是什么

Kage 是面向编码代理的记忆层。在代理工作时，它会把学到的东西
（决策、缺陷修复、约定、代码如何衔接）捕获为存放在 `.agent_memory/` 下、
随仓库提交的小型 JSON **packet**。下一次会话（你的或队友的）一开始就已经知道这些，
无需重新阅读或重新询问。

与其他记忆工具相比，有三点不同：

- **它是协作式的。** 一个人（或其代理）弄明白的知识，会变成整个团队的。记忆通过 git
  共享，因此队友的下一次会话从你刚学到的东西开始，而不是一片空白。
- **它原生于 git。** 记忆是仓库里的纯文本文件，与代码在同一个 PR 中评审，
  而不是锁在某一台机器或某个厂商的云里。你的知识始终属于你。
- **它经过核验。** 每条记忆都引用它所描述的代码，Kage 会在写入时、召回时、
  以及 diff 改动代码时，把这些引用与你的真实文件对照核验。
  与代码不再匹配的记忆会被扣留，因此代理永远不会基于失效的论断行动。

## 工作原理

安装后即在后台运行，你无需手动执行任何命令：

1. **行动前先召回。** 在任务开始时（以及代理打开文件的那一刻），
   Kage 会为它呈现相关的、已核验的记忆。失效或已删除的记忆会被排除。
2. **边做边捕获。** 持久的经验会变成 packet。引用了不存在文件的记忆
   会被当场拒绝，因此幻觉永远进不了存储。
3. **随代码变化保持诚实。** 当 diff 改动了某条记忆所引用的代码时，
   该记忆会在提交/PR 时（`kage pr check`）被标记，并从召回中扣留，
   直到它被重新核验或替换，因此知识不会悄悄腐坏。

在**本地仪表盘**（`kage viewer`）里实时观看：packet、记忆↔代码图谱、
信任门控、以及代理工作时流入的实时事件。任何包裹在
`<private>…</private>` 中的内容都不会被存储。

## 为什么选 Kage

大多数记忆工具（[claude-mem](https://github.com/thedotmack/claude-mem)、
[agentmemory](https://github.com/rohitg00/agentmemory)、mem0、Zep）把记忆存在
单台机器上或你并不拥有的云里，并且从不与代码重新对照。Kage 把记忆留在你的
仓库里并加以核验，因此它始终属于你的团队，并随代码变化保持真实。

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| 自动捕获 + 会话开始时召回 | ✓ | ✓ | 通过 SDK |
| 幻觉引用在**写入时被拒绝** | ✓ | — | — |
| 失效记忆在**召回时被扣留**（引用文件被删/被改、TTL、被举报） | ✓ | — | — |
| **diff 时刻的失效拦截**：你的改动破坏某条记忆时，在 PR 前就告警 | ✓ | — | — |
| 记忆在 git 中评审，与代码同处一个 PR（纯文本文件，无数据库） | ✓ | SQLite + 云 | 托管 API |
| 把记忆固化为代理自动加载的团队 `SKILL.md` | ✓（`kage skills`） | — | — |
| 跨机器同步 | ✓ 你自己的 git 远端 | 他们的云 | 他们的云 |
| 是否需要账号 / API key | 不需要 | 可选云 | 需要 |

## 功能

- **Truth Report。** `kage scan` 约 60 秒读完任意仓库，呈现风险最高的
  知识缺口：无文档的热点文件、无测试覆盖的热点路径、复杂度热点、
  未处理的代码欠债、以及巴士因子为 1 的文件，外加（若存在）重复实现、
  死导出与文档谎言。每条结论都标注到 `file:line`。零配置、不生成任何东西、
  在你安装任何东西之前就能跑。
- **节省回执。** `kage gains` 维护一份按仓库统计的价值账本（代理无需再次
  花费的 token 与美元），每个数字都可追溯到一条已记录的事件；代理会在
  每次召回后转述它。
- **团队技能。** `kage skills` 把持久且已核验的流程转化为代理自动加载的
  `.claude/skills/<name>/SKILL.md` 文件，随仓库提交并共享，无需云。
- **个人记忆与同步。** `kage learn --personal` 把跨机器的笔记保存在
  `~/.kage/memory`，召回时作为清晰区分、信任级别更低的板块，并通过你自己的
  git 远端同步。
- **自愈式会话回路。** 未捕获的会话会被自动蒸馏为待审草稿；
  `kage resume` 在每次会话开始时给出“前情提要”摘要；`kage repair`
  一条命令修复损坏的 packet 与索引。

## 基准测试

- **在同等正确率下比 grep 快 18%**，基于真实的代码导航任务（N=3 套件，
  相同代理/模型；用 `kage benchmark --project . --compare` 复现）。
- **LongMemEval-S 检索：** 96.17% R@5 / 98.72% R@10，零依赖。
- **变更下的记忆正确性：** 失效投喂率 0%（代码被删或被改的记忆会被扣留），
  对比“全量捕获”存储为 100%。
- **信任基准：** 100/100，覆盖幻觉拒绝、失效排除与实时对照
  （`kage benchmark --trust --project .`）。

方法论、命令与注意事项：[docs/BENCHMARKS.md](../docs/BENCHMARKS.md)。

## 日常命令

```bash
kage recall "怎么运行测试" --project .
kage verify --project .        # 把引用与当前代码对照核验
kage pr check --project .      # 失效拦截 + 图谱新鲜度门控
kage gains --project .         # Kage 为你节省了什么
kage viewer --project .        # 本地仪表盘
```

完整 CLI 与 MCP 参考：[文档](https://kage-core.com/guide.html)。

## 存储

一切都存放在 `.agent_memory/`：`packets/` 是随仓库提交的持久记忆（git 跟踪的 JSON）；
`graph/`、`code_graph/`、`structural/` 与 `indexes/` 可用 `kage refresh` 重建；
`reports/` 存放价值账本与健康报告。捕获前会扫描密钥与 PII。

## 开发

```bash
cd mcp
npm install
npm test
npm run build
```

## 许可

GPL-3.0-only。见 [LICENSE](../LICENSE)。切换到 GPL 之前的版本为 MIT。
