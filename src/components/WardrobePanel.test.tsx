import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from '../domain/outfit'
import { useDollStore } from '../store/use-doll-store'
import { WardrobePanel } from './WardrobePanel'

describe('WardrobePanel', () => {
  beforeEach(() => {
    useDollStore.setState({
      room: createInitialState('test-room'),
      selectedItemId: null,
      activeCategory: 'set',
    })
  })

  it('equips a selected item and exposes its pressed state', async () => {
    const user = userEvent.setup()
    render(<WardrobePanel />)

    await user.click(screen.getByRole('tab', { name: '上衣' }))
    await user.click(screen.getByRole('button', { name: '奶油针织开衫' }))

    expect(screen.getByRole('button', { name: '奶油针织开衫' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('changes the visible item group through accessible category tabs', async () => {
    const user = userEvent.setup()
    render(<WardrobePanel />)

    expect(screen.getByRole('button', { name: '日常背带裙套装' })).toBeVisible()
    await user.click(screen.getByRole('tab', { name: '配饰' }))

    expect(screen.getByRole('button', { name: '蝴蝶结发卡' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '日常背带裙套装' })).not.toBeInTheDocument()
  })
})

