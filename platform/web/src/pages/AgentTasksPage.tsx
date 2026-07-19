import type { TaskSummaryDto } from "../api/types";
import { withBase } from "../router";

// The list of agent tasks Kage has receipts for. Each row links to that task's auditable receipt
// (request economics, outcomes, deliveries, knowledge changes). An empty list states the reality —
// "no agent tasks recorded" — rather than rendering nothing, which would read as a load failure.

interface AgentTasksPageProps {
  tasks: TaskSummaryDto[];
}

export function AgentTasksPage({ tasks }: AgentTasksPageProps): React.ReactElement {
  return (
    <section aria-label="Agent tasks" className="agent-tasks-page">
      <h1>Agent tasks</h1>
      {tasks.length === 0 ? (
        <p className="muted">
          No agent tasks have been recorded yet. Tasks appear here once the daemon writes its first
          receipts.
        </p>
      ) : (
        <table className="task-table" aria-label="Agent tasks">
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Surface</th>
              <th scope="col">Outcome</th>
              <th scope="col">Started</th>
              <th scope="col">Receipts</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.task_id}>
                <th scope="row">
                  <a href={withBase(`/tasks/${encodeURIComponent(task.task_id)}`)} className="mono">
                    {task.task_id}
                  </a>
                </th>
                <td>{task.agent_surface}</td>
                <td>{task.outcome ?? "in progress"}</td>
                <td className="mono">{task.started_at}</td>
                <td>{task.receipt_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
