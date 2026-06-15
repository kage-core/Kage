🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · Deutsch · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### Verlässliches Gedächtnis für Coding-Agenten

<img src="../docs/kage-hero.svg" alt="kage scan: der Truth Report, belegt mit file:line" width="760">

Dein Coding-Agent vergisst deine Codebasis in jeder Sitzung, also erklärst du sie immer
wieder neu. **Kage** gibt ihm ein dauerhaftes Gedächtnis, das als einfache Textdateien in
deinem Repository lebt, und gleicht jede Erinnerung mit deinem echten Code ab, damit der
Agent nie auf Basis von etwas handelt, das nicht mehr stimmt. Über git mit dem ganzen Team
geteilt. Kein Konto, keine Datenbank, kein API-Schlüssel.

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
  <a href="https://kage-core.com/">Website</a> ·
  <a href="https://kage-core.com/guide.html">Doku</a> ·
  <a href="https://kage-core.com/viewer/">Live-Viewer</a> ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a> ·
  <a href="https://kage-core.com/demo.html"><b>Demo anfragen</b></a>
</p>

**Funktioniert mit** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline · Goose ·
Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · jedem MCP-Client

</div>

---

## Installation

**Ein Befehl, in deinem Repository, dann starte deinen Agenten neu.** Das ist die gesamte Einrichtung.

```bash
npx -y @kage-core/kage-graph-mcp install
```

Es legt `.agent_memory/` an, baut den Code-Graphen, schreibt die `AGENTS.md` / `CLAUDE.md`-Richtlinie,
die Agenten anweist, Kage zu nutzen, erkennt und verbindet deine Agenten automatisch und konfiguriert
`.gitignore` + den Packet-Merge-Treiber. Erfordert Node.js 18+. Kein Konto, kein API-Schlüssel.

**Oder lass es einfach deinen Agenten einrichten.** Füge das in Claude Code, Cursor oder einen
beliebigen Coding-Agenten ein:

> Richte Kage (verifiziertes Gedächtnis für Coding-Agenten, https://github.com/kage-core/Kage)
> in diesem Repository ein: führe `npx -y @kage-core/kage-graph-mcp install` aus und sag mir dann,
> dass ich dich neu starten soll.

<details><summary>Weitere Wege (Plugin · pro Agent · nur Gedächtnis)</summary>

```bash
# Claude Code / Codex Plugin
/plugin marketplace add kage-core/Kage      # danach: /plugin install kage@kage

# einen einzelnen Agenten verbinden (kage setup list zeigt alle unterstützten)
kage setup claude-code --project . --write

# nur der Gedächtnisspeicher, ohne Agenten zu verbinden
kage init --project .

# bestätigen, dass das Harness aktiv ist
kage setup verify-agent --agent claude-code --project .
```
</details>

## Was ist Kage

Kage ist eine Gedächtnisschicht für Coding-Agenten. Während dein Agent arbeitet, erfasst er das
Gelernte (Entscheidungen, Bugfixes, Konventionen, wie der Code zusammenpasst) als kleine
JSON-**Packets**, die unter `.agent_memory/` im Repository eingecheckt werden. Die nächste Sitzung
(deine oder die eines Teammitglieds) startet bereits mit diesem Wissen, statt erneut zu lesen oder
nachzufragen.

Zwei Dinge unterscheiden es von anderen Gedächtnis-Tools:

- **Es ist verifiziert.** Jede Erinnerung zitiert den Code, um den es geht, und Kage gleicht diese
  Zitate mit deinen echten Dateien ab: beim Schreiben, beim Abruf und wenn ein Diff den Code ändert.
  Erinnerungen, die nicht mehr zum Code passen, werden zurückgehalten, damit der Agent nie auf einer
  veralteten Aussage handelt.
- **Es ist git-nativ.** Das Gedächtnis besteht aus einfachen Textdateien in deinem Repository, im
  selben PR wie der Code geprüft und über git mit dem ganzen Team geteilt, nicht eingesperrt in einer
  Maschine oder der Cloud eines Anbieters.

## Wie es funktioniert

Einmal installiert, läuft es im Hintergrund. Du führst nichts von Hand aus:

1. **Abrufen vor dem Handeln.** Zu Beginn einer Aufgabe (und in dem Moment, in dem der Agent eine
   Datei öffnet) zeigt Kage die relevante verifizierte Erinnerung. Veraltete oder gelöschte
   Erinnerungen bleiben außen vor.
2. **Erfassen während der Arbeit.** Dauerhafte Erkenntnisse werden zu Packets. Eine Erinnerung, die
   eine nicht existierende Datei zitiert, wird sofort abgelehnt, sodass Halluzinationen nie in den
   Speicher gelangen.
3. **Ehrlich bleiben, wenn sich der Code bewegt.** Wenn ein Diff Code ändert, den eine Erinnerung
   zitiert, wird sie beim Commit/PR (`kage pr check`) markiert und vom Abruf zurückgehalten, bis sie
   neu verifiziert oder ersetzt ist, damit Wissen nicht still verrottet.

Sieh es im **lokalen Dashboard** (`kage viewer`): Packets, den Gedächtnis↔Code-Graphen, die
Vertrauens-Gates und Live-Ereignisse, während der Agent arbeitet. Alles, was in
`<private>…</private>` eingeschlossen ist, wird nie gespeichert.

## Warum Kage

Die meisten Gedächtnis-Tools ([claude-mem](https://github.com/thedotmack/claude-mem),
[agentmemory](https://github.com/rohitg00/agentmemory), mem0, Zep) speichern das Gedächtnis pro
Maschine oder in einer Cloud, die dir nicht gehört, und gleichen es nie wieder mit dem Code ab. Kage
behält es in deinem Repository und verifiziert es, sodass es das deines Teams bleibt und wahr bleibt,
während sich der Code ändert.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Automatisches Erfassen + Abruf zu Sitzungsbeginn | ✓ | ✓ | via SDK |
| Halluzinierte Zitate **beim Schreiben abgelehnt** | ✓ | — | — |
| Veraltetes Gedächtnis **beim Abruf zurückgehalten** (zitierte Dateien gelöscht/geändert, TTL, gemeldet) | ✓ | — | — |
| **Veraltungs-Erkennung beim Diff**: warnt vor dem PR, wenn deine Änderung eine Erinnerung bricht | ✓ | — | — |
| Gedächtnis in git geprüft, im selben PR wie der Code (einfache Dateien, keine DB) | ✓ | SQLite + Cloud | gehostete API |
| Gedächtnis in Team-`SKILL.md`-Dateien festschreiben, die Agenten automatisch laden | ✓ (`kage skills`) | — | — |
| Synchronisierung zwischen Maschinen | ✓ dein eigenes git-Remote | deren Cloud | deren Cloud |
| Konto / API-Schlüssel nötig? | keiner | Cloud optional | ja |

## Funktionen

- **Truth Report.** `kage scan` liest jedes Repository in ~60 s und legt seine risikoreichsten
  Wissenslücken offen: undokumentierte Hot-Files, ungetestete Hot-Paths, Komplexitäts-Hotspots,
  ungelöste Code-Schulden und Bus-Faktor-1-Dateien; dazu doppelte Implementierungen, tote Exporte und
  Doku-Lügen, sofern vorhanden. Jeder Befund mit `file:line` belegt. Keine Einrichtung, nichts
  generiert, läuft schon bevor du irgendetwas installierst.
- **Ersparnis-Belege.** `kage gains` führt ein Wert-Hauptbuch pro Repository (Tokens + $, die der
  Agent nicht erneut ausgeben musste), jede Zahl rückverfolgbar zu einem protokollierten Ereignis;
  der Agent gibt es nach jedem Abruf weiter.
- **Team-Skills.** `kage skills` verwandelt dauerhafte, verifizierte Abläufe in
  `.claude/skills/<name>/SKILL.md`-Dateien, die Agenten automatisch laden, eingecheckt und geteilt,
  ohne Cloud.
- **Persönliches Gedächtnis & Sync.** `kage learn --personal` hält maschinenübergreifende Notizen in
  `~/.kage/memory`, abgerufen als klar getrennter Abschnitt mit geringerem Vertrauen und über dein
  eigenes git-Remote synchronisiert.
- **Selbstheilende Sitzungsschleife.** Nicht erfasste Sitzungen werden automatisch zu ausstehenden
  Entwürfen destilliert, die du prüfst; `kage resume` öffnet jede Sitzung mit einer
  „Was bisher geschah“-Zusammenfassung; `kage repair` repariert kaputte Packets und Indizes mit einem
  Befehl.

## Benchmarks

- **18 % schneller als grep bei gleicher Korrektheit** bei echten Code-Navigationsaufgaben (N=3-Suite,
  gleicher Agent/Modell; reproduzierbar mit `kage benchmark --project . --compare`).
- **LongMemEval-S-Retrieval:** 96,17 % R@5 / 98,72 % R@10, null Abhängigkeiten.
- **Gedächtnis-Korrektheit bei Änderung:** 0 % veraltet ausgeliefert (Gedächtnis, dessen Code gelöscht
  oder geändert wurde, wird zurückgehalten), gegenüber 100 % bei Speichern, die alles erfassen.
- **Vertrauens-Benchmark:** 100/100, deckt Halluzinations-Ablehnung, Veraltungs-Ausschluss und
  Live-Verankerung ab (`kage benchmark --trust --project .`).

Methodik, Befehle und Einschränkungen: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Tägliche Befehle

```bash
kage recall "wie führe ich die Tests aus" --project .
kage verify --project .        # Zitate mit dem aktuellen Code abgleichen
kage pr check --project .      # Veraltungs-Erkennung + Graph-Frische-Gate
kage gains --project .         # was Kage dir gespart hat
kage viewer --project .        # lokales Dashboard
```

Vollständige CLI- und MCP-Referenz: [Doku](https://kage-core.com/guide.html).

## Speicherung

Alles liegt in `.agent_memory/`: `packets/` ist das dauerhafte Repo-Gedächtnis (git-versioniertes
JSON); `graph/`, `code_graph/`, `structural/` und `indexes/` sind mit `kage refresh` neu baubar;
`reports/` enthält das Wert-Hauptbuch und Health-Reports. Die Erfassung scannt vor dem Schreiben auf
Secrets und PII.

## Entwicklung

```bash
cd mcp
npm install
npm test
npm run build
```

## Lizenz

GPL-3.0-only. Siehe [LICENSE](../LICENSE). Releases vor dem Wechsel zu GPL waren MIT.
