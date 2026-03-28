// Ports GridSpawner.cs logic exactly (Full category, no category filtering yet)
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'

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

// ── Clue labels (maps pokemon.json category strings → display text) ───────────
const CLUE_MAP = {
  Grass:    'Grass type',    Fire:      'Fire type',    Water:    'Water type',
  Electric: 'Electric type', Fighting:  'Fighting type', Psychic: 'Psychic type',
  Ghost:    'Ghost type',    Dark:      'Dark type',    Fairy:    'Fairy type',
  Dragon:   'Dragon type',   Ice:       'Ice type',     Poison:   'Poison type',
  Bug:      'Bug type',      Flying:    'Flying type',  Rock:     'Rock type',
  Ground:   'Ground type',   Steel:     'Steel type',   Normal:   'Normal type',

  Generation1: 'Generation I',    Generation2: 'Generation II',
  Generation3: 'Generation III',  Generation4: 'Generation IV',
  Generation5: 'Generation V',    Generation6: 'Generation VI',
  Generation7: 'Generation VII',  Generation8: 'Generation VIII',
  Generation9: 'Generation IX',

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
  for (const cat of (p.categories ?? []))
    if (CLUE_MAP[cat]) pool.push(CLUE_MAP[cat])
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : '???'
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Total spawnable tokens across all categories (= GetGlobalTokens for Full) */
export function getGlobalTokens(gameState) {
  let total = 0
  for (const p    of pokemonData) total += Math.max(0, gameState.pokemon[p.id]?.numberToSpawn ?? 0)
  for (const item of itemsData)   total += Math.max(0, gameState.items[item.id]?.numberToSpawn ?? 0)
  return total
}

/** Available tokens for current category (Full = same as global for now) */
export function getAvailableTokens(gameState) {
  return getGlobalTokens(gameState)
}

/**
 * Generates a grid of slots (max 25, exactly getAvailableTokens if fewer).
 * Each slot: { type: 'pokemon'|'item', id, clue }
 * Mirrors GridSpawner.GenerateGrid logic exactly.
 */
export function generateGrid(gameState) {
  const available = getAvailableTokens(gameState)
  if (available === 0) return []

  const gridSize = Math.min(25, available)

  let workingChars = pokemonData.filter(p => (gameState.pokemon[p.id]?.numberToSpawn ?? 0) > 0)
  let workingItems = itemsData.filter(i  => (gameState.items[i.id]?.numberToSpawn   ?? 0) > 0)

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
 * Mirrors GridSpawner.OnCardCollected + DexManager.CharacterCollected/ItemCollected.
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
