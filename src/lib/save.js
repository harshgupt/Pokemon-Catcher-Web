import pokemonData from '../data/pokemon.json'
import itemsData from '../data/items.json'

const SAVE_KEY = 'cc-save-v1'

// Build parent map to identify root pokemon
const parentOf = {}
pokemonData.forEach(p => {
  if (Array.isArray(p.nextForms)) {
    p.nextForms.forEach(nf => {
      if (parentOf[nf.nextCharacterID] === undefined)
        parentOf[nf.nextCharacterID] = p.id
    })
  }
})

const byId = Object.fromEntries(pokemonData.map(p => [p.id, p]))

function safeNextForms(id) {
  const nf = byId[id]?.nextForms
  return Array.isArray(nf) ? nf : []
}

function countChainForms(id, seen = new Set()) {
  if (seen.has(id)) return 0
  seen.add(id)
  let count = 1
  for (const nf of safeNextForms(id))
    count += countChainForms(nf.nextCharacterID, seen)
  return count
}

function createDefaults() {
  const pokemon = {}
  for (const p of pokemonData) {
    pokemon[p.id] = {
      numberToSpawn: p.spawnCount > 0 ? p.spawnCount : 0,
      numberCaught:  0,
      isUnlocked:    false,
    }
  }
  const items = {}
  for (const item of itemsData) {
    items[item.id] = {
      numberToSpawn:   item.spawnCount > 0 ? item.spawnCount : 0,
      numberCollected: 0,
      isUnlocked:      false,
    }
  }
  return { pokemon, items, gameMode: 'easy', completedAchievements: [], evolutionCount: 0 }
}

export function newGame(gameMode = 'easy') {
  const gs = createDefaults()
  gs.gameMode = gameMode
  if (gameMode === 'easy') {
    for (const p of pokemonData) {
      if (parentOf[p.id] !== undefined) continue // not a root pokemon
      if (p.spawnCount <= 0) continue             // doesn't spawn
      gs.pokemon[p.id].numberToSpawn = countChainForms(p.id)
    }
  }
  return gs
}

export function loadSave() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw) {
    try {
      const saved    = JSON.parse(raw)
      const defaults = createDefaults()
      if (saved.pokemon) {
        for (const [id, data] of Object.entries(saved.pokemon)) {
          if (defaults.pokemon[id] !== undefined)
            Object.assign(defaults.pokemon[id], data)
        }
      }
      if (saved.items) {
        for (const [id, data] of Object.entries(saved.items)) {
          if (defaults.items[id] !== undefined)
            Object.assign(defaults.items[id], data)
        }
      }
      if (saved.gameMode) defaults.gameMode = saved.gameMode
      if (saved.completedAchievements) defaults.completedAchievements = saved.completedAchievements
      if (saved.evolutionCount) defaults.evolutionCount = saved.evolutionCount
      // Cap spawn counts for easy mode saves that may have old full-mode values
      if (defaults.gameMode === 'easy') {
        for (const p of pokemonData) {
          if (parentOf[p.id] !== undefined) continue
          if (defaults.pokemon[p.id])
            defaults.pokemon[p.id].numberToSpawn = Math.min(
              defaults.pokemon[p.id].numberToSpawn,
              countChainForms(p.id)
            )
        }
      }
      return defaults
    } catch (_) {
      // corrupted — fall through to defaults
    }
  }
  return newGame()
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY)
}
