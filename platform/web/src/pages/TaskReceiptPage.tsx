import type {
  DeliveryRecordDto,
  KnowledgeChangeDto,
  PolicyFindingSummaryDto,
  TaskReceiptDto,
  TaskTimelineEventDto,
} from "../api/types";
import { CostBreakdown } from "../components/CostBreakdown";
import { withBase } from "../router";

// A single agent task's auditable receipt. Top to bottom:
//   1. Task identity (id, surface, outcome, timing).
//   2. The cost breakdown — EXACT request measurements kept strictly separate from COHORT outcomes
//      (rendered by CostBreakdown), with NO fused "total value created" number anywhere.
//   3. Injected context deliveries (the sections Kage attached to the request).
//   4. Knowledge changes proposed by the task, EACH linking to its evidence.
//   5. Minimal Change Guard findings (deterministic, with an honest null "changed behaviour").
//   6. A timeline of the task, from start to end, with any missing timestamp shown as unavailable.
//
// Honesty invariants, enforced by the tests: the two economics sections never merge; an unmeasured
// metric renders "Unavailable"; every injected knowledge change carries a real "View evidence" link
// (a navigable portal route) or, when there is no navigable target, is shown without a fabricated one.

interface TaskReceiptPageProps {
  receipt: TaskReceiptDto;
}

const TIMELINE_LABELS: Record<TaskTimelineEventDto["kind"], string> = {
  task_started: "Task started",
  capsule_delivered: "Context delivered",
  request_transformed: "Request transformed",
  knowledge_changed: "Knowledge changed",
  policy_finding: "Policy finding",
  task_ended: "Task ended",
};

function DeliveriesSection({ deliveries }: { deliveries: DeliveryRecordDto[] }): React.ReactElement {
  return (
    <section aria-label="Injected context">
      <h3>Injected context</h3>
      {deliveries.length === 0 ? (
        <p className="muted">No context was injected during this task.</p>
      ) : (
        <ul className="delivery-list">
          {deliveries.map((delivery) => (
            <li key={delivery.delivery_id} className="delivery-item" data-status={delivery.status}>
              <span className="delivery-status">{delivery.status}</span>
              <span className="delivery-location mono"> {delivery.injection_location}</span>
              <span className="delivery-size">
                {" "}
                {delivery.status === "delivered"
                  ? `${delivery.added_bytes} bytes`
                  : delivery.reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function KnowledgeChangesSection({
  changes,
}: {
  changes: KnowledgeChangeDto[];
}): React.ReactElement {
  return (
    <section aria-label="Knowledge changes">
      <h3>Knowledge changes</h3>
      {changes.length === 0 ? (
        <p className="muted">No knowledge changes are linked to this task.</p>
      ) : (
        <ul className="knowledge-change-list">
          {changes.map((change) => (
            <li key={change.id} className="knowledge-change-item">
              <span className="knowledge-change-kind mono">{change.change_kind}</span>
              <span className="knowledge-change-title"> {change.title}</span>
              <span className="knowledge-change-trust" data-trust={change.trust_state}>
                {" "}
                {change.trust_state}
              </span>
              {change.evidence_href !== null && (
                <>
                  {" "}
                  <a className="knowledge-change-evidence" href={withBase(change.evidence_href)}>
                    View evidence
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PolicyFindingsSection({
  mode,
  findings,
}: {
  mode: string | null;
  findings: PolicyFindingSummaryDto[];
}): React.ReactElement {
  return (
    <section aria-label="Minimal change findings">
      <h3>Minimal change findings</h3>
      {mode === null ? (
        <p className="muted">The Minimal Change Guard is not enabled for this repository.</p>
      ) : findings.length === 0 ? (
        <p className="muted">No findings for this task's change ({mode} mode).</p>
      ) : (
        <ul className="policy-finding-list">
          {findings.map((finding) => (
            <li key={finding.finding_id} className="policy-finding-item" data-severity={finding.severity}>
              <span className="policy-finding-severity">{finding.severity}</span>
              <span className="policy-finding-title"> {finding.title}</span>
              {finding.deterministic && <span className="policy-finding-deterministic"> deterministic</span>}
              {/* Whether the finding changed what the agent did is unknown without a controlled
                  comparison, so it is stated as unknown — never a fabricated boolean. */}
              <span className="policy-finding-behavior"> Behaviour change: unknown</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TimelineSection({ events }: { events: TaskTimelineEventDto[] }): React.ReactElement {
  return (
    <section aria-label="Task timeline">
      <h3>Timeline</h3>
      {events.length === 0 ? (
        <p className="muted">No timeline events were recorded for this task.</p>
      ) : (
        <ol className="timeline-list">
          {events.map((event, index) => (
            <li key={`${event.kind}:${index}`} className="timeline-item" data-kind={event.kind}>
              <span className="timeline-kind">{TIMELINE_LABELS[event.kind]}</span>
              <span className="timeline-at mono"> {event.at ?? "time unavailable"}</span>
              <span className="timeline-detail"> {event.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function TaskReceiptPage({ receipt }: TaskReceiptPageProps): React.ReactElement {
  const { task } = receipt;
  return (
    <div className="task-receipt-page">
      <header className="task-receipt-header" aria-label="Task identity">
        <p className="entity-kind">Agent task</p>
        <h1 className="mono">{task.task_id}</h1>
        <dl className="task-receipt-meta">
          <div>
            <dt>Surface</dt>
            <dd>{task.agent_surface}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>{task.outcome ?? "in progress"}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd className="mono">{task.started_at}</dd>
          </div>
          <div>
            <dt>Ended</dt>
            <dd className="mono">{task.ended_at ?? "not ended"}</dd>
          </div>
        </dl>
      </header>

      <CostBreakdown receipt={receipt} />

      <DeliveriesSection deliveries={receipt.deliveries} />
      <KnowledgeChangesSection changes={receipt.knowledge_changes} />
      <PolicyFindingsSection mode={receipt.policy_mode} findings={receipt.policy_findings} />
      <TimelineSection events={receipt.timeline} />
    </div>
  );
}
