// The container health probe. Dependency-free on purpose: it runs inside the runtime image, which has
// no dev tooling and (under `read_only: true`) nowhere to write.
//
// IT CHECKS TWO THINGS, AND THE SECOND ONE IS THE POINT.
//   1. The service answers /v1/health.
//   2. The schema version it reports is at least the version this image expects.
//
// A pod that answers 200 while its database is still on an older schema is exactly the pod that must
// not take traffic: it will serve reads against tables the running code does not match. Checking only
// "is the port open" would mark that pod ready. The expected version is supplied by
// KAGE_WORKSPACE_EXPECTED_MIGRATION; when it is unset the probe checks liveness only and says so, rather
// than inventing an expectation it cannot justify.
const port = Number(process.env.KAGE_WORKSPACE_PORT ?? 8787);
const host = process.env.KAGE_WORKSPACE_HEALTH_HOST ?? "127.0.0.1";
const timeoutMs = Number(process.env.KAGE_WORKSPACE_HEALTH_TIMEOUT_MS ?? 4000);
const expectedRaw = process.env.KAGE_WORKSPACE_EXPECTED_MIGRATION;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

let response;
try {
  response = await fetch(`http://${host}:${port}/v1/health`, { signal: controller.signal });
} catch (error) {
  clearTimeout(timer);
  fail(`workspace health check could not reach http://${host}:${port}/v1/health: ${error.message}`);
}
clearTimeout(timer);

if (!response.ok) fail(`workspace health check returned HTTP ${response.status}`);

let body;
try {
  body = await response.json();
} catch (error) {
  fail(`workspace health check returned an unreadable body: ${error.message}`);
}

if (body.status !== "ok") fail(`workspace reported status ${JSON.stringify(body.status)}`);

if (expectedRaw !== undefined && expectedRaw !== "") {
  const expected = Number.parseInt(expectedRaw, 10);
  const actual = Number(body.database_migration);
  if (!Number.isInteger(expected)) {
    fail(`KAGE_WORKSPACE_EXPECTED_MIGRATION is not a number: ${expectedRaw}`);
  }
  if (!Number.isInteger(actual) || actual < expected) {
    fail(
      `workspace database migration ${body.database_migration} is behind the ${expected} this image ` +
        `expects: still migrating, or pointed at a database another build owns`,
    );
  }
  process.stdout.write(`ok status=ok migration=${actual} expected>=${expected}\n`);
} else {
  process.stdout.write(
    `ok status=ok migration=${body.database_migration} (no KAGE_WORKSPACE_EXPECTED_MIGRATION set: ` +
      `liveness only, schema not checked)\n`,
  );
}
process.exit(0);
