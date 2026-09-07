import Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DollCanvas } from './components/DollCanvas'
import { StatusBar } from './components/StatusBar'
import { WardrobePanel } from './components/WardrobePanel'
import { exportDoll } from './features/export-doll'
import { getOrCreateRoomId, parseSnapshotId, withRoomHash, withSnapshotHash } from './features/room-url'
import { DollRoomClient, loadSnapshot } from './realtime/room-client'
import { useDollStore } from './store/use-doll-store'

export default function App() {
  const dispatch = useDollStore((state) => state.dispatch)
  const replaceRoom = useDollStore((state) => state.replaceRoom)
  const stageRef = useRef<Konva.Stage>(null)
  const clientRef = useRef<DollRoomClient | null>(null)
  const pageUrl = useMemo(() => new URL(window.location.href), [])
  const snapshotId = parseSnapshotId(pageUrl)
  const readOnly = Boolean(snapshotId)
  const workerUrl = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787').replace(/\/$/, '')
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>('connecting')
  const [online, setOnline] = useState(1)
  const [activity, setActivity] = useState(readOnly ? '已保存的搭配纪念' : '正在进入两人的衣橱…')

  useEffect(() => {
    if (snapshotId) {
      loadSnapshot(workerUrl, snapshotId)
        .then((room) => {
          replaceRoom(room)
          setConnection('connected')
          setActivity('只读纪念已加载')
        })
        .catch(() => {
          setConnection('offline')
          setActivity('纪念链接暂时无法读取')
        })
      return
    }
    const roomId = getOrCreateRoomId(pageUrl, window.localStorage)
    window.history.replaceState(null, '', withRoomHash(pageUrl, roomId))
    const roomCacheKey = `yutian-room-state:${roomId}`
    try {
      const cached = JSON.parse(window.localStorage.getItem(roomCacheKey) ?? 'null')
      replaceRoom(cached?.roomId === roomId ? cached : { ...useDollStore.getState().room, roomId })
    } catch {
      replaceRoom({ ...useDollStore.getState().room, roomId })
    }
    const unsubscribe = useDollStore.subscribe((state) => {
      if (state.room.roomId === roomId) window.localStorage.setItem(roomCacheKey, JSON.stringify(state.room))
    })
    const client = new DollRoomClient(workerUrl, roomId, {
      onConnection: (state) => {
        setConnection(state)
        if (state === 'offline') setActivity('当前离线；操作会在联网后自动同步')
      },
      onPresence: setOnline,
      onSnapshot: (room, source) => {
        replaceRoom(room)
        setActivity(source === 'self' ? '你的搭配已同步' : '对方刚刚更新了搭配')
      },
      onError: () => setActivity('这次操作没有同步，请再试一次'),
    })
    clientRef.current = client
    useDollStore.getState().setSender((operation) => client.send(operation))
    client.connect()
    return () => {
      useDollStore.getState().setSender(null)
      unsubscribe()
      client.close()
      clientRef.current = null
    }
  }, [pageUrl, replaceRoom, snapshotId, workerUrl])

  const handleExport = () => {
    if (stageRef.current) exportDoll(stageRef.current)
  }

  const handleShare = async () => {
    try {
      const createdSnapshotId = await clientRef.current?.createSnapshot()
      if (!createdSnapshotId) throw new Error('NOT_CONNECTED')
      await navigator.clipboard?.writeText(withSnapshotHash(new URL(window.location.href), createdSnapshotId))
      setActivity('只读纪念链接已复制')
    } catch {
      setActivity('暂时无法生成纪念链接，请稍后再试')
    }
  }

  const handleInvite = async () => {
    await navigator.clipboard?.writeText(window.location.href)
    setActivity('共同换装网址已复制，发给对方就能一起玩')
  }

  const connectionLabel = readOnly
    ? (connection === 'connected' ? '只读纪念' : '加载中')
    : connection === 'connected'
      ? `${online} 人在线`
      : connection === 'offline' ? '离线试玩' : '同步中'

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
          connectionLabel={connectionLabel}
          activityLabel={activity}
          readOnly={readOnly}
          onExport={handleExport}
          onInvite={handleInvite}
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
