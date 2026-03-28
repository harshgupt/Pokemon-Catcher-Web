/**
 * Patches types for custom Mega evolutions not in PokeAPI.
 * Run from Web folder: node scripts/patch-custom-types.mjs
 */
import fs from 'fs'

const POKEMON_JSON = './src/data/pokemon.json'

const CUSTOM_TYPES = {
  // ── Different from base ───────────────────────────────────────────────────
  'Clefable-Mega':              ['Fairy', 'Flying'],
  'Meganium-Mega':              ['Grass', 'Fairy'],
  'Feraligatr-Mega':            ['Water', 'Dragon'],
  'Chimecho-Mega':              ['Psychic', 'Steel'],
  'Absol-MegaZ':                ['Dark', 'Ghost'],
  'Staraptor-Mega':             ['Fighting', 'Flying'],
  'Garchomp-MegaZ':             ['Dragon'],
  'Barbaracle-Mega':            ['Rock', 'Fighting'],
  'Golisopod-Mega':             ['Bug', 'Steel'],

  // ── Same as base ──────────────────────────────────────────────────────────
  'Raichu-MegaX':               ['Electric'],
  'Raichu-MegaY':               ['Electric'],
  'Victreebel-Mega':            ['Grass', 'Poison'],
  'Starmie-Mega':               ['Water', 'Psychic'],
  'Dragonite-Mega':             ['Dragon', 'Flying'],
  'Skarmory-Mega':              ['Steel', 'Flying'],
  'Lucario-MegaZ':              ['Fighting', 'Steel'],
  'Froslass-Mega':              ['Ice', 'Ghost'],
  'Heatran-Mega':               ['Fire', 'Steel'],
  'Darkrai-Mega':               ['Dark'],
  'Emboar-Mega':                ['Fire', 'Fighting'],
  'Excadrill-Mega':             ['Ground', 'Steel'],
  'Scolipede-Mega':             ['Bug', 'Poison'],
  'Scrafty-Mega':               ['Dark', 'Fighting'],
  'Eelektross-Mega':            ['Electric'],
  'Chandelure-Mega':            ['Ghost', 'Fire'],
  'Golurk-Mega':                ['Ground', 'Ghost'],
  'Chesnaught-Mega':            ['Grass', 'Fighting'],
  'Delphox-Mega':               ['Fire', 'Psychic'],
  'Greninja-Mega':              ['Water', 'Dark'],
  'Pyroar-M-Mega':              ['Fire', 'Normal'],
  'Pyroar-F-Mega':              ['Fire', 'Normal'],
  'Floette-Eternal-Mega':       ['Fairy'],
  'Meowstic-M-Mega':            ['Psychic'],
  'Meowstic-F-Mega':            ['Psychic'],
  'Malamar-Mega':               ['Dark', 'Psychic'],
  'Dragalge-Mega':              ['Poison', 'Dragon'],
  'Hawlucha-Mega':              ['Fighting', 'Flying'],
  'Zygarde-Mega':               ['Dragon', 'Ground'],
  'Crabominable-Mega':          ['Fighting', 'Ice'],
  'Drampa-Mega':                ['Normal', 'Dragon'],
  'Magearna-OriginalColor-Mega':['Steel', 'Fairy'],
  'Zeraora-Mega':               ['Electric'],
  'Falinks-Mega':               ['Fighting'],
  'Scovillain-Mega':            ['Grass', 'Fire'],
  'Glimmora-Mega':              ['Rock', 'Poison'],
  'Tatsugiri-Curly-Mega':       ['Dragon', 'Water'],
  'Tatsugiri-Stretchy-Mega':    ['Dragon', 'Water'],
  'Tatsugiri-Droopy-Mega':      ['Dragon', 'Water'],
  'Baxcalibur-Mega':            ['Dragon', 'Ice'],
}

const data = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
let patched = 0

for (const entry of data) {
  if (CUSTOM_TYPES[entry.name]) {
    entry.types = CUSTOM_TYPES[entry.name]
    patched++
  }
}

fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
console.log(`Patched ${patched} custom Mega types.`)

// Verify no entries are still missing types
const missing = data.filter(p => !p.types)
if (missing.length) {
  console.log(`\nStill missing types (${missing.length}):`);
  missing.forEach(p => console.log(' ', p.name))
} else {
  console.log('All entries now have types.')
}
