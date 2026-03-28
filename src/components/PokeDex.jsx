import dexOrder from '../data/dex-order.json'
import pokemon from '../data/pokemon.json'

const byId = Object.fromEntries(pokemon.map(p => [p.id, p]))

const RARITY_COLORS = {
  Common:        '#90caf9',
  Uncommon:      '#a5d6a7',
  Rare:          '#ce93d8',
  Sparse:        '#ffb74d',
  Baby:          '#f48fb1',
  Singular:      '#80deea',
  Pseudo:        '#ef9a9a',
  Fossil:        '#bcaaa4',
  Starter:       '#fff176',
  UltraBeast:    '#b39ddb',
  Legendary:     '#ffcc02',
  BoxLegendary:  '#ff8a65',
  StrongLegendary: '#ff5252',
  Mythical:      '#f06292',
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

function PokeCard({ pokemon: p }) {
  const rarityColor = RARITY_COLORS[p.rarity] ?? '#ffffff'

  return (
    <div style={styles.card}>
      <div style={styles.imageWrap}>
        <img
          src={`/sprites/pokemon/mid/${p.name}.png`}
          alt={p.name}
          style={styles.image}
          onError={e => { e.target.style.opacity = 0.15 }}
        />
      </div>
      <div style={styles.info}>
        <span style={styles.dexId}>#{String(p.dexId).padStart(4, '0')}</span>
        <span style={styles.name}>{p.name}</span>
        <span style={{ ...styles.rarity, color: rarityColor }}>{p.rarity}</span>
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
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
  },
  imageWrap: {
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: '2px',
    width: '100%',
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
  },
  rarity: {
    fontSize: '9px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    opacity: 0.85,
  },
}
