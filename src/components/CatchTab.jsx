import { useState, useEffect, useRef, useMemo } from 'react'
import pokemonData  from '../data/pokemon.json'
import itemsData    from '../data/items.json'
import locationsData from '../data/locations.json'
import { loadSave, saveGame, deleteSave } from '../lib/save'
import { generateGrid, collectToken, getAvailableTokens, getGlobalTokens, formSets, classSets, locationSets } from '../lib/spawn'
import { canEvolveInto, performEvolve, getBaseId, countUnlockedInChain, countChainForms } from '../lib/evolve'
import { EvolveResultPopup } from './EvolveTab'
import { assetUrl } from '../lib/assetUrl'
import ConfirmDialog from './ConfirmDialog'

const TYPES   = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']
const REGIONS = ['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Hisui','Paldea']

const REGIONS_WITH_BGS = new Set(['Kanto','Johto','Hoenn','Sinnoh','Unova'])
const BG_POOL = Object.entries(locationsData)
  .filter(([r]) => REGIONS_WITH_BGS.has(r))
  .flatMap(([r, locs]) => Object.keys(locs).map(l => ({ region: r, location: l })))
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

/**
 * Returns all frontier evolutions for the caught pokemon's chain:
 * any unlocked form → not-yet-unlocked next form.
 * Mirrors the logic in DexCharacterPanel.SetupEvolutions + DexManager.GetChainRoot.
 */
function getEvolutionFrontier(caughtId, gameState, gameMode = 'easy') {
  const result  = []
  const visited = new Set()

  function walk(id) {
    if (visited.has(id)) return
    visited.add(id)
    const p = byPokemonId[id]
    if (!p || !Array.isArray(p.nextForms) || p.nextForms.length === 0) return
    if (!(gameState.pokemon[id]?.isUnlocked)) return

    for (const nf of p.nextForms) {
      const nextId       = nf.nextCharacterID
      const nextUnlocked = gameState.pokemon[nextId]?.isUnlocked ?? false
      if (!nextUnlocked) {
        const rootId   = getBaseId(id)
        const fromPoke = byPokemonId[id]
        const nextPoke = byPokemonId[nextId]
        const nfWithFrom = { ...nf, fromId: id }
        result.push({
          fromId: id, nextId,
          nextCharacterID: nextId,
          characterCount:  nf.characterCount,
          evolutionMethod: nf.evolutionMethod,
          evolutionItemID: nf.evolutionItemID,
          characterRequiredID: nf.characterRequiredID,
          fromSrc:  fromPoke ? assetUrl(`/sprites/pokemon/mid/${fromPoke.spriteName ?? fromPoke.name}.png`) : '',
          nextSrc:  nextPoke ? assetUrl(`/sprites/pokemon/mid/${nextPoke.spriteName ?? nextPoke.name}.png`) : '',
          nextName: nextPoke ? (nextPoke.displayName ?? nextPoke.name) : '???',
          current:  gameState.pokemon[rootId]?.numberCaught ?? 0,
          required: gameMode === 'easy' ? countUnlockedInChain(rootId, gameState) + 1 : nf.characterCount,
          canEvolve: canEvolveInto(nfWithFrom, gameState, gameMode),
        })
      } else {
        walk(nextId)
      }
    }
  }

  const rootId = getBaseId(caughtId)
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
      largeSrc:      assetUrl(`/sprites/pokemon/large/${file}.png`),
      largeFallback: assetUrl(`/sprites/pokemon/large/${p.name}.png`),
      name:  p.displayName ?? p.name,
      types: p.types ?? [],
      isItem: false,
    }
  }
  if (slot.type === 'item') {
    const item = byItemId[slot.id]
    const src  = item.tmType
      ? assetUrl(`/sprites/items/TM ${item.tmType}.png`)
      : assetUrl(`/sprites/items/${item.name}.png`)
    return { largeSrc: src, largeFallback: null,
             name: item.displayName ?? item.name, types: [], isItem: true }
  }
  return { largeSrc: '', largeFallback: null, name: '???', types: [], isItem: false }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CatchTab({ gameState, setGameState, gameMode = 'easy' }) {
  const [slots,     setSlots]     = useState([])
  const [hintSlots, setHintSlots] = useState([])
  const [animIdx,   setAnimIdx]   = useState(-1)
  const [, setAnimPhase] = useState(null)
  const [hoveredIdx,setHoveredIdx]= useState(-1)
  const [popup,     setPopup]     = useState(null)   // { slot, gameState }
  const [phase,     setPhase]     = useState('grid') // 'grid' | 'gameOver' | 'categoryEmpty'
  const [evolving,  setEvolving]  = useState(null)   // { fromPoke, toPoke }
  const [confirmReset, setConfirmReset] = useState(false)

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
  const [fallbackBg,  setFallbackBg]  = useState(null) // {region, location} for unsupported regions
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

  // Compute which filter options have remaining tokens
  const availableFilters = useMemo(() => {
    const activeIds = new Set(
      pokemonData.filter(p => (gameState.pokemon[p.id]?.numberToSpawn ?? 0) > 0).map(p => p.id)
    )
    const types = new Set()
    const regions = new Set()
    for (const p of pokemonData) {
      if (!activeIds.has(p.id)) continue
      for (const t of (p.types ?? [])) types.add(t)
      if (p.region) regions.add(p.region)
    }
    const forms = new Set(
      FORMS.map(f => f.value).filter(v => formSets[v] && [...formSets[v]].some(id => activeIds.has(id)))
    )
    const classes = new Set(
      CLASSES.map(c => c.value).filter(v => classSets[v] && [...classSets[v]].some(id => activeIds.has(id)))
    )
    const locs = {}
    for (const [reg, locMap] of Object.entries(locationSets)) {
      for (const [loc, ids] of Object.entries(locMap)) {
        if ([...ids].some(id => activeIds.has(id))) {
          if (!locs[reg]) locs[reg] = new Set()
          locs[reg].add(loc)
        }
      }
    }
    return { types, regions, forms, classes, locs }
  }, [gameState.pokemon])

// Detect which axis overflows and compute duration for constant scroll speed
  const SCROLL_PX_PER_SEC = 15
  useEffect(() => {
    let bgRegion = region, bgLocation = location
    if (location && !REGIONS_WITH_BGS.has(region)) {
      const pick = BG_POOL[Math.floor(Math.random() * BG_POOL.length)]
      bgRegion = pick.region
      bgLocation = pick.location
      setFallbackBg(pick)
    } else {
      setFallbackBg(null)
    }
    const src = bgLocation
      ? assetUrl(`/sprites/backgrounds/${encodeURIComponent(bgRegion)}/${encodeURIComponent(bgLocation)}.png`)
      : assetUrl(`/sprites/catch-bg.png`)
    const img = new Image()
    img.onload = () => {
      requestAnimationFrame(() => {
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
      }) // end requestAnimationFrame
    }
    img.onerror = () => { setPanAxis(null) }
    img.src = src
  }, [region, location])

  // Regenerate grid on mount and whenever filters change
  useEffect(() => { doGenerateGrid(gsRef.current) }, [type1, type2, region, location, form, cls, itemsOnly])

  function pickHints(pool) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5)
  }

  function doGenerateGrid(gs) {
    const f = filterRef.current
    if (getGlobalTokens(gs) === 0)        { setPhase('gameOver');      setSlots([]); setHintSlots([]); return }
    if (getAvailableTokens(gs, f) === 0)  { setPhase('categoryEmpty'); setSlots([]); setHintSlots([]); return }
    const newSlots = generateGrid(gs, f)
    setSlots(newSlots)
    setHintSlots(pickHints(newSlots))
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

      const slot       = slots[idx]
      const wasUnlocked = slot.type === 'pokemon'
        ? (gsRef.current.pokemon[slot.id]?.isUnlocked ?? false)
        : (gsRef.current.items[slot.id]?.isUnlocked   ?? false)
      const newGs      = collectToken(gsRef.current, slot)
      const isFirstCatch = !wasUnlocked
      setGameState(newGs)
      saveGame(newGs)

      setPopup({ slot, gameState: newGs, isFirstCatch })
    }, 300)
  }

  function handlePopupClose() {
    setPopup(null)
    doGenerateGrid(gsRef.current)
  }

  function handleEvolveFromPopup(ev) {
    const newGs = performEvolve(gsRef.current, ev, gameMode)
    gsRef.current = newGs
    setGameState(newGs)
    saveGame(newGs)
    setPopup(null)
    setEvolving({ fromPoke: byPokemonId[ev.fromId], toPoke: byPokemonId[ev.nextId] })
  }

  function handleReset() {
    setConfirmReset(true)
  }

  function handleResetConfirm() {
    deleteSave()
    const fresh = loadSave()
    gsRef.current = fresh
    setGameState(fresh)
    setConfirmReset(false)
    doGenerateGrid(fresh)
  }

  const clue = hoveredIdx !== -1 && slots[hoveredIdx] ? slots[hoveredIdx].clue : null

  const filtersDisabled = itemsOnly

  const bgRegion   = fallbackBg?.region   ?? region
  const bgLocation = fallbackBg?.location ?? location
  const bgImage = bgLocation
    ? `url("${assetUrl(`/sprites/backgrounds/${encodeURIComponent(bgRegion)}/${encodeURIComponent(bgLocation)}.png`)}")`
    : `url("${assetUrl('/sprites/catch-bg.png')}")`

  const bgAnimation = panAxis ? `bg-pan-${panAxis} ${panDuration.toFixed(1)}s linear infinite` : undefined

  return (
    <div ref={rootRef} style={{ ...styles.root, backgroundImage: bgImage, animation: bgAnimation }}>

      {/* Filter bar — always anchored at top (hidden only on game over) */}
      {phase !== 'gameOver' && (
        <div style={styles.filterBar}>
          <select style={styles.filterSelect} value={type1} onChange={e => setType1(e.target.value)} disabled={filtersDisabled}>
            <option value="">Type 1</option>
            {TYPES.filter(t => availableFilters.types.has(t)).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={styles.filterSelect} value={type2} onChange={e => setType2(e.target.value)} disabled={filtersDisabled}>
            <option value="">Type 2</option>
            {TYPES.filter(t => availableFilters.types.has(t)).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select style={styles.filterSelect} value={region} onChange={e => handleRegionChange(e.target.value)} disabled={filtersDisabled}>
            <option value="">Region</option>
            {REGIONS.filter(r => availableFilters.regions.has(r)).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {region && (
            <select style={styles.filterSelect} value={location} onChange={e => setLocation(e.target.value)} disabled={filtersDisabled}>
              <option value="">Location</option>
              {regionLocations.filter(l => availableFilters.locs[region]?.has(l)).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          <select style={{ ...styles.filterSelect, ...styles.filterSelectWide }} value={form} onChange={e => setForm(e.target.value)} disabled={filtersDisabled}>
            <option value="">Form</option>
            {FORMS.filter(f => availableFilters.forms.has(f.value)).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select style={{ ...styles.filterSelect, ...styles.filterSelectWide }} value={cls} onChange={e => setCls(e.target.value)} disabled={filtersDisabled}>
            <option value="">Class</option>
            {CLASSES.filter(c => availableFilters.classes.has(c.value)).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
            <HintPanel hintSlots={hintSlots} />

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

      {popup && !evolving && (
        <CatchPopup
          slot={popup.slot}
          gameState={popup.gameState}
          isFirstCatch={popup.isFirstCatch}
          gameMode={gameMode}
          onClose={handlePopupClose}
          onEvolve={handleEvolveFromPopup}
        />
      )}
      {evolving && (
        <EvolveResultPopup
          fromPoke={evolving.fromPoke}
          toPoke={evolving.toPoke}
          onClose={() => { setEvolving(null); doGenerateGrid(gsRef.current) }}
        />
      )}
      {confirmReset && (
        <ConfirmDialog
          title="Start New Game?"
          message="All progress will be permanently deleted. This cannot be undone."
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmReset(false)}
        />
      )}
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
    transformOrigin: 'center',
    ...(isAnimating
      ? { animation: 'pb-burst 0.28s ease-out forwards' }
      : isHovered
        ? { animation: 'pb-wiggle 0.5s ease-in-out infinite' }
        : { transform: 'scale(1)', transition: 'transform 0.15s ease' }
    ),
  }

  return (
    <div
      style={{ ...styles.ballSlot, cursor: isAnimating ? 'default' : 'pointer' }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverExit}
      onClick={onClick}
    >
      <img src={assetUrl('/sprites/pokeball.png')} alt="Pokéball" style={imgStyle} draggable={false} />
    </div>
  )
}

// ── HintPanel ─────────────────────────────────────────────────────────────────
function HintPanel({ hintSlots }) {
  return (
    <div style={styles.hintPanel}>
      {hintSlots.map((slot, i) => {
        let src
        if (slot.type === 'pokemon') {
          const p = byPokemonId[slot.id]
          src = assetUrl(`/sprites/pokemon/mid/${p.spriteName ?? p.name}.png`)
        } else {
          const item = byItemId[slot.id]
          src = item.tmType
            ? assetUrl(`/sprites/items/TM ${item.tmType}.png`)
            : assetUrl(`/sprites/items/${item.name}.png`)
        }
        return (
          <img
            key={i}
            src={src}
            alt=""
            style={slot.type === 'pokemon' ? styles.hintSpritePokemon : styles.hintSpriteItem}
            draggable={false}
          />
        )
      })}
    </div>
  )
}

// ── CatchPopup ────────────────────────────────────────────────────────────────
function CatchPopup({ slot, gameState, isFirstCatch, gameMode = 'easy', onClose, onEvolve }) {
  const d = slotData(slot)
  const catchLine = d.isItem ? `You found ${d.name}!` : `You caught ${d.name}!`

  // ── Pokemon-only stats ─────────────────────────────────────────────────────
  let remaining    = null
  let evolutions   = []

  if (slot.type === 'pokemon') {
    const rawRemaining = gameState.pokemon[slot.id]?.numberToSpawn ?? 0
    remaining = gameMode === 'easy'
      ? Math.min(rawRemaining, countChainForms(slot.id))
      : rawRemaining
    evolutions = getEvolutionFrontier(slot.id, gameState, gameMode)
  }

  return (
    <div style={{ ...styles.overlay, perspective: '1200px' }} onClick={onClose}>
      <div style={{ ...styles.popup, ...(isFirstCatch ? styles.popupFirstCatch : {}), animation: 'popup-flip-in 0.35s ease-out' }} onClick={e => e.stopPropagation()}>
        <img
          src={d.largeSrc}
          alt={d.name}
          style={isFirstCatch
            ? { ...(d.isItem ? styles.popupImageItem : styles.popupImage), animation: 'first-catch-glow 2.5s ease-in-out 1 forwards' }
            : (d.isItem ? styles.popupImageItem : styles.popupImage)
          }
          onError={e => {
            if (d.largeFallback && e.target.src !== d.largeFallback) {
              e.target.onerror = null
              e.target.src = d.largeFallback  // already wrapped by assetUrl via slotData()
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
                {gameMode !== 'easy' && (
                  <span style={{ ...styles.evoCount, color: ev.current >= ev.required ? 'var(--accent-bright)' : '#e57373' }}>
                    {ev.current} / {ev.required}
                  </span>
                )}
                {ev.canEvolve && (
                  <button className="btn-evolve-golden" onClick={e => { e.stopPropagation(); onEvolve(ev) }}>
                    Evolve
                  </button>
                )}
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
    position: 'relative',
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
  hintPanel: {
    position: 'absolute',
    left: '20px',
    top: 'calc(50% - 238px)',
    background: 'rgba(8, 12, 24, 0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '10px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: '428px',
  },
  hintSpritePokemon: {
    width: '76px',
    height: '76px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    filter: 'brightness(0)',
    opacity: 0.65,
  },
  hintSpriteItem: {
    width: '68px',
    height: '68px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    filter: 'brightness(0)',
    opacity: 0.65,
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
  popupFirstCatch: {
    border: '2px solid #FFD700',
    boxShadow: '0 0 32px rgba(255, 215, 0, 0.25), var(--shadow-md)',
  },
  popup: {
    position: 'relative',
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
