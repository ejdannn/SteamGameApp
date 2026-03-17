/**
 * Recommendation engine: scores Steam games against user preference sliders.
 *
 * Preferences shape (each 0–10):
 *   actionVsStrategy, rpgDepth, horror, simulation,
 *   soloVsMulti, shortVsLong, difficulty, priceSensitivity
 */

// Maps Steam tags to which preference slider they relate to, and direction (+1 = high value, -1 = low value)
const TAG_WEIGHTS = {
  // actionVsStrategy (high = action)
  'Action': { pref: 'actionVsStrategy', dir: 1, weight: 2 },
  'Shooter': { pref: 'actionVsStrategy', dir: 1, weight: 2 },
  'Fighting': { pref: 'actionVsStrategy', dir: 1, weight: 1.5 },
  'Strategy': { pref: 'actionVsStrategy', dir: -1, weight: 2 },
  'Turn-Based Strategy': { pref: 'actionVsStrategy', dir: -1, weight: 2 },
  'Real Time Strategy': { pref: 'actionVsStrategy', dir: -1, weight: 2 },
  'Tower Defense': { pref: 'actionVsStrategy', dir: -1, weight: 1 },

  // rpgDepth
  'RPG': { pref: 'rpgDepth', dir: 1, weight: 3 },
  'JRPG': { pref: 'rpgDepth', dir: 1, weight: 2.5 },
  'Action RPG': { pref: 'rpgDepth', dir: 1, weight: 2 },
  'Dungeon Crawler': { pref: 'rpgDepth', dir: 1, weight: 1.5 },
  'Character Customization': { pref: 'rpgDepth', dir: 1, weight: 1 },

  // horror
  'Horror': { pref: 'horror', dir: 1, weight: 3 },
  'Survival Horror': { pref: 'horror', dir: 1, weight: 3 },
  'Psychological Horror': { pref: 'horror', dir: 1, weight: 2.5 },
  'Dark': { pref: 'horror', dir: 1, weight: 1 },

  // simulation
  'Simulation': { pref: 'simulation', dir: 1, weight: 3 },
  'City Builder': { pref: 'simulation', dir: 1, weight: 2.5 },
  'Building': { pref: 'simulation', dir: 1, weight: 2 },
  'Management': { pref: 'simulation', dir: 1, weight: 2 },
  'Farming Sim': { pref: 'simulation', dir: 1, weight: 2 },
  'Base Building': { pref: 'simulation', dir: 1, weight: 2 },

  // soloVsMulti (high = multiplayer)
  'Multiplayer': { pref: 'soloVsMulti', dir: 1, weight: 2 },
  'Online Co-Op': { pref: 'soloVsMulti', dir: 1, weight: 2 },
  'PvP': { pref: 'soloVsMulti', dir: 1, weight: 2 },
  'MMO': { pref: 'soloVsMulti', dir: 1, weight: 2 },
  'Co-op': { pref: 'soloVsMulti', dir: 1, weight: 1.5 },
  'Singleplayer': { pref: 'soloVsMulti', dir: -1, weight: 1.5 },

  // shortVsLong (high = long games)
  'Short': { pref: 'shortVsLong', dir: -1, weight: 2 },
  'Visual Novel': { pref: 'shortVsLong', dir: -1, weight: 1 },
  'Open World': { pref: 'shortVsLong', dir: 1, weight: 2 },
  'Sandbox': { pref: 'shortVsLong', dir: 1, weight: 1.5 },
  'Roguelite': { pref: 'shortVsLong', dir: 1, weight: 1 },
  'Roguelike': { pref: 'shortVsLong', dir: 1, weight: 1 },

  // difficulty (high = hardcore)
  'Difficult': { pref: 'difficulty', dir: 1, weight: 2 },
  'Souls-like': { pref: 'difficulty', dir: 1, weight: 3 },
  'Hardcore': { pref: 'difficulty', dir: 1, weight: 2.5 },
  'Casual': { pref: 'difficulty', dir: -1, weight: 2 },
  'Relaxing': { pref: 'difficulty', dir: -1, weight: 2 },
  'Family Friendly': { pref: 'difficulty', dir: -1, weight: 1.5 },

  // priceSensitivity (high = willing to pay)
  'Free to Play': { pref: 'priceSensitivity', dir: -1, weight: 3 },
}

/**
 * Score a single game against user preferences.
 * Returns a score 0–100.
 */
function scoreGame(game, prefs) {
  if (!game.tags || game.tags.length === 0) return 30 // neutral default

  let score = 0
  let maxPossible = 0

  for (const tag of game.tags) {
    const mapping = TAG_WEIGHTS[tag]
    if (!mapping) continue

    const prefValue = prefs[mapping.pref] ?? 5 // default to neutral
    // Normalize pref to -1..+1
    const normalizedPref = (prefValue - 5) / 5

    // Tag contribution: positive if direction matches user preference
    const contribution = normalizedPref * mapping.dir * mapping.weight
    score += contribution
    maxPossible += mapping.weight
  }

  // Also factor in price sensitivity for paid games
  if (game.price > 0) {
    const willingness = prefs.priceSensitivity ?? 5
    // High price + low willingness = penalty
    const priceNorm = Math.min(game.price / 6000, 1) // normalize to 0-1 (~$60 max)
    const willingnessNorm = willingness / 10
    const pricePenalty = priceNorm * (1 - willingnessNorm) * 3
    score -= pricePenalty
    maxPossible += 3
  }

  if (maxPossible === 0) return 50

  // Normalize to 0–100
  const normalized = ((score / maxPossible) + 1) / 2 * 100
  return Math.max(0, Math.min(100, normalized))
}

/**
 * Takes a pool of games and user preferences, returns top N sorted by score.
 */
export function recommend(games, prefs, n = 24) {
  const scored = games
    .filter(g => g.appid && g.name)
    .map(game => ({
      ...game,
      score: scoreGame(game, prefs),
    }))
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, n)
}

export const DEFAULT_PREFS = {
  actionVsStrategy: 5,
  rpgDepth: 5,
  horror: 3,
  simulation: 5,
  soloVsMulti: 5,
  shortVsLong: 5,
  difficulty: 5,
  priceSensitivity: 7,
}
