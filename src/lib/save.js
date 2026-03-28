import pokemonData from '../data/pokemon.json'
import itemsData from '../data/items.json'

const SAVE_KEY = 'cc-save-v1'

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
  return { pokemon, items }
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
      return defaults
    } catch (_) {
      // corrupted — fall through to defaults
    }
  }
  return createDefaults()
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY)
}
