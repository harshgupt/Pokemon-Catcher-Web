/**
 * Adds displayName to pokemon.json for form variants where the internal name
 * differs from the official display name.
 * Covers: Mega, Gigantamax, Primal, Alolan, Galarian, Hisuian, Paldean.
 * Run from Web folder: node scripts/add-display-names.mjs
 */

import fs from 'fs'

const POKEMON_JSON = './src/data/pokemon.json'

// Internal base name → official display name
const BASE_DISPLAY = {
  'MrMime':    'Mr. Mime',
  'MrRime':    'Mr. Rime',
  'MimeJr':    'Mime Jr.',
  'TypeNull':  'Type: Null',
}

// Suffix → prefix transform
// Returns [prefix, suffix_after_base] or null if not a handled form
function parseForm(name) {
  // Double-hyphen cases first: Tauros-Paldean-Combat etc.
  const taurosMatch = name.match(/^Tauros-Paldean-(.+)$/)
  if (taurosMatch) {
    return { display: `Paldean Tauros (${taurosMatch[1]} Breed)` }
  }

  // Urshifu double-hyphen with Giga: Urshifu-SingleStrike-Giga
  const urshifuGiga = name.match(/^Urshifu-(SingleStrike|RapidStrike)-Giga$/)
  if (urshifuGiga) {
    const style = urshifuGiga[1] === 'SingleStrike' ? 'Single Strike' : 'Rapid Strike'
    return { display: `Gigantamax Urshifu (${style} Style)` }
  }

  // Darmanitan ZenMode Galarian: Darmanitan-ZenMode-Galarian
  if (name === 'Darmanitan-ZenMode-Galarian') {
    return { display: 'Galarian Darmanitan (Zen Mode)' }
  }

  // Ogerpon mask + Terastal: Ogerpon-TealMask-Terastal
  const ogerponTera = name.match(/^Ogerpon-(\w+Mask)-Terastal$/)
  if (ogerponTera) {
    const maskMap = {
      TealMask: 'Teal Mask',
      WellspringMask: 'Wellspring Mask',
      HearthflameMask: 'Hearthflame Mask',
      CornerstoneMask: 'Cornerstone Mask',
    }
    return { display: `Ogerpon (${maskMap[ogerponTera[1]] ?? ogerponTera[1]}) (Tera)` }
  }

  // Multi-form Megas with two hyphens (Pyroar-M-Mega, Meowstic-M-Mega, etc.)
  const tripleForm = name.match(/^(.+?)-(M|F)-Mega$/)
  if (tripleForm) {
    const [, base, gender] = tripleForm
    const gLabel = gender === 'M' ? '(Male)' : '(Female)'
    const displayBase = BASE_DISPLAY[base] ?? base
    return { display: `Mega ${displayBase} ${gLabel}` }
  }

  // Floette-Eternal-Mega
  if (name === 'Floette-Eternal-Mega') {
    return { display: 'Mega Floette (Eternal)' }
  }

  // Generic Name-Form-Mega pattern (e.g. Magearna-OriginalColor-Mega, Tatsugiri-Curly-Mega)
  const formMega = name.match(/^(.+?)-(.+)-Mega$/)
  if (formMega) {
    const [, base, form] = formMega
    const displayBase = BASE_DISPLAY[base] ?? base
    // Convert CamelCase form to words with spaces
    const formLabel = form.replace(/([A-Z])/g, ' $1').trim()
    return { display: `Mega ${displayBase} (${formLabel})` }
  }

  // Single-hyphen forms
  const m = name.match(/^(.+?)-(.+)$/)
  if (!m) return null
  const [, base, suffix] = m
  const displayBase = BASE_DISPLAY[base] ?? base

  // Mega variants
  if (suffix === 'Mega')  return { display: `Mega ${displayBase}` }
  if (suffix === 'MegaX') return { display: `Mega ${displayBase} X` }
  if (suffix === 'MegaY') return { display: `Mega ${displayBase} Y` }
  if (suffix === 'MegaZ') return { display: `Mega ${displayBase} Z` }

  // Gigantamax
  if (suffix === 'Giga')  return { display: `Gigantamax ${displayBase}` }

  // Primal
  if (suffix === 'Primal') return { display: `Primal ${displayBase}` }

  // Regional
  if (suffix === 'Alolan')   return { display: `Alolan ${displayBase}` }
  if (suffix === 'Galarian')  return { display: `Galarian ${displayBase}` }
  if (suffix === 'Hisuian')   return { display: `Hisuian ${displayBase}` }
  if (suffix === 'Paldean')   return { display: `Paldean ${displayBase}` }

  return null
}

const data = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
let added = 0

for (const entry of data) {
  const result = parseForm(entry.name)
  if (result && entry.displayName !== result.display) {
    entry.displayName = result.display
    added++
  }
}

fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
console.log(`Added/updated ${added} displayNames.`)

// Print all added for review
const updated = data.filter(p => p.displayName)
updated.forEach(p => console.log(`  ${p.name.padEnd(36)} → ${p.displayName}`))
