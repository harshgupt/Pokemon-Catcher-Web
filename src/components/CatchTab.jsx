import { useState, useEffect, useRef } from 'react'
import pokemonData  from '../data/pokemon.json'
import itemsData    from '../data/items.json'
import locationsData from '../data/locations.json'
import { loadSave, saveGame, deleteSave } from '../lib/save'
import { generateGrid, collectToken, getAvailableTokens, getGlobalTokens } from '../lib/spawn'

const TYPES   = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']
const REGIONS = ['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Hisui','Paldea']
const FORMS   = [
  { value: 'MegaEvolution',  label: 'Mega Evolution'  },
  { value: 'RegionalForm',   label: 'Regional Form'   },
  { value: 'Gigantamax',     label: 'Gigantamax'      },
  { value: 'ConvergentForm', label: 'Convergent Form' },
  { value: 'AlternateForm',  label: 'Alternate Form'  },
]
const CLASSES = [
  { value: 'Starter',         label: 'Starter'          },
  { value: 'Baby',            label: 'Baby'             },
  { value: 'Fossil',          label: 'Fossil'           },
  { value: 'PseudoLegendary', label: 'Pseudo-Legendary' },
  { value: 'Legendary',       label: 'Legendary'        },
  { value: 'Mythical',        label: 'Mythical'         },
  { value: 'UltraBeast',      label: 'Ultra Beast'      },
  { value: 'Paradox',         label: 'Paradox'          },
]

const byPokemonId = Object.fromEntries(pokemonData.map(p => [p.id, p]))
const byItemId    = Object.fromEntries(itemsData.map(i   => [i.id, i]))

// Build parent map for chain-root lookup (mirrors DexManager.GetChainRoot)
const parentOf = {}
pokemonData.forEach(p => {
  if (Array.isArray(p.nextForms))
    p.nextForms.forEach(nf => { if (parentOf[nf.nextCharacterID] === undefined) parentOf[nf.nextCharacterID] = p.id })
})
function getChainRoot(id, seen = new Set()) {
  if (seen.has(id)) return id
  seen.add(id)
  return parentOf[id] !== undefined ? getChainRoot(parentOf[id], seen) : id
}

/**
 * Returns all frontier evolutions for the caught pokemon's chain:
 * any unlocked form → not-yet-unlocked next form.
 * Mirrors the logic in DexCharacterPanel.SetupEvolutions + DexManager.GetChainRoot.
 */
function getEvolutionFrontier(caughtId, gameState) {
  const result  = []
  const visited = new Set()

  function walk(id) {
    if (visited.has(id)) return
    visited.add(id)
    const p = byPokemonId[id]
    if (!p || !Array.isArray(p.nextForms) || p.nextForms.length === 0) return
    if (!(gameState.pokemon[id]?.isUnlocked)) return   // can only evolve unlocked forms

    for (const nf of p.nextForms) {
      const nextId      = nf.nextCharacterID
      const nextUnlocked = gameState.pokemon[nextId]?.isUnlocked ?? false
      if (!nextUnlocked) {
        const rootId   = getChainRoot(id)
        const fromPoke = byPokemonId[id]
        const nextPoke = byPokemonId[nextId]
        result.push({
          fromId: id,
          nextId,
          fromSrc:  fromPoke ? `/sprites/pokemon/mid/${fromPoke.spriteName ?? fromPoke.name}.png` : '',
          nextSrc:  nextPoke ? `/sprites/pokemon/mid/${nextPoke.spriteName ?? nextPoke.name}.png` : '',
          nextName: nextPoke ? (nextPoke.displayName ?? nextPoke.name) : '???',
          current:  gameState.pokemon[rootId]?.numberCaught ?? 0,
          required: nf.characterCount,
        })
      } else {
        walk(nextId)   // already unlocked — look deeper
      }
    }
  }

  // Start from the chain root; also start from caughtId itself in case root is not yet unlocked
  const rootId = getChainRoot(caughtId)
  walk(rootId)
  if (caughtId !== rootId) walk(caughtId)

  return result
}

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
export default function CatchTab({ gameState, setGameState }) {
  const [slots,     setSlots]     = useState([])
  const [animIdx,   setAnimIdx]   = useState(-1)
  const [, setAnimPhase] = useState(null)
  const [hoveredIdx,setHoveredIdx]= useState(-1)
  const [popup,     setPopup]     = useState(null)   // { slot, gameState }
  const [phase,     setPhase]     = useState('grid') // 'grid' | 'gameOver' | 'categoryEmpty'

  // Spawn filters
  const [type1,     setType1]     = useState('')
  const [type2,     setType2]     = useState('')
  const [region,    setRegion]    = useState('')
  const [location,  setLocation]  = useState('')
  const [form,      setForm]      = useState('')
  const [cls,       setCls]       = useState('')
  const [itemsOnly, setItemsOnly] = useState(false)

  const regionLocations = region ? Object.keys(locationsData[region] ?? {}) : []

  const [panAxis,     setPanAxis]     = useState(null) // 'x' | 'y' | null
  const [panDuration, setPanDuration] = useState(40)
  const rootRef = useRef(null)

  // Keep refs in sync so callbacks always see latest values
  const gsRef     = useRef(gameState)
  const filterRef = useRef({})
  gsRef.current     = gameState
  filterRef.current = { type1, type2, region, location, form, cls, itemsOnly }

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

  // Detect which axis overflows and compute duration for constant scroll speed
  const SCROLL_PX_PER_SEC = 15
  useEffect(() => {
    const src = location
      ? `/sprites/backgrounds/${encodeURIComponent(region)}/${encodeURIComponent(location)}.png`
      : `/sprites/catch-bg.png`
    const img = new Image()
    img.onload = () => {
      const el = rootRef.current
      if (!el) return
      const { clientWidth: cw, clientHeight: ch } = el
      const iw = img.naturalWidth, ih = img.naturalHeight
      const imgRatio = iw / ih
      const containerRatio = cw / ch
      let axis, overflow
      if (imgRatio > containerRatio) {
        // wider than container — scale by height, pan x
        overflow = (iw * ch / ih) - cw
        axis = 'x'
      } else {
        // taller than container — scale by width, pan y
        overflow = (ih * cw / iw) - ch
        axis = 'y'
      }
      // duration covers one full back-and-forth; one-way = overflow / speed
      const duration = Math.max(5, (overflow / SCROLL_PX_PER_SEC) * 2)
      setPanAxis(axis)
      setPanDuration(duration)
    }
    img.onerror = () => { setPanAxis(null) }
    img.src = src
  }, [region, location])

  // Regenerate grid on mount and whenever filters change
  useEffect(() => { doGenerateGrid(gsRef.current) }, [type1, type2, region, location, form, cls, itemsOnly])

  function doGenerateGrid(gs) {
    const f = filterRef.current
    if (getGlobalTokens(gs) === 0)        { setPhase('gameOver');      setSlots([]); return }
    if (getAvailableTokens(gs, f) === 0)  { setPhase('categoryEmpty'); setSlots([]); return }
    setSlots(generateGrid(gs, f))
    setPhase('grid')
  }

  function handleItemsOnly() {
    setItemsOnly(v => !v)
  }

  function handleResetFilters() {
    setType1(''); setType2(''); setRegion(''); setLocation(''); setForm(''); setCls(''); setItemsOnly(false)
  }

  function handleRegionChange(r) {
    setRegion(r)
    setLocation('') // clear location whenever region changes
  }

  const anyFilterActive = type1 || type2 || region || location || form || cls || itemsOnly

  function handleBallClick(idx) {
    if (animIdx !== -1) return

    setAnimIdx(idx)
    setAnimPhase('burst')
    setHoveredIdx(-1)

    setTimeout(() => {
      setAnimIdx(-1)
      setAnimPhase(null)

      const slot  = slots[idx]
      const newGs = collectToken(gsRef.current, slot)
      setGameState(newGs)
      saveGame(newGs)

      setPopup({ slot, gameState: newGs })
    }, 300)
  }

  function handlePopupClose() {
    setPopup(null)
    doGenerateGrid(gsRef.current)
  }

  function handleReset() {
    if (!confirm('Reset all progress? This cannot be undone.')) return
    deleteSave()
    const fresh = loadSave()
    gsRef.current = fresh   // sync ref before generateGrid reads it
    setGameState(fresh)
    doGenerateGrid(fresh)
  }

  const clue = hoveredIdx !== -1 && slots[hoveredIdx] ? slots[hoveredIdx].clue : null

  const filtersDisabled = itemsOnly

  const bgImage = location
    ? `url(/sprites/backgrounds/${encodeURIComponent(region)}/${encodeURIComponent(location)}.png)`
    : `url(/sprites/catch-bg.png)`

  const bgAnimation = panAxis ? `bg-pan-${panAxis} ${panDuration.toFixed(1)}s linear infinite` : undefined

  return (
    <div ref={rootRef} style={{ ...styles.root, backgroundImage: bgImage, animation: bgAnimation }}>

      {/* Filter bar — always anchored at top (hidden only on game over) */}
      {phase !== 'gameOver' && (
        <div style={styles.filterBar}>
          <select style={styles.filterSelect} value={type1} onChange={e => setType1(e.target.value)} disabled={filtersDisabled}>
            <option value="">Type 1</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={styles.filterSelect} value={type2} onChange={e => setType2(e.target.value)} disabled={filtersDisabled}>
            <option value="">Type 2</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={styles.filterSelect} value={region} onChange={e => handleRegionChange(e.target.value)} disabled={filtersDisabled}>
            <option value="">Region</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {region && (
            <select style={styles.filterSelect} value={location} onChange={e => setLocation(e.target.value)} disabled={filtersDisabled}>
              <option value="">Location</option>
              {regionLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          <select style={{ ...styles.filterSelect, ...styles.filterSelectWide }} value={form} onChange={e => setForm(e.target.value)} disabled={filtersDisabled}>
            <option value="">Form</option>
            {FORMS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select style={{ ...styles.filterSelect, ...styles.filterSelectWide }} value={cls} onChange={e => setCls(e.target.value)} disabled={filtersDisabled}>
            <option value="">Class</option>
            {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button
            style={{ ...styles.itemsBtn, ...(itemsOnly ? styles.itemsBtnActive : {}) }}
            onClick={handleItemsOnly}
          >
            Items
          </button>
          {anyFilterActive && (
            <button style={styles.resetFilterBtn} onClick={handleResetFilters} title="Reset filters">✕</button>
          )}
        </div>
      )}

      {/* Main content — fills remaining space, centers its content */}
      <div style={styles.mainContent}>
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
            <div style={styles.gridPanel}>
              <div style={styles.grid}>
                {slots.map((_slot, idx) => (
                  <BallSlot
                    key={idx}
                    isAnimating={animIdx === idx}
                    isHovered={hoveredIdx === idx}
                    onHoverEnter={() => { if (animIdx === -1) setHoveredIdx(idx) }}
                    onHoverExit={() => setHoveredIdx(-1)}
                    onClick={() => handleBallClick(idx)}
                  />
                ))}
              </div>
            </div>

            <div style={styles.clueBar}>
              {clue
                ? <span style={styles.clueText}>{clue}</span>
                : <span style={styles.cluePlaceholder}>Hover a Pokéball for a hint…</span>
              }
            </div>
          </>
        )}
      </div>

      {popup && <CatchPopup slot={popup.slot} gameState={popup.gameState} onClose={handlePopupClose} />}
    </div>
  )
}

// ── BallSlot ──────────────────────────────────────────────────────────────────
function BallSlot({ isAnimating, isHovered, onHoverEnter, onHoverExit, onClick }) {
  const imgStyle = {
    width: '68px',
    height: '68px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    transform: isHovered && !isAnimating ? 'scale(1.12)' : 'scale(1)',
    transition: isAnimating ? 'none' : 'transform 0.15s ease',
    ...(isAnimating && {
      animation: 'pb-burst 0.28s ease-out forwards',
      transformOrigin: 'center',
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
function CatchPopup({ slot, gameState, onClose }) {
  const d = slotData(slot)
  const catchLine = d.isItem ? `You found ${d.name}!` : `You caught ${d.name}!`

  // ── Pokemon-only stats ─────────────────────────────────────────────────────
  let remaining    = null
  let evolutions   = []

  if (slot.type === 'pokemon') {
    remaining  = gameState.pokemon[slot.id]?.numberToSpawn ?? 0
    evolutions = getEvolutionFrontier(slot.id, gameState)
  }

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
        {slot.type === 'pokemon' && (
          <div style={styles.statsRow}>
            <span style={styles.statChip}>
              {remaining === 0 ? 'None left in the wild' : `${remaining} left in the wild`}
            </span>
            {evolutions.map((ev, i) => (
              <div key={i} style={styles.evoChip}>
                <img src={ev.fromSrc} alt="" style={styles.evoSprite} />
                <span style={styles.evoArrow}>→</span>
                <img src={ev.nextSrc} alt={ev.nextName} style={styles.evoSprite} />
                <span style={{ ...styles.evoCount, color: ev.current >= ev.required ? 'var(--accent-bright)' : '#e57373' }}>
                  {ev.current} / {ev.required}
                </span>
              </div>
            ))}
          </div>
        )}
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
    gap: '12px',
    height: '100%',
    overflow: 'hidden',
    padding: '16px 0',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    borderRadius: 'var(--radius-md)',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(8, 12, 24, 0.72)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '10px 14px',
    width: 'min(96%, 900px)',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  filterSelect: {
    flex: '1 1 0',
    minWidth: '0',
    padding: '5px 4px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
  },
  filterSelectWide: {
    flex: '1.6 1 0',
  },
  itemsBtn: {
    flexShrink: 0,
    padding: '5px 10px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  resetFilterBtn: {
    flexShrink: 0,
    width: '26px',
    height: '26px',
    padding: '0',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '50%',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsBtnActive: {
    background: 'rgba(var(--accent-rgb, 99,102,241), 0.25)',
    border: '1px solid var(--accent)',
    color: 'var(--accent-bright)',
  },
  gridPanel: {
    background: 'rgba(8, 12, 24, 0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '20px 24px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '12px',
    maxWidth: '400px',
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
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueText: {
    fontSize: '15px',
    fontWeight: '600',
    fontFamily: "'Nunito', sans-serif",
    color: '#fff',
    letterSpacing: '0.03em',
    background: 'rgba(0,0,0,0.55)',
    padding: '7px 22px',
    borderRadius: '20px',
    backdropFilter: 'blur(4px)',
  },
  cluePlaceholder: {
    fontSize: '14px',
    fontFamily: "'Nunito', sans-serif",
    fontWeight: '500',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(0,0,0,0.3)',
    padding: '7px 22px',
    borderRadius: '20px',
    backdropFilter: 'blur(4px)',
  },
  endPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(8, 12, 24, 0.80)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '40px 56px',
  },
  endIcon:  { fontSize: '48px', color: 'var(--accent-bright)' },
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
    maxWidth: '440px',
    maxHeight: '85vh',
    overflowY: 'auto',
    overflowX: 'hidden',
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
  statsRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
  },
  statChip: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 10px',
    textAlign: 'center',
  },
  evoChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 10px',
  },
  evoSprite: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  evoArrow: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  evoCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginLeft: '2px',
  },
}
