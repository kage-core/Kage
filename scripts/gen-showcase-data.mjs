#!/usr/bin/env node
// Generates the bundled showcase dataset for the published viewer (docs/viewer/).
//
// The public viewer at kage-core.com/viewer/ has no live daemon behind it, so it
// reads static JSON from docs/viewer/data/. This script builds that dataset:
//   - lifecycle/trust/suppressed/metrics: copied verbatim from this repo's real
//     reports (genuine — 172 real packets, real trust gates).
//   - activity/value: REGENERATED so recalls read as organic daily usage spread
//     across the window, instead of the real repo's automation bursts that all
//     land in a single bucket. This is clearly showcase data; the viewer rebases
//     its timestamps to "now" on load so the demo never looks stale.
//
// Reproducible: deterministic seeded RNG, no network. Run: node scripts/gen-showcase-data.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reports = join(root, ".agent_memory", "reports");
const outDir = join(root, "docs", "viewer", "data", "kage");
const outReports = join(outDir, "reports");
mkdirSync(outReports, { recursive: true });

const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJSON = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

// Deterministic RNG so regenerating produces a stable diff.
let _seed = 1337;
const rng = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };
const randint = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// ---- copy the genuine reports verbatim ----
for (const name of ["lifecycle", "trust", "suppressed"]) {
  const src = join(reports, `${name}.json`);
  if (existsSync(src)) writeJSON(join(outReports, `${name}.json`), readJSON(src));
}
if (existsSync(join(root, ".agent_memory", "metrics.json"))) {
  writeJSON(join(outDir, "metrics.json"), readJSON(join(root, ".agent_memory", "metrics.json")));
}

// Real packet titles → authentic-looking feed rows.
const lifecycle = readJSON(join(reports, "lifecycle.json"));
const titles = (lifecycle.items || [])
  .filter((i) => i.status === "approved" && i.title)
  .map((i) => ({ title: i.title, type: i.type, paths: i.paths || [] }));

// ---- regenerate activity.json with an organic daily curve ----
// Anchor everything to a fixed snapshot instant; the viewer rebases to now on load.
const SNAP = Date.parse("2026-06-14T17:30:00.000Z");
const DAY = 86_400_000;
const WINDOW = 14;

// Build a believable daily recall curve: weekday-weighted, gentle upward trend, noise.
const daily = [];
let recallEvents = [];
for (let i = WINDOW - 1; i >= 0; i -= 1) {
  const dayMs = SNAP - i * DAY;
  const dow = new Date(dayMs).getUTCDay(); // 0 Sun .. 6 Sat
  const weekend = dow === 0 || dow === 6;
  const trend = 1 + (WINDOW - 1 - i) * 0.05; // ramps ~1.0 -> ~1.65
  const base = weekend ? randint(3, 9) : randint(14, 34);
  const count = Math.max(0, Math.round(base * trend) + randint(-3, 4));
  const dayStr = new Date(dayMs).toISOString().slice(0, 10);
  daily.push({ day: dayStr, recalls: count });
  // Scatter that day's recalls across working hours.
  for (let r = 0; r < count; r += 1) {
    const hour = randint(8, 22), min = randint(0, 59), sec = randint(0, 59);
    const at = new Date(dayMs);
    at.setUTCHours(hour, min, sec, randint(0, 999));
    recallEvents.push({ at: at.toISOString(), msFromSnap: SNAP - at.getTime() });
  }
}
recallEvents.sort((a, b) => a.msFromSnap - b.msFromSnap); // newest first

// A handful of captures sprinkled into the recent feed.
const captureEvents = [];
for (let c = 0; c < 6; c += 1) {
  const at = new Date(SNAP - randint(0, 6) * DAY - randint(0, 20) * 3_600_000);
  captureEvents.push({ at: at.toISOString(), msFromSnap: SNAP - at.getTime() });
}

const totalRecalls = daily.reduce((a, b) => a + b.recalls, 0);

// Feed: newest ~80 events, recalls + captures interleaved by time.
const feed = [
  ...recallEvents.map((e) => {
    const t = pick(titles);
    return { at: e.at, kind: "recall", title: t.title, detail: `recalled · rank ${randint(1, 4)}`, _ms: e.msFromSnap };
  }),
  ...captureEvents.map((e) => {
    const t = pick(titles);
    return { at: e.at, kind: "capture", title: t.title, detail: "capture", actor: "agent", _ms: e.msFromSnap };
  }),
].sort((a, b) => a._ms - b._ms).slice(0, 80).map(({ _ms, ...rest }) => rest);

const cutoff7ms = 7 * DAY;
const recalls7d = recallEvents.filter((e) => e.msFromSnap <= cutoff7ms).length;

writeJSON(join(outReports, "activity.json"), {
  schema_version: 1,
  project_dir: "showcase",
  generated_at: new Date(SNAP).toISOString(),
  showcase: true,
  window_days: 30,
  totals: { events: totalRecalls + captureEvents.length, recalls: totalRecalls, captures: captureEvents.length, recalls_7d: recalls7d },
  daily,
  events: feed,
});

// ---- regenerate value.json (gains ledger) aligned to the same recalls ----
const valueEvents = [];
let staleWithheld = 0, callerAnswers = 0;
for (const e of recallEvents) {
  const roll = rng();
  if (roll < 0.08) { valueEvents.push({ at: e.at, kind: "stale_withheld" }); staleWithheld += 1; }
  else if (roll < 0.16) { valueEvents.push({ at: e.at, kind: "caller_answered", tokens_saved: randint(1200, 5200) }); callerAnswers += 1; }
  else { valueEvents.push({ at: e.at, kind: "recall_served", tokens_saved: randint(900, 9400) }); }
}
const tokensSaved = valueEvents.reduce((a, b) => a + (b.tokens_saved || 0), 0);
const servedCount = valueEvents.filter((e) => e.kind === "recall_served").length;
writeJSON(join(outReports, "value.json"), {
  schema_version: 1,
  showcase: true,
  totals: {
    tokens_saved: tokensSaved,
    replay_tokens: tokensSaved,
    stale_withheld: staleWithheld,
    stale_caught: staleWithheld,
    recalls: servedCount,
    caller_answers: callerAnswers,
  },
  events: valueEvents.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
});

console.log(`showcase data written to docs/viewer/data/kage/`);
console.log(`  activity: ${totalRecalls} recalls across ${WINDOW} days (range ${daily[0].recalls}-${Math.max(...daily.map((d) => d.recalls))}/day), ${feed.length} feed rows`);
console.log(`  value: ${tokensSaved.toLocaleString()} tokens saved, ${staleWithheld} stale withheld, ${callerAnswers} caller answers`);
