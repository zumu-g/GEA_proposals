// ─────────────────────────────────────────────────────────────────────────────
// Filtering that can explain itself.
//
// A listings grid applies several independent filters at once. When the result
// is empty the user sees "all 1115 filtered out" and is told to widen the
// distance — but the culprit is often a filter they can't see (e.g. a property
// type inherited from the subject property, sitting behind a collapsed panel).
//
// filterWithExplain applies the criteria and, when nothing survives, re-runs
// each criterion in isolation to find which single one is responsible.
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterCriterion<T> {
  /** Human label used in the "X is excluding all N listings" message. */
  label: string
  /** False when this criterion is inactive (empty input, "Any" selected). */
  active: boolean
  test: (row: T) => boolean
}

export interface FilterResult<T> {
  rows: T[]
  /**
   * Populated only when `rows` is empty: every active criterion that, dropped
   * on its own, would have returned results — most-freeing first. All of them
   * are true, so the caller shows a couple rather than guessing at one: the
   * filter freeing the most listings isn't necessarily the one the user wants
   * to clear (an inherited property type may free fewer than a price band).
   */
  candidates?: { label: string; wouldReturn: number }[]
}

export function filterWithExplain<T>(rows: T[], criteria: FilterCriterion<T>[]): FilterResult<T> {
  const active = criteria.filter(c => c.active)
  const matched = rows.filter(row => active.every(c => c.test(row)))
  if (matched.length > 0 || rows.length === 0 || active.length < 2) return { rows: matched }

  // Nothing survived. Drop each criterion in turn and keep the ones that would
  // rescue results. Needs 2+ active criteria to be meaningful — with one,
  // "clear the only filter you set" tells the user nothing.
  const candidates = active
    .map(dropped => {
      const rest = active.filter(c => c !== dropped)
      return { label: dropped.label, wouldReturn: rows.filter(row => rest.every(c => c.test(row))).length }
    })
    .filter(c => c.wouldReturn > 0)
    .sort((a, b) => b.wouldReturn - a.wouldReturn)

  return { rows: matched, candidates: candidates.length > 0 ? candidates : undefined }
}
