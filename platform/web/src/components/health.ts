import type { SystemMapNodeHealth } from "../api/types";

// Knowledge health rendered so meaning is carried by TEXT (and a decorative glyph), never by color
// alone — the same accessibility discipline as StatusBadge. The color tints in global.css are
// redundant reinforcement, not the sole signal.
export const HEALTH_LABELS: Record<SystemMapNodeHealth, string> = {
  verified: "Verified",
  stale: "Stale",
  disputed: "Disputed",
  unverified: "Unverified",
};

// Distinct glyph shapes so sighted users who cannot distinguish the tints still get a non-color cue.
export const HEALTH_ICONS: Record<SystemMapNodeHealth, string> = {
  verified: "●",
  stale: "◐",
  disputed: "▲",
  unverified: "○",
};
