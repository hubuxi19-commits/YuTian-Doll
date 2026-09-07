import type { CatalogItem, DollOperation, RoomState, Transform } from './types'
import { CANVAS_SIZE } from './types'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const normalizeRotation = (rotation: number) => {
  const normalized = ((rotation + 180) % 360 + 360) % 360 - 180
  return normalized === -180 && rotation > 0 ? 180 : normalized
}

const normalizeTransform = (transform: Transform): Transform => ({
  x: clamp(transform.x, 0, CANVAS_SIZE),
  y: clamp(transform.y, 0, CANVAS_SIZE),
  scale: clamp(transform.scale, 0.25, 3),
  rotation: normalizeRotation(transform.rotation),
})

export const createInitialState = (roomId = ''): RoomState => ({
  roomId,
  version: 0,
  equipped: {},
  accessories: {},
  updatedAt: new Date(0).toISOString(),
})

const findItem = (itemId: string, catalog: readonly CatalogItem[]) => {
  const found = catalog.find((entry) => entry.id === itemId)
  if (!found) throw new Error('UNKNOWN_ITEM')
  return found
}

export const applyOperation = (
  state: RoomState,
  operation: DollOperation,
  catalog: readonly CatalogItem[],
): RoomState => {
  if (operation.type === 'reset') {
    return { ...createInitialState(state.roomId), version: state.version, updatedAt: state.updatedAt }
  }

  if (operation.type === 'remove') {
    const equipped = { ...state.equipped }
    const removedId = equipped[operation.slot]
    delete equipped[operation.slot]
    const accessories = { ...state.accessories }
    if (removedId) delete accessories[removedId]
    return { ...state, equipped, accessories }
  }

  const selected = findItem(operation.itemId, catalog)

  if (operation.type === 'transform') {
    if (!selected.movable) throw new Error('ITEM_NOT_MOVABLE')
    return {
      ...state,
      accessories: {
        ...state.accessories,
        [selected.id]: normalizeTransform(operation),
      },
    }
  }

  const equipped = { ...state.equipped }
  const accessories = { ...state.accessories }
  for (const claimedSlot of selected.claims) {
    const removedId = equipped[claimedSlot]
    delete equipped[claimedSlot]
    if (removedId) delete accessories[removedId]
  }
  equipped[selected.slot] = selected.id
  if (selected.movable && selected.defaultTransform) {
    accessories[selected.id] = { ...selected.defaultTransform }
  }

  return { ...state, equipped, accessories }
}
