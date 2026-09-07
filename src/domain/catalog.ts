import type { CatalogItem, Slot, Style, Transform } from './types'

type ItemInput = {
  id: string
  name: string
  slot: Slot
  style: Style
  layer: number
  movable?: boolean
  claims?: readonly Slot[]
  defaultTransform?: Transform
}

const item = ({ movable = false, claims, ...input }: ItemInput): CatalogItem => ({
  ...input,
  movable,
  claims: claims ?? [input.slot],
  asset: `/assets/items/${input.id}.png`,
  thumbnail: `/assets/items/${input.id}.png`,
})

export const catalog: readonly CatalogItem[] = [
  item({ id: 'daily-pinafore', name: '日常背带裙套装', slot: 'set', style: 'daily', layer: 30, claims: ['set', 'dress', 'top', 'bottom'] }),
  item({ id: 'date-lace-dress', name: '约会蕾丝连衣裙', slot: 'dress', style: 'date', layer: 30, claims: ['set', 'dress', 'top', 'bottom'] }),
  item({ id: 'princess-dress', name: '公主蓬蓬裙', slot: 'dress', style: 'princess', layer: 30, claims: ['set', 'dress', 'top', 'bottom'] }),
  item({ id: 'cream-cardigan', name: '奶油针织开衫', slot: 'top', style: 'daily', layer: 30, claims: ['set', 'dress', 'top'] }),
  item({ id: 'pink-hoodie', name: '粉色连帽卫衣', slot: 'top', style: 'daily', layer: 30, claims: ['set', 'dress', 'top'] }),
  item({ id: 'ribbon-blouse', name: '蝴蝶结衬衫', slot: 'top', style: 'date', layer: 30, claims: ['set', 'dress', 'top'] }),
  item({ id: 'plaid-skirt', name: '格纹百褶裙', slot: 'bottom', style: 'daily', layer: 31, claims: ['set', 'dress', 'bottom'] }),
  item({ id: 'a-line-skirt', name: '柔粉 A 字裙', slot: 'bottom', style: 'date', layer: 31, claims: ['set', 'dress', 'bottom'] }),
  item({ id: 'white-sneakers', name: '白色运动鞋', slot: 'shoes', style: 'daily', layer: 32 }),
  item({ id: 'mary-janes', name: '玛丽珍鞋', slot: 'shoes', style: 'date', layer: 32 }),
  item({ id: 'bow-hairclip', name: '蝴蝶结发卡', slot: 'hair', style: 'daily', layer: 50, movable: true, defaultTransform: { x: 810, y: 245, scale: 1, rotation: -8 } }),
  item({ id: 'round-glasses', name: '圆框眼镜', slot: 'glasses', style: 'daily', layer: 51, movable: true, defaultTransform: { x: 640, y: 545, scale: 1, rotation: 0 } }),
  item({ id: 'mini-bag', name: '迷你斜挎包', slot: 'bag', style: 'date', layer: 52, movable: true, defaultTransform: { x: 800, y: 835, scale: 1, rotation: 4 } }),
  item({ id: 'pearl-crown', name: '珍珠小皇冠', slot: 'hair', style: 'princess', layer: 50, movable: true, defaultTransform: { x: 640, y: 165, scale: 1, rotation: 0 } }),
  item({ id: 'flower-bouquet', name: '手持花束', slot: 'handheld', style: 'princess', layer: 53, movable: true, defaultTransform: { x: 835, y: 835, scale: 1, rotation: -10 } }),
]

export const catalogById = new Map(catalog.map((entry) => [entry.id, entry]))

