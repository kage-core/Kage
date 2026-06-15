🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Español · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### Memoria de equipo para agentes de código que nunca se pierde

<img src="../docs/kage-viewer.jpg" alt="kage viewer: las decisiones, runbooks y correcciones de errores capturadas del equipo, enlazadas al código del que tratan" width="760">

<sub>`kage viewer`: las decisiones, runbooks y correcciones de errores de tu equipo (morado), guardadas en el repo y enlazadas al código del que tratan (azul).</sub>

Las decisiones detrás de tu base de código, el runbook de un despliegue delicado, la causa
raíz de un bug peliagudo: ese conocimiento vive en la cabeza de las personas y se pierde
entre los mensajes del chat. **Kage** lo captura mientras tus agentes de código trabajan, lo
guarda como archivos de texto plano en tu repositorio y lo comparte con todo tu equipo a
través de git. La siguiente sesión, tuya o de un compañero, empieza ya sabiéndolo. Cada
memoria también se contrasta con el código real, así que lo que se comparte sigue siendo
cierto. Sin cuenta, sin base de datos, sin clave de API.

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
  <img src="https://img.shields.io/badge/LongMemEval--S%20R@5-96%25-1f6feb" alt="retrieval R@5 96%">
  <img src="https://img.shields.io/badge/stale%20served-0%25-1f6feb" alt="0% stale served">
  <img src="https://img.shields.io/badge/vs%20grep-18%25%20faster-1f6feb" alt="18% faster than grep">
  <img src="https://img.shields.io/badge/external%20DBs-0-1f6feb" alt="zero external databases">
  <img src="https://img.shields.io/badge/tests-340%2B%20passing-1f6feb" alt="340+ tests passing">
</p>

<p>
  <a href="https://kage-core.com/">Sitio web</a> ·
  <a href="https://kage-core.com/guide.html">Documentación</a> ·
  <a href="https://kage-core.com/viewer/">Visor en vivo</a> ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a> ·
  <a href="https://kage-core.com/demo.html"><b>Solicitar demo</b></a>
</p>

**Compatible con** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline · Goose ·
Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · cualquier cliente MCP

</div>

---

## Instalación

**Un comando, dentro de tu repositorio, y luego reinicia tu agente.** Esa es toda la configuración.

```bash
npx -y @kage-core/kage-graph-mcp install
```

Crea `.agent_memory/`, construye el grafo de código, escribe la política
`AGENTS.md` / `CLAUDE.md` que indica a los agentes que usen Kage, detecta y conecta tus
agentes automáticamente, y configura `.gitignore` + el driver de fusión de packets.
Requiere Node.js 18+. Sin cuenta, sin clave de API.

**O simplemente pídele a tu agente que lo configure.** Pega esto en Claude Code, Cursor o
cualquier agente de código:

> Configura Kage (memoria verificada para agentes de código, https://github.com/kage-core/Kage)
> en este repositorio: ejecuta `npx -y @kage-core/kage-graph-mcp install` y luego dime que te reinicie.

<details><summary>Otras formas (plugin · por agente · solo memoria)</summary>

```bash
# Plugin de Claude Code / Codex
/plugin marketplace add kage-core/Kage      # luego: /plugin install kage@kage

# conectar un solo agente (ejecuta kage setup list para ver todos los compatibles)
kage setup claude-code --project . --write

# solo el almacén de memoria, sin conectar agentes
kage init --project .

# confirmar que el arnés está activo
kage setup verify-agent --agent claude-code --project .
```
</details>

## Qué es Kage

Kage es una capa de memoria para agentes de código. Mientras tu agente trabaja, captura
lo que aprende (decisiones, correcciones de errores, convenciones, cómo encaja el código)
como pequeños **packets** JSON confirmados en tu repositorio bajo `.agent_memory/`. La
siguiente sesión (tuya o de un compañero) empieza ya sabiéndolo, en vez de releer o volver
a preguntar.

Tres cosas la hacen distinta de otras herramientas de memoria:

- **Es colaborativa.** Lo que una persona (o su agente) descubre pasa a ser de todo el equipo.
  La memoria se comparte a través de git, así que la siguiente sesión de un compañero empieza
  con lo que acabas de aprender, no desde cero.
- **Es nativa de git.** La memoria son archivos de texto plano en tu repositorio, revisados en
  el mismo PR que el código, no encerrados en una sola máquina ni en la nube de un proveedor.
  Tu conocimiento sigue siendo tuyo.
- **Está verificada.** Cada memoria cita el código del que trata, y Kage contrasta esas citas
  con tus archivos reales: al escribir, al recordar y cuando un diff cambia el código. La
  memoria que ya no coincide con el código se retiene, para que el agente nunca actúe sobre
  una afirmación obsoleta.

## Cómo funciona

Una vez instalada, es ambiental. No ejecutas nada a mano:

1. **Recordar antes de actuar.** Al inicio de una tarea (y en el momento en que el agente abre
   un archivo), Kage le presenta la memoria verificada relevante. La memoria obsoleta o
   eliminada queda fuera.
2. **Capturar mientras trabaja.** Los aprendizajes duraderos se vuelven packets. Una memoria que
   cita un archivo que no existe se rechaza en el acto, así las alucinaciones nunca entran al
   almacén.
3. **Mantenerse honesta a medida que el código cambia.** Cuando un diff cambia código que una
   memoria cita, esa memoria se marca en el momento del commit/PR (`kage pr check`) y se retiene
   del recuerdo hasta reverificarla o reemplazarla, para que el conocimiento no se pudra en
   silencio.

Míralo en el **panel local** (`kage viewer`): packets, el grafo memoria↔código, las
compuertas de confianza y los eventos en vivo a medida que el agente trabaja. Cualquier cosa
envuelta en `<private>…</private>` nunca se almacena.

## Por qué Kage

La mayoría de las herramientas de memoria ([claude-mem](https://github.com/thedotmack/claude-mem),
[agentmemory](https://github.com/rohitg00/agentmemory), mem0, Zep) guardan la memoria por máquina
o en una nube que no es tuya, y nunca la contrastan con el código. Kage la mantiene en tu
repositorio y la verifica, así sigue siendo de tu equipo y sigue siendo cierta a medida que el
código cambia.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Captura automática + recuerdo al inicio de sesión | ✓ | ✓ | vía SDK |
| Citas alucinadas **rechazadas al escribir** | ✓ | — | — |
| Memoria obsoleta **retenida al recordar** (archivos citados borrados/cambiados, TTL, reportada) | ✓ | — | — |
| **Detección de obsolescencia en el diff**: avisa antes del PR si tu cambio rompe una memoria | ✓ | — | — |
| Memoria revisada en git, en el mismo PR que el código (archivos planos, sin BD) | ✓ | SQLite + nube | API alojada |
| Codificar la memoria en archivos `SKILL.md` de equipo que los agentes autocargan | ✓ (`kage skills`) | — | — |
| Sincronización entre máquinas | ✓ tu propio remoto de git | su nube | su nube |
| ¿Requiere cuenta / clave de API? | ninguna | nube opcional | sí |

## Funciones

- **Informe de Verdad.** `kage scan` lee cualquier repositorio en ~60 s y revela sus vacíos de
  conocimiento de mayor riesgo: archivos calientes sin documentar, rutas calientes sin pruebas,
  puntos calientes de complejidad, deuda de código sin resolver y archivos con factor bus 1;
  además de implementaciones duplicadas, exportaciones muertas y mentiras en la documentación
  cuando existen. Cada hallazgo citado a `file:line`. Sin configuración, sin generar nada, se
  ejecuta antes de instalar nada.
- **Recibos de ahorro.** `kage gains` mantiene un libro de valor por repositorio (tokens + $ que
  el agente no tuvo que volver a gastar), con cada número trazable a un evento registrado; el
  agente lo comunica tras cada recuerdo.
- **Skills de equipo.** `kage skills` convierte procedimientos duraderos y verificados en archivos
  `.claude/skills/<name>/SKILL.md` que los agentes autocargan, confirmados y compartidos, sin nube.
- **Memoria personal y sincronización.** `kage learn --personal` guarda notas entre máquinas en
  `~/.kage/memory`, recordadas como una sección de menor confianza claramente separada y
  sincronizadas por tu propio remoto de git.
- **Bucle de sesión autorreparable.** Las sesiones no capturadas se destilan automáticamente en
  borradores pendientes que revisas; `kage resume` abre cada sesión con un resumen «anteriormente…»;
  `kage repair` arregla packets e índices rotos con un solo comando.

## Benchmarks

- **18% más rápido que grep con igual exactitud** en tareas reales de navegación de código (suite
  N=3, mismo agente/modelo; reprodúcelo con `kage benchmark --project . --compare`).
- **Recuperación LongMemEval-S:** 96.17% R@5 / 98.72% R@10, sin dependencias.
- **Exactitud de memoria ante cambios:** 0% de obsoletas servidas (la memoria cuyo código fue
  borrado o cambiado se retiene), frente al 100% de los almacenes que capturan todo.
- **Benchmark de confianza:** 100/100, cubriendo rechazo de alucinaciones, exclusión de obsoletas
  y anclaje en vivo (`kage benchmark --trust --project .`).

Metodología, comandos y advertencias: [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Comandos diarios

```bash
kage recall "cómo ejecuto las pruebas" --project .
kage verify --project .        # contrasta las citas con el código actual
kage pr check --project .      # detección de obsolescencia + compuerta de frescura del grafo
kage gains --project .         # lo que Kage te ahorró
kage viewer --project .        # panel local
```

Referencia completa de CLI y MCP: [documentación](https://kage-core.com/guide.html).

## Almacenamiento

Todo vive en `.agent_memory/`: `packets/` es la memoria persistente del repositorio (JSON
versionado en git); `graph/`, `code_graph/`, `structural/` e `indexes/` se reconstruyen con
`kage refresh`; `reports/` guarda el libro de valor y los informes de salud. La captura escanea
secretos y PII antes de escribir.

## Desarrollo

```bash
cd mcp
npm install
npm test
npm run build
```

## Licencia

GPL-3.0-only. Ver [LICENSE](../LICENSE). Las versiones anteriores al cambio a GPL eran MIT.
