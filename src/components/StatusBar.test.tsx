import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  it('keeps read-only memories downloadable but removes mutation actions', () => {
    render(
      <StatusBar
        connectionLabel="只读纪念"
        readOnly
        onExport={vi.fn()}
        onShare={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByText('只读纪念')).toBeVisible()
    expect(screen.getByRole('button', { name: '下载图片' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '重新搭配' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '分享成品' })).not.toBeInTheDocument()
  })
})
