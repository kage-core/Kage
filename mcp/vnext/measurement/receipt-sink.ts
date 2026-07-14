import type { TransformationReceipt } from "../protocol/index.js";
import { openVnextDatabase, type LocalDatabase } from "../storage/database.js";
import { migrateLocalDatabase } from "../storage/migrations.js";
import { ReceiptStore } from "../storage/receipt-store.js";
import { resolveRuntimePaths } from "../runtime/paths.js";

// A sink is deliberately the narrowest possible seam: measurement must be able to fail without the
// gateway noticing. Nothing here is allowed to throw into a request path.
export interface ReceiptSink {
  write(receipt: TransformationReceipt): void;
  close?(): void;
}

// IMPORTANT (Node 18): `openVnextDatabase` requires node:sqlite (Node 22.5+) and throws on older
// runtimes. It is called lazily here, never at import time, so a legacy `kage proxy` on Node 18
// keeps working and simply records no receipts. This module must never gain a top-level
// `node:sqlite` import.
export function openReceiptSink(projectDir: string): ReceiptSink | null {
  let db: LocalDatabase | undefined;
  try {
    const paths = resolveRuntimePaths(projectDir);
    db = openVnextDatabase(paths.databasePath);
    migrateLocalDatabase(db);
    const store = new ReceiptStore(db);
    const database = db;
    return {
      write(receipt) {
        store.write(receipt);
      },
      close() {
        try {
          database.close();
        } catch {
          // A close failure has nothing left to protect.
        }
      },
    };
  } catch {
    try {
      db?.close();
    } catch {
      // Ignore: we are already on the failure path.
    }
    return null;
  }
}
