import { describe, expect, it } from 'vitest'
import { catalog } from '../domain/catalog'
import { applyOperation, createInitialState } from '../domain/outfit'
import { getRenderableItems } from './canvas-model'

describe('canvas render model', () => {
  it('sorts equipped wardrobe layers from clothing to accessories', () => {
    let state = applyOperation(
      createInitialState('room-a'),
      { type: 'equip', itemId: 'round-glasses' },
      catalog,
    )
    state = applyOperation(state, { type: 'equip', itemId: 'cream-cardigan' }, catalog)

    expect(getRenderableItems(state, catalog).map((entry) => entry.item.id)).toEqual([
      'cream-cardigan',
      'round-glasses',
    ])
  })
})
