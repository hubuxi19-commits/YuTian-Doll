type VisibilityNode = {
  visible: (value: boolean) => void
  isVisible: () => boolean
}

export type ExportableStage = {
  width: () => number
  find: (selector: string) => VisibilityNode[]
  toDataURL: (config: { pixelRatio: number; mimeType: string }) => string
  draw: () => void
}

export function exportDoll(stage: ExportableStage) {
  const controls = stage.find('.ui-only')
  const previousVisibility = controls.map((control) => control.isVisible())
  controls.forEach((control) => control.visible(false))
  stage.draw()
  try {
    const dataUrl = stage.toDataURL({ pixelRatio: 1280 / stage.width(), mimeType: 'image/png' })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = '雨田娃娃.png'
    link.click()
  } finally {
    controls.forEach((control, index) => control.visible(previousVisibility[index] ?? true))
    stage.draw()
  }
}

