import { describe, expect, it } from 'vitest'
import { parseWireMessage } from '../src/protocol'

describe('realtime protocol', () => {
  it('accepts catalog items and normalized operation shapes', () => {
    expect(parseWireMessage(JSON.stringify({ type: 'equip', itemId: 'cream-cardigan' }))).toEqual({
      type: 'equip',
      itemId: 'cream-cardigan',
    })
  })

  it('rejects unknown item IDs', () => {
    expect(() => parseWireMessage(JSON.stringify({ type: 'equip', itemId: 'not-in-catalog' }))).toThrowError('UNKNOWN_ITEM')
  })

  it('rejects out-of-range accessory transforms', () => {
    expect(() => parseWireMessage(JSON.stringify({
      type: 'transform', itemId: 'round-glasses', x: 1, y: 1, scale: 10, rotation: 0,
    }))).toThrowError('INVALID_TRANSFORM')
  })

  it('rejects messages larger than 4096 bytes before parsing', () => {
    expect(() => parseWireMessage(`{"type":"join","padding":"${'x'.repeat(4096)}"}`)).toThrowError('MESSAGE_TOO_LARGE')
  })
})
