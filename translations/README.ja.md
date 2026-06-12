🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · 日本語 · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### コーディングエージェントのための検証済みリポジトリ知識

すべての主張は、現在のコードを引用して裏付けられます —— そして、それが何を
節約してくれたのかを正確に確認できます。Kage は存在しないファイルを引用する
記憶を拒否し、根拠が削除された記憶を保留し、あなたの変更がチームの知識を
無効化した瞬間に警告します。記憶はリポジトリ内のプレーンファイルとして保存され、
コードと同じ PR でレビューされます。API キー不要、データベース不要、デーモン不要。

<p>
  <a href="https://kage-core.github.io/Kage/">ウェブサイト</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">ドキュメント</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">ビューア</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**対応エージェント** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · 任意の MCP クライアント

</div>

---

## あなたのリポジトリが隠しているものを暴く —— 60 秒、セットアップ不要

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

**Truth Report**（真実レポート）は、重複実装、ゴーストエクスポート、
バスファクター 1 のホットファイル、知識の空白、ドキュメントの嘘を見つけ出します。
Express をクローンした直後の状態では：

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

すべての検出結果は、*あなた自身の*コードから `file:line` の証拠を引用します ——
生成されたものは一切ありません。

## 30 秒の信頼デモ

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

## 感覚ではなく、レシートを

Kage はリポジトリごとに価値台帳を保持し、メモリハーネスが実際に何をしたかを
示します。`kage gains --project .`：

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

エージェントはリコールのたびに同じレシートを伝え、ビューアも同じ台帳を元にした
Gains タブを先頭に表示します —— すべての数字は記録済みイベントまで遡れます。

## 信頼のメカニズム

誤った記憶に基づいて行動するエージェントは、記憶を持たないエージェントより
たちが悪い。Kage は 3 つのポイントで信頼を強制します：

1. **書き込み時の拒否** —— リポジトリに存在しないファイルを引用する記憶は
   拒否されます。幻覚による引用がストレージに入ることはありません。
2. **リコール時の保留** —— すべてのリコールで引用ファイルを再検証します。
   証拠が削除された、TTL が失効した、または記憶が stale として報告された場合は
   抑制されます（ビューアには表示され、黙って破棄されることはありません）。
3. **変更時の stale 検出** —— `kage pr check`（および pre-commit フックとしての
   `kage staleguard`）は、あなたの diff が何を壊したかを最初に提示します：

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

さらにプライバシーの保証もあります：`<private>…</private>` で囲んだ内容を
Kage が保存することは決してありません —— packet や観測記録がディスクに
触れる前に、その範囲は `[private]` に置き換えられます。

セッションループは自律的に回ります：エージェントが何もキャプチャしなかった場合、
セッションの観測記録はセッション終了時に**保留中のドラフトへ自動蒸留**されます
（あなたがレビューし、盲目的に信頼されることはありません）。次のセッションは
**「前回までのあらすじ」ダイジェスト**（`kage resume`）で始まり、ビューアは
メモリイベントを発生と同時に**ライブ**でストリーミングし、何かが壊れたときは
**`kage repair`** が 1 コマンドでバックアップ・修復・再構築を行います。

自分のリポジトリで証明してください：`kage benchmark --trust --project .` は
幻覚の拒否、stale の除外、ライブグラウンディングを測定します —— 100/100。

## 数字で見る

- 実際のコードナビゲーションタスクにおいて、**同等の正確さで grep より 18% 高速**
  （N=3 タスクスイート、同一エージェント・同一モデル。
  `kage benchmark --project . --compare --task "<task>"` で再現可能）。
- import を考慮した呼び出し解決により、**Express 上の 524 本のゴースト呼び出し
  エッジが 0 に**：呼び出し先はローカルスコープ → import → パッケージの順で
  解決されてから名前のみのマッチが許され、外部パッケージの import はリポジトリ内の
  エッジを生成しません。
- tree-sitter 層（純粋な WASM、ネイティブ依存ゼロ）により Python、Go、Rust、
  Java、Ruby の**本物の AST 抽出**を実現 —— Click では正規表現抽出が 0 件
  だったところ、466 メソッドを正しく分類。
- **LongMemEval-S 検索**：依存ゼロで 96.17% R@5 / 98.72% R@10。

方法論・コマンド・注意点：[docs/BENCHMARKS.md](../docs/BENCHMARKS.md)。

## メモリツールはすでにあるのに、なぜ Kage なのか

すべてをキャプチャするメモリ（[claude-mem](https://github.com/thedotmack/claude-mem)、
mem0、Zep）が解決するのは*覚えること*。Kage が解決するのは
*覚えた内容を信頼すること*です：すべての記憶は、それが引用するコードと
照合されます —— 書き込み時、リコール時、そしてあなたの diff がその下の
コードを変更したとき。

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| 自動キャプチャ + セッション開始時リコール | ✓ | ✓ | SDK 経由 |
| 幻覚による引用を**書き込み時に拒否** | ✓ | — | — |
| stale な記憶を**リコール時に保留**（証拠が変更/削除された場合） | ✓ | — | — |
| **diff 時の stale 検出** —— あなたの変更が記憶を無効化したら、PR の前に警告 | ✓ | — | — |
| 記憶を git でレビュー、コードと同じ PR（プレーンファイル、DB なし） | ✓ | SQLite + クラウド | ホステッド API |
| 節約レシート（リコールごとのトークン数 + ドル、価値台帳） | ✓ | トークンインデックス | — |
| 任意のリポジトリで Truth Report、セットアップ不要 | ✓ | — | — |
| アカウント / API キーの要否 | 不要 | クラウドは任意 | 必要 |

自らの主張を再検証しないメモリシステムは、使えば使うほど*信頼できなく*
なっていきます。Kage は、時間が経つほど良くなる方です。

## クイックスタート

Node.js 18+ が必要です。リポジトリの中から 1 コマンド：

```bash
npx -y @kage-core/kage-graph-mcp install
```

これにより `.agent_memory/` が作成され、コードグラフが構築され、エージェント
（Claude Code、Codex、Cursor、Windsurf、Gemini CLI、OpenCode、Goose、Aider）が
自動検出されて接続されます。あるいはグローバルにインストールして、
エージェントを 1 つずつ接続することもできます：

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

代わりにエージェントを手動で接続することもできます
（1 コマンドで MCP + hooks の設定を書き込みます）：

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Claude Code / Codex ユーザーは代わりにプラグインをインストールできます：

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

エージェントを一度再起動してから、ハーネスが有効であることを確認します：

```bash
kage setup verify-agent --agent claude-code --project .
```

ここから先は環境的に動きます：エージェントはタスク開始時に根拠のある記憶を
リコールし（`kage_context`）、作業しながら永続的な学びをキャプチャし
（`kage_learn`）、あなたはコードと同じ PR で記憶をレビューします。
`kage refresh` はマージ後に再グラウンディングし、`kage viewer` は利得・信頼・
保留中の記憶を表示します。

## packet のライフサイクル

各学びは **packet** です：`.agent_memory/packets/` 内のレビュー可能な JSON で、
git で追跡され、diff できます。

**キャプチャ → 引用チェック**（存在しないパスを拒否）**→ グラウンディング**
（引用ファイルのフィンガープリント取得）**→ リコール**（stale な記憶を除外）
**→ リフレッシュ**（コードの変化に合わせてグラウンディングを再検証）
**→ 更新 / 置換 / 引退**。

引用ファイルが消失または検証後に変更された、TTL（365 日）が失効した、
あるいは報告・非推奨化された場合、packet は stale になります。ソフト stale
（リンク先のコードが変更）はレビュー対象としてフラグ付けされ、ハード stale
（証拠が消失）はリコールから保留されます。`kage compact` は死んだ引用を
削除して重複を浮かび上がらせ、`kage supersede` はある記憶が別の記憶を
置き換えたときの系譜を記録します。

## 日常のコマンド

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

CLI と MCP の完全なリファレンス：[ドキュメント](https://kage-core.github.io/Kage/guide.html)。

## ストレージ

すべては `.agent_memory/` の中にあります：`packets/` は永続的なリポジトリ記憶
（git 追跡の JSON）、`graph/`・`code_graph/`・`structural/`・`indexes/` は
`kage refresh` で再構築可能、`reports/` には価値台帳とヘルスレポートが
格納されます。キャプチャは書き込み前にシークレットと PII をスキャンします。

## 開発

```bash
cd mcp
npm install
npm test
npm run build
```

## ライセンス

GPL-3.0-only。[LICENSE](../LICENSE) を参照してください。GPL への切り替え以前の
リリースは MIT でした。
