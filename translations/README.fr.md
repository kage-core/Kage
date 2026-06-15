🌐 [English](../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · Français · [Deutsch](README.de.md) · [हिन्दी](README.hi.md)

<div align="center">

# Kage

### La mémoire d'équipe pour agents de code qui ne se perd jamais

<img src="../docs/kage-viewer.jpg" alt="kage viewer : les décisions, runbooks et corrections de bugs captés de l'équipe, reliés au code qu'ils concernent" width="760">

<sub>`kage viewer` : les décisions, runbooks et corrections de bugs de votre équipe (violet), gardés dans le dépôt et reliés au code qu'ils concernent (bleu).</sub>

Les décisions derrière votre base de code, le runbook d'un déploiement délicat, la cause
racine d'un bug retors : ce savoir vit dans la tête des gens et file dans le chat, puis se
perd. **Kage** le capte pendant que vos agents de code travaillent, le garde sous forme de
fichiers en texte clair dans votre dépôt, et le partage avec toute votre équipe via git. La
session suivante, la vôtre ou celle d'un collègue, démarre en le sachant déjà. Chaque souvenir
est aussi confronté au code réel, donc ce qui est partagé reste vrai. Sans compte, sans base
de données, sans clé d'API.

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
  <a href="https://kage-core.com/">Site web</a> ·
  <a href="https://kage-core.com/guide.html">Documentation</a> ·
  <a href="https://kage-core.com/viewer/">Visualiseur en direct</a> ·
  <a href="https://www.npmjs.com/package/@kage-core/kage-graph-mcp">npm</a> ·
  <a href="https://kage-core.com/demo.html"><b>Demander une démo</b></a>
</p>

**Compatible avec** Claude Code · Codex · Cursor · Windsurf · Gemini CLI · Cline · Goose ·
Roo Code · Kilo Code · OpenCode · Aider · Claude Desktop · tout client MCP

</div>

---

## Installation

**Une commande, dans votre dépôt, puis redémarrez votre agent.** C'est toute la configuration.

```bash
npx -y @kage-core/kage-graph-mcp install
```

Elle crée `.agent_memory/`, construit le graphe de code, écrit la politique
`AGENTS.md` / `CLAUDE.md` qui indique aux agents d'utiliser Kage, détecte et connecte vos
agents automatiquement, et configure `.gitignore` + le pilote de fusion des packets.
Nécessite Node.js 18+. Sans compte, sans clé d'API.

**Ou demandez simplement à votre agent de l'installer.** Collez ceci dans Claude Code, Cursor
ou n'importe quel agent de code :

> Installe Kage (mémoire vérifiée pour agents de code, https://github.com/kage-core/Kage)
> dans ce dépôt : exécute `npx -y @kage-core/kage-graph-mcp install`, puis dis-moi de te redémarrer.

<details><summary>Autres méthodes (plugin · par agent · mémoire seule)</summary>

```bash
# Plugin Claude Code / Codex
/plugin marketplace add kage-core/Kage      # ensuite : /plugin install kage@kage

# connecter un seul agent (lancez kage setup list pour voir tous ceux pris en charge)
kage setup claude-code --project . --write

# uniquement le magasin de mémoire, sans connecter d'agent
kage init --project .

# confirmer que le harnais est actif
kage setup verify-agent --agent claude-code --project .
```
</details>

## Qu'est-ce que Kage

Kage est une couche de mémoire pour les agents de code. Pendant que votre agent travaille, il
capture ce qu'il apprend (décisions, corrections de bugs, conventions, comment le code
s'assemble) sous forme de petits **packets** JSON versionnés dans votre dépôt sous
`.agent_memory/`. La session suivante (la vôtre ou celle d'un collègue) démarre en le sachant
déjà, au lieu de relire ou de redemander.

Trois choses la distinguent des autres outils de mémoire :

- **Elle est collaborative.** Ce qu'une personne (ou son agent) comprend devient le savoir de
  toute l'équipe. La mémoire est partagée via git, donc la session suivante d'un collègue démarre
  avec ce que vous venez d'apprendre, pas d'une page blanche.
- **Elle est native de git.** La mémoire, ce sont des fichiers en texte clair dans votre dépôt,
  relus dans la même PR que le code, pas enfermés dans une seule machine ni dans le cloud d'un
  fournisseur. Votre savoir reste le vôtre.
- **Elle est vérifiée.** Chaque souvenir cite le code dont il parle, et Kage confronte ces
  citations à vos fichiers réels : à l'écriture, au rappel, et quand un diff modifie le code. Un
  souvenir qui ne correspond plus au code est retenu, pour que l'agent n'agisse jamais sur une
  affirmation périmée.

## Comment ça marche

Une fois installée, elle est ambiante. Vous ne lancez rien à la main :

1. **Rappeler avant d'agir.** Au début d'une tâche (et au moment où l'agent ouvre un fichier),
   Kage lui présente la mémoire vérifiée pertinente. La mémoire périmée ou supprimée est écartée.
2. **Capturer en travaillant.** Les apprentissages durables deviennent des packets. Un souvenir qui
   cite un fichier inexistant est rejeté sur-le-champ, ainsi les hallucinations n'entrent jamais
   dans le stockage.
3. **Rester honnête quand le code bouge.** Quand un diff modifie du code qu'un souvenir cite, ce
   souvenir est signalé au commit/à la PR (`kage pr check`) et retenu du rappel jusqu'à sa
   re-vérification ou son remplacement, pour que la connaissance ne pourrisse pas en silence.

Suivez le tout dans le **tableau de bord local** (`kage viewer`) : packets, graphe mémoire↔code,
portes de confiance et événements en direct au fil du travail de l'agent. Tout ce qui est entouré
de `<private>…</private>` n'est jamais stocké.

## Pourquoi Kage

La plupart des outils de mémoire ([claude-mem](https://github.com/thedotmack/claude-mem),
[agentmemory](https://github.com/rohitg00/agentmemory), mem0, Zep) stockent la mémoire par machine
ou dans un cloud qui n'est pas le vôtre, et ne la reconfrontent jamais au code. Kage la garde dans
votre dépôt et la vérifie, ainsi elle reste celle de votre équipe et reste vraie à mesure que le
code change.

| | Kage | claude-mem | mem0 / Zep |
|---|---|---|---|
| Capture automatique + rappel au début de session | ✓ | ✓ | via SDK |
| Citations hallucinées **rejetées à l'écriture** | ✓ | — | — |
| Mémoire périmée **retenue au rappel** (fichiers cités supprimés/modifiés, TTL, signalée) | ✓ | — | — |
| **Détection de péremption au diff** : alerte avant la PR quand votre changement casse un souvenir | ✓ | — | — |
| Mémoire relue dans git, dans la même PR que le code (fichiers clairs, sans BD) | ✓ | SQLite + cloud | API hébergée |
| Codifier la mémoire en fichiers `SKILL.md` d'équipe chargés automatiquement par les agents | ✓ (`kage skills`) | — | — |
| Synchronisation entre machines | ✓ votre propre dépôt distant git | leur cloud | leur cloud |
| Compte / clé d'API requis ? | aucun | cloud optionnel | oui |

## Fonctionnalités

- **Rapport de Vérité.** `kage scan` lit n'importe quel dépôt en ~60 s et révèle ses lacunes de
  connaissance les plus à risque : fichiers chauds non documentés, chemins chauds non testés, points
  chauds de complexité, dette de code non résolue et fichiers à facteur d'autobus 1 ; plus les
  implémentations dupliquées, les exports morts et les mensonges de documentation lorsqu'ils
  existent. Chaque constat cité à `file:line`. Sans configuration, sans rien générer, s'exécute
  avant toute installation.
- **Reçus d'économies.** `kage gains` tient un registre de valeur par dépôt (tokens + $ que l'agent
  n'a pas eu à dépenser à nouveau), chaque chiffre traçable jusqu'à un événement journalisé ;
  l'agent le rapporte après chaque rappel.
- **Skills d'équipe.** `kage skills` transforme des procédures durables et vérifiées en fichiers
  `.claude/skills/<name>/SKILL.md` chargés automatiquement par les agents, versionnés et partagés,
  sans cloud.
- **Mémoire personnelle et synchronisation.** `kage learn --personal` garde des notes inter-machines
  dans `~/.kage/memory`, rappelées dans une section à confiance moindre clairement séparée et
  synchronisées via votre propre dépôt distant git.
- **Boucle de session auto-réparatrice.** Les sessions non capturées sont distillées
  automatiquement en brouillons en attente que vous relisez ; `kage resume` ouvre chaque session
  par un résumé « précédemment… » ; `kage repair` répare packets et index cassés en une commande.

## Benchmarks

- **18 % plus rapide que grep à exactitude égale** sur de vraies tâches de navigation dans le code
  (suite N=3, même agent/modèle ; reproduisez avec `kage benchmark --project . --compare`).
- **Récupération LongMemEval-S :** 96,17 % R@5 / 98,72 % R@10, zéro dépendance.
- **Exactitude de la mémoire face au changement :** 0 % de périmées servies (la mémoire dont le code
  a été supprimé ou modifié est retenue), contre 100 % pour les magasins qui capturent tout.
- **Benchmark de confiance :** 100/100, couvrant le rejet des hallucinations, l'exclusion des
  périmées et l'ancrage en direct (`kage benchmark --trust --project .`).

Méthodologie, commandes et réserves : [docs/BENCHMARKS.md](../docs/BENCHMARKS.md).

## Commandes au quotidien

```bash
kage recall "comment lancer les tests" --project .
kage verify --project .        # confronte les citations au code actuel
kage pr check --project .      # détection de péremption + porte de fraîcheur du graphe
kage gains --project .         # ce que Kage vous a économisé
kage viewer --project .        # tableau de bord local
```

Référence complète CLI et MCP : [documentation](https://kage-core.com/guide.html).

## Stockage

Tout vit dans `.agent_memory/` : `packets/` est la mémoire persistante du dépôt (JSON versionné
dans git) ; `graph/`, `code_graph/`, `structural/` et `indexes/` sont reconstruits avec
`kage refresh` ; `reports/` contient le registre de valeur et les rapports de santé. La capture
analyse les secrets et les PII avant d'écrire.

## Développement

```bash
cd mcp
npm install
npm test
npm run build
```

## Licence

GPL-3.0-only. Voir [LICENSE](../LICENSE). Les versions antérieures au passage à GPL étaient sous MIT.
