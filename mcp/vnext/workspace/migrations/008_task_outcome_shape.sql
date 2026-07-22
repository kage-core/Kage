-- Kage workspace service — migration 008: make the task-outcome privacy guarantee STRUCTURAL.
--
-- ORDERED, IDEMPOTENT and version-tracked exactly like 001-007, and SEPARATE from the local sqlite
-- storage. Migration 007 is immutable once shipped, so these constraints land here.
--
-- WHAT 007 LEFT OPEN. 007 gave every column an identifier/class/count TYPE, and the code checked that a
-- record carried no key outside an allow-list. Neither bounded what was INSIDE a permitted key:
-- task_id, repository_id and agent_surface were unbounded TEXT, so
--   task_id = 'SSN 123-45-6789; the user''s full prompt text with customer data'
-- stored and read back cleanly. "No raw payloads" was a producer convention, not a property of the
-- schema. The CHECK constraints below make a prose payload UNREPRESENTABLE: an identifier here is
-- bounded to 128 characters and drawn from an identifier alphabet with no whitespace, so a prompt (which
-- has spaces and punctuation prose needs) simply cannot be stored, whatever a client sends.
--
-- WHY actor_id EXISTS. k-anonymity over a TASK count is not k-anonymity over PEOPLE: fifty tasks from
-- one engineer are that individual's working record published as a "team" trend. The workspace needs to
-- count DISTINCT PEOPLE to enforce a real floor, so each row carries a salted pseudonym produced by the
-- local daemon. It is a counting token only: never published, never joined, never returned by a route,
-- and (being salted per install) not reversible to the address it came from.
--
-- WHY knowledge_ids_reused AND review_decisions BECOME NULLABLE. NOT NULL DEFAULT '{}' / DEFAULT 0 meant
-- an install that does not measure reuse or attribute review decisions was recorded as having measured
-- them and found none — publishing "your team reuses nothing" as a measurement of something never taken.
-- NULL now means unmeasured, and the aggregate excludes it from the denominator instead of booking a zero.

ALTER TABLE workspace_task_outcomes
  -- Any row written before this migration predates actor attribution; it is marked 'unattributed'
  -- rather than assigned to somebody, and an unattributed row can only ever COUNT AS ONE actor, which
  -- keeps the per-person floor fail-closed for historical data.
  ADD COLUMN actor_id TEXT NOT NULL DEFAULT 'unattributed';
ALTER TABLE workspace_task_outcomes ALTER COLUMN actor_id DROP DEFAULT;

ALTER TABLE workspace_task_outcomes ALTER COLUMN knowledge_ids_reused DROP NOT NULL;
ALTER TABLE workspace_task_outcomes ALTER COLUMN knowledge_ids_reused DROP DEFAULT;
ALTER TABLE workspace_task_outcomes ALTER COLUMN review_decisions DROP NOT NULL;
ALTER TABLE workspace_task_outcomes ALTER COLUMN review_decisions DROP DEFAULT;

-- Identifier shape. Mirrors IDENTIFIER_PATTERN in metrics.ts so the database and the code agree; the
-- database is the one that cannot be bypassed by a caller who skips the TypeScript layer.
ALTER TABLE workspace_task_outcomes
  ADD CONSTRAINT workspace_task_outcomes_identifier_shape_check CHECK (
    task_id ~ '^[A-Za-z0-9._:@/+-]{1,128}$'
    AND repository_id ~ '^[A-Za-z0-9._:@/+-]{1,128}$'
    AND agent_surface ~ '^[A-Za-z0-9._:@/+-]{1,128}$'
    AND actor_id ~ '^[A-Za-z0-9._:@/+-]{1,128}$'
  );

-- The reused-knowledge array: bounded in length, and every element must satisfy the same identifier
-- shape. A CHECK cannot run a subquery, so the elements are joined and matched as one bounded string —
-- which is exactly as strict: the separator is not in the identifier alphabet, so no element can hide
-- whitespace or prose punctuation inside it.
ALTER TABLE workspace_task_outcomes
  ADD CONSTRAINT workspace_task_outcomes_knowledge_ids_shape_check CHECK (
    knowledge_ids_reused IS NULL
    OR (
      coalesce(array_length(knowledge_ids_reused, 1), 0) <= 64
      -- The length bound is a length() test rather than a {0,N} repetition, because Postgres' POSIX
      -- engine caps repetition counts at 255 and a larger one is a syntax error, not a wider bound.
      AND length(array_to_string(knowledge_ids_reused, ',')) <= 8320
      AND array_to_string(knowledge_ids_reused, ',') ~ '^[A-Za-z0-9._:@/+,-]*$'
    )
  );

-- Counts and measurements stay in their honest ranges: a negative review count or latency is a bug or a
-- hostile client, never a measurement.
ALTER TABLE workspace_task_outcomes
  ADD CONSTRAINT workspace_task_outcomes_counts_check CHECK (
    (review_decisions IS NULL OR review_decisions >= 0)
    AND (latency_ms IS NULL OR latency_ms >= 0)
  );
