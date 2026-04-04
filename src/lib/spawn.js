// Ports GridSpawner.cs logic exactly
import pokemonData    from '../data/pokemon.json'
import itemsData      from '../data/items.json'
import filters        from '../data/pokedex-filters.json'
import catchFilters   from '../data/catch-filters.json'
import locations      from '../data/locations.json'

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
const TYPE_CLUE_MAP = {
  Grass: 'Grass type', Fire: 'Fire type', Water: 'Water type',
  Electric: 'Electric type', Fighting: 'Fighting type', Psychic: 'Psychic type',
  Ghost: 'Ghost type', Dark: 'Dark type', Fairy: 'Fairy type',
  Dragon: 'Dragon type', Ice: 'Ice type', Poison: 'Poison type',
  Bug: 'Bug type', Flying: 'Flying type', Rock: 'Rock type',
  Ground: 'Ground type', Steel: 'Steel type', Normal: 'Normal type',
}

const FORM_CLUE_MAP = {
  AlternateForm:  'Alternate Form',
  RegionalForm:   'Regional Form',
  ConvergentForm: 'Convergent Form',
  MegaEvolution:  'Mega Evolution',
  GigantamaxForm: 'Gigantamax',
}

const CLUE_MAP = {
  Starter:         'Starter Pokémon',
  ClassPseudo:     'Pseudo-Legendary',
  ClassUltraBeast: 'Ultra Beast',
  ClassParadox:    'Paradox Pokémon',
  ClassLegendary:  'Legendary Pokémon',
  ClassMythical:   'Mythical Pokémon',

  EvolutionSingle: 'Does not evolve',
  EvolutionDouble: 'Two-stage evolution',
  EvolutionTriple: 'Three-stage evolution',
  EvolutionSplit:  'Branched evolution',
}

// ── Filter lookup sets ────────────────────────────────────────────────────────
export const formSets     = Object.fromEntries(Object.entries(filters.forms).map(([k, ids])   => [k, new Set(ids)]))
export const classSets       = Object.fromEntries(Object.entries(filters.classes).map(([k, ids]) => [k, new Set(ids)]))
export const catchFormSets   = Object.fromEntries(Object.entries(catchFilters).map(([k, ids]) => [k, new Set(ids)]))
// locationSets[region][location] = Set of ids
export const locationSets = Object.fromEntries(
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
  if (f.form  && !catchFormSets[f.form]?.has(p.id))                    return false
  if (f.cls   && !(catchFormSets[f.cls] ?? classSets[f.cls])?.has(p.id)) return false
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

const CLS_TO_CAT  = {
  Starter: 'Starter', PseudoLegendary: 'ClassPseudo',
  UltraBeast: 'ClassUltraBeast', Legendary: 'ClassLegendary',
  Mythical: 'ClassMythical', Paradox: 'ClassParadox',
  Baby: 'ClassBaby', Fossil: 'ClassFossil',
}

function pokemonClue(p, spawnFilter = {}) {
  const suppress = new Set()
  if (spawnFilter.type1) suppress.add(spawnFilter.type1)
  if (spawnFilter.type2) suppress.add(spawnFilter.type2)
  if (spawnFilter.form)  suppress.add(spawnFilter.form)
  if (spawnFilter.cls)   suppress.add(CLS_TO_CAT[spawnFilter.cls]   ?? ('Class' + spawnFilter.cls))

  const pool = []
  if (p.region && !spawnFilter.region) pool.push(p.region + ' Pokémon')
  for (const type of (p.types ?? []))
    if (!suppress.has(type) && TYPE_CLUE_MAP[type]) pool.push(TYPE_CLUE_MAP[type])
  for (const form of (p.forms ?? []))
    if (!suppress.has(form) && FORM_CLUE_MAP[form]) pool.push(FORM_CLUE_MAP[form])
  for (const cat of (p.categories ?? []))
    if (!suppress.has(cat) && CLUE_MAP[cat]) pool.push(CLUE_MAP[cat])
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
 * - otherwise: matching pokemon tokens only (items are a bonus and don't inflate grid size)
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
  let workingChars = spawnFilter.itemsOnly ? [] :
    pokemonData.filter(p => (gameState.pokemon[p.id]?.numberToSpawn ?? 0) > 0 && matchesFilter(p, spawnFilter))

  // Items always included unless itemsOnly (which already handles the all-items case)
  let workingItems = itemsData.filter(i => (gameState.items[i.id]?.numberToSpawn ?? 0) > 0)

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
      slots.push({ type: 'pokemon', id: poke.id, clue: pokemonClue(poke, spawnFilter) })
      charCounts[poke.id]--
      if (charCounts[poke.id] <= 0) workingChars = workingChars.filter(x => x.id !== poke.id)
    }
  }

  // Shuffle so the weighted selection order doesn't create a rarity gradient
  // (common tends to be picked first → appears at top without this)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]]
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
