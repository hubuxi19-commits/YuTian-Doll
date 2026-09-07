import { describe, expect, it, vi } from 'vitest'
import { exportDoll } from './export-doll'

describe('doll export', () => {
  it('exports a 1280-pixel PNG without selection controls', () => {
    const control = { visible: vi.fn(), isVisible: () => true }
    const stage = {
      width: () => 640,
      find: () => [control],
      toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
      draw: vi.fn(),
    }
    const clicked: HTMLAnchorElement[] = []
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreate(tagName)
      if (tagName === 'a') {
        element.click = () => clicked.push(element as HTMLAnchorElement)
      }
      return element
    }) as typeof document.createElement)

    exportDoll(stage)

    expect(stage.toDataURL).toHaveBeenCalledWith({ pixelRatio: 2, mimeType: 'image/png' })
    expect(clicked[0]?.download).toBe('雨田娃娃.png')
    expect(control.visible).toHaveBeenNthCalledWith(1, false)
    expect(control.visible).toHaveBeenLastCalledWith(true)
  })
})
