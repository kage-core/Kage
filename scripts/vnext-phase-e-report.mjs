#!/usr/bin/env node
// Kage vNext — Phase E / GA decision report.
//
// This is the honest ledger that decides whether Kage v4 may go GA. It has ONE job: to be TRUE, even
// when the truth is "not yet". It NEVER fabricates a pilot number, a paid conversion, or a cohort saving,
// and it EXITS NON-ZERO whenever a required gate is unmet — which, until real design-partner pilots run,
// it always is.
//
// It splits the readiness bar into two halves that are graded very differently:
//
//   TECHNICAL gates A–E are code-provable HERE. Each is enforced by a real automated test (named below)
//   that runs against a real embedded PostgreSQL. This report does not re-assert a green check it cannot
//   observe from a static process; it records which test is the authority and requires that test to be
//   green in CI. The authoritative proof is `npm test --prefix mcp` (which runs mcp/vnext/phase-e-gate.
//   test.ts end-to-end) — not this script's say-so.
//
//   The COMMERCIAL gate is NOT code-completable. "Three design partners complete pilots and at least one
//   accepts paid terms" requires real external partners over real weeks. This report reads the pilot
//   cohort from an optional evidence file (docs/commercial/pilot-cohort.json). Absent that file — the
//   state today — it reports pilots NOT RUN, zero cohort, zero paid conversions, and FAILS the commercial
//   gate. There is deliberately no flag that fakes it.
//
// Usage: node scripts/vnext-phase-e-report.mjs --project <dir> [--json]
// Exit:  0 only if EVERY required gate is met; non-zero otherwise (today: always non-zero).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}

const projectDir = resolve(argValue("--project", process.cwd()));
const asJson = process.argv.includes("--json");

// The technical gates. Each names the test that IS its proof. A gate is "code_provable" and its status
// is "enforced_by_test": the report asserts the enforcing test EXISTS in the tree, and defers the pass
// itself to `npm test` (never claims a green it did not run).
const TECHNICAL_GATES = [
  {
    id: "A",
    name: "Tenant, repository, and path-permission isolation",
    enforced_by: [
      "mcp/vnext/phase-e-gate.test.ts",
      "mcp/vnext/workspace/sync-routes.test.ts",
      "mcp/vnext/workspace/metrics.test.ts",
    ],
    proves: "cross_tenant_reads=0 — a cross-tenant/cross-repository/out-of-scope read returns zero rows",
    required: true,
  },
  {
    id: "B",
    name: "Raw prompts and tool payloads stay local",
    enforced_by: ["mcp/vnext/phase-e-gate.test.ts", "mcp/vnext/sync/sync.test.ts"],
    proves: "raw_payloads_synced=0 — a batch carrying local_raw evidence is refused before any row lands",
    required: true,
  },
  {
    id: "C",
    name: "GitHub signatures, least privilege, token expiry, delivery idempotency",
    enforced_by: ["mcp/vnext/workspace/github/github.test.ts", "mcp/vnext/phase-e-gate.test.ts"],
    proves:
      "invalid_webhooks_accepted=0 — bad signature is 401 before parse; a redelivery is processed once; " +
      "read-only permissions requested; installation tokens cached only to the reported expiry",
    required: true,
  },
  {
    id: "D",
    name: "Review authority, self-approval prevention, Stripe idempotency, server-side entitlements, OIDC/SCIM",
    enforced_by: [
      "mcp/vnext/phase-e-gate.test.ts",
      "mcp/vnext/workspace/review.test.ts",
      "mcp/vnext/workspace/billing/billing.test.ts",
      "mcp/vnext/workspace/billing/hardening.test.ts",
      "mcp/vnext/workspace/enterprise/enterprise.test.ts",
    ],
    proves:
      "self_approvals=0 — a proposer cannot approve their own high-impact claim (403); Stripe webhooks " +
      "idempotent by event id; entitlements resolved from stored server state; OIDC/SCIM verified with jose",
    required: true,
  },
  {
    id: "E",
    name: "Backup/restore, export/delete, retention, and local operation during a workspace outage",
    enforced_by: [
      "mcp/vnext/phase-e-gate.test.ts",
      "mcp/vnext/workspace/enterprise/enterprise.test.ts",
      "deploy/workspace/deploy.test.mjs",
    ],
    proves:
      "local_context_available_during_workspace_outage=true and export_available_after_entitlement_expiry=true " +
      "— a lapsed customer keeps local runtime and export; backup/restore round-trips against real PG",
    required: true,
  },
];

// The commercial gate is required and CANNOT be code-completed. Its evidence, if it ever exists, is an
// operator-produced cohort file. Its SHAPE is documented so a future reader knows exactly what real
// pilots must record — but this report will never write it, and never invents its contents.
const PILOT_COHORT_FILE = join(ROOT, "docs", "commercial", "pilot-cohort.json");

// Honest gaps: every part of Phase E that needs a live external system or a real human process and
// therefore CANNOT be proven by the test suite in this repository.
const HONEST_GAPS = [
  "design_partner_pilots_not_run — no design partner has completed the 7-audit + 14-assist protocol; cohort is empty",
  "live_github_app_registration_needed — signature/idempotency/least-privilege are fixture-proven; a real App id + webhook secret against api.github.com is not exercised",
  "live_stripe_keys_needed — webhook idempotency, server entitlements, and the credit cap are fixture-proven; a live Stripe account + price ids are not exercised",
  "live_oidc_scim_idp_needed — token/assertion verification is proven with a locally-minted RS256 keypair; interop with a real Okta/Entra/Google tenant is not exercised",
  "docker_build_not_run_here — the Dockerfile + compose are lint/structure-tested; an actual image build/run needs a Docker daemon in CI",
];

// GA is abandoned (not merely delayed) if any of these becomes true. Recorded so the decision is a
// standing contract, not a one-time vibe.
const KILL_CRITERIA = [
  "A tenant-isolation or raw-payload leak is found in production data that the gate did not catch.",
  "No design partner accepts paid terms after three completed pilots AND no product change is identified that would change that.",
  "The measured pilot cohort shows Kage INCREASES exact request cost and the no-overhead credit cannot cover it within the platform-fee cap.",
];

function loadPilotCohort() {
  if (!existsSync(PILOT_COHORT_FILE)) {
    return {
      status: "not_run",
      source: null,
      partners: [],
      partners_completed: 0,
      paid_conversions: 0,
      exact_cost_nonincrease_or_credit_proven: null,
      distributions: null,
      note: "No pilot cohort evidence file present. Pilots have not been run; every cohort number is null, not zero-with-meaning.",
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(PILOT_COHORT_FILE, "utf8"));
  } catch (error) {
    return {
      status: "unreadable",
      source: PILOT_COHORT_FILE,
      partners: [],
      partners_completed: 0,
      paid_conversions: 0,
      exact_cost_nonincrease_or_credit_proven: null,
      distributions: null,
      note: `Pilot cohort file present but unreadable (${error.message}); treated as no evidence.`,
    };
  }
  const partners = Array.isArray(parsed.partners) ? parsed.partners : [];
  const completed = partners.filter((p) => p && p.pilot_completed === true).length;
  const paid = partners.filter((p) => p && p.paid_conversion === true).length;
  return {
    status: completed > 0 ? "reported" : "not_run",
    source: PILOT_COHORT_FILE,
    partners,
    partners_completed: completed,
    paid_conversions: paid,
    // This flag is only ever TRUE when the cohort file explicitly records a measured proof. The report
    // does not derive it — an operator who ran the pilots asserts it, with data behind it.
    exact_cost_nonincrease_or_credit_proven:
      typeof parsed.exact_cost_nonincrease_or_credit_proven === "boolean"
        ? parsed.exact_cost_nonincrease_or_credit_proven
        : null,
    distributions: parsed.distributions ?? null,
    note: parsed.note ?? null,
  };
}

function evaluate() {
  const pilot = loadPilotCohort();

  const technical = TECHNICAL_GATES.map((gate) => {
    const missing = gate.enforced_by.filter((rel) => !existsSync(join(ROOT, rel)));
    return {
      ...gate,
      // The one thing this static report CAN verify: the enforcing test actually exists in the tree.
      // Whether it passes is `npm test`'s job, recorded as "enforced_by_test", never as a fabricated pass.
      status: missing.length === 0 ? "enforced_by_test" : "enforcing_test_missing",
      missing_tests: missing,
    };
  });
  const technicalOk = technical.every((g) => g.status === "enforced_by_test");

  // The commercial gate: three partners completed AND at least one paid AND the exact-cost proof recorded.
  const commercial = {
    id: "commercial",
    name: "Design-partner pilots and a paid conversion",
    required: true,
    partners_completed: pilot.partners_completed,
    partners_required: 3,
    paid_conversions: pilot.paid_conversions,
    paid_conversions_required: 1,
    exact_cost_nonincrease_or_credit_proven: pilot.exact_cost_nonincrease_or_credit_proven,
    met:
      pilot.partners_completed >= 3 &&
      pilot.paid_conversions >= 1 &&
      pilot.exact_cost_nonincrease_or_credit_proven === true,
    status: pilot.status,
  };

  const requiredGates = [
    ...technical.map((g) => ({ id: g.id, required: g.required, met: g.status === "enforced_by_test" })),
    { id: commercial.id, required: commercial.required, met: commercial.met },
  ];
  const allRequiredMet = requiredGates.every((g) => !g.required || g.met);

  return {
    ok: true,
    project_dir: projectDir,
    generated_at: new Date().toISOString(),
    decision: allRequiredMet ? "GO" : "NO-GO",
    technical_gates: technical,
    technical_gates_all_enforced: technicalOk,
    commercial_gate: commercial,
    pilot_cohort: pilot,
    honest_gaps: HONEST_GAPS,
    kill_criteria: KILL_CRITERIA,
    required_gates_all_met: allRequiredMet,
  };
}

function render(v) {
  const lines = [
    `Kage vNext Phase E / GA decision report — ${v.project_dir}`,
    `  generated_at: ${v.generated_at}`,
    "",
    `  DECISION: ${v.decision}`,
    "",
    "  TECHNICAL GATES (code-provable; the named test is the authority, run via `npm test --prefix mcp`):",
  ];
  for (const g of v.technical_gates) {
    const mark = g.status === "enforced_by_test" ? "enforced-by-test" : "ENFORCING TEST MISSING";
    lines.push(`    Gate ${g.id}: ${g.name}`);
    lines.push(`             ${g.proves}`);
    lines.push(`             status: ${mark}${g.missing_tests.length ? ` (missing: ${g.missing_tests.join(", ")})` : ""}`);
  }
  lines.push("");
  lines.push("  COMMERCIAL GATE (NOT code-completable — needs real partners over real weeks):");
  const c = v.commercial_gate;
  lines.push(
    `    partners completed: ${c.partners_completed}/${c.partners_required}   ` +
      `paid conversions: ${c.paid_conversions}/${c.paid_conversions_required}   ` +
      `exact-cost non-increase or credit proven: ${c.exact_cost_nonincrease_or_credit_proven === null ? "not measured" : c.exact_cost_nonincrease_or_credit_proven}`,
  );
  lines.push(`    status: ${c.status} → ${c.met ? "MET" : "NOT MET"}`);
  const p = v.pilot_cohort;
  lines.push(`    pilot cohort: ${p.status}${p.note ? ` — ${p.note}` : ""}`);
  lines.push("");
  lines.push("  HONEST GAPS (cannot be proven by the test suite in this repository):");
  for (const gap of v.honest_gaps) lines.push(`    - ${gap}`);
  lines.push("");
  lines.push("  KILL CRITERIA:");
  for (const k of v.kill_criteria) lines.push(`    - ${k}`);
  lines.push("");
  lines.push(
    v.required_gates_all_met
      ? "  All required gates met."
      : "  NOT all required gates met — GA is blocked. This is the correct, honest state until design-partner pilots run.",
  );
  return lines.join("\n");
}

const value = evaluate();
console.log(asJson ? JSON.stringify(value, null, 2) : render(value));
// Exit non-zero if ANY required gate is unmet. Today the commercial gate is always unmet, so this always
// exits non-zero — by design, so CI can never mistake "code is ready" for "we may launch".
process.exit(value.required_gates_all_met ? 0 : 1);
