import achievementsData from '../data/achievements.json'
import pokemonData     from '../data/pokemon.json'
import itemsData       from '../data/items.json'

// ── Pokemon lookups ───────────────────────────────────────────────────────────
const pokemonById   = Object.fromEntries(pokemonData.map(p => [p.id, p]))
const pokemonByName = Object.fromEntries(pokemonData.map(p => [p.name, p.id]))

const parentOf = {}
pokemonData.forEach(p => {
  if (Array.isArray(p.nextForms)) {
    p.nextForms.forEach(nf => {
      if (parentOf[nf.nextCharacterID] === undefined)
        parentOf[nf.nextCharacterID] = p.id
    })
  }
})

function countChainForms(id, seen = new Set()) {
  if (seen.has(id)) return 0
  seen.add(id)
  let n = 1
  for (const nf of (pokemonById[id]?.nextForms ?? []))
    n += countChainForms(nf.nextCharacterID, seen)
  return n
}

function countUnlockedInChain(id, gs, seen = new Set()) {
  if (seen.has(id)) return 0
  seen.add(id)
  let n = gs.pokemon[id]?.isUnlocked ? 1 : 0
  for (const nf of (pokemonById[id]?.nextForms ?? []))
    n += countUnlockedInChain(nf.nextCharacterID, gs, seen)
  return n
}

// ── Item categories ───────────────────────────────────────────────────────────
const EVO_STONE_IDS   = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
const MEGA_STONE_IDS  = new Set(
  itemsData
    .filter(i => i.name.endsWith('ite') || i.name.endsWith('ite X') ||
                 i.name.endsWith('ite Y') || i.name.endsWith('ite Z'))
    .map(i => i.id)
)
const WISHING_STAR_ID    = 131
const WISHING_STAR_TOTAL = 34
const TM_IDS          = new Set(itemsData.filter(i => i.tmType).map(i => i.id))
const TERA_SHARD_IDS  = new Set([157, 158, 159, 160, 161])

// ── Pokemon category sets ─────────────────────────────────────────────────────
// Convert each achievement's pokemonList (names) to a set of IDs once
const achPokemonIdSets = {}
for (const ach of achievementsData) {
  if (ach.pokemonList.length > 0) {
    achPokemonIdSets[ach.id] = new Set(
      ach.pokemonList.map(name => pokemonByName[name]).filter(id => id !== undefined)
    )
  }
}

// Catchable pokemon (spawnCount > 0)
const catchableIds = new Set(pokemonData.filter(p => p.spawnCount > 0).map(p => p.id))

// Pokemon IDs by type
const TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
               'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']
const pokemonIdsByType = {}
for (const t of TYPES) pokemonIdsByType[t] = []
for (const p of pokemonData) {
  for (const t of (p.types ?? [])) {
    if (pokemonIdsByType[t]) pokemonIdsByType[t].push(p.id)
  }
}

// Region "All" achievement IDs in region order (Kanto…Paldea)
const REGION_ALL_ACH_IDS = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79]

// "First category" ach ID → the matching "All X" ach ID (which has the pokemonList)
const FIRST_TO_ALL = {
  30: 106, // Regional Form
  31: 108, // Convergent Form
  32: 112, // Alternate Form
  33: 101, // Starter
  34: 102, // Baby
  35: 103, // Fossil
  36: 104, // Pseudo-Legendary
  37: 113, // Legendary
  38: 109, // Mythical
  39: 110, // Ultra Beast
  40: 111, // Paradox
}

// Total possible evolutions (for Evolution Master)
export const TOTAL_POSSIBLE_EVOLUTIONS =
  pokemonData.reduce((sum, p) => sum + (p.nextForms?.length ?? 0), 0)

// ── Helpers ───────────────────────────────────────────────────────────────────
function allUnlocked(idSet, gs) {
  for (const id of idSet) {
    if (!gs.pokemon[id]?.isUnlocked) return false
  }
  return true
}

function anyUnlocked(idSet, gs) {
  for (const id of idSet) {
    if (gs.pokemon[id]?.isUnlocked) return true
  }
  return false
}

function countCatchableCaught(gs) {
  let n = 0
  for (const id of catchableIds) {
    if (gs.pokemon[id]?.isUnlocked) n++
  }
  return n
}

function countTotalUnlocked(gs) {
  let n = 0
  for (const p of pokemonData) {
    if (gs.pokemon[p.id]?.isUnlocked) n++
  }
  return n
}

function hasCompleted3StageChain(gs) {
  for (const p of pokemonData) {
    if (parentOf[p.id] !== undefined) continue // not a chain root
    const total = countChainForms(p.id)
    if (total < 3) continue
    if (countUnlockedInChain(p.id, gs) >= total) return true
  }
  return false
}

function countUsedEvoStones(gs) {
  const used = new Set()
  for (const p of pokemonData) {
    for (const nf of (p.nextForms ?? [])) {
      if (!EVO_STONE_IDS.has(nf.evolutionItemID)) continue
      if (nf.evolutionMethod !== 'Item' && nf.evolutionMethod !== 'ItemAndCharacterRequired') continue
      if (gs.pokemon[nf.nextCharacterID]?.isUnlocked) used.add(nf.evolutionItemID)
    }
  }
  return used.size
}

// ── Trigger logic ─────────────────────────────────────────────────────────────
const CATCHABLE_THRESHOLDS  = { 41: 6,   42: 10,  43: 50,  44: 100, 45: 250, 46: 500 }
const TOTAL_PCT_THRESHOLDS  = { 47: 142, 48: 355, 49: 710, 50: 1065, 51: 1278 }
const EVO_COUNT_THRESHOLDS  = { 58: 10,  59: 50,  60: 100, 61: 250,  62: 500, 63: 800 }

function isTriggered(ach, gs, context, getCatchable, getTotal) {
  const id = ach.id

  // ── Pokemon-list-based achievements ──────────────────────────────────────
  if (ach.pokemonList.length > 0) {
    const set = achPokemonIdSets[id]
    return set ? allUnlocked(set, gs) : false
  }

  // ── First catchable ───────────────────────────────────────────────────────
  if (id === 1) return [...catchableIds].some(pid => gs.pokemon[pid]?.isUnlocked)

  // ── IDs 2–11: First from each region ─────────────────────────────────────
  if (id >= 2 && id <= 11) {
    const set = achPokemonIdSets[REGION_ALL_ACH_IDS[id - 2]]
    return set ? anyUnlocked(set, gs) : false
  }

  // ── IDs 12–29: First of each type ────────────────────────────────────────
  if (id >= 12 && id <= 29) {
    const type = TYPES[id - 12]
    return (pokemonIdsByType[type] ?? []).some(pid => gs.pokemon[pid]?.isUnlocked)
  }

  // ── IDs 30–40: First of each category ───────────────────────────────────
  if (id >= 30 && id <= 40) {
    const set = achPokemonIdSets[FIRST_TO_ALL[id]]
    return set ? anyUnlocked(set, gs) : false
  }

  // ── Count: catchable only ─────────────────────────────────────────────────
  if (id in CATCHABLE_THRESHOLDS) return getCatchable() >= CATCHABLE_THRESHOLDS[id]

  // ── Count: % of total 1420 ───────────────────────────────────────────────
  if (id in TOTAL_PCT_THRESHOLDS) return getTotal() >= TOTAL_PCT_THRESHOLDS[id]

  // ── ID 52: Pokédex Complete (all 1420 unlocked) ──────────────────────────
  if (id === 52) return getTotal() >= pokemonData.length

  // ── ID 53: Completionist (all 600 catchable) ─────────────────────────────
  if (id === 53) return getCatchable() >= catchableIds.size

  // ── Evolution achievements ────────────────────────────────────────────────
  if (!context.evolutionPerformed) {
    // These can only trigger on an evolution action
    if (id >= 54 && id <= 65) return false
  }

  if (id === 54) return true                                           // first evolution
  if (id === 55) return hasCompleted3StageChain(gs)                   // first 3-stage chain
  if (id === 56) return context.isMega === true                       // first Mega
  if (id === 57) return context.isGiga === true                       // first Giga
  if (id in EVO_COUNT_THRESHOLDS) return (gs.evolutionCount ?? 0) >= EVO_COUNT_THRESHOLDS[id]
  if (id === 64) return (gs.evolutionCount ?? 0) >= TOTAL_POSSIBLE_EVOLUTIONS
  if (id === 65) return countUsedEvoStones(gs) >= 10                  // Stone Mason

  // ── Item first achievements ──────────────────────────────────────────────
  // IDs 65–69: item "first" achievements
  // 65 = Found Something (any item), 66 = first Evo Stone, 67 = first Mega Stone,
  // 68 = first Wishing Star, 69 = first TM
  if (id === 65) return itemsData.some(i => gs.items[i.id]?.isUnlocked)
  if (id === 66) return [...EVO_STONE_IDS].some(sid => gs.items[sid]?.isUnlocked)
  if (id === 67) return [...MEGA_STONE_IDS].some(mid => gs.items[mid]?.isUnlocked)
  if (id === 68) return gs.items[WISHING_STAR_ID]?.isUnlocked ?? false
  if (id === 69) return [...TM_IDS].some(tid => gs.items[tid]?.isUnlocked)

  // ── Type complete (IDs 80–97) ─────────────────────────────────────────────
  if (id >= 80 && id <= 97) {
    const type = TYPES[id - 80]
    return (pokemonIdsByType[type] ?? []).every(pid => gs.pokemon[pid]?.isUnlocked)
  }

  // ── Derived diversity achievements ───────────────────────────────────────
  if (id === 98) // Prism: one of every type
    return TYPES.every(t => (pokemonIdsByType[t] ?? []).some(pid => gs.pokemon[pid]?.isUnlocked))

  if (id === 99) // World Traveller: at least one from every region
    return REGION_ALL_ACH_IDS.every(rid => anyUnlocked(achPokemonIdSets[rid] ?? new Set(), gs))

  if (id === 100) // Type Triangle: Fire + Water + Grass
    return ['Fire','Water','Grass'].every(t =>
      (pokemonIdsByType[t] ?? []).some(pid => gs.pokemon[pid]?.isUnlocked))

  // ── Evolution Master ──────────────────────────────────────────────────────
  if (id === 114) return (gs.evolutionCount ?? 0) >= TOTAL_POSSIBLE_EVOLUTIONS

  // ── Item collection completions ───────────────────────────────────────────
  if (id === 119) return [...EVO_STONE_IDS].every(sid => gs.items[sid]?.isUnlocked)
  if (id === 120) return [...MEGA_STONE_IDS].every(mid => gs.items[mid]?.isUnlocked)
  if (id === 121) return (gs.items[WISHING_STAR_ID]?.numberCollected ?? 0) >= WISHING_STAR_TOTAL
  if (id === 122) return [...TM_IDS].every(tid => gs.items[tid]?.isUnlocked)
  if (id === 123) return itemsData.every(i => gs.items[i.id]?.isUnlocked)
  if (id === 124) return [...TERA_SHARD_IDS].every(sid => gs.items[sid]?.isUnlocked)

  return false
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns IDs of achievements newly unlocked given the current game state.
 * context: { evolutionPerformed?, isMega?, isGiga? }
 */
export function checkAchievements(gs, context = {}) {
  const completed = new Set(gs.completedAchievements ?? [])
  const newlyUnlocked = []

  // Memoised expensive counts (computed at most once per call)
  let _catchable = null
  let _total = null
  const getCatchable = () => { if (_catchable === null) _catchable = countCatchableCaught(gs); return _catchable }
  const getTotal    = () => { if (_total === null)    _total    = countTotalUnlocked(gs);    return _total    }

  for (const ach of achievementsData) {
    if (completed.has(ach.id)) continue
    if (isTriggered(ach, gs, context, getCatchable, getTotal)) {
      newlyUnlocked.push(ach.id)
    }
  }

  return newlyUnlocked
}

/** Merge newly unlocked IDs into game state and return updated state. */
export function applyAchievements(gs, newIds) {
  if (newIds.length === 0) return gs
  return { ...gs, completedAchievements: [...(gs.completedAchievements ?? []), ...newIds] }
}

export { achievementsData }
