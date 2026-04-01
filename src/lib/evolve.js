import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'

export const byId     = Object.fromEntries(pokemonData.map(p => [p.id, p]))
export const byItemId = Object.fromEntries(itemsData.map(i   => [i.id, i]))

const parentOf = {}
pokemonData.forEach(p => {
  if (Array.isArray(p.nextForms)) {
    p.nextForms.forEach(nf => {
      if (parentOf[nf.nextCharacterID] === undefined)
        parentOf[nf.nextCharacterID] = p.id
    })
  }
})

export function getBaseId(id, seen = new Set()) {
  if (seen.has(id)) return id
  seen.add(id)
  return parentOf[id] !== undefined ? getBaseId(parentOf[id], seen) : id
}

const safeNextForms = (id) => {
  const nf = byId[id]?.nextForms
  return Array.isArray(nf) ? nf : []
}

/** Count all forms (locked or unlocked) in the evolution chain rooted at rootId. */
export function countChainForms(rootId, seen = new Set()) {
  if (seen.has(rootId)) return 0
  seen.add(rootId)
  let count = 1
  for (const nf of safeNextForms(rootId))
    count += countChainForms(nf.nextCharacterID, seen)
  return count
}

/** Count all unlocked forms in the evolution chain rooted at rootId. */
export function countUnlockedInChain(rootId, gameState, seen = new Set()) {
  if (seen.has(rootId)) return 0
  seen.add(rootId)
  let count = (gameState.pokemon[rootId]?.isUnlocked ? 1 : 0)
  for (const nf of safeNextForms(rootId))
    count += countUnlockedInChain(nf.nextCharacterID, gameState, seen)
  return count
}

export function canEvolveInto(nf, gameState, gameMode = 'easy') {
  if (gameState.pokemon[nf.nextCharacterID]?.isUnlocked) return false
  const rootId     = getBaseId(nf.fromId)
  const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0
  const required   = gameMode === 'easy'
    ? countUnlockedInChain(rootId, gameState) + 1
    : nf.characterCount
  const hasCount   = rootCaught >= required
  const hasItem    = !nf.evolutionItemID
    || (gameState.items[nf.evolutionItemID]?.numberCollected ?? 0) > 0
  const hasChar    = !nf.characterRequiredID
    || (gameState.pokemon[nf.characterRequiredID]?.isUnlocked ?? false)
  switch (nf.evolutionMethod) {
    case 'LevelUp':                  return hasCount
    case 'Item':                     return hasCount && hasItem
    case 'CharacterRequired':        return hasCount && hasChar
    case 'ItemAndCharacterRequired': return hasCount && hasItem && hasChar
    default:                         return hasCount
  }
}

export function performEvolve(gameState, nf, gameMode = 'easy') {
  const rootId = getBaseId(nf.fromId)
  let gs = gameState

  const nextCur = gs.pokemon[nf.nextCharacterID] ?? {}
  gs = { ...gs, pokemon: { ...gs.pokemon, [nf.nextCharacterID]: { ...nextCur, numberCaught: (nextCur.numberCaught ?? 0) + 1, isUnlocked: true } } }

  if (gameMode !== 'easy') {
    const rootCur = gs.pokemon[rootId] ?? {}
    gs = { ...gs, pokemon: { ...gs.pokemon, [rootId]: { ...rootCur, numberCaught: Math.max(0, (rootCur.numberCaught ?? 0) - nf.characterCount) } } }
  }

  if (nf.evolutionItemID && (nf.evolutionMethod === 'Item' || nf.evolutionMethod === 'ItemAndCharacterRequired')) {
    const itemCur = gs.items[nf.evolutionItemID] ?? {}
    gs = { ...gs, items: { ...gs.items, [nf.evolutionItemID]: { ...itemCur, numberCollected: Math.max(0, (itemCur.numberCollected ?? 0) - 1) } } }
  }

  return gs
}
