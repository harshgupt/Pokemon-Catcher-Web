/**
 * Renames sprite files from UPPERCASE to Pascal Case.
 * Also updates pokemon.json and items.json names to match.
 * Run from the Web folder: node scripts/rename-sprites.mjs
 */

import fs from 'fs'
import path from 'path'

const POKEMON_LARGE = './public/sprites/pokemon/large'
const POKEMON_MID   = './public/sprites/pokemon/mid'
const ITEMS_DIR     = './public/sprites/items'
const POKEMON_JSON  = './src/data/pokemon.json'
const ITEMS_JSON    = './src/data/items.json'

// ─── Special cases: full filename (no extension) → new name ───────────────
// Used when the hyphen is part of the Pokemon's name itself
const FULL_OVERRIDES = {
  'HAKAMO-O':  'Hakamo-o',
  'JANGMO-O':  'Jangmo-o',
  'KOMMO-O':   'Kommo-o',
}

// ─── Special cases: Pokemon name segment (before first hyphen) ─────────────
const NAME_OVERRIDES = {
  'HOOH':        'Ho-oh',
  'MRMIME':      'MrMime',
  'MRRIME':      'MrRime',
  'MIMEJR':      'MimeJr',
  'TYPENULL':    'TypeNull',
  "FARFETCH'D":  "Farfetch'd",
  "SIRFETCH'D":  "Sirfetch'd",
  'TAPUBULU':    'Tapu Bulu',
  'TAPUFINI':    'Tapu Fini',
  'TAPUKOKO':    'Tapu Koko',
  'TAPULELE':    'Tapu Lele',
}

// ─── Special cases: individual words in item filenames ────────────────────
const WORD_OVERRIDES = {
  'TM':  'TM',
  'DNA': 'DNA',
  'PHD': 'PhD',
}

// ─── JSON name corrections (old → new) ────────────────────────────────────
const POKEMON_JSON_RENAMES = {
  'Ho-Oh':          'Ho-oh',
  'Mr. Mime':       'MrMime',
  'Mr. Mime-Galarian': 'MrMime-Galarian',
  'Mr. Rime':       'MrRime',
  'Mime Jr.':       'MimeJr',
  'Type: Null':     'TypeNull',
  '\u2019':         "'",  // smart apostrophe → regular (applied as substring replace)
}

const ITEM_JSON_RENAMES = {
  'Ph.D Costume': 'PhD Costume',
  'N-Solarizer':  'N Solarizer',
  'N-Lunarizer':  'N Lunarizer',
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function titleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function transformPokemonFilename(name) {
  if (FULL_OVERRIDES[name]) return FULL_OVERRIDES[name]

  const hyphenIdx = name.indexOf('-')
  if (hyphenIdx === -1) {
    return NAME_OVERRIDES[name] ?? titleCase(name)
  }

  const namePart = name.slice(0, hyphenIdx)
  const suffix   = name.slice(hyphenIdx + 1)  // kept as-is (already Pascal cased)
  const newName  = NAME_OVERRIDES[namePart] ?? titleCase(namePart)
  return `${newName}-${suffix}`
}

function transformItemFilename(name) {
  return name
    .split(' ')
    .map(word => WORD_OVERRIDES[word.toUpperCase()] ?? titleCase(word))
    .join(' ')
}

// ─── Rename files in a directory ─────────────────────────────────────────
function renameFiles(dir, transformFn) {
  const files = fs.readdirSync(dir).filter(f => /\.(png|PNG)$/i.test(f))
  let renamed = 0, skipped = 0

  for (const file of files) {
    const ext     = path.extname(file)
    const base    = file.slice(0, -ext.length)
    const newBase = transformFn(base)
    const newFile = newBase + '.png'  // normalise extension to lowercase

    if (file === newFile) { skipped++; continue }

    fs.renameSync(path.join(dir, file), path.join(dir, newFile))
    renamed++
  }

  console.log(`  ${dir}: ${renamed} renamed, ${skipped} already correct`)
}

// ─── Update JSON names ────────────────────────────────────────────────────
function fixSmartApostrophes(str) {
  return str.replace(/\u2018|\u2019/g, "'")
}

function updatePokemonJson() {
  const data = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
  let changed = 0

  for (const entry of data) {
    let name = fixSmartApostrophes(entry.name)
    if (POKEMON_JSON_RENAMES[name]) {
      name = POKEMON_JSON_RENAMES[name]
    }
    if (name !== entry.name) { entry.name = name; changed++ }
  }

  fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
  console.log(`  pokemon.json: ${changed} names updated`)
}

function updateItemsJson() {
  const data = JSON.parse(fs.readFileSync(ITEMS_JSON, 'utf8'))
  let changed = 0

  for (const entry of data) {
    const newName = ITEM_JSON_RENAMES[entry.name] ?? entry.name
    if (newName !== entry.name) { entry.name = newName; changed++ }
  }

  fs.writeFileSync(ITEMS_JSON, JSON.stringify(data, null, 2))
  console.log(`  items.json: ${changed} names updated`)
}

// ─── Run ──────────────────────────────────────────────────────────────────
console.log('Renaming Pokemon sprites...')
renameFiles(POKEMON_LARGE, transformPokemonFilename)
renameFiles(POKEMON_MID,   transformPokemonFilename)

console.log('Renaming item sprites...')
renameFiles(ITEMS_DIR, transformItemFilename)

console.log('Updating JSON...')
updatePokemonJson()
updateItemsJson()

console.log('Done.')
