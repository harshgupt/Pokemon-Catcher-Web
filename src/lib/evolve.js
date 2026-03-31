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

export function canEvolveInto(nf, gameState) {
  if (gameState.pokemon[nf.nextCharacterID]?.isUnlocked) return false
  const rootId     = getBaseId(nf.fromId)
  const rootCaught = gameState.pokemon[rootId]?.numberCaught ?? 0
  const hasCount   = rootCaught >= nf.characterCount
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

export function performEvolve(gameState, nf) {
  const rootId = getBaseId(nf.fromId)
  let gs = gameState

  const nextCur = gs.pokemon[nf.nextCharacterID] ?? {}
  gs = { ...gs, pokemon: { ...gs.pokemon, [nf.nextCharacterID]: { ...nextCur, numberCaught: (nextCur.numberCaught ?? 0) + 1, isUnlocked: true } } }

  const rootCur = gs.pokemon[rootId] ?? {}
  gs = { ...gs, pokemon: { ...gs.pokemon, [rootId]: { ...rootCur, numberCaught: Math.max(0, (rootCur.numberCaught ?? 0) - nf.characterCount) } } }

  if (nf.evolutionItemID && (nf.evolutionMethod === 'Item' || nf.evolutionMethod === 'ItemAndCharacterRequired')) {
    const itemCur = gs.items[nf.evolutionItemID] ?? {}
    gs = { ...gs, items: { ...gs.items, [nf.evolutionItemID]: { ...itemCur, numberCollected: Math.max(0, (itemCur.numberCollected ?? 0) - 1) } } }
  }

  return gs
}
