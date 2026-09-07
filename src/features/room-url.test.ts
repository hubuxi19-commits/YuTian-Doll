import { describe, expect, it } from 'vitest'
import { getOrCreateRoomId, parseSnapshotId, withRoomHash } from './room-url'

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Pick<Storage, 'getItem' | 'setItem'>
}

describe('room URLs', () => {
  it('creates and persists a UUID when neither URL nor storage has one', () => {
    const storage = memoryStorage()
    const generated = '2fa80e2f-3f4a-4d57-991f-fb9d3ab188d2'

    expect(
      getOrCreateRoomId(new URL('https://example.test/YuTian-Doll/'), storage, () => generated),
    ).toBe(generated)
    expect(storage.getItem('yutian-room-id')).toBe(generated)
  })

  it('prefers a valid room ID from the URL and stores it for later visits', () => {
    const storage = memoryStorage()
    const roomId = '346c2d87-90bd-4858-88c1-31c33a7267c0'

    expect(getOrCreateRoomId(new URL(`https://example.test/#room=${roomId}`), storage)).toBe(roomId)
    expect(storage.getItem('yutian-room-id')).toBe(roomId)
  })

  it('recognizes read-only snapshot hashes and creates stable room links', () => {
    expect(parseSnapshotId(new URL('https://example.test/#snapshot=memory-42'))).toBe('memory-42')
    expect(
      withRoomHash(new URL('https://example.test/YuTian-Doll/#snapshot=old'), '346c2d87-90bd-4858-88c1-31c33a7267c0'),
    ).toBe('https://example.test/YuTian-Doll/#room=346c2d87-90bd-4858-88c1-31c33a7267c0')
  })
})

