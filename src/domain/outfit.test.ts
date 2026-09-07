import { describe, expect, it } from 'vitest'
import { catalog } from './catalog'
import { applyOperation, createInitialState } from './outfit'

describe('outfit state', () => {
  it('clears clothing slots claimed by a newly equipped dress', () => {
    const withTop = applyOperation(
      createInitialState('room-a'),
      { type: 'equip', itemId: 'cream-cardigan' },
      catalog,
    )
    const withSeparates = applyOperation(
      withTop,
      { type: 'equip', itemId: 'plaid-skirt' },
      catalog,
    )

    const replaced = applyOperation(
      withSeparates,
      { type: 'equip', itemId: 'princess-dress' },
      catalog,
    )

    expect(replaced.equipped).toEqual({ dress: 'princess-dress' })
    expect(withSeparates.equipped).toEqual({
      top: 'cream-cardigan',
      bottom: 'plaid-skirt',
    })
  })

  it('clamps accessory transforms to the logical canvas', () => {
    const state = applyOperation(
      createInitialState('room-a'),
      {
        type: 'transform',
        itemId: 'round-glasses',
        x: -20,
        y: 2000,
        scale: 8,
        rotation: 540,
      },
      catalog,
    )

    expect(state.accessories['round-glasses']).toEqual({
      x: 0,
      y: 1280,
      scale: 3,
      rotation: 180,
    })
  })

  it('rejects transform operations for fixed clothing', () => {
    expect(() =>
      applyOperation(
        createInitialState('room-a'),
        {
          type: 'transform',
          itemId: 'cream-cardigan',
          x: 640,
          y: 640,
          scale: 1,
          rotation: 0,
        },
        catalog,
      ),
    ).toThrowError('ITEM_NOT_MOVABLE')
  })
})
