import { create } from 'zustand'
import { catalog } from '../domain/catalog'
import { applyOperation, createInitialState } from '../domain/outfit'
import type { DollOperation, RoomState } from '../domain/types'

export type WardrobeCategory = 'set' | 'top' | 'bottom' | 'shoes' | 'accessory'

type DollStore = {
  room: RoomState
  selectedItemId: string | null
  activeCategory: WardrobeCategory
  dispatch: (operation: DollOperation) => void
  selectItem: (itemId: string | null) => void
  setActiveCategory: (category: WardrobeCategory) => void
  replaceRoom: (room: RoomState) => void
  setSender: (sender: ((operation: DollOperation) => void) | null) => void
  sender: ((operation: DollOperation) => void) | null
}

export const useDollStore = create<DollStore>((set) => ({
  room: createInitialState(''),
  selectedItemId: null,
  activeCategory: 'set',
  sender: null,
  dispatch: (operation) => set(({ room, sender }) => {
    sender?.(operation)
    return {
      room: applyOperation(room, operation, catalog),
      selectedItemId: operation.type === 'equip' ? operation.itemId : null,
    }
  }),
  selectItem: (selectedItemId) => set({ selectedItemId }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  replaceRoom: (room) => set({ room, selectedItemId: null }),
  setSender: (sender) => set({ sender }),
}))
