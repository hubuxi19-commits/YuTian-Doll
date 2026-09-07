// @vitest-environment node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalog } from './catalog'

describe('wardrobe catalog', () => {
  it('publishes exactly fifteen unique items across all approved styles', () => {
    expect(catalog).toHaveLength(15)
    expect(new Set(catalog.map((item) => item.id)).size).toBe(15)
    expect(new Set(catalog.map((item) => item.style))).toEqual(
      new Set(['daily', 'date', 'princess']),
    )
  })

  it('has a committed transparent vector asset for every catalog item', () => {
    const missing = catalog
      .map((item) => item.asset)
      .filter((asset) => !existsSync(resolve('public', asset.replace(/^\//, ''))))

    expect(missing).toEqual([])
  })
})
