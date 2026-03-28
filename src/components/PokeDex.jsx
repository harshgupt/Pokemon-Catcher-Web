import { useState } from 'react'
import dexOrder from '../data/dex-order.json'
import pokemon from '../data/pokemon.json'

const byId = Object.fromEntries(pokemon.map(p => [p.id, p]))

// Official Pokémon HOME type colours
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
  const entries = dexOrder.map(id => byId[id]).filter(Boolean)

  return (
    <div style={styles.root}>
      <div style={styles.counter}>{entries.length} Pokémon</div>
      <div style={styles.grid}>
        {entries.map((p, i) => (
          <PokeCard key={`${p.id}-${i}`} pokemon={p} />
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

function PokeCard({ pokemon: p }) {
  const [imgState, setImgState] = useState('loading')
  const displayName = p.displayName ?? p.name
  const spriteFile  = p.spriteName ?? p.name

  return (
    <div style={styles.card}>
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
    gap: '16px',
    height: '100%',
  },
  counter: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '10px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 6px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'border-color var(--transition), background var(--transition)',
    contentVisibility: 'auto',
    containIntrinsicSize: '0 140px',
    height: '140px',
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
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  dexId: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    letterSpacing: '0.04em',
    marginBottom: '2px',
  },
  name: {
    fontSize: '10px',
    color: 'var(--text-primary)',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: '1.3',
    wordBreak: 'break-word',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  types: {
    display: 'flex',
    gap: '3px',
    justifyContent: 'center',
    marginTop: '3px',
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
