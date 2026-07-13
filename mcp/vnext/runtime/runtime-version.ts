const VNEXT_RUNTIME_ERROR =
  "Kage vNext runtime requires Node 22.5+; legacy Kage commands remain available on Node 18+.";

export function assertVnextRuntime(version = process.versions.node): void {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    if (
      Number.isSafeInteger(major) &&
      Number.isSafeInteger(minor) &&
      (major > 22 || (major === 22 && minor >= 5))
    ) {
      return;
    }
  }

  throw new Error(VNEXT_RUNTIME_ERROR);
}
