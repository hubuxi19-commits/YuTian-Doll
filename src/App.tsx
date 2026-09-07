import Konva from 'konva'
import { useEffect, useMemo, useRef } from 'react'
import { DollCanvas } from './components/DollCanvas'
import { StatusBar } from './components/StatusBar'
import { WardrobePanel } from './components/WardrobePanel'
import { exportDoll } from './features/export-doll'
import { getOrCreateRoomId, parseSnapshotId, withRoomHash } from './features/room-url'
import { useDollStore } from './store/use-doll-store'

export default function App() {
  const dispatch = useDollStore((state) => state.dispatch)
  const replaceRoom = useDollStore((state) => state.replaceRoom)
  const stageRef = useRef<Konva.Stage>(null)
  const pageUrl = useMemo(() => new URL(window.location.href), [])
  const snapshotId = parseSnapshotId(pageUrl)
  const readOnly = Boolean(snapshotId)

  useEffect(() => {
    if (snapshotId) return
    const roomId = getOrCreateRoomId(pageUrl, window.localStorage)
    window.history.replaceState(null, '', withRoomHash(pageUrl, roomId))
    replaceRoom({ ...useDollStore.getState().room, roomId })
  }, [pageUrl, replaceRoom, snapshotId])

  const handleExport = () => {
    if (stageRef.current) exportDoll(stageRef.current)
  }

  const handleShare = () => {
    void navigator.clipboard?.writeText(window.location.href)
  }

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
        <StatusBar
          connectionLabel={readOnly ? '只读纪念' : '单机准备'}
          readOnly={readOnly}
          onExport={handleExport}
          onShare={handleShare}
          onReset={() => dispatch({ type: 'reset' })}
        />
      </header>

      <section className="studio-layout">
        <div className="canvas-column">
          <div className="section-caption"><span>01</span> DRESSING ROOM</div>
          <DollCanvas stageRef={stageRef} readOnly={readOnly} />
        </div>
        <div className="wardrobe-column">
          <div className="section-caption"><span>02</span> WARDROBE</div>
          {!readOnly ? <WardrobePanel /> : <div className="readonly-card">这是一份已经保存的搭配纪念。你可以欣赏或下载图片。</div>}
          <aside className="tiny-letter">
            <span aria-hidden="true">✦</span>
            <p>每一次搭配，都会变成只属于你们的小小纪念。</p>
          </aside>
        </div>
      </section>
    </main>
  )
}
