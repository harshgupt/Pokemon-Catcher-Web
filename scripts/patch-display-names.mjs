/**
 * Patches displayName for all remaining form name concerns.
 * Run from Web folder: node scripts/patch-display-names.mjs
 */
import fs from 'fs'

const POKEMON_JSON = './src/data/pokemon.json'

const PATCHES = {
  // ── Inverted order ────────────────────────────────────────────────────────
  'Greninja-Ash':            'Ash-Greninja',
  'Calyrex-IceRider':        'Ice Rider Calyrex',
  'Calyrex-ShadowRider':     'Shadow Rider Calyrex',
  'Necrozma-DuskMane':       'Dusk Mane Necrozma',
  'Necrozma-DawnWings':      'Dawn Wings Necrozma',
  'Necrozma-Ultra':          'Ultra Necrozma',
  'Eternatus-Eternamax':     'Eternamax Eternatus',
  'Urshifu-SingleStrike':    'Single Strike Style Urshifu',
  'Urshifu-RapidStrike':     'Rapid Strike Style Urshifu',
  'Zacian-CrownedSword':     'Crowned Sword Zacian',
  'Zamazenta-CrownedShield': 'Crowned Shield Zamazenta',
  'Hoopa-Unbound':           'Unbound Hoopa',

  // ── Forme naming ─────────────────────────────────────────────────────────
  'Deoxys-Attack':           'Attack Forme Deoxys',
  'Deoxys-Defense':          'Defense Forme Deoxys',
  'Deoxys-Speed':            'Speed Forme Deoxys',
  'Giratina-Origin':         'Origin Forme Giratina',
  'Shaymin-Sky':             'Sky Forme Shaymin',
  'Darmanitan-ZenMode':      'Zen Mode Darmanitan',
  'Tornadus-Therian':        'Therian Forme Tornadus',
  'Thundurus-Therian':       'Therian Forme Thundurus',
  'Landorus-Therian':        'Therian Forme Landorus',
  'Enamorus-Therian':        'Therian Forme Enamorus',
  'Dialga-Origin':           'Origin Forme Dialga',
  'Palkia-Origin':           'Origin Forme Palkia',

  // ── Gender forms — using ♀/♂ symbols ─────────────────────────────────────
  'Nidoran-F':        'Nidoran ♀',
  'Nidoran-M':        'Nidoran ♂',
  'Hippopotas-F':     'Hippopotas ♀',
  'Hippopotas-M':     'Hippopotas ♂',
  'Hippowdon-F':      'Hippowdon ♀',
  'Hippowdon-M':      'Hippowdon ♂',
  'Unfezant-F':       'Unfezant ♀',
  'Unfezant-M':       'Unfezant ♂',
  'Meowstic-F':       'Meowstic ♀',
  'Meowstic-M':       'Meowstic ♂',
  'Indeedee-F':       'Indeedee ♀',
  'Indeedee-M':       'Indeedee ♂',
  'Oinkologne-F':     'Oinkologne ♀',
  'Oinkologne-M':     'Oinkologne ♂',
  'Basculegion-F':    'Basculegion ♀',
  'Basculegion-M':    'Basculegion ♂',

  // ── Pikachu caps ──────────────────────────────────────────────────────────
  'Pikachu-OriginalCap':  'Original Cap Pikachu',
  'Pikachu-HoennCap':     'Hoenn Cap Pikachu',
  'Pikachu-SinnohCap':    'Sinnoh Cap Pikachu',
  'Pikachu-UnovaCap':     'Unova Cap Pikachu',
  'Pikachu-KalosCap':     'Kalos Cap Pikachu',
  'Pikachu-AlolaCap':     'Alola Cap Pikachu',
  'Pikachu-PartnerCap':   'Partner Cap Pikachu',
  'Pikachu-WorldCap':     'World Cap Pikachu',

  // ── Pikachu costumes ──────────────────────────────────────────────────────
  'Pikachu-RockStarCostume': 'Rock Star Pikachu',
  'Pikachu-BelleCostume':    'Belle Pikachu',
  'Pikachu-PopStarCostume':  'Pop Star Pikachu',
  'Pikachu-Ph.DCostume':     'Ph.D. Pikachu',
  'Pikachu-LibreCostume':    'Libre Pikachu',

  // ── Misc forms ────────────────────────────────────────────────────────────
  'Magearna-OriginalColor':  'Original Color Magearna',
  'Solgaleo-RadiantSun':     'Radiant Sun Phase Solgaleo',
  'Lunala-FullMoon':         'Full Moon Phase Lunala',
  'Xerneas-NeutralMode':     'Neutral Mode Xerneas',
  'Xerneas-ActiveMode':      'Active Mode Xerneas',
  'Zarude-Dada':             'Dada Zarude',
  'Marshadow-Zenith':        'Zenith Marshadow',
  'Zygarde-Core':            'Core Form Zygarde',
  'Zygarde-10':              '10% Zygarde',
  'Zygarde-50':              '50% Zygarde',
  'Zygarde-Complete':        'Complete Forme Zygarde',
  'Eiscue-IceFace':          'Ice Face Eiscue',
  'Eiscue-NoiceFace':        'Noice Face Eiscue',
  'Morpeko-FullBelly':       'Full Belly Mode Morpeko',
  'Morpeko-Hangry':          'Hangry Mode Morpeko',
  'Toxtricity-Amped':        'Amped Form Toxtricity',
  'Toxtricity-LowKey':       'Low Key Form Toxtricity',
  'Palafin-Zero':            'Zero Form Palafin',
  'Palafin-Hero':            'Hero Form Palafin',
  'Terapagos-Terastal':      'Terastal Form Terapagos',
  'Terapagos-Stellar':       'Stellar Form Terapagos',
  'Wishiwashi-Solo':         'Solo Form Wishiwashi',
  'Wishiwashi-Schooling':    'School Form Wishiwashi',
  'Cramorant-Gulping':       'Gulping Form Cramorant',
  'Cramorant-Gorging':       'Gorging Form Cramorant',
}

const data = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
let patched = 0

for (const entry of data) {
  if (PATCHES[entry.name]) {
    entry.displayName = PATCHES[entry.name]
    patched++
  }
}

fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
console.log(`Patched ${patched} displayNames.`)
