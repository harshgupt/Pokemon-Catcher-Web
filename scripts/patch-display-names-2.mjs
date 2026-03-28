/**
 * Comprehensive display name patch — covers all remaining form variants.
 * Run from Web folder: node scripts/patch-display-names-2.mjs
 */
import fs from 'fs'

const POKEMON_JSON = './src/data/pokemon.json'

const PATCHES = {
  // ── Capitalisation fix ────────────────────────────────────────────────────
  'Ho-oh': 'Ho-Oh',

  // ── Unique event forms ────────────────────────────────────────────────────
  'Pichu-SpikyEared':         'Spiky-Eared Pichu',
  "Farfetch'd-Galarian":      "Galarian Farfetch'd",
  'Dudunsparce-TwoSegment':   'Two-Segment Dudunsparce',
  'Dudunsparce-ThreeSegment': 'Three-Segment Dudunsparce',
  'Ursaluna-BloodMoon':       'Bloodmoon Ursaluna',

  // ── Castform ──────────────────────────────────────────────────────────────
  'Castform-Sunny': 'Sunny Form Castform',
  'Castform-Rainy': 'Rainy Form Castform',
  'Castform-Snowy': 'Snowy Form Castform',

  // ── Rotom ─────────────────────────────────────────────────────────────────
  'Rotom-Heat':  'Heat Rotom',
  'Rotom-Wash':  'Wash Rotom',
  'Rotom-Frost': 'Frost Rotom',
  'Rotom-Fan':   'Fan Rotom',
  'Rotom-Mow':   'Mow Rotom',

  // ── Burmy / Wormadam ──────────────────────────────────────────────────────
  'Burmy-Plant':     'Plant Cloak Burmy',
  'Burmy-Sandy':     'Sandy Cloak Burmy',
  'Burmy-Trash':     'Trash Cloak Burmy',
  'Wormadam-Plant':  'Plant Cloak Wormadam',
  'Wormadam-Sandy':  'Sandy Cloak Wormadam',
  'Wormadam-Trash':  'Trash Cloak Wormadam',

  // ── Cherrim ───────────────────────────────────────────────────────────────
  'Cherrim-Overcast':  'Overcast Form Cherrim',
  'Cherrim-Sunshine':  'Sunshine Form Cherrim',

  // ── Shellos / Gastrodon ───────────────────────────────────────────────────
  'Shellos-WestSea':    'West Sea Shellos',
  'Shellos-EastSea':    'East Sea Shellos',
  'Gastrodon-WestSea':  'West Sea Gastrodon',
  'Gastrodon-EastSea':  'East Sea Gastrodon',

  // ── Gender forms ──────────────────────────────────────────────────────────
  'Frillish-M':   'Frillish ♂',
  'Frillish-F':   'Frillish ♀',
  'Jellicent-M':  'Jellicent ♂',
  'Jellicent-F':  'Jellicent ♀',
  'Pyroar-M':     'Pyroar ♂',
  'Pyroar-F':     'Pyroar ♀',

  // ── Incarnate Formes ──────────────────────────────────────────────────────
  'Tornadus-Incarnate':  'Incarnate Forme Tornadus',
  'Thundurus-Incarnate': 'Incarnate Forme Thundurus',
  'Landorus-Incarnate':  'Incarnate Forme Landorus',
  'Enamorus-Incarnate':  'Incarnate Forme Enamorus',

  // ── Kyurem fusions ────────────────────────────────────────────────────────
  'Kyurem-Black': 'Black Kyurem',
  'Kyurem-White': 'White Kyurem',

  // ── Overdrive forms ───────────────────────────────────────────────────────
  'Reshiram-Overdrive':       'Overdrive Reshiram',
  'Zekrom-Overdrive':         'Overdrive Zekrom',
  'Kyurem-Black-Overdrive':   'Overdrive Black Kyurem',
  'Kyurem-White-Overdrive':   'Overdrive White Kyurem',

  // ── Keldeo / Meloetta ─────────────────────────────────────────────────────
  'Keldeo-Resolute':      'Resolute Forme Keldeo',
  'Meloetta-Aria':        'Aria Forme Meloetta',
  'Meloetta-Pirouette':   'Pirouette Forme Meloetta',

  // ── Basculin ──────────────────────────────────────────────────────────────
  'Basculin-RedStriped':    'Red-Striped Form Basculin',
  'Basculin-BlueStriped':   'Blue-Striped Form Basculin',
  'Basculin-WhiteStriped':  'White-Striped Form Basculin',

  // ── Deerling / Sawsbuck ───────────────────────────────────────────────────
  'Deerling-Spring':  'Spring Form Deerling',
  'Deerling-Summer':  'Summer Form Deerling',
  'Deerling-Autumn':  'Autumn Form Deerling',
  'Deerling-Winter':  'Winter Form Deerling',
  'Sawsbuck-Spring':  'Spring Form Sawsbuck',
  'Sawsbuck-Summer':  'Summer Form Sawsbuck',
  'Sawsbuck-Autumn':  'Autumn Form Sawsbuck',
  'Sawsbuck-Winter':  'Winter Form Sawsbuck',

  // ── Vivillon patterns ─────────────────────────────────────────────────────
  'Vivillon-Archipelago':  'Archipelago Pattern Vivillon',
  'Vivillon-Continental':  'Continental Pattern Vivillon',
  'Vivillon-Elegant':      'Elegant Pattern Vivillon',
  'Vivillon-Fancy':        'Fancy Pattern Vivillon',
  'Vivillon-Garden':       'Garden Pattern Vivillon',
  'Vivillon-HighPlains':   'High Plains Pattern Vivillon',
  'Vivillon-IcySnow':      'Icy Snow Pattern Vivillon',
  'Vivillon-Jungle':       'Jungle Pattern Vivillon',
  'Vivillon-Marine':       'Marine Pattern Vivillon',
  'Vivillon-Meadow':       'Meadow Pattern Vivillon',
  'Vivillon-Modern':       'Modern Pattern Vivillon',
  'Vivillon-Monsoon':      'Monsoon Pattern Vivillon',
  'Vivillon-Ocean':        'Ocean Pattern Vivillon',
  'Vivillon-PokéBall':     'Poké Ball Pattern Vivillon',
  'Vivillon-Polar':        'Polar Pattern Vivillon',
  'Vivillon-River':        'River Pattern Vivillon',
  'Vivillon-Sandstorm':    'Sandstorm Pattern Vivillon',
  'Vivillon-Savanna':      'Savanna Pattern Vivillon',
  'Vivillon-Sun':          'Sun Pattern Vivillon',
  'Vivillon-Tundra':       'Tundra Pattern Vivillon',

  // ── Flabébé / Floette / Florges flowers ───────────────────────────────────
  'Flabébé-Red':     'Red Flower Flabébé',
  'Flabébé-Yellow':  'Yellow Flower Flabébé',
  'Flabébé-Orange':  'Orange Flower Flabébé',
  'Flabébé-Blue':    'Blue Flower Flabébé',
  'Flabébé-White':   'White Flower Flabébé',
  'Floette-Red':     'Red Flower Floette',
  'Floette-Yellow':  'Yellow Flower Floette',
  'Floette-Orange':  'Orange Flower Floette',
  'Floette-Blue':    'Blue Flower Floette',
  'Floette-White':   'White Flower Floette',
  'Floette-Eternal': 'Eternal Flower Floette',
  'Florges-Red':     'Red Flower Florges',
  'Florges-Yellow':  'Yellow Flower Florges',
  'Florges-Orange':  'Orange Flower Florges',
  'Florges-Blue':    'Blue Flower Florges',
  'Florges-White':   'White Flower Florges',

  // ── Furfrou trims ─────────────────────────────────────────────────────────
  'Furfrou-Heart':     'Heart Trim Furfrou',
  'Furfrou-Star':      'Star Trim Furfrou',
  'Furfrou-Diamond':   'Diamond Trim Furfrou',
  'Furfrou-Debutante': 'Debutante Trim Furfrou',
  'Furfrou-Matron':    'Matron Trim Furfrou',
  'Furfrou-Dandy':     'Dandy Trim Furfrou',
  'Furfrou-LaReine':   'La Reine Trim Furfrou',
  'Furfrou-Kabuki':    'Kabuki Trim Furfrou',
  'Furfrou-Pharaoh':   'Pharaoh Trim Furfrou',

  // ── Aegislash ─────────────────────────────────────────────────────────────
  'Aegislash-Blade':   'Blade Forme Aegislash',
  'Aegislash-Shield':  'Shield Forme Aegislash',

  // ── Oricorio ──────────────────────────────────────────────────────────────
  'Oricorio-Baile':   'Baile Style Oricorio',
  'Oricorio-PomPom':  'Pom-Pom Style Oricorio',
  "Oricorio-Pa'u":    "Pa'u Style Oricorio",
  'Oricorio-Sensu':   'Sensu Style Oricorio',

  // ── Lycanroc ──────────────────────────────────────────────────────────────
  'Lycanroc-Midday':   'Midday Form Lycanroc',
  'Lycanroc-Midnight': 'Midnight Form Lycanroc',
  'Lycanroc-Dusk':     'Dusk Form Lycanroc',

  // ── Minior ────────────────────────────────────────────────────────────────
  'Minior-Red':    'Red Core Minior',
  'Minior-Orange': 'Orange Core Minior',
  'Minior-Yellow': 'Yellow Core Minior',
  'Minior-Green':  'Green Core Minior',
  'Minior-Blue':   'Blue Core Minior',
  'Minior-Indigo': 'Indigo Core Minior',
  'Minior-Violet': 'Violet Core Minior',

  // ── Mimikyu ───────────────────────────────────────────────────────────────
  'Mimikyu-Disguised': 'Disguised Form Mimikyu',
  'Mimikyu-Busted':    'Busted Form Mimikyu',

  // ── Sinistea / Polteageist ────────────────────────────────────────────────
  'Sinistea-Phony':      'Phony Form Sinistea',
  'Sinistea-Antique':    'Antique Form Sinistea',
  'Polteageist-Phony':   'Phony Form Polteageist',
  'Polteageist-Antique': 'Antique Form Polteageist',

  // ── Poltchageist / Sinistcha ──────────────────────────────────────────────
  'Poltchageist-Phony':   'Phony Form Poltchageist',
  'Poltchageist-Antique': 'Antique Form Poltchageist',
  'Sinistcha-Phony':      'Phony Form Sinistcha',
  'Sinistcha-Antique':    'Antique Form Sinistcha',

  // ── Alcremie sweets ───────────────────────────────────────────────────────
  'Alcremie-StrawberrySweet': 'Strawberry Sweet Alcremie',
  'Alcremie-BerrySweet':      'Berry Sweet Alcremie',
  'Alcremie-LoveSweet':       'Love Sweet Alcremie',
  'Alcremie-StarSweet':       'Star Sweet Alcremie',
  'Alcremie-CloverSweet':     'Clover Sweet Alcremie',
  'Alcremie-FlowerSweet':     'Flower Sweet Alcremie',
  'Alcremie-RibbonSweet':     'Ribbon Sweet Alcremie',

  // ── Maushold ──────────────────────────────────────────────────────────────
  'Maushold-FamilyOfFour':   'Family of Four Maushold',
  'Maushold-FamilyOfThree':  'Family of Three Maushold',

  // ── Squawkabilly ──────────────────────────────────────────────────────────
  'Squawkabilly-GreenPlumage':   'Green Plumage Squawkabilly',
  'Squawkabilly-BluePlumage':    'Blue Plumage Squawkabilly',
  'Squawkabilly-YellowPlumage':  'Yellow Plumage Squawkabilly',
  'Squawkabilly-WhitePlumage':   'White Plumage Squawkabilly',

  // ── Tatsugiri (base forms — Mega already covered) ─────────────────────────
  'Tatsugiri-Curly':    'Curly Form Tatsugiri',
  'Tatsugiri-Droopy':   'Droopy Form Tatsugiri',
  'Tatsugiri-Stretchy': 'Stretchy Form Tatsugiri',

  // ── Gimmighoul ────────────────────────────────────────────────────────────
  'Gimmighoul-Chest':    'Chest Form Gimmighoul',
  'Gimmighoul-Roaming':  'Roaming Form Gimmighoul',

  // ── Ogerpon masks (non-Terastal — Terastal already covered) ──────────────
  'Ogerpon-TealMask':        'Ogerpon (Teal Mask)',
  'Ogerpon-WellspringMask':  'Ogerpon (Wellspring Mask)',
  'Ogerpon-HearthflameMask': 'Ogerpon (Hearthflame Mask)',
  'Ogerpon-CornerstoneMask': 'Ogerpon (Cornerstone Mask)',

  // ── Unown ─────────────────────────────────────────────────────────────────
  'Unown-A': 'Unown (A)',  'Unown-B': 'Unown (B)',  'Unown-C': 'Unown (C)',
  'Unown-D': 'Unown (D)',  'Unown-E': 'Unown (E)',  'Unown-F': 'Unown (F)',
  'Unown-G': 'Unown (G)',  'Unown-H': 'Unown (H)',  'Unown-I': 'Unown (I)',
  'Unown-J': 'Unown (J)',  'Unown-K': 'Unown (K)',  'Unown-L': 'Unown (L)',
  'Unown-M': 'Unown (M)',  'Unown-N': 'Unown (N)',  'Unown-O': 'Unown (O)',
  'Unown-P': 'Unown (P)',  'Unown-Q': 'Unown (Q)',  'Unown-R': 'Unown (R)',
  'Unown-S': 'Unown (S)',  'Unown-T': 'Unown (T)',  'Unown-U': 'Unown (U)',
  'Unown-V': 'Unown (V)',  'Unown-W': 'Unown (W)',  'Unown-X': 'Unown (X)',
  'Unown-Y': 'Unown (Y)',  'Unown-Z': 'Unown (Z)',
  'Unown-1': 'Unown (?)',  // ? form (27th in standard ordering)
  'Unown-2': 'Unown (!)',  // ! form (28th in standard ordering)
}

const data = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
let patched = 0, notFound = []

for (const [name, display] of Object.entries(PATCHES)) {
  const entry = data.find(p => p.name === name)
  if (entry) {
    entry.displayName = display
    patched++
  } else {
    notFound.push(name)
  }
}

fs.writeFileSync(POKEMON_JSON, JSON.stringify(data, null, 2))
console.log(`Patched ${patched} displayNames.`)
if (notFound.length) console.log('Not found in data:', notFound)
