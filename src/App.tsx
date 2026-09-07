import { DollCanvas } from './components/DollCanvas'
import { WardrobePanel } from './components/WardrobePanel'
import { useDollStore } from './store/use-doll-store'

export default function App() {
  const dispatch = useDollStore((state) => state.dispatch)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">雨</span>
          <div>
            <p>OUR LITTLE CLOSET</p>
            <h1>雨田娃娃</h1>
          </div>
        </div>
        <div className="top-actions">
          <span className="presence-pill"><i /> 单机准备</span>
          <button className="soft-button" onClick={() => dispatch({ type: 'reset' })}>重新搭配</button>
        </div>
      </header>

      <section className="studio-layout">
        <div className="canvas-column">
          <div className="section-caption"><span>01</span> DRESSING ROOM</div>
          <DollCanvas />
        </div>
        <div className="wardrobe-column">
          <div className="section-caption"><span>02</span> WARDROBE</div>
          <WardrobePanel />
          <aside className="tiny-letter">
            <span aria-hidden="true">✦</span>
            <p>每一次搭配，都会变成只属于你们的小小纪念。</p>
          </aside>
        </div>
      </section>
    </main>
  )
}

