import { env, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import type { Env } from '../src/index'

const roomId = '11111111-1111-4111-8111-111111111111'
const allowedOrigin = 'http://localhost:5173'

describe('doll room worker', () => {
  it('reports health without requiring an origin', async () => {
    const response = await SELF.fetch('https://worker.test/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('rejects room access from an unlisted origin', async () => {
    const response = await SELF.fetch(`https://worker.test/room/${roomId}`, {
      headers: { Origin: 'https://example.com' },
    })
    expect(response.status).toBe(403)
  })

  it('persists valid operations in a named durable room', async () => {
    const stub = (env as unknown as Env).DOLL_ROOMS.getByName(roomId)
    const initial = await stub.getState(roomId)
    expect(initial).toMatchObject({ roomId, version: 0, equipped: {} })

    const updated = await stub.apply(roomId, { type: 'equip', itemId: 'cream-cardigan' })
    expect(updated).toMatchObject({
      roomId,
      version: 1,
      equipped: { top: 'cream-cardigan' },
    })

    await expect(stub.getState(roomId)).resolves.toEqual(updated)
  })

  it('creates and serves an immutable read-only snapshot', async () => {
    const createResponse = await SELF.fetch(`https://worker.test/room/${roomId}/snapshot`, {
      method: 'POST',
      headers: { Origin: allowedOrigin },
    })
    expect(createResponse.status).toBe(201)
    const created = await createResponse.json<{ snapshotId: string }>()

    const response = await SELF.fetch(`https://worker.test/snapshot/${created.snapshotId}`, {
      headers: { Origin: allowedOrigin },
    })
    expect(response.status).toBe(200)
    const state = await response.json()
    expect(state).toMatchObject({ roomId })
  })
})
