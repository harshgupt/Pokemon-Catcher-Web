import { useState } from 'react'
import allItems from '../data/items.json'
import { assetUrl } from '../lib/assetUrl'


export default function ItemDex({ gameState }) {
  const [query,        setQuery]        = useState('')
  const [showCaught,   setShowCaught]   = useState(false)
  const [showUncaught, setShowUncaught] = useState(false)
  const lowerQuery = query.toLowerCase()
  const hasFilters = query || showCaught || showUncaught

  function resetFilters() {
    setQuery(''); setShowCaught(true); setShowUncaught(true)
  }

  return (
    <div style={styles.root}>
      <div style={styles.filterBar}>
        <input
          style={styles.search}
          type="text"
          placeholder="Search items…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button
          style={{ ...styles.toggleBtn, ...(showCaught ? styles.toggleBtnActive : {}) }}
          onClick={() => setShowCaught(v => !v)}
        >Collected</button>
        <button
          style={{ ...styles.toggleBtn, ...(showUncaught ? styles.toggleBtnActive : {}) }}
          onClick={() => setShowUncaught(v => !v)}
        >Not Yet</button>
        {hasFilters && (
          <button style={styles.resetBtn} onClick={resetFilters} title="Reset filters">✕</button>
        )}
      </div>
      <div style={styles.grid}>
        {allItems.map(item => {
          const unlocked  = gameState?.items[item.id]?.isUnlocked  ?? false
          const collected = gameState?.items[item.id]?.numberCollected ?? 0
          const hidden =
            (query && !(item.displayName ?? item.name).toLowerCase().includes(lowerQuery)) ||
            (showCaught && !showUncaught && !unlocked) ||
            (showUncaught && !showCaught && unlocked)
          return <ItemCard key={item.id} item={item} hidden={hidden} unlocked={unlocked} collected={collected} />
        })}
      </div>
    </div>
  )
}

function ItemCard({ item, hidden, unlocked, collected }) {
  const [imgState, setImgState] = useState('loading')
  const spriteSrc = item.tmType
    ? assetUrl(`/sprites/items/TM ${item.tmType}.png`)
    : assetUrl(`/sprites/items/${item.name}.png`)
  const displayName = unlocked ? (item.displayName ?? item.name) : '?????'

  return (
    <div style={hidden ? { ...styles.card, display: 'none' } : styles.card}>
      <div style={styles.imageWrap}>
        {imgState === 'loading' && <div className="sprite-spinner" />}
        <img
          src={spriteSrc}
          alt={item.name}
          style={{ ...styles.image, opacity: imgState === 'loaded' ? 1 : 0, filter: unlocked ? 'none' : 'brightness(0)' }}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />
      </div>
      <div style={styles.info}>
        <span style={styles.name}>{displayName}</span>
        {unlocked && <span style={styles.count}>×{collected}</span>}
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
  filterBar: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
    alignItems: 'center',
  },
  search: {
    flex: 1,
    minWidth: 0,
    padding: '6px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  toggleBtn: {
    flexShrink: 0,
    alignSelf: 'stretch',
    padding: '0 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  toggleBtnActive: {
    background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
    border: '1px solid var(--accent)',
    color: 'var(--accent-bright)',
  },
  resetBtn: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    padding: '0',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: '50%',
    color: 'var(--text-muted)',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    alignItems: 'start',
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
    height: '124px',
    boxSizing: 'border-box',
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
  count: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    letterSpacing: '0.04em',
  },
}
