import type { DollOperation, RoomState } from '../domain/types'

type ConnectionState = 'connecting' | 'connected' | 'offline'
type SnapshotSource = 'self' | 'partner'

type ClientCallbacks = {
  onConnection?: (state: ConnectionState) => void
  onPresence?: (online: number) => void
  onSnapshot?: (state: RoomState, source: SnapshotSource) => void
  onError?: (code: string) => void
}

type ServerMessage =
  | { type: 'snapshot'; state: RoomState }
  | { type: 'presence'; online: number }
  | { type: 'ack'; version: number; operation: DollOperation }
  | { type: 'error'; code: string }

export const toWebSocketUrl = (workerUrl: string, roomId: string) => {
  const url = new URL(workerUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `/room/${roomId}/connect`
  url.search = ''
  url.hash = ''
  return url.toString()
}

export class DollRoomClient {
  private socket: WebSocket | null = null
  private pending: DollOperation[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private retry = 0
  private ownVersions = new Set<number>()
  private idleWaiters = new Set<() => void>()
  private readonly queueKey: string

  constructor(
    private workerUrl: string,
    private roomId: string,
    private callbacks: ClientCallbacks,
    private storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage,
  ) {
    this.queueKey = `yutian-pending:${roomId}`
    try {
      const saved = JSON.parse(this.storage?.getItem(this.queueKey) ?? '[]')
      if (Array.isArray(saved)) this.pending = saved
    } catch { this.pending = [] }
  }

  connect() {
    this.closed = false
    this.callbacks.onConnection?.('connecting')
    const socket = new WebSocket(toWebSocketUrl(this.workerUrl, this.roomId))
    this.socket = socket
    socket.onopen = () => {
      this.retry = 0
      this.callbacks.onConnection?.('connected')
      socket.send(JSON.stringify({ type: 'join' }))
      for (const operation of this.pending) socket.send(JSON.stringify(operation))
    }
    socket.onmessage = (event) => this.handleMessage(event.data)
    socket.onerror = () => this.callbacks.onConnection?.('offline')
    socket.onclose = () => {
      this.callbacks.onConnection?.('offline')
      if (!this.closed) this.scheduleReconnect()
    }
  }

  send(operation: DollOperation) {
    this.pending.push(operation)
    this.persistPending()
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(operation))
  }

  async createSnapshot(): Promise<string> {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('NOT_CONNECTED')
    await this.waitUntilSynced()
    const response = await fetch(`${this.workerUrl}/room/${this.roomId}/snapshot`, { method: 'POST' })
    if (!response.ok) throw new Error('SNAPSHOT_FAILED')
    const body = await response.json() as { snapshotId: string }
    return body.snapshotId
  }

  close() {
    this.closed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close()
    this.socket = null
  }

  private handleMessage(raw: string) {
    try {
      const message = JSON.parse(raw) as ServerMessage
      if (message.type === 'ack') {
        this.ownVersions.add(message.version)
        this.pending.shift()
        this.persistPending()
        if (this.pending.length === 0) {
          for (const resolve of this.idleWaiters) resolve()
          this.idleWaiters.clear()
        }
        return
      }
      if (message.type === 'snapshot') {
        const source = this.ownVersions.delete(message.state.version) ? 'self' : 'partner'
        this.callbacks.onSnapshot?.(message.state, source)
      } else if (message.type === 'presence') {
        this.callbacks.onPresence?.(message.online)
      } else if (message.type === 'error') {
        this.callbacks.onError?.(message.code)
      }
    } catch {
      this.callbacks.onError?.('INVALID_SERVER_MESSAGE')
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(10_000, 750 * 2 ** this.retry++)
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private persistPending() {
    this.storage?.setItem(this.queueKey, JSON.stringify(this.pending))
  }

  private waitUntilSynced() {
    if (this.pending.length === 0) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.idleWaiters.delete(done)
        reject(new Error('SYNC_TIMEOUT'))
      }, 5000)
      const done = () => {
        clearTimeout(timeout)
        resolve()
      }
      this.idleWaiters.add(done)
    })
  }
}

export async function loadSnapshot(workerUrl: string, snapshotId: string): Promise<RoomState> {
  const response = await fetch(`${workerUrl}/snapshot/${snapshotId}`)
  if (!response.ok) throw new Error(response.status === 404 ? 'SNAPSHOT_NOT_FOUND' : 'SNAPSHOT_FAILED')
  const snapshot = await response.json() as Omit<RoomState, 'roomId'>
  return { ...snapshot, roomId: '' }
}
