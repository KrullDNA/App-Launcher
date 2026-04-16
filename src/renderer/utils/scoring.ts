import type { SearchResult } from '../stores/searchStore'

export interface ShortcutCandidate {
  itemId: string
  count: number
  lastUsed: string
}

export interface ShortcutsData {
  [abbrev: string]: ShortcutCandidate[]
}

export interface ScoringContext {
  query: string
  shortcuts: ShortcutsData
  maxGlobalCount: number
}

/**
 * Blended ranking per Section 3.2 of the brief:
 *   Final = (shortcut * 0.6) + (fuzzy * 0.25) + (freq * 0.1) + (recency * 0.05)
 */
export function scoreAndSort(
  results: SearchResult[],
  fuseScores: Map<string, number>,
  context: ScoringContext
): SearchResult[] {
  const { query, shortcuts, maxGlobalCount } = context
  const candidates = query ? (shortcuts[query] || []) : []

  const scored = results.map((result) => {
    // (a) Shortcut score (60%): top candidate = 1.0, second = 0.5, third = 0.25
    let shortcutScore = 0
    const candidateIndex = candidates.findIndex((c) => c.itemId === result.id)
    if (candidateIndex === 0) shortcutScore = 1.0
    else if (candidateIndex === 1) shortcutScore = 0.5
    else if (candidateIndex === 2) shortcutScore = 0.25

    // (b) Fuzzy score (25%): Fuse.js score normalised (Fuse score 0=perfect, 1=worst)
    const rawFuseScore = fuseScores.get(result.id) ?? 1.0
    const fuzzyScore = 1.0 - rawFuseScore // invert: 1.0 = perfect match

    // (c) Frequency score (10%): global launch count normalised
    const globalCount = getGlobalCountForItem(result.id, shortcuts)
    const frequencyScore = maxGlobalCount > 0 ? globalCount / maxGlobalCount : 0

    // (d) Recency score (5%): exponential decay from hours since last launch
    const lastUsed = getLastUsedForItem(result.id, shortcuts)
    const recencyScore = lastUsed ? computeRecency(lastUsed) : 0

    const finalScore =
      shortcutScore * 0.6 +
      fuzzyScore * 0.25 +
      frequencyScore * 0.1 +
      recencyScore * 0.05

    // Mark as trained shortcut if it's the top candidate for this query
    const isShortcut = candidateIndex === 0

    return { ...result, isShortcut, _score: finalScore }
  })

  // Sort descending by score
  scored.sort((a, b) => b._score - a._score)

  // Strip internal score field
  return scored.map(({ _score, ...rest }) => rest)
}

function getGlobalCountForItem(itemId: string, shortcuts: ShortcutsData): number {
  let total = 0
  for (const candidates of Object.values(shortcuts)) {
    for (const c of candidates) {
      if (c.itemId === itemId) {
        total += c.count
      }
    }
  }
  return total
}

function getLastUsedForItem(itemId: string, shortcuts: ShortcutsData): string | null {
  let latest: string | null = null
  for (const candidates of Object.values(shortcuts)) {
    for (const c of candidates) {
      if (c.itemId === itemId) {
        if (!latest || c.lastUsed > latest) {
          latest = c.lastUsed
        }
      }
    }
  }
  return latest
}

function computeRecency(isoTimestamp: string): number {
  const hoursSince = (Date.now() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60)
  // Exponential decay: score halves every 24 hours
  return Math.exp(-0.0289 * hoursSince) // ln(2)/24 ≈ 0.0289
}
