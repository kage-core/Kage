🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · Português (Brasil) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### Conhecimento verificado do repositório para agentes de código

Cada afirmação é citada contra o seu código atual — e você vê exatamente o que
isso economiza. O Kage rejeita memória que cita arquivos inexistentes, retém
memória cuja evidência foi apagada e avisa no momento em que suas mudanças
invalidam o que a equipe sabe. Arquivos simples no seu repositório, revisados
no mesmo PR que o código. Sem API key, sem banco de dados, sem daemon.

<p>
  <a href="https://kage-core.github.io/Kage/">Site</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Documentação</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Visualizador</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**Funciona com** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · qualquer cliente MCP

</div>

---

## Veja o que seu repositório está escondendo — 60 segundos, zero configuração

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

O **Truth Report** (relatório da verdade) encontra implementações duplicadas,
exports fantasma, arquivos críticos com bus factor 1, vazios de conhecimento e
mentiras na documentação. Em um clone recém-feito do Express:

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

Cada achado cita evidência `file:line` do *seu* código — nada é gerado.

## A demo de confiança de 30 segundos

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

## Recibos, não achismos

O Kage mantém um livro-razão de valor por repositório e mostra o que o sistema
de memória de fato fez. `kage gains --project .`:

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

Os agentes repassam o mesmo recibo após cada recuperação, e o visualizador abre
com uma aba Gains alimentada pelo mesmo livro-razão — cada número é rastreável
até um evento registrado.

## Mecânica de confiança

Um agente agindo sobre memória errada é pior do que um sem memória nenhuma.
O Kage impõe confiança em três pontos:

1. **Rejeição na escrita** — uma memória que cita arquivos que não existem no
   seu repositório é recusada. Citações alucinadas nunca entram no
   armazenamento.
2. **Retenção na recuperação** — cada recuperação re-verifica os arquivos
   citados. Se a evidência foi apagada, o TTL expirou ou a memória foi
   reportada como desatualizada, ela é suprimida (e exibida para você no
   visualizador, nunca descartada em silêncio).
3. **Captura de obsolescência na hora da mudança** — `kage pr check` (e
   `kage staleguard` como hook de pre-commit) abre com o que o seu diff acabou
   de quebrar:

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

E, por cima, uma garantia de privacidade: envolva qualquer coisa em
`<private>…</private>` e o Kage nunca vai armazená-la — o trecho é substituído
por `[private]` antes que qualquer packet ou observação toque o disco.

O ciclo de sessão se cuida sozinho: se o agente não capturou nada, as
observações da sessão são **destiladas automaticamente em rascunhos
pendentes** ao final (revisados por você, nunca confiados às cegas); a próxima
sessão abre com um **resumo "anteriormente…"** (`kage resume`); o visualizador
transmite os eventos de memória **ao vivo** conforme acontecem; e quando algo
quebra, **`kage repair`** faz backup, conserta e reconstrói em um único
comando.

Prove no seu próprio repositório: `kage benchmark --trust --project .` mede a
rejeição de alucinações, a exclusão de memória desatualizada e o aterramento
ao vivo — 100/100.

## Os números

- **18% mais rápido que o grep com a mesma correção** em tarefas reais de
  navegação de código (suíte de N=3 tarefas, mesmo agente, mesmo modelo;
  reproduza com `kage benchmark --project . --compare --task "<task>"`).
- **524 arestas de chamadas fantasma → 0** no Express após a resolução de
  chamadas ciente de imports: os alvos são resolvidos por escopo local →
  imports → pacote antes de qualquer correspondência só por nome, e imports de
  pacotes externos não produzem arestas no repositório.
- **Extração AST de verdade** para Python, Go, Rust, Java e Ruby via camada
  tree-sitter (WASM puro, zero dependências nativas) — no Click, 466 métodos
  classificados corretamente onde a extração por regex encontrou 0.
- **Recuperação LongMemEval-S**: 96.17% R@5 / 98.72% R@10 com zero
  dependências.

Metodologia, comandos e ressalvas: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Por que o Kage, se ferramentas de memória já existem

Memória de captura total ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) resolve o *lembrar*. O Kage resolve o *confiar no que foi lembrado*:
cada memória é checada contra o código que ela cita — quando é escrita, quando
é recuperada e quando o seu diff muda o código por baixo dela.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Captura automática + recuperação no início da sessão | ✓ | ✓ | via SDK |
| Citações alucinadas **rejeitadas na escrita** | ✓ | — | — |
| Memória desatualizada **retida na recuperação** (evidência alterada/apagada) | ✓ | — | — |
| **Captura de obsolescência no diff** — sua mudança invalida uma memória e você é avisado antes do PR | ✓ | — | — |
| Memória revisada no git, mesmo PR que o código (arquivos simples, sem BD) | ✓ | SQLite + nuvem | API hospedada |
| Recibos de economia (tokens + $ por recuperação, livro-razão de valor) | ✓ | índice de tokens | — |
| Truth Report em qualquer repositório, zero configuração | ✓ | — | — |
| Conta / API key necessária | nenhuma | nuvem opcional | sim |

Um sistema de memória que nunca re-verifica as próprias afirmações fica *menos*
confiável quanto mais você o usa. O Kage é o que envelhece bem.

## Início rápido

Requer Node.js 18+. Um comando de dentro do seu repositório:

```bash
npx -y @kage-core/kage-graph-mcp install
```

Isso cria `.agent_memory/`, constrói o grafo de código, detecta seus agentes
automaticamente (Claude Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode,
Goose, Aider) e os conecta. Ou instale globalmente e conecte os agentes um de
cada vez:

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

Ou conecte um agente manualmente (um comando grava a configuração de MCP +
hooks):

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Usuários de Claude Code / Codex podem instalar o plugin em vez disso:

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

Reinicie o agente uma vez e confirme que o sistema está ativo:

```bash
kage setup verify-agent --agent claude-code --project .
```

A partir daí, tudo é ambiente: o agente recupera memória fundamentada no início
da tarefa (`kage_context`), captura aprendizados duráveis enquanto trabalha
(`kage_learn`), e você revisa a memória no mesmo PR que o código.
`kage refresh` re-aterra após merges; `kage viewer` mostra ganhos, confiança e
o que está sendo retido.

## O ciclo de vida do packet

Cada aprendizado é um **packet**: JSON revisável em `.agent_memory/packets/`,
rastreado pelo git e comparável com diff.

**captura → checagem de citações** (rejeita caminhos inexistentes)
**→ aterramento** (impressão digital dos arquivos citados) **→ recuperação**
(memória desatualizada excluída) **→ atualização do índice** (re-verifica o
aterramento conforme o código muda) **→ atualizar / substituir / aposentar**.

Um packet fica desatualizado quando um arquivo citado está ausente ou mudou
desde a verificação, seu TTL (365 dias) expirou, ou ele foi
reportado/depreciado. Obsolescência branda (o código vinculado mudou) é
sinalizada para revisão; obsolescência dura (a evidência sumiu) é retida da
recuperação. `kage compact` poda citações mortas e expõe duplicatas;
`kage supersede` registra a linhagem quando uma memória substitui outra.

## Comandos do dia a dia

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

Referência completa de CLI e MCP: [documentação](https://kage-core.github.io/Kage/guide.html).

## Armazenamento

Tudo vive em `.agent_memory/`: `packets/` é a memória durável do repositório
(JSON rastreado pelo git); `graph/`, `code_graph/`, `structural/` e `indexes/`
são reconstruíveis com `kage refresh`; `reports/` guarda o livro-razão de
valor e os relatórios de saúde. A captura escaneia segredos e dados pessoais
(PII) antes de gravar.

## Desenvolvimento

```bash
cd mcp
npm install
npm test
npm run build
```

## Licença

GPL-3.0-only. Veja [LICENSE](../LICENSE). As versões anteriores à mudança para
GPL eram MIT.
