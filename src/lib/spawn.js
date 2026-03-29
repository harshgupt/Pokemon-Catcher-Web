// Ports GridSpawner.cs logic exactly
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'
import filters   from '../data/pokedex-filters.json'
import locations from '../data/locations.json'

// ── Rarity weights (matches GetCharacterWeight) ───────────────────────────────
const CHAR_WEIGHTS = {
  Common:         500,
  Uncommon:       400,
  Rare:           300,
  Sparse:         200,
  Baby:           175,
  Singular:       150,
  Pseudo:         100,
  Fossil:          75,
  Starter:         50,
  UltraBeast:      20,
  Legendary:       10,
  BoxLegendary:     5,
  StrongLegendary:  2,
  Mythical:         1,
}

const ITEM_WEIGHTS = { Common: 25, Uncommon: 10, Rare: 5, Sparse: 1 }

// ── Clue labels ───────────────────────────────────────────────────────────────
const CLUE_MAP = {
  Grass:    'Grass type',    Fire:      'Fire type',    Water:    'Water type',
  Electric: 'Electric type', Fighting:  'Fighting type', Psychic: 'Psychic type',
  Ghost:    'Ghost type',    Dark:      'Dark type',    Fairy:    'Fairy type',
  Dragon:   'Dragon type',   Ice:       'Ice type',     Poison:   'Poison type',
  Bug:      'Bug type',      Flying:    'Flying type',  Rock:     'Rock type',
  Ground:   'Ground type',   Steel:     'Steel type',   Normal:   'Normal type',

  ClassStarter:    'Starter Pokémon',
  ClassPseudo:     'Pseudo-Legendary',
  ClassUltraBeast: 'Ultra Beast',
  ClassParadox:    'Paradox Pokémon',
  ClassLegendary:  'Legendary Pokémon',
  ClassMythical:   'Mythical Pokémon',

  AlternateForm:  'Alternate Form',
  RegionalForm:   'Regional Form',
  ConvergentForm: 'Convergent Form',
  MegaEvolution:  'Mega Evolution',
  GigantamaxForm: 'Gigantamax',

  EvolutionSingle: 'Does not evolve',
  EvolutionDouble: 'Two-stage evolution',
  EvolutionTriple: 'Three-stage evolution',
  EvolutionSplit:  'Branched evolution',
}

// ── Filter lookup sets ────────────────────────────────────────────────────────
const formSets     = Object.fromEntries(Object.entries(filters.forms).map(([k, ids])   => [k, new Set(ids)]))
const classSets    = Object.fromEntries(Object.entries(filters.classes).map(([k, ids]) => [k, new Set(ids)]))
// locationSets[region][location] = Set of ids
const locationSets = Object.fromEntries(
  Object.entries(locations).map(([region, locs]) => [
    region,
    Object.fromEntries(Object.entries(locs).map(([loc, ids]) => [loc, new Set(ids)]))
  ])
)

function hasPokemonFilter(f) {
  return !!(f.type1 || f.type2 || f.region || f.location || f.form || f.cls)
}

function matchesFilter(p, f) {
  if (f.type1 && !p.types?.includes(f.type1))                          return false
  if (f.type2 && !p.types?.includes(f.type2))                          return false
  // location is a subset of region — if location set, use it; otherwise fall back to region
  if (f.location && f.region) {
    if (!locationSets[f.region]?.[f.location]?.has(p.id))              return false
  } else if (f.region) {
    if (p.region !== f.region)                                          return false
  }
  if (f.form  && !formSets[f.form]?.has(p.id))                         return false
  if (f.cls   && !classSets[f.cls]?.has(p.id))                         return false
  return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function weightedSelect(pool, getWeight) {
  const total = pool.reduce((s, x) => s + (getWeight(x) ?? 1), 0)
  let roll = Math.random() * total
  for (const x of pool) {
    roll -= getWeight(x) ?? 1
    if (roll <= 0) return x
  }
  return pool[pool.length - 1]
}

function pokemonClue(p) {
  const pool = []
  if (p.region) pool.push(p.region + ' Pokémon')
  for (const cat of (p.categories ?? []))
    if (CLUE_MAP[cat]) pool.push(CLUE_MAP[cat])
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : '???'
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Total spawnable tokens across all categories (ignores filters) */
export function getGlobalTokens(gameState) {
  let total = 0
  for (const p    of pokemonData) total += Math.max(0, gameState.pokemon[p.id]?.numberToSpawn ?? 0)
  for (const item of itemsData)   total += Math.max(0, gameState.items[item.id]?.numberToSpawn ?? 0)
  return total
}

/**
 * Available tokens given the current spawn filter.
 * - itemsOnly: only item tokens count
 * - pokemon filter active: only matching pokemon; items excluded
 * - no filter: all pokemon + items
 */
export function getAvailableTokens(gameState, spawnFilter = {}) {
  if (spawnFilter.itemsOnly) {
    let total = 0
    for (const item of itemsData) total += Math.max(0, gameState.items[item.id]?.numberToSpawn ?? 0)
    return total
  }
  let total = 0
  for (const p of pokemonData) {
    if ((gameState.pokemon[p.id]?.numberToSpawn ?? 0) > 0 && matchesFilter(p, spawnFilter))
      total += gameState.pokemon[p.id].numberToSpawn
  }
  if (!hasPokemonFilter(spawnFilter)) {
    for (const item of itemsData) total += Math.max(0, gameState.items[item.id]?.numberToSpawn ?? 0)
  }
  return total
}

/**
 * Generates a grid of slots (max 25).
 * spawnFilter: { type1, type2, region, form, cls, itemsOnly }
 */
export function generateGrid(gameState, spawnFilter = {}) {
  const available = getAvailableTokens(gameState, spawnFilter)
  if (available === 0) return []

  const gridSize = Math.min(25, available)
  const pokemonOnly = hasPokemonFilter(spawnFilter) && !spawnFilter.itemsOnly

  let workingChars = spawnFilter.itemsOnly ? [] :
    pokemonData.filter(p => (gameState.pokemon[p.id]?.numberToSpawn ?? 0) > 0 && matchesFilter(p, spawnFilter))

  let workingItems = pokemonOnly ? [] :
    itemsData.filter(i => (gameState.items[i.id]?.numberToSpawn ?? 0) > 0)

  const charCounts = {}; workingChars.forEach(p => { charCounts[p.id] = gameState.pokemon[p.id].numberToSpawn })
  const itemCounts = {}; workingItems.forEach(i => { itemCounts[i.id] = gameState.items[i.id].numberToSpawn   })

  const slots = []

  for (let i = 0; i < gridSize; i++) {
    if (workingChars.length === 0 && workingItems.length === 0) break

    let spawnItem = Math.random() < 0.1
    if (spawnItem && workingItems.length === 0) spawnItem = false
    if (!spawnItem && workingChars.length === 0) spawnItem = true

    if (spawnItem) {
      const item = weightedSelect(workingItems, x => ITEM_WEIGHTS[x.rarity] ?? 1)
      slots.push({ type: 'item', id: item.id, clue: "It's an item!" })
      itemCounts[item.id]--
      if (itemCounts[item.id] <= 0) workingItems = workingItems.filter(x => x.id !== item.id)
    } else {
      const poke = weightedSelect(workingChars, x => CHAR_WEIGHTS[x.rarity] ?? 1)
      slots.push({ type: 'pokemon', id: poke.id, clue: pokemonClue(poke) })
      charCounts[poke.id]--
      if (charCounts[poke.id] <= 0) workingChars = workingChars.filter(x => x.id !== poke.id)
    }
  }

  return slots
}

/**
 * Returns a new gameState after collecting the given slot.
 */
export function collectToken(gameState, slot) {
  if (slot.type === 'pokemon') {
    const cur = gameState.pokemon[slot.id]
    return {
      ...gameState,
      pokemon: {
        ...gameState.pokemon,
        [slot.id]: {
          ...cur,
          numberToSpawn: Math.max(0, cur.numberToSpawn - 1),
          numberCaught:  cur.numberCaught + 1,
          isUnlocked:    true,
        },
      },
    }
  }
  if (slot.type === 'item') {
    const cur = gameState.items[slot.id]
    return {
      ...gameState,
      items: {
        ...gameState.items,
        [slot.id]: {
          ...cur,
          numberToSpawn:   Math.max(0, cur.numberToSpawn - 1),
          numberCollected: cur.numberCollected + 1,
          isUnlocked:      true,
        },
      },
    }
  }
  return gameState
}
