import items from '../data/items.json'

const RARITY_COLORS = {
  Common:   '#90caf9',
  Uncommon: '#a5d6a7',
  Rare:     '#ce93d8',
  Sparse:   '#ffcc02',
}

export default function ItemDex() {
  return (
    <div style={styles.root}>
      <div style={styles.counter}>{items.length} items</div>
      <div style={styles.grid}>
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function ItemCard({ item }) {
  const rarityColor = RARITY_COLORS[item.rarity] ?? '#ffffff'
  const spriteSrc = item.tmType
    ? `/sprites/items/TM ${item.tmType}.png`
    : `/sprites/items/${item.name}.png`

  return (
    <div style={styles.card}>
      <div style={styles.imageWrap}>
        <img
          src={spriteSrc}
          alt={item.name}
          style={styles.image}
          onError={e => { e.target.style.opacity = 0 }}
        />
      </div>
      <div style={styles.info}>
        <span style={styles.name}>{item.name}</span>
        <span style={{ ...styles.rarity, color: rarityColor }}>{item.rarity}</span>
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
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '12px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 8px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'border-color var(--transition), transform var(--transition), background var(--transition)',
  },
  imageWrap: {
    width: '56px',
    height: '56px',
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
    gap: '3px',
    width: '100%',
  },
  name: {
    fontSize: '11px',
    color: 'var(--text-primary)',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: '1.3',
    wordBreak: 'break-word',
  },
  rarity: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    opacity: 0.8,
  },
}
