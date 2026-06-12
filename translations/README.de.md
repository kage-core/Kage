🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · Deutsch · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### Verifiziertes Repository-Wissen für Coding-Agenten

Jede Aussage wird gegen Ihren aktuellen Code zitiert — und Sie sehen genau,
was sie Ihnen erspart. Kage weist Erinnerungen zurück, die nicht existierende
Dateien zitieren, hält Erinnerungen zurück, deren Belege gelöscht wurden, und
warnt Sie in dem Moment, in dem Ihre Änderungen das Wissen Ihres Teams
entwerten. Einfache Dateien in Ihrem Repository, geprüft im selben PR wie der
Code. Kein API-Key, keine Datenbank, kein Daemon.

<p>
  <a href="https://kage-core.github.io/Kage/">Website</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Dokumentation</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Viewer</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**Funktioniert mit** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · jedem MCP-Client

</div>

---

## Sehen Sie, was Ihr Repository verbirgt — 60 Sekunden, null Einrichtung

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

Der **Truth Report** (Wahrheitsbericht) findet doppelte Implementierungen,
Geister-Exports, Hot-Files mit Bus-Faktor 1, Wissenslücken und Lügen in der
Dokumentation. Auf einem frischen Klon von Express:

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

Jeder Befund zitiert `file:line`-Belege aus *Ihrem* Code — nichts ist
generiert.

## Die 30-Sekunden-Vertrauensdemo

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

## Belege statt Bauchgefühl

Kage führt pro Repository ein Wert-Hauptbuch und zeigt Ihnen, was das
Memory-System tatsächlich geleistet hat. `kage gains --project .`:

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

Agenten geben denselben Beleg nach jedem Abruf weiter, und der Viewer startet
mit einem Gains-Tab, der aus demselben Hauptbuch gespeist wird — jede Zahl
lässt sich auf ein protokolliertes Ereignis zurückführen.

## Vertrauensmechanik

Ein Agent, der auf falsche Erinnerungen baut, ist schlimmer als einer ohne.
Kage erzwingt Vertrauen an drei Punkten:

1. **Ablehnung beim Schreiben** — eine Erinnerung, die Dateien zitiert, die in
   Ihrem Repository nicht existieren, wird verweigert. Halluzinierte Zitate
   gelangen niemals in den Speicher.
2. **Zurückhalten beim Abruf** — jeder Abruf verifiziert die zitierten Dateien
   erneut. Wenn die Belege gelöscht wurden, die TTL abgelaufen ist oder die
   Erinnerung als veraltet gemeldet wurde, wird sie unterdrückt (und Ihnen im
   Viewer angezeigt, niemals stillschweigend verworfen).
3. **Veraltet-Erkennung zum Änderungszeitpunkt** — `kage pr check` (und
   `kage staleguard` als Pre-Commit-Hook) zeigt zuerst, was Ihr Diff gerade
   kaputt gemacht hat:

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

Und obendrauf eine Datenschutzgarantie: Verpacken Sie beliebige Inhalte in
`<private>…</private>`, und Kage wird sie niemals speichern — der Abschnitt
wird durch `[private]` ersetzt, bevor ein packet oder eine Beobachtung die
Festplatte berührt.

Die Session-Schleife versorgt sich selbst: Hat der Agent nichts erfasst,
werden die Beobachtungen der Session am Sitzungsende **automatisch zu
ausstehenden Entwürfen destilliert** (von Ihnen geprüft, niemals blind
vertraut); die nächste Session beginnt mit einem **„Was bisher geschah…“-
Digest** (`kage resume`); der Viewer streamt Memory-Ereignisse **live**, wenn
sie passieren; und wenn etwas kaputtgeht, sichert, repariert und baut
**`kage repair`** alles mit einem Befehl wieder auf.

Beweisen Sie es an Ihrem eigenen Repository: `kage benchmark --trust
--project .` misst Halluzinations-Ablehnung, Veraltet-Ausschluss und
Live-Verankerung — 100/100.

## Die Zahlen

- **18 % schneller als grep bei gleicher Korrektheit** auf echten
  Code-Navigationsaufgaben (N=3-Aufgaben-Suite, gleicher Agent, gleiches
  Modell; reproduzierbar mit
  `kage benchmark --project . --compare --task "<task>"`).
- **524 Geister-Aufrufkanten → 0** auf Express nach import-bewusster
  Aufruf-Auflösung: Aufgerufene werden über lokalen Scope → Imports → Paket
  aufgelöst, bevor ein reiner Namensabgleich greift, und Imports externer
  Pakete erzeugen keine Repository-Kante.
- **Echte AST-Extraktion** für Python, Go, Rust, Java und Ruby über eine
  tree-sitter-Schicht (reines WASM, null native Abhängigkeiten) — bei Click
  wurden 466 Methoden korrekt klassifiziert, wo die Regex-Extraktion 0 fand.
- **LongMemEval-S-Retrieval**: 96,17 % R@5 / 98,72 % R@10 mit null
  Abhängigkeiten.

Methodik, Befehle und Einschränkungen: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Warum Kage, wenn es schon Memory-Tools gibt

Alles-erfassende Memory-Systeme ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) lösen das *Erinnern*. Kage löst das *Vertrauen in das Erinnerte*:
Jede Erinnerung wird gegen den Code geprüft, den sie zitiert — beim Schreiben,
beim Abruf und wenn Ihr Diff den Code darunter verändert.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Automatische Erfassung + Abruf beim Sitzungsstart | ✓ | ✓ | via SDK |
| Halluzinierte Zitate **beim Schreiben abgelehnt** | ✓ | — | — |
| Veraltete Erinnerungen **beim Abruf zurückgehalten** (Belege geändert/gelöscht) | ✓ | — | — |
| **Veraltet-Erkennung beim Diff** — Ihre Änderung entwertet eine Erinnerung, Sie werden vor dem PR gewarnt | ✓ | — | — |
| Erinnerungen in git geprüft, gleicher PR wie der Code (einfache Dateien, keine DB) | ✓ | SQLite + Cloud | gehostete API |
| Einsparungsbelege (Tokens + $ pro Abruf, Wert-Hauptbuch) | ✓ | Token-Index | — |
| Truth Report auf jedem Repository, null Einrichtung | ✓ | — | — |
| Konto / API-Key erforderlich | keiner | Cloud optional | ja |

Ein Memory-System, das seine eigenen Aussagen nie erneut verifiziert, wird
*weniger* vertrauenswürdig, je länger man es benutzt. Kage ist das System,
das gut altert.

## Schnellstart

Benötigt Node.js 18+. Ein Befehl aus Ihrem Repository heraus:

```bash
npx -y @kage-core/kage-graph-mcp install
```

Das erstellt `.agent_memory/`, baut den Code-Graphen, erkennt Ihre Agenten
automatisch (Claude Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode,
Goose, Aider) und verdrahtet sie. Oder global installieren und Agenten einzeln
anbinden:

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

Oder einen Agenten manuell verbinden (ein Befehl schreibt die MCP- +
Hooks-Konfiguration):

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Nutzer von Claude Code / Codex können stattdessen das Plugin installieren:

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

Starten Sie den Agenten einmal neu und bestätigen Sie dann, dass das System
aktiv ist:

```bash
kage setup verify-agent --agent claude-code --project .
```

Von da an läuft alles im Hintergrund: Der Agent ruft zu Aufgabenbeginn
verankerte Erinnerungen ab (`kage_context`), erfasst während der Arbeit
dauerhafte Erkenntnisse (`kage_learn`), und Sie prüfen die Erinnerungen im
selben PR wie den Code. `kage refresh` verankert nach Merges neu;
`kage viewer` zeigt Gewinne, Vertrauen und was zurückgehalten wird.

## Der packet-Lebenszyklus

Jede Erkenntnis ist ein **packet**: prüfbares JSON in
`.agent_memory/packets/`, von git verfolgt und diff-bar.

**Erfassen → Zitatprüfung** (nicht existierende Pfade ablehnen)
**→ Verankern** (Fingerabdruck der zitierten Dateien) **→ Abrufen** (veraltete
Erinnerungen ausgeschlossen) **→ Auffrischen** (Verankerung bei Codeänderungen
erneut verifizieren) **→ Aktualisieren / Ersetzen / Ausmustern**.

Ein packet veraltet, wenn eine zitierte Datei fehlt oder sich seit der
Verifizierung geändert hat, seine TTL (365 Tage) abgelaufen ist oder es
gemeldet/abgekündigt wurde. Weich-veraltet (verknüpfter Code geändert) wird
zur Prüfung markiert; hart-veraltet (Belege verschwunden) wird vom Abruf
zurückgehalten. `kage compact` entfernt tote Zitate und deckt Duplikate auf;
`kage supersede` hält die Abstammung fest, wenn eine Erinnerung eine andere
ersetzt.

## Tägliche Befehle

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

Vollständige CLI- und MCP-Referenz: [Dokumentation](https://kage-core.github.io/Kage/guide.html).

## Speicherung

Alles liegt in `.agent_memory/`: `packets/` ist das dauerhafte
Repository-Gedächtnis (git-verfolgtes JSON); `graph/`, `code_graph/`,
`structural/` und `indexes/` sind mit `kage refresh` wiederherstellbar;
`reports/` enthält das Wert-Hauptbuch und Gesundheitsberichte. Die Erfassung
scannt vor dem Schreiben nach Geheimnissen und personenbezogenen Daten (PII).

## Entwicklung

```bash
cd mcp
npm install
npm test
npm run build
```

## Lizenz

GPL-3.0-only. Siehe [LICENSE](../LICENSE). Releases vor dem Wechsel zur GPL
standen unter MIT.
