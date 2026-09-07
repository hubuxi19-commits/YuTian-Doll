const ROOM_KEY = 'yutian-room-id'
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SNAPSHOT_ID = /^[a-zA-Z0-9_-]{1,96}$/

const hashParams = (url: URL) => new URLSearchParams(url.hash.replace(/^#/, ''))

export const getOrCreateRoomId = (
  url: URL,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  randomUUID: () => string = () => crypto.randomUUID(),
) => {
  const fromUrl = hashParams(url).get('room')
  if (fromUrl && UUID_V4.test(fromUrl)) {
    storage.setItem(ROOM_KEY, fromUrl)
    return fromUrl
  }
  const stored = storage.getItem(ROOM_KEY)
  if (stored && UUID_V4.test(stored)) return stored
  const generated = randomUUID()
  if (!UUID_V4.test(generated)) throw new Error('INVALID_GENERATED_ROOM_ID')
  storage.setItem(ROOM_KEY, generated)
  return generated
}

export const parseSnapshotId = (url: URL) => {
  const snapshotId = hashParams(url).get('snapshot')
  return snapshotId && SNAPSHOT_ID.test(snapshotId) ? snapshotId : null
}

export const withRoomHash = (url: URL, roomId: string) => {
  if (!UUID_V4.test(roomId)) throw new Error('INVALID_ROOM_ID')
  const next = new URL(url)
  next.hash = `room=${roomId}`
  return next.toString()
}

export const withSnapshotHash = (url: URL, snapshotId: string) => {
  if (!SNAPSHOT_ID.test(snapshotId)) throw new Error('INVALID_SNAPSHOT_ID')
  const next = new URL(url)
  next.hash = `snapshot=${snapshotId}`
  return next.toString()
}

