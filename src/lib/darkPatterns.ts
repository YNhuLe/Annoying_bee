export type PatternId =
  | "asymmetric_buttons"
  | "fake_x"
  | "infinite_preferences"
  | "legitimate_interest_locked"
  | "save_preferences_reopen"
  | "guilt_trip_copy"
  | "scroll_trap"
  | "reappearing_banner"
  | "fake_progress"
  | "wall_of_text_tooltips"
  | "hall_of_shame"
  | "bee_proximity"
  | "bee_click"
  | "reject_shrinks_evades"
  | "reject_teleport"
  | "silent_reset";

export const PATTERN_LABELS: Record<PatternId, string> = {
  asymmetric_buttons: "Asymmetric Button Trap",
  fake_x: "Fake ✕ Button",
  infinite_preferences: "Infinite Preferences Panel",
  legitimate_interest_locked: "Legitimate Interest (Cannot Disable)",
  save_preferences_reopen: "Save Preferences Reopens Banner",
  guilt_trip_copy: "Guilt-Trip Decline Copy",
  scroll_trap: "Scroll Trap Consent",
  reappearing_banner: "Reappearing Banner (every 30s)",
  fake_progress: "Fake Progress Bar (never completes)",
  wall_of_text_tooltips: "Wall of Text Tooltips (8px legalese)",
  hall_of_shame: "Hall of Shame Badge",
  bee_proximity: "Bee Proximity Defense",
  bee_click: "Bee Click Explosion Popup",
  reject_shrinks_evades: "Reject Button Shrinks & Drifts",
  reject_teleport: "Reject Button Teleports (<10px)",
  silent_reset: "Silent Reset (re-enable cookies anyway)",
};

export function bumpScore(
  prev: Record<PatternId, number>,
  id: PatternId,
): Record<PatternId, number> {
  return { ...prev, [id]: (prev[id] ?? 0) + 1 };
}

