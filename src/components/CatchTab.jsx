import { useState, useEffect, useRef } from 'react'
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'
import { loadSave, saveGame, deleteSave } from '../lib/save'
import { generateGrid, collectToken, getAvailableTokens, getGlobalTokens } from '../lib/spawn'

const byPokemonId = Object.fromEntries(pokemonData.map(p => [p.id, p]))
const byItemId    = Object.fromEntries(itemsData.map(i   => [i.id, i]))

const TYPE_COLORS = {
  Normal: '#9FA19F', Fire: '#E62829', Water: '#2980EF', Electric: '#FAC000',
  Grass: '#3FA129', Ice: '#3DCEF3', Fighting: '#FF8000', Poison: '#9141CB',
  Ground: '#915121', Flying: '#81B9EF', Psychic: '#EF4179', Bug: '#91A119',
  Rock: '#AFA981', Ghost: '#704170', Dragon: '#5060E1', Dark: '#624D4E',
  Steel: '#60A1B8', Fairy: '#EF70EF',
}

function slotData(slot) {
  if (slot.type === 'pokemon') {
    const p    = byPokemonId[slot.id]
    const file = p.spriteName ?? p.name
    return {
      largeSrc:      `/sprites/pokemon/large/${file}.png`,
      largeFallback: `/sprites/pokemon/large/${p.name}.png`,
      name:  p.displayName ?? p.name,
      types: p.types ?? [],
      isItem: false,
    }
  }
  if (slot.type === 'item') {
    const item = byItemId[slot.id]
    const src  = item.tmType
      ? `/sprites/items/TM ${item.tmType}.png`
      : `/sprites/items/${item.name}.png`
    return { largeSrc: src, largeFallback: null,
             name: item.displayName ?? item.name, types: [], isItem: true }
  }
  return { largeSrc: '', largeFallback: null, name: '???', types: [], isItem: false }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CatchTab() {
  const [gameState, setGameState] = useState(() => loadSave())
  const [slots,     setSlots]     = useState([])
  const [animIdx,   setAnimIdx]   = useState(-1)
  const [animPhase, setAnimPhase] = useState(null)   // 'shake' | 'burst'
  const [hoveredIdx,setHoveredIdx]= useState(-1)
  const [popup,     setPopup]     = useState(null)   // { slot }
  const [phase,     setPhase]     = useState('grid') // 'grid' | 'gameOver' | 'categoryEmpty'

  const gsRef = useRef(gameState)
  useEffect(() => { gsRef.current = gameState }, [gameState])

  useEffect(() => {
    const onUnload     = () => saveGame(gsRef.current)
    const onVisibility = () => { if (document.hidden) saveGame(gsRef.current) }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => { doGenerateGrid(gsRef.current) }, [])

  function doGenerateGrid(gs) {
    if (getGlobalTokens(gs) === 0)    { setPhase('gameOver');      setSlots([]); return }
    if (getAvailableTokens(gs) === 0) { setPhase('categoryEmpty'); setSlots([]); return }
    setSlots(generateGrid(gs))
    setPhase('grid')
  }

  function handleBallClick(idx) {
    if (animIdx !== -1) return

    setAnimIdx(idx)
    setAnimPhase('shake')
    setHoveredIdx(-1)

    const t1 = setTimeout(() => setAnimPhase('burst'), 420)
    setTimeout(() => {
      clearTimeout(t1)
      setAnimIdx(-1)
      setAnimPhase(null)

      const slot  = slots[idx]
      const newGs = collectToken(gsRef.current, slot)
      setGameState(newGs)
      saveGame(newGs)

      setPopup({ slot })
    }, 670)
  }

  function handlePopupClose() {
    setPopup(null)
    doGenerateGrid(gsRef.current)
  }

  function handleReset() {
    if (!confirm('Reset all progress? This cannot be undone.')) return
    deleteSave()
    const fresh = loadSave()
    setGameState(fresh)
    gsRef.current = fresh
    doGenerateGrid(fresh)
  }

  const clue = hoveredIdx !== -1 && slots[hoveredIdx] ? slots[hoveredIdx].clue : null

  return (
    <div style={styles.root}>

      {phase === 'gameOver' && (
        <div style={styles.endPanel}>
          <span style={styles.endIcon}>◈</span>
          <p style={styles.endTitle}>All Pokémon Caught!</p>
          <p style={styles.endSub}>You've caught everything. Start a new game?</p>
          <button style={styles.resetBtn} onClick={handleReset}>New Game</button>
        </div>
      )}

      {phase === 'categoryEmpty' && (
        <div style={styles.endPanel}>
          <span style={styles.endIcon}>◈</span>
          <p style={styles.endTitle}>Nothing Available</p>
          <p style={styles.endSub}>No Pokémon left in this category.</p>
        </div>
      )}

      {phase === 'grid' && (
        <>
          <div style={styles.grid}>
            {slots.map((slot, idx) => (
              <BallSlot
                key={idx}
                isAnimating={animIdx === idx}
                animPhase={animIdx === idx ? animPhase : null}
                isHovered={hoveredIdx === idx}
                onHoverEnter={() => { if (animIdx === -1) setHoveredIdx(idx) }}
                onHoverExit={() => setHoveredIdx(-1)}
                onClick={() => handleBallClick(idx)}
              />
            ))}
          </div>

          <div style={styles.clueBar}>
            {clue
              ? <span style={styles.clueText}>{clue}</span>
              : <span style={styles.cluePlaceholder}>Hover a Pokéball for a hint…</span>
            }
          </div>
        </>
      )}

      {popup && <CatchPopup slot={popup.slot} onClose={handlePopupClose} />}
    </div>
  )
}

// ── BallSlot ──────────────────────────────────────────────────────────────────
function BallSlot({ isAnimating, animPhase, isHovered, onHoverEnter, onHoverExit, onClick }) {
  const imgStyle = {
    width: '68px',
    height: '68px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    transform: isHovered && !isAnimating ? 'scale(1.12)' : 'scale(1)',
    transition: 'transform 0.15s ease',
    ...(isAnimating && animPhase === 'shake' && {
      animation: 'pb-shake 0.14s ease-in-out 3',
      transformOrigin: 'center',
      transition: 'none',
    }),
    ...(isAnimating && animPhase === 'burst' && {
      animation: 'pb-burst 0.25s ease-out forwards',
      transformOrigin: 'center',
      transition: 'none',
    }),
  }

  return (
    <div
      style={{ ...styles.ballSlot, cursor: isAnimating ? 'default' : 'pointer' }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverExit}
      onClick={onClick}
    >
      <img src="/sprites/pokeball.png" alt="Pokéball" style={imgStyle} draggable={false} />
    </div>
  )
}

// ── CatchPopup ────────────────────────────────────────────────────────────────
function CatchPopup({ slot, onClose }) {
  const d = slotData(slot)
  const catchLine = d.isItem ? `You found ${d.name}!` : `You caught ${d.name}!`

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.popup} onClick={e => e.stopPropagation()}>
        <img
          src={d.largeSrc}
          alt={d.name}
          style={d.isItem ? styles.popupImageItem : styles.popupImage}
          onError={e => {
            if (d.largeFallback && e.target.src !== d.largeFallback) {
              e.target.onerror = null
              e.target.src = d.largeFallback
            }
          }}
          draggable={false}
        />
        <p style={styles.catchLine}>{catchLine}</p>
        <p style={styles.popupName}>{d.name}</p>
        {d.types.length > 0 && (
          <div style={styles.popupTypes}>
            {d.types.map(t => (
              <span key={t} style={{ ...styles.typeBadge, background: TYPE_COLORS[t] ?? '#9FA19F' }}>
                {t}
              </span>
            ))}
          </div>
        )}
        <button style={styles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    height: '100%',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '16px',
    maxWidth: '460px',
  },
  ballSlot: {
    width: '68px',
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
  },
  clueBar: {
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueText: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  cluePlaceholder: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  endPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  endIcon:  { fontSize: '48px', color: 'var(--accent)', opacity: 0.4 },
  endTitle: { fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' },
  endSub:   { fontSize: '13px', color: 'var(--text-secondary)' },
  resetBtn: {
    marginTop: '8px',
    padding: '8px 28px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    top: 0, right: 0, bottom: 0,
    left: 'var(--sidebar-width)',
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  popup: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 56px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    boxShadow: 'var(--shadow-md)',
    minWidth: '300px',
  },
  popupImage:     { width: '280px', height: '280px', objectFit: 'contain', imageRendering: 'pixelated' },
  popupImageItem: { width: '120px', height: '120px', objectFit: 'contain', imageRendering: 'pixelated' },
  catchLine: {
    fontSize: '17px',
    fontWeight: '700',
    color: 'var(--accent-bright)',
    textAlign: 'center',
  },
  popupName: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  popupTypes: { display: 'flex', gap: '8px', justifyContent: 'center' },
  typeBadge: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    borderRadius: '5px',
    padding: '3px 12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  closeBtn: {
    marginTop: '4px',
    padding: '7px 24px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    cursor: 'pointer',
  },
}
