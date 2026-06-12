🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · 한국어 · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### 코딩 에이전트를 위한 검증된 저장소 지식

모든 주장은 현재 코드를 인용해 뒷받침됩니다 — 그리고 그것이 무엇을 절약해
주는지 정확히 확인할 수 있습니다. Kage는 존재하지 않는 파일을 인용하는
기억을 거부하고, 근거가 삭제된 기억은 보류하며, 당신의 변경이 팀의 지식을
무효화하는 순간 경고합니다. 기억은 저장소 안의 일반 파일로 보관되어 코드와
같은 PR에서 리뷰됩니다. API 키도, 데이터베이스도, 데몬도 필요 없습니다.

<p>
  <a href="https://kage-core.github.io/Kage/">웹사이트</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">문서</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">뷰어</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**지원 에이전트** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · 모든 MCP 클라이언트

</div>

---

## 저장소가 숨기고 있는 것을 확인하세요 — 60초, 설정 제로

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

**Truth Report**(진실 보고서)는 중복 구현, 고스트 익스포트, 버스 팩터 1의
핫 파일, 지식 공백, 문서의 거짓말을 찾아냅니다. 갓 클론한 Express 저장소에서:

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

모든 발견은 *당신의* 코드에서 가져온 `file:line` 증거를 인용합니다 —
생성된 내용은 하나도 없습니다.

## 30초 신뢰 데모

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

## 감이 아니라 영수증으로

Kage는 저장소별 가치 장부를 유지하며 메모리 하니스가 실제로 무엇을 했는지
보여줍니다. `kage gains --project .`:

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

에이전트는 매 리콜 후 같은 영수증을 전달하고, 뷰어도 같은 장부에서 가져온
Gains 탭을 가장 먼저 보여줍니다 — 모든 숫자는 기록된 이벤트로 추적할 수
있습니다.

## 신뢰 메커니즘

잘못된 기억으로 행동하는 에이전트는 기억이 없는 에이전트보다 더 나쁩니다.
Kage는 세 지점에서 신뢰를 강제합니다:

1. **쓰기 시 거부** — 저장소에 존재하지 않는 파일을 인용하는 기억은
   거부됩니다. 환각 인용은 절대 저장소에 들어가지 못합니다.
2. **리콜 시 보류** — 모든 리콜은 인용된 파일을 다시 검증합니다. 증거가
   삭제되었거나, TTL이 만료되었거나, 기억이 오래된 것으로 신고된 경우
   억제됩니다(뷰어에 표시되며, 조용히 버려지는 일은 없습니다).
3. **변경 시점 stale 감지** — `kage pr check`(그리고 pre-commit 훅인
   `kage staleguard`)는 당신의 diff가 방금 무엇을 깨뜨렸는지부터 보여줍니다:

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

그 위에 프라이버시 보장이 하나 더 있습니다: 무엇이든 `<private>…</private>`로
감싸면 Kage는 절대 저장하지 않습니다 — packet이나 관찰 기록이 디스크에 닿기
전에 해당 구간이 `[private]`으로 치환됩니다.

세션 루프는 알아서 굴러갑니다: 에이전트가 아무것도 캡처하지 않았다면 세션의
관찰 기록은 세션 종료 시 **대기 중인 초안으로 자동 증류**됩니다(당신이
리뷰하며, 맹목적으로 신뢰되지 않습니다). 다음 세션은 **"지난 이야기…"
다이제스트**(`kage resume`)로 시작하고, 뷰어는 메모리 이벤트를 발생하는
즉시 **라이브**로 스트리밍하며, 무언가 깨지면 **`kage repair`**가 백업,
수리, 재구축을 한 번의 명령으로 처리합니다.

당신의 저장소에서 직접 증명하세요: `kage benchmark --trust --project .`는
환각 거부, stale 배제, 라이브 그라운딩을 측정합니다 — 100/100.

## 숫자로 보기

- 실제 코드 탐색 작업에서 **동일한 정확도로 grep보다 18% 빠름**
  (N=3 작업 스위트, 동일 에이전트·동일 모델;
  `kage benchmark --project . --compare --task "<task>"`로 재현 가능).
- import 인식 호출 해석 후 **Express의 고스트 호출 엣지 524개 → 0개**:
  피호출자는 로컬 스코프 → import → 패키지 순으로 해석된 뒤에야 이름만으로
  매칭되며, 외부 패키지 import는 저장소 엣지를 만들지 않습니다.
- tree-sitter 계층(순수 WASM, 네이티브 의존성 제로)을 통한 Python, Go, Rust,
  Java, Ruby의 **진짜 AST 추출** — Click에서 정규식 추출이 0개를 찾은 곳에서
  466개 메서드를 정확히 분류.
- **LongMemEval-S 검색**: 의존성 제로로 96.17% R@5 / 98.72% R@10.

방법론, 명령어, 주의 사항: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## 메모리 도구가 이미 있는데 왜 Kage인가

모든 것을 캡처하는 메모리([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep)는 *기억하기*를 해결합니다. Kage는 *기억한 것을 신뢰하기*를
해결합니다: 모든 기억은 그것이 인용하는 코드와 대조됩니다 — 쓰일 때,
리콜될 때, 그리고 당신의 diff가 그 아래의 코드를 바꿀 때.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| 자동 캡처 + 세션 시작 시 리콜 | ✓ | ✓ | SDK 경유 |
| 환각 인용을 **쓰기 시점에 거부** | ✓ | — | — |
| 오래된 기억을 **리콜 시 보류**(증거 변경/삭제) | ✓ | — | — |
| **diff 시점 stale 감지** — 당신의 변경이 기억을 무효화하면 PR 전에 경고 | ✓ | — | — |
| 기억을 git에서 리뷰, 코드와 같은 PR(일반 파일, DB 없음) | ✓ | SQLite + 클라우드 | 호스팅 API |
| 절감 영수증(리콜당 토큰 + 달러, 가치 장부) | ✓ | 토큰 인덱스 | — |
| 어떤 저장소에서든 Truth Report, 설정 제로 | ✓ | — | — |
| 계정 / API 키 필요 여부 | 불필요 | 클라우드는 선택 | 필요 |

자신의 주장을 다시 검증하지 않는 메모리 시스템은 오래 쓸수록 *덜*
신뢰할 수 있게 됩니다. Kage는 시간이 지날수록 좋아지는 쪽입니다.

## 빠른 시작

Node.js 18+가 필요합니다. 저장소 안에서 명령어 하나:

```bash
npx -y @kage-core/kage-graph-mcp install
```

이 명령은 `.agent_memory/`를 생성하고, 코드 그래프를 구축하고, 에이전트
(Claude Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode, Goose, Aider)를
자동 감지해 연결합니다. 또는 전역으로 설치하고 에이전트를 하나씩 연결할 수도
있습니다:

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

대신 에이전트를 수동으로 연결할 수도 있습니다(명령어 하나로 MCP + hooks
설정을 기록합니다):

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Claude Code / Codex 사용자는 대신 플러그인을 설치할 수 있습니다:

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

에이전트를 한 번 재시작한 뒤, 하니스가 살아 있는지 확인하세요:

```bash
kage setup verify-agent --agent claude-code --project .
```

그다음부터는 모든 것이 자연스럽게 흘러갑니다: 에이전트는 작업 시작 시 근거
있는 기억을 리콜하고(`kage_context`), 작업하면서 오래갈 배움을 캡처하며
(`kage_learn`), 당신은 코드와 같은 PR에서 기억을 리뷰합니다. `kage refresh`는
머지 후 다시 그라운딩하고, `kage viewer`는 이득, 신뢰, 무엇이 보류되고
있는지를 보여줍니다.

## packet 생명주기

각 배움은 하나의 **packet**입니다: `.agent_memory/packets/`에 있는 리뷰
가능한 JSON으로, git이 추적하고 diff할 수 있습니다.

**캡처 → 인용 검사**(존재하지 않는 경로 거부) **→ 그라운딩**
(인용 파일 핑거프린팅) **→ 리콜**(오래된 기억 배제) **→ 리프레시**
(코드 변화에 따라 그라운딩 재검증) **→ 업데이트 / 대체 / 은퇴**.

인용된 파일이 사라졌거나 검증 이후 변경되었거나, TTL(365일)이 만료되었거나,
신고/폐기된 경우 packet은 stale이 됩니다. 소프트 stale(연결된 코드가 변경됨)은
리뷰 대상으로 표시되고, 하드 stale(증거 소실)은 리콜에서 보류됩니다.
`kage compact`는 죽은 인용을 정리하고 중복을 드러내며, `kage supersede`는
한 기억이 다른 기억을 대체할 때 계보를 기록합니다.

## 일상 명령어

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

전체 CLI 및 MCP 레퍼런스: [문서](https://kage-core.github.io/Kage/guide.html).

## 저장 구조

모든 것은 `.agent_memory/` 안에 있습니다: `packets/`는 내구성 있는 저장소
기억(git 추적 JSON)이고, `graph/`, `code_graph/`, `structural/`, `indexes/`는
`kage refresh`로 재구축할 수 있으며, `reports/`에는 가치 장부와 상태 보고서가
들어 있습니다. 캡처는 기록 전에 시크릿과 개인정보(PII)를 스캔합니다.

## 개발

```bash
cd mcp
npm install
npm test
npm run build
```

## 라이선스

GPL-3.0-only. [LICENSE](../LICENSE)를 참조하세요. GPL 전환 이전 릴리스는
MIT였습니다.
