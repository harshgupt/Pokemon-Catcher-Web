import { useState } from 'react'
import dexOrder from '../data/dex-order.json'
import pokemon from '../data/pokemon.json'

const byId = Object.fromEntries(pokemon.map(p => [p.id, p]))

// ── Evolution chain helpers ───────────────────────────────────────────────────
const parentOf = {}
pokemon.forEach(p => {
  if (Array.isArray(p.nextForms)) {
    p.nextForms.forEach(nf => {
      if (parentOf[nf.nextCharacterID] === undefined)
        parentOf[nf.nextCharacterID] = p.id
    })
  }
})

function getBaseId(id, seen = new Set()) {
  if (seen.has(id)) return id
  seen.add(id)
  return parentOf[id] !== undefined ? getBaseId(parentOf[id], seen) : id
}

function getGen(p) {
  const own = p.categories.find(c => c.startsWith('Generation'))
  if (own) return own
  const base = byId[getBaseId(p.id)]
  return base?.categories.find(c => c.startsWith('Generation')) ?? ''
}

function getFormType(p) {
  const n = p.name
  if (/-Mega([XYZ]|Z)?$/.test(n)) return 'mega'
  if (/-Giga$/.test(n))           return 'giga'
  if (/-(Alolan|Galarian|Hisuian|Paldean)/.test(n) || p.categories.includes('RegionalForm')) return 'regional'
  if (p.categories.includes('ConvergentForm'))                                  return 'alt'
  if (p.categories.includes('AlternateForm') && n.includes('-'))                return 'alt'
  if (n.includes('-') && !p.categories.some(c => c.startsWith('Generation')))  return 'alt'
  return 'base'
}

// Pre-compute per-entry metadata once at module load
const meta = Object.fromEntries(pokemon.map(p => [p.id, {
  gen:      getGen(p),
  formType: getFormType(p),
}]))

// ── Filter options ────────────────────────────────────────────────────────────
const TYPES = [
  'Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
  'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy',
]

const GENERATIONS = [
  { value: 'Generation1', label: 'Gen I'   },
  { value: 'Generation2', label: 'Gen II'  },
  { value: 'Generation3', label: 'Gen III' },
  { value: 'Generation4', label: 'Gen IV'  },
  { value: 'Generation5', label: 'Gen V'   },
  { value: 'Generation6', label: 'Gen VI'  },
  { value: 'Generation7', label: 'Gen VII' },
  { value: 'Generation8', label: 'Gen VIII'},
  { value: 'Generation9', label: 'Gen IX'  },
]

const RARITIES = [
  { value: 'Common',          label: 'Common'           },
  { value: 'Uncommon',        label: 'Uncommon'         },
  { value: 'Rare',            label: 'Rare'             },
  { value: 'Sparse',          label: 'Sparse'           },
  { value: 'Starter',         label: 'Starter'          },
  { value: 'Baby',            label: 'Baby'             },
  { value: 'Fossil',          label: 'Fossil'           },
  { value: 'Pseudo',          label: 'Pseudo-Legendary' },
  { value: 'Legendary',       label: 'Legendary'        },
  { value: 'StrongLegendary', label: 'Strong Legendary' },
  { value: 'BoxLegendary',    label: 'Box Legendary'    },
  { value: 'Mythical',        label: 'Mythical'         },
  { value: 'Singular',        label: 'Singular'         },
  { value: 'UltraBeast',      label: 'Ultra Beast'      },
]

// ── Official Pokémon HOME type colours ────────────────────────────────────────
const TYPE_COLORS = {
  Normal:   '#9FA19F',
  Fire:     '#E62829',
  Water:    '#2980EF',
  Electric: '#FAC000',
  Grass:    '#3FA129',
  Ice:      '#3DCEF3',
  Fighting: '#FF8000',
  Poison:   '#9141CB',
  Ground:   '#915121',
  Flying:   '#81B9EF',
  Psychic:  '#EF4179',
  Bug:      '#91A119',
  Rock:     '#AFA981',
  Ghost:    '#704170',
  Dragon:   '#5060E1',
  Dark:     '#624D4E',
  Steel:    '#60A1B8',
  Fairy:    '#EF70EF',
}

export default function PokeDex() {
  const [query,  setQuery]  = useState('')
  const [type1,  setType1]  = useState('')
  const [type2,  setType2]  = useState('')
  const [gen,    setGen]    = useState('')
  const [form,   setForm]   = useState('')
  const [rarity, setRarity] = useState('')

  const allEntries  = dexOrder.map(id => byId[id]).filter(Boolean)
  const lowerQuery  = query.toLowerCase()
  const hasFilters  = query || type1 || type2 || gen || form || rarity

  function isHidden(p) {
    if (!hasFilters) return false
    if (query  && !(p.displayName ?? p.name).toLowerCase().includes(lowerQuery)) return true
    if (type1  && !p.types?.includes(type1))        return true
    if (type2  && !p.types?.includes(type2))        return true
    const m = meta[p.id]
    if (gen    && m.gen      !== gen)    return true
    if (form   && m.formType !== form)   return true
    if (rarity && p.rarity   !== rarity) return true
    return false
  }

  return (
    <div style={styles.root}>
      <input
        style={styles.search}
        type="text"
        placeholder="Search Pokémon…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div style={styles.filters}>
        <select style={styles.select} value={type1} onChange={e => setType1(e.target.value)}>
          <option value="">Type 1</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={styles.select} value={type2} onChange={e => setType2(e.target.value)}>
          <option value="">Type 2</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={styles.select} value={gen} onChange={e => setGen(e.target.value)}>
          <option value="">Generation</option>
          {GENERATIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select style={styles.select} value={form} onChange={e => setForm(e.target.value)}>
          <option value="">Form</option>
          <option value="base">Base Forms</option>
          <option value="mega">Mega Evolutions</option>
          <option value="giga">Gigantamax</option>
          <option value="regional">Regional Forms</option>
          <option value="alt">Alternate Forms</option>
        </select>
        <select style={styles.select} value={rarity} onChange={e => setRarity(e.target.value)}>
          <option value="">Rarity</option>
          {RARITIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div style={styles.grid}>
        {allEntries.map((p, i) => (
          <PokeCard key={`${p.id}-${i}`} pokemon={p} hidden={isHidden(p)} />
        ))}
      </div>
    </div>
  )
}

function GenderedName({ name }) {
  const femaleIdx = name.indexOf(' ♀')
  const maleIdx   = name.indexOf(' ♂')
  if (femaleIdx !== -1) {
    return <>{name.slice(0, femaleIdx)} <span style={{ color: '#f48fb1' }}>♀</span></>
  }
  if (maleIdx !== -1) {
    return <>{name.slice(0, maleIdx)} <span style={{ color: '#90caf9' }}>♂</span></>
  }
  return <>{name}</>
}

function TypeBadge({ type }) {
  const bg = TYPE_COLORS[type] ?? '#9FA19F'
  return (
    <span style={{ ...styles.typeBadge, background: bg }}>
      {type}
    </span>
  )
}

function PokeCard({ pokemon: p, hidden }) {
  const [imgState, setImgState] = useState('loading')
  const displayName = p.displayName ?? p.name
  const spriteFile  = p.spriteName ?? p.name

  return (
    <div style={hidden ? { ...styles.card, display: 'none' } : styles.card}>
      <div style={styles.imageWrap}>
        {imgState === 'loading' && <div className="sprite-spinner" />}
        <img
          src={`/sprites/pokemon/mid/${spriteFile}.png`}
          alt={p.name}
          style={{ ...styles.image, opacity: imgState === 'loaded' ? 1 : 0 }}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />
      </div>
      <div style={styles.info}>
        <span style={styles.dexId}>#{String(p.dexId).padStart(4, '0')}</span>
        <span style={styles.name}><GenderedName name={displayName} /></span>
        <div style={styles.types}>
          {(p.types ?? []).map(t => <TypeBadge key={t} type={t} />)}
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
  },
  search: {
    flexShrink: 0,
    width: '100%',
    padding: '6px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  filters: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  select: {
    flex: '1 1 0',
    minWidth: '80px',
    padding: '5px 6px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '10px',
    overflowY: 'auto',
    paddingRight: '4px',
    flex: 1,
  },
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 6px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'border-color var(--transition), background var(--transition)',
    contentVisibility: 'auto',
    containIntrinsicSize: '0 132px',
  },
  imageWrap: {
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '52px',
    height: '52px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: '4px',
  },
  dexId: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    letterSpacing: '0.04em',
  },
  name: {
    fontSize: '10px',
    color: 'var(--text-primary)',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: '1.3',
    wordBreak: 'break-word',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  types: {
    display: 'flex',
    gap: '3px',
    justifyContent: 'center',
  },
  typeBadge: {
    fontSize: '8px',
    fontWeight: '700',
    color: '#fff',
    borderRadius: '3px',
    padding: '1px 5px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
}
