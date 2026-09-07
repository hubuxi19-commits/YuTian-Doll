import { catalog } from '../domain/catalog'
import { useDollStore, type WardrobeCategory } from '../store/use-doll-store'

const categories: readonly { id: WardrobeCategory; label: string; icon: string }[] = [
  { id: 'set', label: '套装', icon: '♡' },
  { id: 'top', label: '上衣', icon: '♧' },
  { id: 'bottom', label: '下装', icon: '♢' },
  { id: 'shoes', label: '鞋子', icon: '⌁' },
  { id: 'accessory', label: '配饰', icon: '✦' },
]

const belongsToCategory = (category: WardrobeCategory, slot: string) => {
  if (category === 'set') return slot === 'set' || slot === 'dress'
  if (category === 'accessory') return ['hair', 'glasses', 'bag', 'handheld'].includes(slot)
  return category === slot
}

export function WardrobePanel() {
  const { activeCategory, room, dispatch, setActiveCategory } = useDollStore()
  const visibleItems = catalog.filter((item) => belongsToCategory(activeCategory, item.slot))
  const equippedIds = new Set(Object.values(room.equipped))

  return (
    <section className="wardrobe" aria-label="衣橱">
      <div className="wardrobe-heading">
        <div>
          <span className="eyebrow">TODAY'S CLOSET</span>
          <h2>挑一件心动搭配</h2>
        </div>
        <span className="item-count">{visibleItems.length} 件</span>
      </div>

      <div className="category-tabs" role="tablist" aria-label="服装分类">
        {categories.map((category) => (
          <button
            className="category-tab"
            data-active={activeCategory === category.id}
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            role="tab"
            aria-selected={activeCategory === category.id}
          >
            <span aria-hidden="true">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      <div className="item-strip">
        {visibleItems.map((item) => {
          const equipped = equippedIds.has(item.id)
          return (
            <button
              key={item.id}
              className="wardrobe-item"
              data-equipped={equipped}
              aria-pressed={equipped}
              aria-label={item.name}
              onClick={() => dispatch({ type: 'equip', itemId: item.id })}
            >
              <span className="item-art"><img data-movable={item.movable} src={`${import.meta.env.BASE_URL}${item.thumbnail.slice(1)}`} alt="" /></span>
              <span className="item-name">{item.name}</span>
              <span className={`style-dot style-${item.style}`} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
