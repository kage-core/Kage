🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · 日本語 · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### 信頼できる、コーディングエージェントのためのメモリ

<img src="../docs/kage-viewer.jpg" alt="kage viewer のメモリ↔コードマップ：メモリ packet が根拠となるコードファイルに結ばれている" width="760">

<sub>`kage viewer` のメモリ ↔ コードマップ：各メモリ packet（紫）が、その根拠となるファイル（青）に結ばれています。</sub>

コーディングエージェントはセッションごとにコードベースを忘れるため、あなたは
何度も説明し直すことになります。**Kage** は、リポジトリ内にプレーンなファイルとして
存在する永続メモリを与え、すべてのメモリを実際のコードと照合します。だから
エージェントが、もはや正しくない内容に基づいて動くことはありません。git を通じて
チーム全員と共有。アカウント不要、データベース不要、API キー不要。

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
  <a href="https://kage-core.com/">ウェブサイト</a> ·
  <a href="https://kage-core.com/guide.html">ドキュメント</a> ·
  <a href="https://kage-core.com/viewer/">ライブビューア</a> ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a> ·
  <a href="https://kage-core.com/demo.html"><b>デモを予約</b></a>
</p>

**対応** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline · Goose ·
Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · あらゆる MCP クライアント

</div>

---

## インストール

**リポジトリ内で 1 コマンド、そしてエージェントを再起動するだけ。** セットアップはこれで全部です。

```bash
npx -y @kage-core/kage-graph-mcp install
```

`.agent_memory/` を作成し、コードグラフを構築し、エージェントに Kage を使うよう伝える
`AGENTS.md` / `CLAUDE.md` ポリシーを書き込み、エージェントを自動検出して接続し、
`.gitignore` と packet マージドライバを設定します。Node.js 18+ が必要。アカウント不要、API キー不要。

**または、エージェントにセットアップさせるだけ。** 次の文を Claude Code、Cursor、
あるいは任意のコーディングエージェントに貼り付けてください：

> このリポジトリに Kage（コーディングエージェント向けの検証済みメモリ、
> https://github.com/kage-core/Kage）をセットアップして：`npx -y @kage-core/kage-graph-mcp install`
> を実行し、終わったら再起動するよう私に伝えてください。

<details><summary>その他の方法（プラグイン · 個別エージェント · メモリのみ）</summary>

```bash
# Claude Code / Codex プラグイン
/plugin marketplace add kage-core/Kage      # その後：/plugin install kage@kage

# 個別のエージェントを接続（対応一覧は kage setup list）
kage setup claude-code --project . --write

# メモリストアのみ、エージェント接続なし
kage init --project .

# ハーネスが有効か確認
kage setup verify-agent --agent claude-code --project .
```
</details>

## Kage とは

Kage はコーディングエージェントのためのメモリ層です。エージェントが作業する中で学んだこと
（決定、バグ修正、規約、コードのつながり方）を、`.agent_memory/` 配下にリポジトリと共に
コミットされる小さな JSON **packet** として捕捉します。次のセッション（あなた自身、あるいは
チームメイトの）は、読み直したり聞き直したりせずに、すでにそれを知った状態で始まります。

他のメモリツールと異なる点が 2 つあります：

- **検証されている。** すべてのメモリは対象のコードを引用し、Kage はそれらの引用を、
  書き込み時・想起時・diff がコードを変更したときに、実際のファイルと照合します。
  コードと一致しなくなったメモリは差し控えられるため、エージェントが古い主張に基づいて
  動くことはありません。
- **git ネイティブ。** メモリはリポジトリ内のプレーンなファイルで、コードと同じ PR で
  レビューされ、git を通じてチーム全員と共有されます。1 台のマシンやベンダーのクラウドに
  閉じ込められることはありません。

## 仕組み

インストール後はバックグラウンドで動作し、手動で何かを実行する必要はありません：

1. **動く前に想起。** タスクの開始時（およびエージェントがファイルを開いた瞬間）に、
   Kage は関連する検証済みメモリを提示します。古い、または削除済みのメモリは除外されます。
2. **作業しながら捕捉。** 永続的な学びは packet になります。存在しないファイルを引用する
   メモリはその場で拒否されるため、ハルシネーションがストレージに入ることはありません。
3. **コードが動いても正直に。** メモリが引用するコードを diff が変更すると、そのメモリは
   コミット/PR 時（`kage pr check`）にフラグが立ち、再検証または置き換えまで想起から
   差し控えられます。こうして知識が静かに腐ることはありません。

**ローカルダッシュボード**（`kage viewer`）でその様子を確認できます：packet、メモリ↔コードの
グラフ、信頼ゲート、エージェント作業中に流れ込むライブイベント。`<private>…</private>` で
囲んだものは一切保存されません。

## なぜ Kage か

ほとんどのメモリツール（[claude-mem](https://github.com/thedotmack/claude-mem)、
[agentmemory](https://github.com/rohitg00/agentmemory)、mem0、Zep）は、メモリを 1 台の
マシンか、あなたの所有ではないクラウドに保存し、コードと再照合することはありません。
Kage はメモリをあなたのリポジトリに置き、検証します。だからチームのものであり続け、
コードの変化とともに真実であり続けます。

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| 自動捕捉 + セッション開始時の想起 | ✓ | ✓ | SDK 経由 |
| ハルシネーション引用を**書き込み時に拒否** | ✓ | — | — |
| 古いメモリを**想起時に差し控え**（引用ファイルの削除/変更、TTL、報告） | ✓ | — | — |
| **diff 時点の陳腐化検出**：変更がメモリを壊すと PR 前に警告 | ✓ | — | — |
| メモリを git でレビュー、コードと同じ PR（プレーンファイル、DB なし） | ✓ | SQLite + クラウド | ホスト API |
| メモリをエージェントが自動読込するチーム `SKILL.md` に固定化 | ✓（`kage skills`） | — | — |
| マシン間同期 | ✓ 自分の git リモート | 各社クラウド | 各社クラウド |
| アカウント / API キーの要否 | 不要 | クラウドは任意 | 必要 |

## 機能

- **Truth Report。** `kage scan` は任意のリポジトリを約 60 秒で読み、最もリスクの高い
  知識ギャップを浮かび上がらせます：ドキュメントのないホットファイル、テストのない
  ホットパス、複雑度のホットスポット、未解決の技術的負債、バス係数 1 のファイル。さらに
  （存在すれば）重複実装、デッドエクスポート、ドキュメントの嘘も。すべての指摘は `file:line`
  に明示。セットアップ不要、何も生成せず、何かをインストールする前に実行できます。
- **節約のレシート。** `kage gains` はリポジトリ単位の価値台帳（エージェントが再び費やさずに
  済んだトークンと金額）を保持し、すべての数値は記録済みイベントまで遡れます。エージェントは
  想起のたびにそれを伝えます。
- **チームスキル。** `kage skills` は永続的で検証済みの手順を、エージェントが自動読込する
  `.claude/skills/<name>/SKILL.md` に変換します。コミットして共有、クラウド不要。
- **個人メモリと同期。** `kage learn --personal` はマシン間のメモを `~/.kage/memory` に保存し、
  明確に区別された信頼度の低いセクションとして想起され、自分の git リモートで同期されます。
- **自己修復するセッションループ。** 未捕捉のセッションは自動で蒸留され、レビュー待ちの下書きに
  なります。`kage resume` は各セッションを「これまでのあらすじ」ダイジェストで開始します。
  `kage repair` は壊れた packet とインデックスを 1 コマンドで修復します。

## ベンチマーク

- **同等の正確さで grep より 18% 高速**、実際のコードナビゲーションタスクにて（N=3 スイート、
  同一エージェント/モデル。`kage benchmark --project . --compare` で再現）。
- **LongMemEval-S 検索：** 96.17% R@5 / 98.72% R@10、依存ゼロ。
- **変更下でのメモリ正確性：** 陳腐な提供 0%（削除・変更されたコードのメモリは差し控え）、
  「全部捕捉」型ストアの 100% に対して。
- **信頼ベンチマーク：** 100/100、ハルシネーション拒否・陳腐化除外・ライブ照合をカバー
  （`kage benchmark --trust --project .`）。

方法論・コマンド・注意点：[docs/BENCHMARKS.md](../docs/BENCHMARKS.md)。

## 日常のコマンド

```bash
kage recall "テストの実行方法" --project .
kage verify --project .        # 引用を現在のコードと照合
kage pr check --project .      # 陳腐化検出 + グラフ鮮度ゲート
kage gains --project .         # Kage が節約したもの
kage viewer --project .        # ローカルダッシュボード
```

CLI と MCP の完全なリファレンス：[ドキュメント](https://kage-core.com/guide.html)。

## ストレージ

すべては `.agent_memory/` 配下にあります：`packets/` はリポジトリと共にコミットされる永続メモリ
（git 管理の JSON）。`graph/`、`code_graph/`、`structural/`、`indexes/` は `kage refresh` で再構築可能。
`reports/` は価値台帳と健全性レポートを保持します。捕捉前にシークレットと PII をスキャンします。

## 開発

```bash
cd mcp
npm install
npm test
npm run build
```

## ライセンス

GPL-3.0-only。[LICENSE](../LICENSE) を参照。GPL へ切り替える前のリリースは MIT でした。
