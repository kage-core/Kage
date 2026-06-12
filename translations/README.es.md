🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Español · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### Conocimiento verificado del repositorio para agentes de código

Cada afirmación se cita contra tu código actual — y ves exactamente lo que te
ahorra. Kage rechaza memoria que cita archivos inexistentes, retiene la memoria
cuya evidencia fue eliminada y te avisa en el momento en que tus cambios
invalidan lo que tu equipo sabe. Archivos planos en tu repositorio, revisados
en el mismo PR que el código. Sin API key, sin base de datos, sin demonio.

<p>
  <a href="https://kage-core.github.io/Kage/">Sitio web</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Documentación</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Visor</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**Funciona con** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · cualquier cliente MCP

</div>

---

## Descubre lo que tu repositorio esconde — 60 segundos, cero configuración

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

El **Truth Report** (informe de la verdad) encuentra implementaciones
duplicadas, exports fantasma, archivos calientes con bus factor 1, vacíos de
conocimiento y mentiras en la documentación. En un clon recién hecho de Express:

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

Cada hallazgo cita evidencia `file:line` de *tu* código — nada es generado.

## La demo de confianza de 30 segundos

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

## Recibos, no sensaciones

Kage mantiene un libro de valor por repositorio y te muestra lo que el sistema
de memoria realmente hizo. `kage gains --project .`:

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

Los agentes transmiten el mismo recibo tras cada recuperación, y el visor abre
con una pestaña Gains alimentada por el mismo libro — cada número es trazable
hasta un evento registrado.

## Mecánica de confianza

Un agente que actúa sobre memoria equivocada es peor que uno sin ninguna.
Kage impone la confianza en tres puntos:

1. **Rechazo al escribir** — una memoria que cita archivos que no existen en tu
   repositorio es rechazada. Las citas alucinadas nunca entran al almacenamiento.
2. **Retención al recuperar** — cada recuperación vuelve a verificar los
   archivos citados. Si la evidencia fue eliminada, el TTL venció o la memoria
   fue reportada como obsoleta, se suprime (y se te muestra en el visor, nunca
   se descarta en silencio).
3. **Detección de obsolescencia al cambiar** — `kage pr check` (y
   `kage staleguard` como hook de pre-commit) abre con lo que tu diff acaba de
   romper:

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

Y encima, una garantía de privacidad: envuelve cualquier cosa en
`<private>…</private>` y Kage nunca la almacenará — el fragmento se reemplaza
por `[private]` antes de que cualquier packet u observación toque el disco.

El ciclo de sesión se cuida solo: si el agente no capturó nada, las
observaciones de la sesión se **destilan automáticamente en borradores
pendientes** al terminar (revisados por ti, nunca confiados a ciegas); la
siguiente sesión abre con un **resumen "anteriormente…"** (`kage resume`); el
visor transmite los eventos de memoria **en vivo** a medida que ocurren; y
cuando algo se rompe, **`kage repair`** respalda, repara y reconstruye en un
solo comando.

Compruébalo en tu propio repositorio: `kage benchmark --trust --project .`
mide el rechazo de alucinaciones, la exclusión de memoria obsoleta y el
anclaje en vivo — 100/100.

## Los números

- **18% más rápido que grep con igual exactitud** en tareas reales de
  navegación de código (suite de N=3 tareas, mismo agente, mismo modelo;
  reproducible con `kage benchmark --project . --compare --task "<task>"`).
- **524 aristas de llamadas fantasma → 0** en Express tras la resolución de
  llamadas consciente de imports: los destinos se resuelven por ámbito local →
  imports → paquete antes de cualquier coincidencia solo por nombre, y los
  imports de paquetes externos no producen aristas en el repositorio.
- **Extracción AST real** para Python, Go, Rust, Java y Ruby mediante una capa
  tree-sitter (WASM puro, cero dependencias nativas) — en Click, 466 métodos
  clasificados correctamente donde la extracción por regex encontró 0.
- **Recuperación LongMemEval-S**: 96.17% R@5 / 98.72% R@10 con cero
  dependencias.

Metodología, comandos y salvedades: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Por qué Kage, si ya existen herramientas de memoria

La memoria de captura total ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) resuelve el *recordar*. Kage resuelve el *confiar en lo recordado*:
cada memoria se verifica contra el código que cita — al escribirse, al
recuperarse y cuando tu diff cambia el código que tiene debajo.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Captura automática + recuperación al iniciar la sesión | ✓ | ✓ | vía SDK |
| Citas alucinadas **rechazadas al escribir** | ✓ | — | — |
| Memoria obsoleta **retenida al recuperar** (evidencia cambiada/eliminada) | ✓ | — | — |
| **Detección de obsolescencia en el diff** — tu cambio invalida una memoria y se te avisa antes del PR | ✓ | — | — |
| Memoria revisada en git, mismo PR que el código (archivos planos, sin BD) | ✓ | SQLite + nube | API alojada |
| Recibos de ahorro (tokens + $ por recuperación, libro de valor) | ✓ | índice de tokens | — |
| Truth Report en cualquier repositorio, cero configuración | ✓ | — | — |
| Cuenta / API key requerida | ninguna | nube opcional | sí |

Un sistema de memoria que nunca vuelve a verificar sus propias afirmaciones se
vuelve *menos* confiable cuanto más lo usas. Kage es el que envejece bien.

## Inicio rápido

Requiere Node.js 18+. Un comando desde dentro de tu repositorio:

```bash
npx -y @kage-core/kage-graph-mcp install
```

Esto crea `.agent_memory/`, construye el grafo de código, detecta tus agentes
automáticamente (Claude Code, Codex, Cursor, Windsurf, Gemini CLI, OpenCode,
Goose, Aider) y los conecta. O instala globalmente y conecta los agentes uno a
uno:

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

O conecta un agente manualmente (un comando escribe la configuración de MCP +
hooks):

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Los usuarios de Claude Code / Codex pueden instalar el plugin en su lugar:

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

Reinicia el agente una vez y confirma que el sistema está activo:

```bash
kage setup verify-agent --agent claude-code --project .
```

A partir de ahí todo es ambiental: el agente recupera memoria fundamentada al
iniciar la tarea (`kage_context`), captura aprendizajes duraderos mientras
trabaja (`kage_learn`) y tú revisas la memoria en el mismo PR que el código.
`kage refresh` vuelve a anclar tras los merges; `kage viewer` muestra
ganancias, confianza y qué se está reteniendo.

## El ciclo de vida del packet

Cada aprendizaje es un **packet**: JSON revisable en `.agent_memory/packets/`,
rastreado por git y comparable con diff.

**captura → verificación de citas** (rechaza rutas inexistentes) **→ anclaje**
(huella digital de los archivos citados) **→ recuperación** (memoria obsoleta
excluida) **→ refresco** (re-verifica el anclaje cuando el código cambia)
**→ actualizar / reemplazar / retirar**.

Un packet queda obsoleto cuando un archivo citado falta o cambió desde la
verificación, su TTL (365 días) venció, o fue reportado/deprecado. La
obsolescencia blanda (el código vinculado cambió) se marca para revisión; la
dura (la evidencia desapareció) se retiene de la recuperación. `kage compact`
poda citas muertas y revela duplicados; `kage supersede` registra el linaje
cuando una memoria reemplaza a otra.

## Comandos diarios

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

Referencia completa de CLI y MCP: [documentación](https://kage-core.github.io/Kage/guide.html).

## Almacenamiento

Todo vive en `.agent_memory/`: `packets/` es la memoria duradera del
repositorio (JSON rastreado por git); `graph/`, `code_graph/`, `structural/` e
`indexes/` se pueden reconstruir con `kage refresh`; `reports/` guarda el libro
de valor y los informes de salud. La captura escanea en busca de secretos y
datos personales (PII) antes de escribir.

## Desarrollo

```bash
cd mcp
npm install
npm test
npm run build
```

## Licencia

GPL-3.0-only. Ver [LICENSE](../LICENSE). Las versiones anteriores al cambio a
GPL fueron MIT.
