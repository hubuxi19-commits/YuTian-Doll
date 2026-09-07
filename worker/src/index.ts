import { DurableObject } from 'cloudflare:workers'
import { catalog } from '../../src/domain/catalog'
import { applyOperation, createInitialState } from '../../src/domain/outfit'
import type { DollOperation, RoomState } from '../../src/domain/types'
import { parseWireMessage, type ServerMessage } from './protocol'

export interface Env {
  DOLL_ROOMS: DurableObjectNamespace<DollRoom>
  ALLOWED_ORIGINS: string
}

const ROOM_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SNAPSHOT_PATTERN = /^[0-9a-f]{32}$/i
type SnapshotState = Omit<RoomState, 'roomId'>

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, { status, headers })

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
})

const originAllowed = (request: Request, env: Env) => {
  const origin = request.headers.get('Origin') ?? ''
  return env.ALLOWED_ORIGINS.split(',').map((entry) => entry.trim()).includes(origin)
}

const roomStub = (env: Env, roomId: string) => env.DOLL_ROOMS.getByName(roomId)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/health') return json({ ok: true })

    const origin = request.headers.get('Origin') ?? ''
    if (!originAllowed(request, env)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403)
    const headers = corsHeaders(origin)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    const roomMatch = url.pathname.match(/^\/room\/([^/]+)(?:\/(connect|snapshot))?$/)
    if (roomMatch) {
      const [, roomId, action] = roomMatch
      if (!ROOM_PATTERN.test(roomId)) return json({ error: 'INVALID_ROOM_ID' }, 400, headers)
      const stub = roomStub(env, roomId)

      if (!action && request.method === 'GET') return json(await stub.getState(roomId), 200, headers)
      if (action === 'snapshot' && request.method === 'POST') {
        const { roomId: _, ...snapshot } = await stub.getState(roomId)
        const snapshotId = crypto.randomUUID().replaceAll('-', '')
        await roomStub(env, `snapshot-${snapshotId}`).saveSnapshot(snapshot)
        return json({ snapshotId }, 201, headers)
      }
      if (action === 'connect' && request.method === 'GET') {
        const forwarded = new Request(`https://durable-object/connect?roomId=${roomId}`, request)
        return stub.fetch(forwarded)
      }
    }

    const snapshotMatch = url.pathname.match(/^\/snapshot\/([^/]+)$/)
    if (snapshotMatch && request.method === 'GET') {
      const snapshotId = snapshotMatch[1]
      if (!SNAPSHOT_PATTERN.test(snapshotId)) return json({ error: 'INVALID_SNAPSHOT_ID' }, 400, headers)
      const state = await roomStub(env, `snapshot-${snapshotId}`).getSnapshot()
      return state ? json(state, 200, headers) : json({ error: 'SNAPSHOT_NOT_FOUND' }, 404, headers)
    }

    return json({ error: 'NOT_FOUND' }, 404, headers)
  },
} satisfies ExportedHandler<Env>

export class DollRoom extends DurableObject<Env> {
  private async load(roomId: string): Promise<RoomState> {
    return (await this.ctx.storage.get<RoomState>('room-state')) ?? createInitialState(roomId)
  }

  async getState(roomId: string): Promise<RoomState> {
    return this.load(roomId)
  }

  async apply(roomId: string, operation: DollOperation): Promise<RoomState> {
    const checked = parseWireMessage(JSON.stringify(operation))
    if (checked.type === 'join') throw new Error('INVALID_OPERATION')
    const previous = await this.load(roomId)
    const next = {
      ...applyOperation(previous, checked, catalog),
      version: previous.version + 1,
      updatedAt: new Date().toISOString(),
    }
    await this.ctx.storage.put('room-state', next)
    return next
  }

  async saveSnapshot(snapshot: SnapshotState): Promise<void> {
    await this.ctx.storage.put('snapshot', snapshot)
  }

  async getSnapshot(): Promise<SnapshotState | null> {
    return (await this.ctx.storage.get<SnapshotState>('snapshot')) ?? null
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const roomId = url.searchParams.get('roomId') ?? ''
    if (url.pathname !== '/connect' || !ROOM_PATTERN.test(roomId)) {
      return json({ error: 'NOT_FOUND' }, 404)
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ error: 'EXPECTED_WEBSOCKET' }, 426)
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ roomId })
    this.broadcastPresence()
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const { roomId = '' } = socket.deserializeAttachment() as { roomId?: string }
    try {
      const parsed = parseWireMessage(typeof message === 'string' ? message : new TextDecoder().decode(message))
      if (parsed.type === 'join') {
        socket.send(JSON.stringify({ type: 'snapshot', state: await this.load(roomId) } satisfies ServerMessage))
        return
      }
      const state = await this.apply(roomId, parsed)
      socket.send(JSON.stringify({ type: 'ack', version: state.version, operation: parsed } satisfies ServerMessage))
      this.broadcast({ type: 'snapshot', state })
    } catch (error) {
      const code = error instanceof Error ? error.message : 'INVALID_MESSAGE'
      socket.send(JSON.stringify({ type: 'error', code } satisfies ServerMessage))
    }
  }

  webSocketClose(): void {
    this.broadcastPresence()
  }

  webSocketError(): void {
    this.broadcastPresence()
  }

  private broadcast(message: ServerMessage) {
    const encoded = JSON.stringify(message)
    for (const socket of this.activeSockets()) {
      try { socket.send(encoded) } catch { /* stale sockets disappear automatically */ }
    }
  }

  private broadcastPresence() {
    this.broadcast({ type: 'presence', online: this.activeSockets().length })
  }

  private activeSockets() {
    return this.ctx.getWebSockets().filter((socket) => socket.readyState === WebSocket.OPEN)
  }
}
