🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · Français · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### Une connaissance du dépôt vérifiée, pour les agents de code

Chaque affirmation est citée par rapport à votre code actuel — et vous voyez
exactement ce que cela vous fait économiser. Kage rejette la mémoire qui cite
des fichiers inexistants, retient la mémoire dont la preuve a été supprimée et
vous avertit dès que vos changements invalident ce que votre équipe sait. De
simples fichiers dans votre dépôt, relus dans la même PR que le code. Pas de
clé API, pas de base de données, pas de démon.

<p>
  <a href="https://kage-core.github.io/Kage/">Site web</a>
  ·
  <a href="https://kage-core.github.io/Kage/guide.html">Documentation</a>
  ·
  <a href="https://kage-core.github.io/Kage/viewer/">Visionneuse</a>
  ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/v/@kage-core/kage-graph-mcp?color=41ff8f&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp"><img src="https://img.shields.io/npm/dm/@kage-core/kage-graph-mcp?color=41ff8f" alt="downloads"></a>
  <img src="https://img.shields.io/npm/l/@kage-core/kage-graph-mcp?color=41ff8f" alt="license">
  <img src="https://img.shields.io/badge/trust%20benchmark-100%2F100-41ff8f" alt="trust 100/100">
</p>

**Compatible avec** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline ·
Goose · Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · tout client MCP

</div>

---

## Découvrez ce que votre dépôt vous cache — 60 secondes, zéro configuration

```bash
npx -y @kage-core/kage-graph-mcp scan --project .
```

Le **Truth Report** (rapport de vérité) détecte les implémentations dupliquées,
les exports fantômes, les fichiers sensibles à bus factor 1, les vides de
connaissance et les mensonges de la documentation. Sur un clone tout frais
d'Express :

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

Chaque constat cite une preuve `file:line` issue de *votre* code — rien n'est
généré.

## La démo de confiance en 30 secondes

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

## Des reçus, pas des impressions

Kage tient un registre de valeur par dépôt et vous montre ce que le harnais de
mémoire a réellement fait. `kage gains --project .` :

```text
This week Kage saved you ~564K tokens (~$8.46), blocked 0 stale memories,
caught 0 stale at change-time, answered 2 recalls.
```

Les agents relaient le même reçu après chaque rappel, et la visionneuse ouvre
sur un onglet Gains alimenté par le même registre — chaque chiffre est
traçable jusqu'à un événement journalisé.

## Mécanique de la confiance

Un agent qui agit sur une mémoire fausse est pire qu'un agent sans mémoire.
Kage impose la confiance en trois points :

1. **Rejet à l'écriture** — une mémoire qui cite des fichiers absents de votre
   dépôt est refusée. Les citations hallucinées n'entrent jamais dans le
   stockage.
2. **Rétention au rappel** — chaque rappel re-vérifie les fichiers cités. Si la
   preuve a été supprimée, si le TTL a expiré ou si la mémoire a été signalée
   comme périmée, elle est supprimée du résultat (et affichée dans la
   visionneuse, jamais écartée en silence).
3. **Détection de péremption au moment du changement** — `kage pr check` (et
   `kage staleguard` en hook de pre-commit) commence par ce que votre diff
   vient de casser :

   ```text
   ⚠ Your changes invalidated 15 team memories:
     • CI: Kage PR Check must block only on hard-stale memory — cites mcp/kernel.ts (file changed)
     fix: kage learn (update) | kage supersede --packet <id>
   ```

Et par-dessus, une garantie de confidentialité : entourez n'importe quoi de
`<private>…</private>` et Kage ne le stockera jamais — le passage est remplacé
par `[private]` avant qu'un packet ou une observation ne touche le disque.

La boucle de session s'entretient toute seule : si l'agent n'a rien capturé,
les observations de la session sont **automatiquement distillées en brouillons
en attente** à la fin de la session (relus par vous, jamais acceptés
aveuglément) ; la session suivante s'ouvre sur un **résumé « précédemment… »**
(`kage resume`) ; la visionneuse diffuse les événements mémoire **en direct**
au fil de l'eau ; et quand quelque chose casse, **`kage repair`** sauvegarde,
répare et reconstruit en une seule commande.

Prouvez-le sur votre propre dépôt : `kage benchmark --trust --project .`
mesure le rejet des hallucinations, l'exclusion du périmé et l'ancrage en
direct — 100/100.

## Les chiffres

- **18 % plus rapide que grep à exactitude égale** sur de vraies tâches de
  navigation dans le code (suite de N=3 tâches, même agent, même modèle ;
  reproductible avec `kage benchmark --project . --compare --task "<task>"`).
- **524 arêtes d'appels fantômes → 0** sur Express après la résolution
  d'appels consciente des imports : les appelés sont résolus via la portée
  locale → les imports → le paquet avant toute correspondance par simple nom,
  et les imports de paquets externes ne produisent aucune arête dans le dépôt.
- **Véritable extraction AST** pour Python, Go, Rust, Java et Ruby via une
  couche tree-sitter (WASM pur, zéro dépendance native) — sur Click,
  466 méthodes correctement classées là où l'extraction par regex en trouvait 0.
- **Récupération LongMemEval-S** : 96,17 % R@5 / 98,72 % R@10 avec zéro
  dépendance.

Méthodologie, commandes et réserves : [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Pourquoi Kage, alors que des outils de mémoire existent déjà

La mémoire « tout capturer » ([claude-mem](https://github.com/thedotmack/claude-mem),
mem0, Zep) résout le fait de *se souvenir*. Kage résout le fait de *faire
confiance à ce dont on se souvient* : chaque mémoire est confrontée au code
qu'elle cite — à l'écriture, au rappel, et quand votre diff modifie le code
qu'elle recouvre.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Capture automatique + rappel en début de session | ✓ | ✓ | via SDK |
| Citations hallucinées **rejetées à l'écriture** | ✓ | — | — |
| Mémoire périmée **retenue au rappel** (preuve modifiée/supprimée) | ✓ | — | — |
| **Détection de péremption au diff** — votre changement invalide une mémoire, vous êtes prévenu avant la PR | ✓ | — | — |
| Mémoire relue dans git, même PR que le code (fichiers simples, pas de BDD) | ✓ | SQLite + cloud | API hébergée |
| Reçus d'économies (tokens + $ par rappel, registre de valeur) | ✓ | index de tokens | — |
| Truth Report sur n'importe quel dépôt, zéro configuration | ✓ | — | — |
| Compte / clé API nécessaire | aucun | cloud optionnel | oui |

Un système de mémoire qui ne re-vérifie jamais ses propres affirmations devient
*moins* fiable à mesure qu'on l'utilise. Kage est celui qui vieillit bien.

## Démarrage rapide

Nécessite Node.js 18+. Une seule commande depuis votre dépôt :

```bash
npx -y @kage-core/kage-graph-mcp install
```

Cela crée `.agent_memory/`, construit le graphe de code, détecte
automatiquement vos agents (Claude Code, Codex, Cursor, Windsurf, Gemini CLI,
OpenCode, Goose, Aider) et les câble. Ou installez globalement et connectez
les agents un par un :

```bash
npm install -g @kage-core/kage-graph-mcp
cd your-repo
kage install                   # or: kage init --project . for memory only
```

Ou connectez un agent manuellement (une commande écrit la configuration MCP +
hooks) :

```bash
kage setup claude-code --project . --write     # Claude Code
kage setup codex       --project . --write     # Codex
kage setup cursor      --project . --write     # Cursor
kage setup windsurf    --project . --write     # Windsurf
# also: gemini-cli, cline, goose, roo-code, kilo-code, opencode, aider,
#       claude-desktop, generic-mcp — see: kage setup list
```

Les utilisateurs de Claude Code / Codex peuvent installer le plugin à la
place :

```bash
/plugin marketplace add kage-core/Kage      # then: /plugin install kage@kage
codex plugin marketplace add kage-core/Kage # then: codex plugin add kage@kage
```

Redémarrez l'agent une fois, puis confirmez que le harnais est actif :

```bash
kage setup verify-agent --agent claude-code --project .
```

Ensuite, tout devient ambiant : l'agent rappelle une mémoire ancrée au début
de la tâche (`kage_context`), capture des apprentissages durables pendant
qu'il travaille (`kage_learn`), et vous relisez la mémoire dans la même PR que
le code. `kage refresh` ré-ancre après les merges ; `kage viewer` montre les
gains, la confiance et ce qui est retenu.

## Le cycle de vie du packet

Chaque apprentissage est un **packet** : du JSON relisible dans
`.agent_memory/packets/`, suivi par git et diffable.

**capture → vérification des citations** (rejet des chemins inexistants)
**→ ancrage** (empreinte des fichiers cités) **→ rappel** (mémoire périmée
exclue) **→ rafraîchissement** (re-vérification de l'ancrage quand le code
change) **→ mise à jour / remplacement / retrait**.

Un packet devient périmé quand un fichier cité est manquant ou a changé depuis
la vérification, quand son TTL (365 jours) a expiré, ou quand il a été
signalé/déprécié. La péremption douce (le code lié a changé) est marquée pour
relecture ; la péremption dure (la preuve a disparu) est retenue du rappel.
`kage compact` élague les citations mortes et fait remonter les doublons ;
`kage supersede` enregistre la filiation quand une mémoire en remplace une
autre.

## Commandes du quotidien

```bash
kage recall "how do I run tests" --project .
kage code-graph "who calls createPacket" --project .   # definition + call sites
kage verify --project .        # check citations against current code
kage pr check --project .      # stale-catch + graph freshness gate
kage gains --project .         # what Kage saved you
kage viewer --project .        # local dashboard
```

Référence complète CLI et MCP : [documentation](https://kage-core.github.io/Kage/guide.html).

## Stockage

Tout vit dans `.agent_memory/` : `packets/` est la mémoire durable du dépôt
(JSON suivi par git) ; `graph/`, `code_graph/`, `structural/` et `indexes/`
sont reconstructibles avec `kage refresh` ; `reports/` contient le registre de
valeur et les rapports de santé. La capture recherche les secrets et les
données personnelles (PII) avant d'écrire.

## Développement

```bash
cd mcp
npm install
npm test
npm run build
```

## Licence

GPL-3.0-only. Voir [LICENSE](../LICENSE). Les versions antérieures au passage
à la GPL étaient sous MIT.
