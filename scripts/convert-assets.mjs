/**
 * Converts Unity ScriptableObject .asset files to JSON for the web project.
 * Run from the Web folder: node scripts/convert-assets.mjs
 */

import fs from 'fs'
import path from 'path'

const ASSETS_ROOT = '../Assets/ScriptableObjects'
const OUT_DIR = './src/data'

const SPAWN_CATEGORY = [
  'Full', 'Grass', 'Fire', 'Water', 'Electric', 'Fighting', 'Psychic',
  'Ghost', 'Dark', 'Fairy', 'Dragon', 'Ice', 'Poison', 'Bug', 'Flying',
  'Rock', 'Ground', 'Steel', 'Normal',
  'Generation1', 'Generation2', 'Generation3', 'Generation4', 'Generation5',
  'Generation6', 'Generation7', 'Generation8', 'Generation9',
  'EvolutionSingle', 'EvolutionDouble', 'EvolutionTriple', 'EvolutionSplit',
  'AlternateForm', 'RegionalForm', 'ConvergentForm', 'MegaEvolution', 'GigantamaxForm',
  'ClassStarter', 'ClassPseudo', 'ClassUltraBeast', 'ClassParadox',
  'ClassLegendary', 'ClassMythical', 'Items'
]

const RARITY = [
  'Common', 'Uncommon', 'Rare', 'Sparse', 'Baby', 'Singular', 'Pseudo',
  'Fossil', 'Starter', 'UltraBeast', 'Legendary', 'BoxLegendary',
  'StrongLegendary', 'Mythical'
]

const EVOLUTION_METHOD = [
  'LevelUp', 'Item', 'CharacterRequired', 'ItemAndCharacterRequired'
]

const ITEM_RARITY = ['Common', 'Uncommon', 'Rare', 'Sparse']

function decodeSpawnLists(hex) {
  if (!hex || hex === '[]') return []
  const buf = Buffer.from(hex, 'hex')
  const categories = []
  for (let i = 0; i < buf.length; i += 4) {
    const val = buf.readInt32LE(i)
    categories.push(SPAWN_CATEGORY[val] ?? val)
  }
  return categories
}

function parseAsset(content) {
  const lines = content.split('\n')
  const result = {}
  let i = 0
  let inNextForms = false
  let currentForm = null

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Simple key: value pairs
    const kvMatch = trimmed.match(/^(\w+): (.+)$/)
    if (kvMatch && !inNextForms) {
      result[kvMatch[1]] = kvMatch[2].trim()
    }

    // nextForms list start
    if (trimmed === 'nextForms:') {
      result.nextForms = []
      inNextForms = true
      i++
      continue
    }

    if (inNextForms) {
      if (trimmed.startsWith('- nextCharacterID:')) {
        if (currentForm) result.nextForms.push(currentForm)
        currentForm = { nextCharacterID: parseInt(trimmed.split(':')[1]) }
      } else if (currentForm && trimmed.startsWith('evolutionMethod:')) {
        currentForm.evolutionMethod = EVOLUTION_METHOD[parseInt(trimmed.split(':')[1])] ?? trimmed.split(':')[1]
      } else if (currentForm && trimmed.startsWith('characterCount:')) {
        currentForm.characterCount = parseInt(trimmed.split(':')[1])
      } else if (currentForm && trimmed.startsWith('evolutionItemID:')) {
        currentForm.evolutionItemID = parseInt(trimmed.split(':')[1])
      } else if (currentForm && trimmed.startsWith('characterRequiredID:')) {
        currentForm.characterRequiredID = parseInt(trimmed.split(':')[1])
      } else if (trimmed === 'nextForms: []') {
        result.nextForms = []
        inNextForms = false
      } else if (!trimmed.startsWith('-') && trimmed.includes(':') && !trimmed.startsWith('next') && !trimmed.startsWith('evolution') && !trimmed.startsWith('character') && !trimmed.startsWith('item')) {
        // Exited nextForms block
        if (currentForm) { result.nextForms.push(currentForm); currentForm = null }
        inNextForms = false
        // Re-process this line
        i--
      }
    }

    i++
  }

  if (currentForm) result.nextForms.push(currentForm)
  return result
}

function convertPokemon() {
  const soDir = path.join(ASSETS_ROOT, 'CharacterScriptableObjects')
  const files = fs.readdirSync(soDir).filter(f => f.endsWith('.asset'))
  const pokemon = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(soDir, file), 'utf8')
    const raw = parseAsset(content)

    if (!raw.id && raw.id !== '0') continue

    pokemon.push({
      id: parseInt(raw.id),
      dexId: parseInt(raw.dexID ?? 0),
      name: raw.characterName ?? '',
      spawnCount: parseInt(raw.spawnCount ?? 0),
      rarity: RARITY[parseInt(raw.rarity)] ?? raw.rarity,
      nextForms: raw.nextForms ?? [],
      categories: decodeSpawnLists(raw.spawnLists),
    })
  }

  pokemon.sort((a, b) => a.id - b.id)
  return pokemon
}

function convertItems() {
  const soDir = path.join(ASSETS_ROOT, 'ItemScriptableObjects')
  const files = fs.readdirSync(soDir).filter(f => f.endsWith('.asset'))
  const items = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(soDir, file), 'utf8')
    const raw = parseAsset(content)

    if (!raw.id && raw.id !== '0') continue

    items.push({
      id: parseInt(raw.id),
      name: raw.itemName ?? '',
      spawnCount: parseInt(raw.spawnCount ?? 0),
      rarity: ITEM_RARITY[parseInt(raw.itemRarity)] ?? raw.itemRarity,
    })
  }

  items.sort((a, b) => a.id - b.id)
  return items
}

// Run
fs.mkdirSync(OUT_DIR, { recursive: true })

const pokemon = convertPokemon()
fs.writeFileSync(path.join(OUT_DIR, 'pokemon.json'), JSON.stringify(pokemon, null, 2))
console.log(`✓ pokemon.json — ${pokemon.length} entries`)

const items = convertItems()
fs.writeFileSync(path.join(OUT_DIR, 'items.json'), JSON.stringify(items, null, 2))
console.log(`✓ items.json — ${items.length} entries`)
