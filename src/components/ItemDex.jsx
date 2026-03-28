import { useState } from 'react'
import allItems from '../data/items.json'


export default function ItemDex() {
  const [query, setQuery] = useState('')
  const lowerQuery = query.toLowerCase()

  return (
    <div style={styles.root}>
      <input
        style={styles.search}
        type="text"
        placeholder="Search items…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div style={styles.grid}>
        {allItems.map(item => {
          const hidden = query && !(item.displayName ?? item.name).toLowerCase().includes(lowerQuery)
          return <ItemCard key={item.id} item={item} hidden={hidden} />
        })}
      </div>
    </div>
  )
}

function ItemCard({ item, hidden }) {
  const [imgState, setImgState] = useState('loading')
  const spriteSrc = item.tmType
    ? `/sprites/items/TM ${item.tmType}.png`
    : `/sprites/items/${item.name}.png`

  return (
    <div style={hidden ? { ...styles.card, display: 'none' } : styles.card}>
      <div style={styles.imageWrap}>
        {imgState === 'loading' && <div className="sprite-spinner" />}
        <img
          src={spriteSrc}
          alt={item.name}
          style={{ ...styles.image, opacity: imgState === 'loaded' ? 1 : 0 }}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />
      </div>
      <div style={styles.info}>
        <span style={styles.name}>{item.displayName ?? item.name}</span>
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
    padding: '10px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'border-color var(--transition), transform var(--transition), background var(--transition)',
    contentVisibility: 'auto',
    containIntrinsicSize: '0 124px',
  },
  imageWrap: {
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
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
    height: '29px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
}
