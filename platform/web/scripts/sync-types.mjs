#!/usr/bin/env node
// Checked type-sync: regenerate `src/api/types.ts` from the backend single source of truth
// (`mcp/vnext/api/types.ts`) so the portal DTOs can NEVER drift from the read-model that
// serves them. Run `npm run sync-types` to regenerate; CI/tests run `--check` to fail on drift.
//
// The backend module imports its enum aliases from sibling `.js` modules. Those imports cannot
// resolve inside the standalone Vite package, so we inline the three referenced string-literal
// unions (EntityKind, ImpactClass, TrustState) verbatim and strip the cross-module import/export
// lines. Everything else — every interface, every field — is copied byte-for-byte, so a change to
// a DTO shape on the backend forces a regeneration here and the drift check fails until it happens.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(webRoot, "..", "..");

const BACKEND_DTOS = resolve(repoRoot, "mcp/vnext/api/types.ts");
const BACKEND_MODEL_ENUMS = resolve(repoRoot, "mcp/vnext/repo-model/types.ts");
const BACKEND_PROTOCOL_ENUMS = resolve(repoRoot, "mcp/vnext/protocol/types.ts");
const FRONTEND_DTOS = resolve(webRoot, "src/api/types.ts");

// Pull a single `export type Name = ...;` union (possibly multi-line) out of a backend module.
function extractUnion(source, name) {
  const marker = `export type ${name} =`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find "export type ${name}" in backend enums`);
  const end = source.indexOf(";", start);
  if (end === -1) throw new Error(`Unterminated "export type ${name}" in backend enums`);
  return source.slice(start, end + 1);
}

function generate() {
  const dtos = readFileSync(BACKEND_DTOS, "utf8");
  const modelEnums = readFileSync(BACKEND_MODEL_ENUMS, "utf8");
  const protocolEnums = readFileSync(BACKEND_PROTOCOL_ENUMS, "utf8");

  const entityKind = extractUnion(modelEnums, "EntityKind");
  const impactClass = extractUnion(modelEnums, "ImpactClass");
  const trustState = extractUnion(protocolEnums, "TrustState");

  // Drop the cross-module import + re-export lines that reference `.js` siblings; the enums they
  // pulled in are inlined below instead.
  const body = dtos
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("import type { EntityKind")) return false;
      if (trimmed.startsWith("export type { EntityKind")) return false;
      return true;
    })
    .join("\n")
    .replace(/^\n+/, "");

  return [
    "// GENERATED FILE — DO NOT EDIT BY HAND.",
    "// Regenerate with `npm run sync-types` (from platform/web). Source of truth:",
    "//   mcp/vnext/api/types.ts (DTOs) + mcp/vnext/repo-model/types.ts + mcp/vnext/protocol/types.ts (enums).",
    "// The `npm run check-types` drift guard fails CI if this file diverges from the backend.",
    "",
    "// --- Inlined backend enums (string-literal unions, mirrored verbatim) ---",
    entityKind,
    "",
    impactClass,
    "",
    trustState,
    "",
    "// --- Portal DTOs (copied verbatim from mcp/vnext/api/types.ts) ---",
    "",
    body.replace(/\n+$/, ""),
    "",
  ].join("\n");
}

const generated = generate();
const check = process.argv.includes("--check");

if (check) {
  let current = "";
  try {
    current = readFileSync(FRONTEND_DTOS, "utf8");
  } catch {
    current = "";
  }
  if (current !== generated) {
    console.error(
      "Type drift detected: platform/web/src/api/types.ts is out of sync with the backend DTOs.\n" +
        "Run `npm run sync-types --prefix platform/web` and commit the result.",
    );
    process.exit(1);
  }
  console.log("Type-sync OK: portal DTOs match the backend read-model.");
} else {
  writeFileSync(FRONTEND_DTOS, generated);
  console.log(`Wrote ${FRONTEND_DTOS} from backend DTOs.`);
}
