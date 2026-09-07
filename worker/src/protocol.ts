import { catalog } from '../../src/domain/catalog'
import type { DollOperation, RoomState, Slot } from '../../src/domain/types'

const catalogById = new Map(catalog.map((item) => [item.id, item]))
const slots = new Set<Slot>(['set', 'dress', 'top', 'bottom', 'shoes', 'hair', 'glasses', 'bag', 'handheld'])

export type ClientMessage = { type: 'join' } | DollOperation

export type ServerMessage =
  | { type: 'snapshot'; state: RoomState }
  | { type: 'presence'; online: number }
  | { type: 'ack'; version: number; operation: DollOperation }
  | { type: 'error'; code: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const finiteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const requireItem = (itemId: unknown) => {
  if (typeof itemId !== 'string' || !catalogById.has(itemId)) throw new Error('UNKNOWN_ITEM')
  return catalogById.get(itemId)!
}

export function parseWireMessage(raw: string): ClientMessage {
  if (new TextEncoder().encode(raw).byteLength > 4096) throw new Error('MESSAGE_TOO_LARGE')
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('INVALID_JSON')
  }
  if (!isRecord(value) || typeof value.type !== 'string') throw new Error('INVALID_MESSAGE')

  if (value.type === 'join' || value.type === 'reset') return { type: value.type }
  if (value.type === 'equip') {
    const item = requireItem(value.itemId)
    return { type: 'equip', itemId: item.id }
  }
  if (value.type === 'remove') {
    if (typeof value.slot !== 'string' || !slots.has(value.slot as Slot)) throw new Error('INVALID_SLOT')
    return { type: 'remove', slot: value.slot as Slot }
  }
  if (value.type === 'transform') {
    const item = requireItem(value.itemId)
    if (!item.movable) throw new Error('ITEM_NOT_MOVABLE')
    const { x, y, scale, rotation } = value
    if (
      !finiteNumber(x) || x < 0 || x > 1280 ||
      !finiteNumber(y) || y < 0 || y > 1280 ||
      !finiteNumber(scale) || scale < 0.25 || scale > 3 ||
      !finiteNumber(rotation) || rotation < -180 || rotation > 180
    ) {
      throw new Error('INVALID_TRANSFORM')
    }
    return { type: 'transform', itemId: item.id, x, y, scale, rotation }
  }

  throw new Error('UNKNOWN_MESSAGE_TYPE')
}
