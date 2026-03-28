/**
 * Fetches Pokemon types from PokeAPI and writes them to pokemon.json.
 * Caches results so the script can be safely interrupted and re-run.
 * Run from Web folder: node scripts/fetch-types.mjs
 */
import fs from 'fs'
import { setTimeout as sleep } from 'timers/promises'

const POKEMON_JSON = './src/data/pokemon.json'
const CACHE_FILE   = './scripts/.type-cache.json'
const DELAY_MS     = 120  // be polite to the API

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = fs.existsSync(CACHE_FILE)
  ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  : {}
console.log(`Cache: ${Object.keys(cache).length} entries loaded.\n`)

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
}

// ── PokeAPI fetch ─────────────────────────────────────────────────────────────
async function fetchTypes(slug) {
  if (cache[slug] !== undefined) return cache[slug]
  await sleep(DELAY_MS)
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`)
    if (!res.ok) { cache[slug] = null; saveCache(); return null }
    const json = await res.json()
    const types = json.types
      .sort((a, b) => a.slot - b.slot)
      .map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1))
    cache[slug] = types
    saveCache()
    return types
  } catch {
    cache[slug] = null; saveCache(); return null
  }
}

// ── Name → PokeAPI slug ───────────────────────────────────────────────────────

// Explicit overrides where generic transform won't produce the right slug.
// null  = skip (no type data; will be flagged for manual entry)
// string = exact PokeAPI slug to use
const OVERRIDES = {
  // ── Names with special characters ─────────────────────────────────────────
  "Farfetch'd":           'farfetchd',
  "Farfetch'd-Galarian":  'farfetchd-galar',
  "Sirfetch'd":           'sirfetchd',
  "Oricorio-Pa'u":        'oricorio-pau',
  'Type: Null':           'type-null',
  'Mr. Mime':             'mr-mime',
  'Mr. Mime-Galarian':    'mr-mime-galar',
  'Mr. Rime':             'mr-rime',
  'Mime Jr.':             'mime-jr',
  'Ho-oh':                'ho-oh',
  'Porygon-Z':            'porygon-z',
  'Jangmo-o':             'jangmo-o',
  'Hakamo-o':             'hakamo-o',
  'Kommo-o':              'kommo-o',
  'Flabébé-Red':    'flabebe', 'Flabébé-Yellow': 'flabebe',
  'Flabébé-Orange': 'flabebe', 'Flabébé-Blue':   'flabebe', 'Flabébé-White': 'flabebe',

  // ── Multi-word base names (Tapu / Paradox / Treasures of Ruin) ────────────
  'Tapu Koko': 'tapu-koko', 'Tapu Lele': 'tapu-lele',
  'Tapu Bulu': 'tapu-bulu', 'Tapu Fini': 'tapu-fini',
  'Wo-Chien':  'wo-chien',  'Chien-Pao': 'chien-pao',
  'Ting-Lu':   'ting-lu',   'Chi-Yu':    'chi-yu',
  'Scream Tail':  'scream-tail',  'Sandy Shocks':  'sandy-shocks',
  'Flutter Mane': 'flutter-mane', 'Iron Bundle':   'iron-bundle',
  'Great Tusk':   'great-tusk',   'Iron Treads':   'iron-treads',
  'Iron Thorns':  'iron-thorns',  'Raging Bolt':   'raging-bolt',
  'Gouging Fire': 'gouging-fire', 'Walking Wake':  'walking-wake',
  'Iron Valiant': 'iron-valiant', 'Iron Hands':    'iron-hands',
  'Roaring Moon': 'roaring-moon', 'Brute Bonnet':  'brute-bonnet',
  'Slither Wing': 'slither-wing', 'Iron Moth':     'iron-moth',
  'Iron Jugulis': 'iron-jugulis', 'Iron Crown':    'iron-crown',
  'Iron Boulder': 'iron-boulder', 'Iron Leaves':   'iron-leaves',

  // ── Form suffixes PokeAPI uses differently ────────────────────────────────
  'Darmanitan-ZenMode':          'darmanitan-zen',
  'Darmanitan-ZenMode-Galarian': 'darmanitan-galar-zen',
  'Darmanitan-Galarian':         'darmanitan-galar-standard',
  'Necrozma-DuskMane':           'necrozma-dusk',
  'Necrozma-DawnWings':          'necrozma-dawn',
  'Necrozma-Ultra':              'necrozma-ultra',
  'Calyrex-IceRider':            'calyrex-ice',
  'Calyrex-ShadowRider':         'calyrex-shadow',
  'Zacian-CrownedSword':         'zacian-crowned',
  'Zamazenta-CrownedShield':     'zamazenta-crowned',
  'Eternatus-Eternamax':         'eternatus-eternamax',
  'Urshifu-SingleStrike':        'urshifu-single-strike',
  'Urshifu-RapidStrike':         'urshifu-rapid-strike',
  'Urshifu-SingleStrike-Giga':   'urshifu-single-strike',
  'Urshifu-RapidStrike-Giga':    'urshifu-rapid-strike',
  'Toxtricity-LowKey':           'toxtricity-low-key',
  'Toxtricity-Giga':             'toxtricity-amped',
  'Eiscue-IceFace':              'eiscue-ice',
  'Eiscue-NoiceFace':            'eiscue-noice',
  'Wishiwashi-Solo':             'wishiwashi-solo',
  'Wishiwashi-Schooling':        'wishiwashi-school',
  'Morpeko-FullBelly':           'morpeko-full-belly',
  'Morpeko-Hangry':              'morpeko-hangry',
  'Basculin-RedStriped':         'basculin-red-striped',
  'Basculin-BlueStriped':        'basculin-blue-striped',
  'Basculin-WhiteStriped':       'basculin-white-striped',
  'Tauros-Paldean-Combat':       'tauros-paldea-combat-breed',
  'Tauros-Paldean-Blaze':        'tauros-paldea-blaze-breed',
  'Tauros-Paldean-Aqua':         'tauros-paldea-aqua-breed',
  'Oricorio-PomPom':             'oricorio-pom-pom',
  'Oricorio-Baile':              'oricorio-baile',
  'Oricorio-Sensu':              'oricorio-sensu',
  'Lycanroc-Midday':             'lycanroc-midday',
  'Lycanroc-Midnight':           'lycanroc-midnight',
  'Lycanroc-Dusk':               'lycanroc-dusk',
  'Pichu-SpikyEared':            'pichu',  // event Pichu, not in PokeAPI as separate entry

  'Dudunsparce-TwoSegment':      'dudunsparce-two-segment',
  'Dudunsparce-ThreeSegment':    'dudunsparce-three-segment',
  'Ursaluna-BloodMoon':          'ursaluna-bloodmoon',
  'Maushold-FamilyOfFour':       'maushold-family-of-four',
  'Maushold-FamilyOfThree':      'maushold-family-of-three',
  'Squawkabilly-GreenPlumage':   'squawkabilly-green-plumage',
  'Squawkabilly-BluePlumage':    'squawkabilly-blue-plumage',
  'Squawkabilly-YellowPlumage':  'squawkabilly-yellow-plumage',
  'Squawkabilly-WhitePlumage':   'squawkabilly-white-plumage',
  'Ogerpon-TealMask':            'ogerpon',
  'Ogerpon-WellspringMask':      'ogerpon-wellspring-mask',
  'Ogerpon-HearthflameMask':     'ogerpon-hearthflame-mask',
  'Ogerpon-CornerstoneMask':     'ogerpon-cornerstone-mask',
  'Ogerpon-TealMask-Terastal':        'ogerpon',
  'Ogerpon-WellspringMask-Terastal':  'ogerpon-wellspring-mask',
  'Ogerpon-HearthflameMask-Terastal': 'ogerpon-hearthflame-mask',
  'Ogerpon-CornerstoneMask-Terastal': 'ogerpon-cornerstone-mask',
  'Terapagos-Terastal':          'terapagos-terastal',
  'Terapagos-Stellar':           'terapagos-stellar',
  'Gimmighoul-Chest':            'gimmighoul',
  'Gimmighoul-Roaming':          'gimmighoul-roaming',
  'Palafin-Zero':                'palafin-zero',
  'Palafin-Hero':                'palafin-hero',
  'Tatsugiri-Curly':             'tatsugiri-curly',
  'Tatsugiri-Droopy':            'tatsugiri-droopy',
  'Tatsugiri-Stretchy':          'tatsugiri-stretchy',
  'Dialga-Origin':               'dialga-origin',
  'Palkia-Origin':               'palkia-origin',
  'Giratina-Origin':             'giratina-origin',
  'Shaymin-Sky':                 'shaymin-sky',
  'Hoopa-Unbound':               'hoopa-unbound',
  'Keldeo-Resolute':             'keldeo-resolute',
  'Meloetta-Aria':               'meloetta-aria',
  'Meloetta-Pirouette':          'meloetta-pirouette',
  'Kyurem-Black':                'kyurem-black',
  'Kyurem-White':                'kyurem-white',
  'Aegislash-Blade':             'aegislash-blade',
  'Aegislash-Shield':            'aegislash-shield',
  'Mimikyu-Disguised':           'mimikyu-disguised',
  'Mimikyu-Busted':              'mimikyu-busted',
  'Cramorant-Gulping':           'cramorant-gulping',
  'Cramorant-Gorging':           'cramorant-gorging',
  'Nidoran-F':                   'nidoran-f',
  'Nidoran-M':                   'nidoran-m',
  'Castform-Sunny':              'castform-sunny',
  'Castform-Rainy':              'castform-rainy',
  'Castform-Snowy':              'castform-snowy',
  'Zygarde-Core':     'zygarde-10',
  'Zygarde-10':       'zygarde-10',
  'Zygarde-50':       'zygarde-50-power-construct',
  'Zygarde-Complete': 'zygarde-complete',
  'Wormadam-Plant':              'wormadam-plant',
  'Wormadam-Sandy':              'wormadam-sandy',
  'Wormadam-Trash':              'wormadam-trash',
  'Tornadus-Incarnate':          'tornadus-incarnate',
  'Thundurus-Incarnate':         'thundurus-incarnate',
  'Landorus-Incarnate':          'landorus-incarnate',
  'Enamorus-Incarnate':          'enamorus-incarnate',
  'Zarude-Dada':                 'zarude-dada',
  // Base forms whose PokeAPI slug isn't just the lowercased name
  'Deoxys':     'deoxys-normal',
  'Giratina':   'giratina-altered',
  'Shaymin':    'shaymin-land',
  'Darmanitan': 'darmanitan-standard',
  'Keldeo':     'keldeo-ordinary',
  'Minior':     'minior-red-meteor',
  'Pumpkaboo':  'pumpkaboo-small',
  'Gourgeist':  'gourgeist-small',

  // ── Gender forms ──────────────────────────────────────────────────────────
  'Meowstic-M':    'meowstic-male',   'Meowstic-F':    'meowstic-female',
  'Indeedee-M':    'indeedee-male',   'Indeedee-F':    'indeedee-female',
  'Oinkologne-M':  'oinkologne-male', 'Oinkologne-F':  'oinkologne-female',
  'Basculegion-M': 'basculegion-male','Basculegion-F': 'basculegion-female',
  'Frillish-M':    'frillish-male',   'Frillish-F':    'frillish-male',
  'Jellicent-M':   'jellicent-male',  'Jellicent-F':   'jellicent-male',
  'Hippopotas-M':  'hippopotas',      'Hippopotas-F':  'hippopotas',
  'Hippowdon-M':   'hippowdon',       'Hippowdon-F':   'hippowdon',
  'Unfezant-M':    'unfezant',        'Unfezant-F':    'unfezant',
  'Pyroar-M':      'pyroar-male',     'Pyroar-F':      'pyroar-male',

  // ── Same-type cosmetic forms: map to base slug ────────────────────────────
  // Pikachu caps/costumes
  'Pikachu-OriginalCap': 'pikachu', 'Pikachu-HoennCap':    'pikachu',
  'Pikachu-SinnohCap':   'pikachu', 'Pikachu-UnovaCap':    'pikachu',
  'Pikachu-KalosCap':    'pikachu', 'Pikachu-AlolaCap':    'pikachu',
  'Pikachu-PartnerCap':  'pikachu', 'Pikachu-WorldCap':    'pikachu',
  'Pikachu-RockStarCostume': 'pikachu', 'Pikachu-BelleCostume':  'pikachu',
  'Pikachu-PopStarCostume':  'pikachu', 'Pikachu-Ph.DCostume':   'pikachu',
  'Pikachu-LibreCostume':    'pikachu',
  // Furfrou trims
  'Furfrou-Heart': 'furfrou', 'Furfrou-Star': 'furfrou', 'Furfrou-Diamond': 'furfrou',
  'Furfrou-Debutante': 'furfrou', 'Furfrou-Matron': 'furfrou', 'Furfrou-Dandy': 'furfrou',
  'Furfrou-LaReine': 'furfrou', 'Furfrou-Kabuki': 'furfrou', 'Furfrou-Pharaoh': 'furfrou',
  // Vivillon patterns (all Bug/Flying)
  ...Object.fromEntries([
    'Archipelago','Continental','Elegant','Fancy','Garden','HighPlains',
    'IcySnow','Jungle','Marine','Meadow','Modern','Monsoon','Ocean',
    'PokéBall','Polar','River','Sandstorm','Savanna','Sun','Tundra',
  ].map(p => [`Vivillon-${p}`, 'vivillon'])),
  // Unown (all Psychic)
  ...Object.fromEntries([
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => [`Unown-${l}`, 'unown']),
    ['Unown-1', 'unown'], ['Unown-2', 'unown'],
  ]),
  // Alcremie sweets (all Fairy)
  'Alcremie-StrawberrySweet': 'alcremie', 'Alcremie-BerrySweet':   'alcremie',
  'Alcremie-LoveSweet':       'alcremie', 'Alcremie-StarSweet':    'alcremie',
  'Alcremie-CloverSweet':     'alcremie', 'Alcremie-FlowerSweet':  'alcremie',
  'Alcremie-RibbonSweet':     'alcremie',
  // Minior colours (all Rock/Flying as core)
  ...Object.fromEntries(
    ['Red','Orange','Yellow','Green','Blue','Indigo','Violet']
      .map(c => [`Minior-${c}`, 'minior-red-meteor'])
  ),
  // Floette/Florges colours (all Fairy)
  ...Object.fromEntries([
    'Red','Yellow','Orange','Blue','White'
  ].flatMap(c => [
    [`Floette-${c}`, 'floette'], [`Florges-${c}`, 'florges'],
  ])),
  'Floette-Eternal': 'floette-eternal',
  // Seasonal forms — PokeAPI only has base slugs
  ...Object.fromEntries(['Spring','Summer','Autumn','Winter'].flatMap(s => [
    [`Deerling-${s}`, 'deerling'],
    [`Sawsbuck-${s}`, 'sawsbuck'],
  ])),
  // Shellos/Gastrodon (all Water/Ground)
  'Shellos-WestSea': 'shellos', 'Shellos-EastSea': 'shellos',
  'Gastrodon-WestSea': 'gastrodon', 'Gastrodon-EastSea': 'gastrodon',
  // Cherrim (all Grass)
  'Cherrim-Overcast': 'cherrim', 'Cherrim-Sunshine': 'cherrim',
  // Burmy (all Bug — PokeAPI only has base form)
  'Burmy-Plant': 'burmy', 'Burmy-Sandy': 'burmy', 'Burmy-Trash': 'burmy',
  // Deoxys — base is deoxys-normal in PokeAPI
  'Deoxys-Attack': 'deoxys-attack', 'Deoxys-Defense': 'deoxys-defense', 'Deoxys-Speed': 'deoxys-speed',
  // Sinistea/Polteageist antique (same type as phony)
  'Sinistea-Phony': 'sinistea', 'Sinistea-Antique': 'sinistea',
  'Polteageist-Phony': 'polteageist', 'Polteageist-Antique': 'polteageist',
  'Poltchageist-Phony': 'poltchageist', 'Poltchageist-Antique': 'poltchageist',
  'Sinistcha-Phony': 'sinistcha', 'Sinistcha-Antique': 'sinistcha',
  // Misc same-type forms
  'Xerneas-NeutralMode': 'xerneas',     'Xerneas-ActiveMode':  'xerneas',
  'Solgaleo-RadiantSun': 'solgaleo',    'Lunala-FullMoon':     'lunala',
  'Marshadow-Zenith':    'marshadow',
  'Magearna-OriginalColor': 'magearna',
  // Gigantamax (same types as base)
  ...Object.fromEntries([
    'Pikachu','Venusaur','Charizard','Blastoise','Butterfree','Meowth','Machamp',
    'Gengar','Kingler','Lapras','Eevee','Snorlax','Garbodor','Melmetal','Rillaboom',
    'Cinderace','Inteleon','Corviknight','Orbeetle','Drednaw','Coalossal','Flapple',
    'Appletun','Sandaconda','Centiskorch','Hatterene','Grimmsnarl','Alcremie',
    'Copperajah','Duraludon',
  ].map(n => [`${n}-Giga`, n.toLowerCase()])),

  // ── Overdrive (custom forms → base) ───────────────────────────────────────
  'Reshiram-Overdrive':     'reshiram',
  'Zekrom-Overdrive':       'zekrom',
  'Kyurem-Black-Overdrive': 'kyurem-black',
  'Kyurem-White-Overdrive': 'kyurem-white',

  // ── Custom Mega evolutions (not in PokeAPI) ────────────────────────────────
  // Set null — will be reported for manual entry
  'Raichu-MegaX': null, 'Raichu-MegaY': null, 'Clefable-Mega': null,
  'Victreebel-Mega': null, 'Starmie-Mega': null, 'Dragonite-Mega': null,
  'Meganium-Mega': null, 'Feraligatr-Mega': null, 'Skarmory-Mega': null,
  'Chimecho-Mega': null, 'Absol-MegaZ': null, 'Staraptor-Mega': null,
  'Garchomp-MegaZ': null, 'Lucario-MegaZ': null, 'Froslass-Mega': null,
  'Heatran-Mega': null, 'Darkrai-Mega': null, 'Emboar-Mega': null,
  'Excadrill-Mega': null, 'Scolipede-Mega': null, 'Scrafty-Mega': null,
  'Eelektross-Mega': null, 'Chandelure-Mega': null, 'Golurk-Mega': null,
  'Chesnaught-Mega': null, 'Delphox-Mega': null, 'Greninja-Mega': null,
  'Pyroar-M-Mega': null, 'Pyroar-F-Mega': null, 'Floette-Eternal-Mega': null,
  'Meowstic-M-Mega': null, 'Meowstic-F-Mega': null, 'Malamar-Mega': null,
  'Barbaracle-Mega': null, 'Dragalge-Mega': null, 'Hawlucha-Mega': null,
  'Zygarde-Mega': null, 'Crabominable-Mega': null, 'Golisopod-Mega': null,
  'Drampa-Mega': null, 'Magearna-OriginalColor-Mega': null, 'Zeraora-Mega': null,
  'Falinks-Mega': null, 'Scovillain-Mega': null, 'Glimmora-Mega': null,
  'Tatsugiri-Curly-Mega': null, 'Tatsugiri-Stretchy-Mega': null,
  'Tatsugiri-Droopy-Mega': null, 'Baxcalibur-Mega': null,
}

// Generic transform for names not in OVERRIDES
const SUFFIX_MAP = {
  '-Alolan': '-alola', '-Galarian': '-galar', '-Hisuian': '-hisui',
  '-Paldean': '-paldea', '-Primal': '-primal',
  '-MegaX': '-mega-x', '-MegaY': '-mega-y', '-MegaZ': '',
  '-Mega': '-mega', '-Giga': '',
}

function toSlug(name) {
  if (OVERRIDES[name] !== undefined) return OVERRIDES[name]

  let base = name, formSlug = ''
  for (const [sfx, rep] of Object.entries(SUFFIX_MAP)) {
    if (name.endsWith(sfx)) { base = name.slice(0, -sfx.length); formSlug = rep; break }
  }

  const baseSlug = base
    .toLowerCase()
    .replace(/\./g, '').replace(/'/g, '').replace(/é/g, 'e')
    .replace(/: /g, '-').replace(/ /g, '-')

  return baseSlug + formSlug || null
}

// ── Main ──────────────────────────────────────────────────────────────────────
const data  = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
const nulls = []
let fetched = 0, skipped = 0, failed = []

for (const entry of data) {
  if (entry.types) { skipped++; continue }  // already has types

  const slug = toSlug(entry.name)

  if (slug === null) {
    nulls.push(entry.name)
    continue
  }

  process.stdout.write(`  Fetching ${entry.name} (${slug})... `)
  const types = await fetchTypes(slug)

  if (types) {
    entry.types = types
    process.stdout.write(types.join('/') + '\n')
    fetched++
  } else {
    process.stdout.write('NOT FOUND\n')
    failed.push({ name: entry.name, slug })
  }
}

fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
console.log(`\nDone. Fetched: ${fetched}, Skipped (already set): ${skipped}`)

if (nulls.length) {
  console.log(`\nCustom forms (need manual types):\n${nulls.map(n => `  ${n}`).join('\n')}`)
}
if (failed.length) {
  console.log(`\nAPI lookup failed (slug not found):\n${failed.map(f => `  ${f.name} → tried "${f.slug}"`).join('\n')}`)
}
