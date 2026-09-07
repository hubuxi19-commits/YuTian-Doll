import type { CatalogItem, RoomState, Transform } from '../domain/types'

export type RenderableItem = {
  item: CatalogItem
  transform?: Transform
}

export const getRenderableItems = (
  room: RoomState,
  catalog: readonly CatalogItem[],
): RenderableItem[] => {
  const equippedIds = new Set(Object.values(room.equipped).filter(Boolean))
  return catalog
    .filter((item) => equippedIds.has(item.id))
    .sort((left, right) => left.layer - right.layer)
    .map((item) => ({ item, transform: room.accessories[item.id] }))
}

