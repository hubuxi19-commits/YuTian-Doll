export const CANVAS_SIZE = 1280

export type Slot =
  | 'set'
  | 'dress'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'hair'
  | 'glasses'
  | 'bag'
  | 'handheld'

export type Style = 'daily' | 'date' | 'princess'

export type Transform = {
  x: number
  y: number
  scale: number
  rotation: number
}

export type CatalogItem = {
  id: string
  name: string
  slot: Slot
  style: Style
  asset: string
  thumbnail: string
  layer: number
  movable: boolean
  claims: readonly Slot[]
  defaultTransform?: Transform
  pairsWith?: string
}

export type RoomState = {
  roomId: string
  version: number
  equipped: Partial<Record<Slot, string>>
  accessories: Record<string, Transform>
  updatedAt: string
}

export type DollOperation =
  | { type: 'equip'; itemId: string }
  | { type: 'remove'; slot: Slot }
  | ({ type: 'transform'; itemId: string } & Transform)
  | { type: 'reset' }
