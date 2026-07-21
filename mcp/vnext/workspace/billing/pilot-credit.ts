// Applying the no-overhead pilot credit — the step that turns a measurement into money off an invoice.
//
// This module exists because a credit that is only ever CALCULATED is not a guarantee. Until something
// resolves the customer's first paid invoice, writes the ledger row, and posts the credit at the
// provider, the promise in docs/commercial/no-overhead-pilot.md has no mechanism behind it.
//
// THE ORDER IS THE SAFETY PROPERTY:
//
//   1. The CAP comes from the provider, not from a caller. The first paid invoice's platform fee is read
//      from Stripe; nothing on the request path can propose a cap, and no invoice means no credit.
//   2. The LEDGER is written before money moves, and what it returns is what gets reported. A re-run
//      reads the existing row instead of re-deriving a figure the ledger does not hold.
//   3. The provider call carries an IDEMPOTENCY KEY derived from the ledger row's own id, so a crash
//      between "posted at Stripe" and "recorded as applied" cannot double-credit on the retry.
//   4. `applied_invoice_id` is claimed with `WHERE applied_invoice_id IS NULL`, so two concurrent jobs
//      cannot both consider themselves the applier.
//
// LIVE STRIPE IS AN HONEST GAP. This path is exercised only against a fixture transport. No live key,
// invoice, or customer balance transaction has been touched by this code.
import type { Db } from "../db.js";
import type { TeamTaskOutcomeRecord } from "../metrics.js";
import {
  loadPilotCreditRow,
  loadSubscription,
  markPilotCreditApplied,
  recordPilotCreditRow,
  storedCreditToResult,
  type StoredPilotCredit,
} from "./entitlements.js";
import { creditCustomerBalance, fetchFirstPaidInvoice, type StripeApiDeps } from "./stripe.js";
import type { PilotCreditResult } from "./types.js";

export interface PilotCreditRequest {
  workspace_id: string;
  pilot_id: string;
  /** The privacy-safe, measured receipts for the pilot window. Identifiers, classes, and numbers only. */
  outcomes: readonly TeamTaskOutcomeRecord[];
}

/** Why applying the credit ended where it did. Every branch is machine-readable and none of them lie. */
export type PilotCreditApplicationStatus =
  /** A positive measured credit was posted against the customer's first paid invoice by THIS call. */
  | "applied"
  /** The ledger already records this credit as applied; no money moved again. */
  | "already_applied"
  /** The measurement produced no credit (unmeasured, a measured saving, or no invoice to credit). */
  | "no_credit"
  /** The workspace has no Stripe customer, so there is no invoice and nothing to credit against. */
  | "no_customer";

export interface PilotCreditApplication {
  /** What the LEDGER holds — never a figure recomputed after the fact. */
  result: PilotCreditResult;
  status: PilotCreditApplicationStatus;
  applied_invoice_id: string | null;
  /** The provider's id for the balance credit, when this call posted one. */
  provider_transaction_id: string | null;
}

function toApplication(
  stored: StoredPilotCredit,
  status: PilotCreditApplicationStatus,
  providerTransactionId: string | null,
  result: PilotCreditResult,
): PilotCreditApplication {
  return {
    result,
    status,
    applied_invoice_id: stored.applied_invoice_id,
    provider_transaction_id: providerTransactionId,
  };
}

/**
 * Compute, persist, and APPLY a pilot's no-overhead credit, at most once per (workspace, pilot).
 *
 * Tenant scoping is the caller's contract in the same way it is everywhere else in this service: the
 * workspace id is the server-resolved one, and the outcomes are the ones that workspace's principal was
 * permitted to read.
 */
export async function applyPilotCredit(
  db: Db,
  stripe: StripeApiDeps,
  request: PilotCreditRequest,
): Promise<PilotCreditApplication> {
  const subscription = await loadSubscription(db, request.workspace_id);
  const customerId = subscription?.stripe_customer_id ?? null;

  // No customer means no invoice, which means no fee to waive. The ledger still records the measurement
  // and the honest reason, so a pilot that measured overhead before a purchase is auditable later.
  const invoice = customerId ? await fetchFirstPaidInvoice(stripe, customerId) : null;

  const stored = await recordPilotCreditRow(db, {
    pilot_id: request.pilot_id,
    workspace_id: request.workspace_id,
    outcomes: request.outcomes,
    first_invoice_platform_fee_usd: invoice?.platform_fee_usd ?? null,
  });
  const result = storedCreditToResult(stored);

  if (stored.applied_invoice_id) {
    return toApplication(stored, "already_applied", null, result);
  }
  if (stored.credit_usd <= 0) {
    return toApplication(stored, "no_credit", null, result);
  }
  if (!customerId || !invoice) {
    // A positive credit with no invoice cannot happen (the calculator returns `no_invoice_to_credit`),
    // but if the ledger ever holds one, refusing to guess an invoice is the only honest branch.
    return toApplication(stored, "no_customer", null, result);
  }

  const transaction = await creditCustomerBalance(stripe, {
    stripe_customer_id: customerId,
    credit_usd: stored.credit_usd,
    description: `Kage no-overhead pilot credit (${request.pilot_id}), capped at invoice ${invoice.invoice_id}`,
    // Derived from the ledger row, so every retry of THIS credit reuses the same key at Stripe.
    idempotency_key: `kage-pilot-credit-${stored.credit_id}`,
  });
  const claimed = await markPilotCreditApplied(db, stored.credit_id, invoice.invoice_id);
  const applied = (await loadPilotCreditRow(db, request.workspace_id, request.pilot_id)) ?? stored;
  return toApplication(
    applied,
    claimed ? "applied" : "already_applied",
    transaction.id,
    storedCreditToResult(applied),
  );
}
