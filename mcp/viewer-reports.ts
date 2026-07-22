// Child-process entry for viewer report generation.
//
// startViewer spawns this after its port is bound: the full report chain is minutes of synchronous
// work on a loaded repository, and running it on the daemon's event loop — even after listen() —
// leaves the bound socket accepting connections it never answers. A separate process keeps the
// viewer responsive from second one while the reports fill in behind it.
//
// Usage: node dist/viewer-reports.js <projectDir>
import { generateViewerReports } from "./daemon.js";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: viewer-reports <projectDir>");
  process.exit(2);
}
generateViewerReports(projectDir);
