import { useState } from 'react'
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'
import { saveGame } from '../lib/save'

const byId     = Object.fromEntries(pokemonData.map(p => [p.id, p]))
const byItemId = Object.fromEntries(itemsData.map(i   => [i.id, i]))

// ── Chain root helper ─────────────────────────────────────────────────────────
const parentOf = {}
pokemonData.forEach(p => {
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

// ── Evolution logic (mirrors Unity DexManager.CanEvolveAny / CanEvolve) ──────

function canEvolveInto(nf, gameState) {
  // Block if next form already unlocked
  if (gameState.pokemon[nf.nextCharacterID]?.isUnlocked) return false

  const rootId    = getBaseId(nf.fromId)
  const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0
  const hasEnoughCount = rootCaught >= nf.characterCount

  const hasItem = !nf.evolutionItemID
    || (gameState.items[nf.evolutionItemID]?.numberCollected ?? 0) > 0

  const hasRequiredChar = !nf.characterRequiredID
    || (gameState.pokemon[nf.characterRequiredID]?.isUnlocked ?? false)

  switch (nf.evolutionMethod) {
    case 'LevelUp':                 return hasEnoughCount
    case 'Item':                    return hasEnoughCount && hasItem
    case 'CharacterRequired':       return hasEnoughCount && hasRequiredChar
    case 'ItemAndCharacterRequired':return hasEnoughCount && hasItem && hasRequiredChar
    default:                        return hasEnoughCount
  }
}

/** Returns all evolution options for a pokemon that currently pass CanEvolve. */
function getAvailableEvolutions(p, gameState) {
  if (!gameState.pokemon[p.id]?.isUnlocked) return []
  if (!Array.isArray(p.nextForms)) return []
  return p.nextForms
    .map(nf => ({ ...nf, fromId: p.id }))
    .filter(nf => canEvolveInto(nf, gameState))
}

/** Returns new gameState after performing one evolution. */
function performEvolve(gameState, nf) {
  const rootId   = getBaseId(nf.fromId)
  let gs = gameState

  // 1. Unlock / increment next form
  const nextCur = gs.pokemon[nf.nextCharacterID] ?? {}
  gs = {
    ...gs,
    pokemon: {
      ...gs.pokemon,
      [nf.nextCharacterID]: {
        ...nextCur,
        numberCaught: (nextCur.numberCaught ?? 0) + 1,
        isUnlocked:   true,
      },
    },
  }

  // 2. Consume root catches
  const rootCur = gs.pokemon[rootId] ?? {}
  gs = {
    ...gs,
    pokemon: {
      ...gs.pokemon,
      [rootId]: {
        ...rootCur,
        numberCaught: Math.max(0, (rootCur.numberCaught ?? 0) - nf.characterCount),
      },
    },
  }

  // 3. Consume item (if applicable)
  if (nf.evolutionItemID && (nf.evolutionMethod === 'Item' || nf.evolutionMethod === 'ItemAndCharacterRequired')) {
    const itemCur = gs.items[nf.evolutionItemID] ?? {}
    gs = {
      ...gs,
      items: {
        ...gs.items,
        [nf.evolutionItemID]: {
          ...itemCur,
          numberCollected: Math.max(0, (itemCur.numberCollected ?? 0) - 1),
        },
      },
    }
  }

  return gs
}

// ── Type colours (same as PokeDex) ───────────────────────────────────────────
const TYPE_COLORS = {
  Normal:'#9FA19F', Fire:'#E62829', Water:'#2980EF', Electric:'#FAC000',
  Grass:'#3FA129', Ice:'#3DCEF3', Fighting:'#FF8000', Poison:'#9141CB',
  Ground:'#915121', Flying:'#81B9EF', Psychic:'#EF4179', Bug:'#91A119',
  Rock:'#AFA981', Ghost:'#704170', Dragon:'#5060E1', Dark:'#624D4E',
  Steel:'#60A1B8', Fairy:'#EF70EF',
}

// ── Components ────────────────────────────────────────────────────────────────


function injectTestState(setGameState) {
  setGameState(prev => {
    const next = { ...prev, pokemon: { ...prev.pokemon }, items: { ...prev.items } }
    next.pokemon[19] = { ...next.pokemon[19], isUnlocked: true, numberCaught: 16 }  // Bulbasaur
    next.pokemon[24] = { ...next.pokemon[24], isUnlocked: true, numberCaught: 16 }  // Charmander
    next.pokemon[2]  = { ...next.pokemon[2],  isUnlocked: true }                    // Pikachu
    next.pokemon[0]  = { ...next.pokemon[0],  numberCaught: 10 }                    // Pichu (root)
    next.items[3]    = { ...next.items[3],     numberCollected: 1, isUnlocked: true } // Thunder Stone
    return next
  })
}

export default function EvolveTab({ gameState, setGameState }) {
  const [selected,   setSelected]   = useState(null) // pokemon for evolve options popup
  const [evolved,    setEvolved]    = useState(null) // { fromPoke, toPoke } for result popup

  const evolvable = pokemonData.filter(p => getAvailableEvolutions(p, gameState).length > 0)

  function handleEvolve(nf) {
    const newGs   = performEvolve(gameState, nf)
    setGameState(newGs)
    saveGame(newGs)
    setSelected(null)
    setEvolved({ fromPoke: byId[nf.fromId], toPoke: byId[nf.nextCharacterID] })
  }

  function handleResultClose() {
    setEvolved(null)
  }

  return (
    <div style={styles.root}>
      {evolvable.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>◈</span>
          <p style={styles.emptyText}>No Pokémon ready to evolve</p>
          <p style={styles.emptySubtext}>Catch more to meet evolution requirements</p>
          {/* <button style={styles.testBtn} onClick={() => injectTestState(setGameState)}>⚙ Load Test Data</button> */}
        </div>
      ) : (
        <div style={styles.grid}>
          {evolvable.map(p => (
            <EvolveCard key={p.id} pokemon={p} gameState={gameState} onSelect={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <EvolvePopup
          pokemon={selected}
          gameState={gameState}
          onEvolve={handleEvolve}
          onClose={() => setSelected(null)}
        />
      )}

      {evolved && (
        <EvolveResultPopup
          fromPoke={evolved.fromPoke}
          toPoke={evolved.toPoke}
          onClose={handleResultClose}
        />
      )}
    </div>
  )
}

function EvolveCard({ pokemon: p, gameState, onSelect }) {
  const [imgState, setImgState] = useState('loading')
  const rootId    = getBaseId(p.id)
  const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0
  const spriteFile = p.spriteName ?? p.name

  return (
    <div style={styles.card} onClick={() => onSelect(p)}>
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
      <div style={styles.cardInfo}>
        <span style={styles.cardName}>{p.displayName ?? p.name}</span>
        <span style={styles.cardCount}>×{rootCaught} caught</span>
      </div>
    </div>
  )
}

function EvolvePopup({ pokemon: p, gameState, onEvolve, onClose }) {
  const evolutions = getAvailableEvolutions(p, gameState)
  const rootId     = getBaseId(p.id)
  const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0
  const spriteFile = p.spriteName ?? p.name

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.popup} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.popupHeader}>
          <img
            src={`/sprites/pokemon/mid/${spriteFile}.png`}
            alt={p.name}
            style={styles.popupHeaderSprite}
          />
          <div style={styles.popupHeaderInfo}>
            <span style={styles.popupName}>{p.displayName ?? p.name}</span>
            <div style={styles.popupTypes}>
              {(p.types ?? []).map(t => (
                <span key={t} style={{ ...styles.typeBadge, background: TYPE_COLORS[t] ?? '#9FA19F' }}>{t}</span>
              ))}
            </div>
            <span style={styles.popupCatchCount}>×{rootCaught} caught</span>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Evolution options */}
        <div style={styles.evoList}>
          {evolutions.map((nf, i) => {
            const toPoke     = byId[nf.nextCharacterID]
            const toFile     = toPoke ? (toPoke.spriteName ?? toPoke.name) : null
            const item       = nf.evolutionItemID ? byItemId[nf.evolutionItemID] : null
            const itemSrc    = item ? (item.tmType ? `/sprites/items/TM ${item.tmType}.png` : `/sprites/items/${item.name}.png`) : null
            const reqChar    = nf.characterRequiredID ? byId[nf.characterRequiredID] : null
            const reqFile    = reqChar ? (reqChar.spriteName ?? reqChar.name) : null
            const methodLabel = { LevelUp: 'Level Up', Item: 'Item', CharacterRequired: 'Pokémon', ItemAndCharacterRequired: 'Item + Pokémon' }[nf.evolutionMethod] ?? nf.evolutionMethod

            return (
              <div key={i} style={styles.evoOption}>
                {/* From → To sprites */}
                <div style={styles.evoSprites}>
                  <img src={`/sprites/pokemon/mid/${spriteFile}.png`} alt={p.name} style={styles.evoSprite} />
                  <span style={styles.evoArrow}>→</span>
                  {toFile && <img src={`/sprites/pokemon/mid/${toFile}.png`} alt={toPoke?.name} style={styles.evoSprite} />}
                </div>

                {/* Details */}
                <div style={styles.evoDetails}>
                  <span style={styles.evoToName}>{toPoke?.displayName ?? toPoke?.name ?? '???'}</span>
                  <div style={styles.evoMeta}>
                    <span style={styles.methodBadge}>{methodLabel}</span>
                    <span style={{ ...styles.countBadge, color: rootCaught >= nf.characterCount ? 'var(--accent-bright)' : 'var(--text-secondary)' }}>
                      {rootCaught} / {nf.characterCount}
                    </span>
                    {itemSrc && (
                      <img src={itemSrc} alt={item?.name} title={item?.displayName ?? item?.name} style={styles.reqSprite} />
                    )}
                    {reqFile && (
                      <img src={`/sprites/pokemon/mid/${reqFile}.png`} alt={reqChar?.name} title={reqChar?.displayName ?? reqChar?.name} style={styles.reqSprite} />
                    )}
                  </div>
                </div>

                {/* Evolve button */}
                <button style={styles.evolveBtn} onClick={() => onEvolve(nf)}>
                  Evolve
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EvolveResultPopup({ fromPoke, toPoke, onClose }) {
  const toFile   = toPoke   ? (toPoke.spriteName   ?? toPoke.name)   : null
  const fromFile = fromPoke ? (fromPoke.spriteName  ?? fromPoke.name) : null
  const toName   = toPoke   ? (toPoke.displayName   ?? toPoke.name)   : '???'
  const fromName = fromPoke ? (fromPoke.displayName ?? fromPoke.name) : '???'

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.resultPopup} onClick={e => e.stopPropagation()}>
        <p style={styles.resultLine}>
          <span style={styles.resultFrom}>{fromName}</span>
          <span style={styles.resultArrow}> evolved into </span>
          <span style={styles.resultTo}>{toName}!</span>
        </p>
        <div style={styles.resultSprites}>
          {fromFile && (
            <img
              src={`/sprites/pokemon/mid/${fromFile}.png`}
              alt={fromName}
              style={{ ...styles.resultSprite, opacity: 0.4, filter: 'brightness(0.6)' }}
            />
          )}
          <span style={styles.resultSpriteArrow}>→</span>
          {toFile && (
            <img
              src={`/sprites/pokemon/large/${toFile}.png`}
              alt={toName}
              style={styles.resultLargeSprite}
              onError={e => { e.target.onerror = null; e.target.src = `/sprites/pokemon/large/${toPoke.name}.png` }}
            />
          )}
        </div>
        <p style={styles.resultDismiss}>Click anywhere to close</p>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: 0.4,
  },
  emptyIcon: {
    fontSize: '48px',
    color: 'var(--accent)',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  emptySubtext: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  testBtn: {
    marginTop: '8px',
    padding: '6px 14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: '11px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    alignItems: 'start',
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
    gap: '6px',
    cursor: 'pointer',
    transition: 'border-color var(--transition), background var(--transition)',
    height: '120px',
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
    width: '56px',
    height: '56px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    width: '100%',
  },
  cardName: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    textAlign: 'center',
    lineHeight: '1.3',
    wordBreak: 'break-word',
  },
  cardCount: {
    fontSize: '10px',
    color: 'var(--accent-bright)',
    fontWeight: '600',
  },
  // ── Popup ──
  overlay: {
    position: 'fixed',
    top: 0, right: 0, bottom: 0,
    left: 'var(--sidebar-width)',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  popup: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: 'var(--shadow-md)',
    minWidth: '380px',
    maxWidth: '500px',
    maxHeight: '85vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  popupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  popupHeaderSprite: {
    width: '72px',
    height: '72px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    flexShrink: 0,
  },
  popupHeaderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  popupName: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  popupTypes: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  typeBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#fff',
    borderRadius: '3px',
    padding: '2px 6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  popupCatchCount: {
    fontSize: '12px',
    color: 'var(--accent-bright)',
    fontWeight: '600',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '0 -32px',
  },
  evoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  evoOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
  },
  evoSprites: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  evoSprite: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  evoArrow: {
    fontSize: '16px',
    color: 'var(--text-muted)',
  },
  evoDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  evoToName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  evoMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  methodBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--accent)',
    background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
    borderRadius: '4px',
    padding: '2px 7px',
    whiteSpace: 'nowrap',
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: '700',
  },
  reqSprite: {
    width: '24px',
    height: '24px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  evolveBtn: {
    flexShrink: 0,
    padding: '8px 16px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity var(--transition)',
  },
  resultPopup: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 56px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    boxShadow: 'var(--shadow-md)',
    minWidth: '320px',
    maxWidth: '480px',
    maxHeight: '85vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  resultLine: {
    fontSize: '18px',
    fontWeight: '600',
    textAlign: 'center',
    color: 'var(--text-primary)',
  },
  resultFrom: {
    color: 'var(--text-secondary)',
  },
  resultArrow: {
    color: 'var(--text-muted)',
  },
  resultTo: {
    color: 'var(--accent-bright)',
    fontWeight: '700',
  },
  resultSprites: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  resultSprite: {
    width: '56px',
    height: '56px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  resultSpriteArrow: {
    fontSize: '24px',
    color: 'var(--text-muted)',
  },
  resultLargeSprite: {
    width: '200px',
    height: '200px',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
  resultDismiss: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
}
