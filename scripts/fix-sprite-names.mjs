/**
 * Fixes two classes of problems in pokemon.json:
 *  1. Bad name values (surrounding quotes, smart apostrophes, typos)
 *  2. Missing spriteName where sprite filename ≠ JSON name
 * Run from Web folder: node scripts/fix-sprite-names.mjs
 */
import fs from 'fs'

const POKEMON_JSON = './src/data/pokemon.json'

// ── 1. Name corrections (fix the stored name itself) ────────────────────────
const NAME_FIXES = {
  // Stored with surrounding double-quotes + literal \u2019 escape sequence → clean name
  '"Farfetch\\u2019d"':          "Farfetch'd",
  '"Farfetch\\u2019d-Galarian"': "Farfetch'd-Galarian",
  // Stored with surrounding single-quotes
  "'Type: Null'":               'Type: Null',
  // Typo
  'Carstform-Rainy':            'Castform-Rainy',
  // Stored with surrounding double-quotes + literal \xE9 escape sequence → clean name
  '"Vivillon-Pok\\xE9Ball"':    'Vivillon-PokéBall',
  '"Flab\\xE9b\\xE9-Red"':      'Flabébé-Red',
  '"Flab\\xE9b\\xE9-Yellow"':   'Flabébé-Yellow',
  '"Flab\\xE9b\\xE9-Orange"':   'Flabébé-Orange',
  '"Flab\\xE9b\\xE9-Blue"':     'Flabébé-Blue',
  '"Flab\\xE9b\\xE9-White"':    'Flabébé-White',
}

// ── 2. spriteName overrides (sprite file stem differs from JSON name) ────────
// Key = JSON name AFTER any fixes above are applied
const SPRITE_NAMES = {
  // Special chars stripped in sprite filenames
  "Farfetch'd":            'Farfetchd',
  "Farfetch'd-Galarian":   'Farfetchd-Galarian',
  "Sirfetch'd":            'Sirfetchd',
  'Mime Jr.':              'MimeJr',
  'Mr. Mime':              'MrMime',
  'Mr. Mime-Galarian':     'MrMime-Galarian',
  'Mr. Rime':              'MrRime',
  'Type: Null':            'TypeNull',

  // Hyphens stripped in sprite filenames
  'Jangmo-o':   'Jangmoo',
  'Hakamo-o':   'Hakamoo',
  'Kommo-o':    'Kommoo',
  'Porygon-Z':  'Porygonz',
  'Wo-Chien':   'Wochien',
  'Chien-Pao':  'Chienpao',
  'Ting-Lu':    'Tinglu',
  'Chi-Yu':     'Chiyu',

  // Spaces stripped in sprite filenames (Paradox + Tapu handled by URL, but sprites have no space)
  'Scream Tail':   'Screamtail',
  'Sandy Shocks':  'Sandyshocks',
  'Flutter Mane':  'Fluttermane',
  'Iron Bundle':   'Ironbundle',
  'Great Tusk':    'Greattusk',
  'Iron Treads':   'Irontreads',
  'Iron Thorns':   'Ironthorns',
  'Raging Bolt':   'Ragingbolt',
  'Gouging Fire':  'Gougingfire',
  'Walking Wake':  'Walkingwake',
  'Iron Valiant':  'Ironvaliant',
  'Iron Hands':    'Ironhands',
  'Roaring Moon':  'Roaringmoon',
  'Brute Bonnet':  'Brutebonnet',
  'Slither Wing':  'Slitherwing',
  'Iron Moth':     'Ironmoth',
  'Iron Jugulis':  'Ironjugulis',
  'Iron Crown':    'Ironcrown',
  'Iron Boulder':  'Ironboulder',
  'Iron Leaves':   'Ironleaves',

  // é → e in sprite filenames (Flabébé)
  'Flabébé-Red':    'Flabebe-Red',
  'Flabébé-Yellow': 'Flabebe-Yellow',
  'Flabébé-Orange': 'Flabebe-Orange',
  'Flabébé-Blue':   'Flabebe-Blue',
  'Flabébé-White':  'Flabebe-White',
  // Vivillon-PokéBall sprite file retains the é (no spriteName needed — name matches file)

}

const data = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
let nameFixed = 0, spriteAdded = 0

for (const entry of data) {
  // Step 1: fix name
  if (NAME_FIXES[entry.name]) {
    console.log(`  name fix: ${JSON.stringify(entry.name)} → ${JSON.stringify(NAME_FIXES[entry.name])}`)
    entry.name = NAME_FIXES[entry.name]
    nameFixed++
  }
  // Step 2: add spriteName (keyed off the corrected name)
  if (SPRITE_NAMES[entry.name] && entry.spriteName !== SPRITE_NAMES[entry.name]) {
    entry.spriteName = SPRITE_NAMES[entry.name]
    spriteAdded++
  }
}

fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
console.log(`\nFixed ${nameFixed} names, added/updated ${spriteAdded} spriteNames.`)
