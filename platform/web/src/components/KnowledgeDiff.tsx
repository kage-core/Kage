// The before/after of a proposed knowledge change, shown side by side so a reviewer decides against
// the current truth it would replace — never the proposal alone. When there is no current claim in
// the slot, that is stated honestly ("No current claim recorded"), not left blank in a way that reads
// as "nothing changes". Meaning is carried by the panel HEADINGS, never by color alone.

export function KnowledgeDiff({
  current,
  proposed,
}: {
  current: string | null;
  proposed: string;
}): React.ReactElement {
  return (
    <div className="knowledge-diff">
      <div className="knowledge-diff-panel" data-side="current">
        <h4>Current knowledge</h4>
        {current ? (
          <p className="knowledge-diff-current">{current}</p>
        ) : (
          <p className="muted">No current claim recorded for this fact.</p>
        )}
      </div>
      <div className="knowledge-diff-panel" data-side="proposed">
        <h4>Proposed change</h4>
        <p className="knowledge-diff-proposed">{proposed}</p>
      </div>
    </div>
  );
}
