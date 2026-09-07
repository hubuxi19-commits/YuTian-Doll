import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoomState } from '../domain/types'
import { DollRoomClient, toWebSocketUrl } from './room-client'

const roomId = '11111111-1111-4111-8111-111111111111'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static OPEN = 1
  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(public url: string) { FakeWebSocket.instances.push(this) }
  send(message: string) { this.sent.push(message) }
  close() { this.onclose?.() }
  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.() }
  receive(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) } as MessageEvent<string>) }
}

afterEach(() => {
  FakeWebSocket.instances = []
  vi.unstubAllGlobals()
})

describe('room client', () => {
  it('converts HTTP worker URLs to WebSocket room URLs', () => {
    expect(toWebSocketUrl('https://example.workers.dev/', roomId)).toBe(
      `wss://example.workers.dev/room/${roomId}/connect`,
    )
  })

  it('joins and forwards room snapshots and presence', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const onSnapshot = vi.fn()
    const onPresence = vi.fn()
    const client = new DollRoomClient('https://example.workers.dev', roomId, { onSnapshot, onPresence })
    client.connect()

    const socket = FakeWebSocket.instances[0]
    socket.open()
    expect(socket.sent).toEqual([JSON.stringify({ type: 'join' })])

    const state: RoomState = { roomId, version: 1, equipped: {}, accessories: {}, updatedAt: new Date().toISOString() }
    socket.receive({ type: 'snapshot', state })
    socket.receive({ type: 'presence', online: 2 })
    expect(onSnapshot).toHaveBeenCalledWith(state, 'partner')
    expect(onPresence).toHaveBeenCalledWith(2)
    client.close()
  })

  it('queues an edit until the connection opens', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
    const client = new DollRoomClient('https://example.workers.dev', roomId, {}, storage)
    client.connect()
    client.send({ type: 'equip', itemId: 'cream-cardigan' })
    FakeWebSocket.instances[0].open()
    expect(FakeWebSocket.instances[0].sent).toEqual([
      JSON.stringify({ type: 'join' }),
      JSON.stringify({ type: 'equip', itemId: 'cream-cardigan' }),
    ])
    client.close()
  })

  it('restores unconfirmed edits after a reload and removes them only after ack', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const first = new DollRoomClient('https://example.workers.dev', roomId, {}, storage)
    first.send({ type: 'equip', itemId: 'cream-cardigan' })
    first.close()

    const second = new DollRoomClient('https://example.workers.dev', roomId, {}, storage)
    second.connect()
    const socket = FakeWebSocket.instances.at(-1)!
    socket.open()
    expect(socket.sent.at(-1)).toBe(JSON.stringify({ type: 'equip', itemId: 'cream-cardigan' }))
    socket.receive({ type: 'ack', version: 1, operation: { type: 'equip', itemId: 'cream-cardigan' } })
    expect([...values.values()]).toContain('[]')
    second.close()
  })
})
