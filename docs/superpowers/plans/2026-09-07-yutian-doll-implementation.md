# YuTian Doll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a mobile-first two-person 2D dress-up game that preserves the supplied doll artwork, synchronizes one permanent room through Cloudflare, and exports 1280×1280 PNG images.

**Architecture:** A React/Vite static client renders the immutable doll and transparent wardrobe layers with React-Konva. A Cloudflare Worker routes one secret room ID to a SQLite-backed Durable Object that serializes, persists, and broadcasts validated operations over WebSockets. GitHub Actions tests and publishes the client to GitHub Pages; Cloudflare deployment remains an explicit account-authorized step.

**Tech Stack:** React 19, TypeScript 5, Vite, Konva, React-Konva, Zustand, Vitest, Testing Library, Cloudflare Workers, SQLite-backed Durable Objects, WebSocket Hibernation, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-07-yutian-doll-design.md`

## Global Constraints

- The logical and exported canvas is exactly 1280×1280 pixels.
- The supplied doll body, face, facial features, and existing hair remain pixel-identical to the source artwork.
- Clothing uses aligned transparent SVG or PNG layers; movable accessories use bounded `x`, `y`, `scale`, and `rotation` values.
- The client is mobile-first and remains usable on desktop browsers.
- The room requires no account or password and is identified by a UUID v4 in the URL hash.
- The server accepts only catalog item IDs and validated protocol messages.
- Cloudflare stores state only; all artwork is served by GitHub Pages.
- No credential or API token may be committed or exposed to the browser bundle.

---

## File Map

- `package.json`, `vite.config.ts`, `tsconfig*.json`: client build, test, and workspace commands.
- `src/domain/types.ts`: canonical catalog, transform, room-state, and operation types.
- `src/domain/catalog.ts`: the 15-item catalog and slot/layer metadata.
- `src/domain/outfit.ts`: pure equip, transform, reset, and validation functions.
- `src/collab/protocol.ts`: JSON message parsing shared by the browser client.
- `src/collab/room-client.ts`: reconnecting WebSocket client and offline operation queue.
- `src/store/use-doll-store.ts`: Zustand adapter between domain functions, UI, and collaboration.
- `src/components/DollCanvas.tsx`: Konva rendering and accessory transforms.
- `src/components/WardrobePanel.tsx`: category and item selection UI.
- `src/components/StatusBar.tsx`: connection, presence, export, share, and reset controls.
- `src/App.tsx`, `src/styles.css`: responsive composition and visual system.
- `public/assets/base/doll.jpg`: unchanged supplied source artwork.
- `public/assets/items/*.svg`: 15 transparent wardrobe layers.
- `worker/src/protocol.ts`: server-side protocol validation.
- `worker/src/doll-room.ts`: room persistence, ordering, presence, snapshots, and broadcasts.
- `worker/src/index.ts`: HTTP routing, CORS, WebSocket upgrades, and read-only snapshots.
- `.github/workflows/ci-pages.yml`: test, build, and GitHub Pages deployment.
- `README.md`: local use, GitHub Pages setup, Cloudflare setup, and user-owned actions.

---

### Task 1: Client Scaffold and Pure Outfit Domain

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `index.html`
- Create: `src/domain/types.ts`
- Create: `src/domain/catalog.ts`
- Create: `src/domain/outfit.ts`
- Test: `src/domain/outfit.test.ts`

**Interfaces:**
- Produces: `CatalogItem`, `RoomState`, `DollOperation`, `createInitialState()`, `applyOperation(state, operation, catalog)`.
- `applyOperation` returns a new state and never mutates its argument.

- [ ] **Step 1: Write failing reducer tests**

```ts
it('replaces an occupied slot and clears slots claimed by a set', () => {
  const dressed = applyOperation(createInitialState(), { type: 'equip', itemId: 'daily-pinafore' }, catalog)
  const replaced = applyOperation(dressed, { type: 'equip', itemId: 'princess-dress' }, catalog)
  expect(replaced.equipped).toEqual({ dress: 'princess-dress' })
})

it('clamps accessory transforms to the logical canvas', () => {
  const state = applyOperation(createInitialState(), {
    type: 'transform', itemId: 'round-glasses', x: -20, y: 2000, scale: 8, rotation: 540,
  }, catalog)
  expect(state.accessories['round-glasses']).toEqual({ x: 0, y: 1280, scale: 3, rotation: 180 })
})
```

- [ ] **Step 2: Run the domain test and verify it fails**

Run: `npm test -- src/domain/outfit.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement the canonical types and immutable reducer**

```ts
export type Slot = 'set' | 'dress' | 'top' | 'bottom' | 'shoes' | 'hair' | 'glasses' | 'bag' | 'handheld'
export type Transform = { x: number; y: number; scale: number; rotation: number }
export type RoomState = {
  roomId: string
  version: number
  equipped: Partial<Record<Slot, string>>
  accessories: Record<string, Transform>
  updatedAt: string
}
export type DollOperation =
  | { type: 'equip'; itemId: string }
  | { type: 'remove'; slot: Slot }
  | ({ type: 'transform'; itemId: string } & Transform)
  | { type: 'reset' }
```

Implement catalog lookup, claimed-slot clearing, movable-item enforcement, numeric clamping, rotation normalization, and immutable updates in `outfit.ts`.

- [ ] **Step 4: Run domain tests**

Run: `npm test -- src/domain/outfit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain slice**

```bash
git add package.json vite.config.ts tsconfig.json tsconfig.app.json index.html src/domain
git commit -m "feat: add wardrobe domain model"
```

---

### Task 2: Immutable Base Artwork and Fifteen-Item Catalog

**Files:**
- Create: `public/assets/base/doll.jpg`
- Create: `public/assets/items/*.svg`
- Create: `public/assets/items/manifest.json`
- Create: `scripts/verify-assets.mjs`
- Test: `src/domain/catalog.test.ts`

**Interfaces:**
- Consumes: `CatalogItem` from Task 1.
- Produces: `catalog: readonly CatalogItem[]` with exactly 15 unique items and valid public asset paths.

- [ ] **Step 1: Add a failing catalog integrity test**

```ts
it('contains the approved fifteen unique wardrobe items', () => {
  expect(catalog).toHaveLength(15)
  expect(new Set(catalog.map(item => item.id)).size).toBe(15)
  expect(new Set(catalog.map(item => item.style))).toEqual(new Set(['daily', 'date', 'princess']))
})
```

- [ ] **Step 2: Run the integrity test and verify it fails**

Run: `npm test -- src/domain/catalog.test.ts`

Expected: FAIL until the complete catalog is present.

- [ ] **Step 3: Add the approved item metadata**

```ts
export const catalog = [
  ['daily-pinafore', '日常背带裙套装', 'set', 'daily'],
  ['date-lace-dress', '约会蕾丝连衣裙', 'dress', 'date'],
  ['princess-dress', '公主蓬蓬裙', 'dress', 'princess'],
  ['cream-cardigan', '奶油针织开衫', 'top', 'daily'],
  ['pink-hoodie', '粉色连帽卫衣', 'top', 'daily'],
  ['ribbon-blouse', '蝴蝶结衬衫', 'top', 'date'],
  ['plaid-skirt', '格纹百褶裙', 'bottom', 'daily'],
  ['a-line-skirt', '柔粉 A 字裙', 'bottom', 'date'],
  ['white-sneakers', '白色运动鞋', 'shoes', 'daily'],
  ['mary-janes', '玛丽珍鞋', 'shoes', 'date'],
  ['bow-hairclip', '蝴蝶结发卡', 'hair', 'daily'],
  ['round-glasses', '圆框眼镜', 'glasses', 'daily'],
  ['mini-bag', '迷你斜挎包', 'bag', 'date'],
  ['pearl-crown', '珍珠小皇冠', 'hair', 'princess'],
  ['flower-bouquet', '手持花束', 'handheld', 'princess'],
] as const
```

Expand each tuple into full metadata with layer, occupied slots, movable flag, default transform, thumbnail, and asset path.

- [ ] **Step 4: Produce and verify artwork**

Keep the supplied JPEG byte-for-byte unchanged as `public/assets/base/doll.jpg`. Produce transparent 1280×1280 SVG clothing layers and tight transparent SVG accessory layers. Run `node scripts/verify-assets.mjs`; it must verify asset presence, SVG view boxes, and source/base SHA-256 equality.

- [ ] **Step 5: Run catalog and asset tests**

Run: `npm test -- src/domain/catalog.test.ts && npm run verify:assets`

Expected: PASS with 15 items and an unchanged base SHA-256.

- [ ] **Step 6: Commit the asset slice**

```bash
git add public/assets src/domain/catalog.ts src/domain/catalog.test.ts scripts/verify-assets.mjs package.json
git commit -m "feat: add initial doll wardrobe assets"
```

---

### Task 3: Responsive Wardrobe and Konva Canvas

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/DollCanvas.tsx`
- Create: `src/components/WardrobePanel.tsx`
- Create: `src/store/use-doll-store.ts`
- Create: `src/styles.css`
- Test: `src/components/WardrobePanel.test.tsx`
- Test: `src/components/DollCanvas.test.tsx`

**Interfaces:**
- Consumes: `catalog`, `RoomState`, and `applyOperation`.
- Produces: `useDollStore`, `DollCanvas`, and `WardrobePanel`.

- [ ] **Step 1: Write failing wardrobe interaction tests**

```tsx
it('equips a selected item and marks it selected', async () => {
  render(<WardrobePanel />)
  await userEvent.click(screen.getByRole('button', { name: '奶油针织开衫' }))
  expect(screen.getByRole('button', { name: '奶油针织开衫' })).toHaveAttribute('aria-pressed', 'true')
})
```

- [ ] **Step 2: Run component tests and verify they fail**

Run: `npm test -- src/components`

Expected: FAIL because the components and store do not exist.

- [ ] **Step 3: Implement the store and responsive interface**

```ts
export const useDollStore = create<DollStore>((set, get) => ({
  state: createInitialState(),
  selectedItemId: null,
  dispatch: operation => set(({ state }) => ({ state: applyOperation(state, operation, catalog) })),
  selectItem: selectedItemId => set({ selectedItemId }),
}))
```

Render the fixed base first, then equipped layers ordered by catalog layer, then the selected movable accessory transformer. Use semantic category tabs and horizontally scrollable item buttons on mobile.

- [ ] **Step 4: Run component and domain tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Build the client**

Run: `npm run build`

Expected: Vite emits `dist/` without TypeScript errors.

- [ ] **Step 6: Commit the interactive client**

```bash
git add src index.html package.json vite.config.ts
git commit -m "feat: build responsive doll wardrobe"
```

---

### Task 4: Export, Room Links, and Read-Only Snapshot Mode

**Files:**
- Create: `src/features/export-doll.ts`
- Create: `src/features/room-url.ts`
- Create: `src/components/StatusBar.tsx`
- Modify: `src/App.tsx`
- Test: `src/features/room-url.test.ts`
- Test: `src/components/StatusBar.test.tsx`

**Interfaces:**
- Produces: `getOrCreateRoomId(location, storage): string`, `parseSnapshotId(location): string | null`, and `exportDoll(stage): Promise<void>`.

- [ ] **Step 1: Write failing URL-state tests**

```ts
it('creates and persists a UUID room hash when none exists', () => {
  const roomId = getOrCreateRoomId(new URL('https://example.test/YuTian-Doll/'), storage)
  expect(roomId).toMatch(/^[0-9a-f-]{36}$/)
  expect(storage.getItem('yutian-room-id')).toBe(roomId)
})

it('recognizes read-only snapshot hashes', () => {
  expect(parseSnapshotId(new URL('https://x.test/#snapshot=abc'))).toBe('abc')
})
```

- [ ] **Step 2: Run URL and status tests and verify they fail**

Run: `npm test -- src/features src/components/StatusBar.test.tsx`

Expected: FAIL because room and export features do not exist.

- [ ] **Step 3: Implement room URL and 1280×1280 export**

```ts
export async function exportDoll(stage: Konva.Stage) {
  const dataUrl = stage.toDataURL({ pixelRatio: 1280 / stage.width(), mimeType: 'image/png' })
  const link = Object.assign(document.createElement('a'), { href: dataUrl, download: '雨田娃娃.png' })
  link.click()
}
```

Hide transformer and UI-only Konva nodes during export, restore them in `finally`, and disable mutation controls in snapshot mode.

- [ ] **Step 4: Run tests and production build**

Run: `npm test && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit sharing and export**

```bash
git add src/features src/components/StatusBar.tsx src/App.tsx
git commit -m "feat: add doll export and share links"
```

---

### Task 5: Validated Cloudflare Room Protocol

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.jsonc`
- Create: `worker/vitest.config.ts`
- Create: `worker/src/protocol.ts`
- Test: `worker/test/protocol.test.ts`

**Interfaces:**
- Produces: `parseClientMessage(input: unknown): ClientMessage`, `validateOperation(operation): DollOperation`, and `ServerMessage`.
- Protocol messages use the exact operation names defined in the spec: `join`, `equip`, `remove`, `transform`, `reset`, `snapshot`, `presence`, `ack`, and `error`.

- [ ] **Step 1: Write failing protocol validation tests**

```ts
it('rejects unknown item IDs and out-of-range transforms', () => {
  expect(() => parseClientMessage({ type: 'equip', itemId: 'not-in-catalog' })).toThrow('UNKNOWN_ITEM')
  expect(() => parseClientMessage({ type: 'transform', itemId: 'round-glasses', x: 1, y: 1, scale: 10, rotation: 0 })).toThrow('INVALID_TRANSFORM')
})
```

- [ ] **Step 2: Run worker protocol tests and verify they fail**

Run: `npm --prefix worker test -- protocol.test.ts`

Expected: FAIL because the worker protocol does not exist.

- [ ] **Step 3: Implement strict parsing**

Use explicit object checks, a generated set of 15 catalog IDs, maximum JSON length of 4096 bytes, coordinates in `[0, 1280]`, scale in `[0.25, 3]`, and rotation in `[-180, 180]`. Return stable error codes without echoing untrusted values.

- [ ] **Step 4: Run worker protocol tests**

Run: `npm --prefix worker test -- protocol.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the protocol**

```bash
git add worker
git commit -m "feat: define validated realtime protocol"
```

---

### Task 6: Durable Object Persistence and WebSocket Broadcast

**Files:**
- Create: `worker/src/doll-room.ts`
- Create: `worker/src/index.ts`
- Test: `worker/test/doll-room.test.ts`
- Test: `worker/test/index.test.ts`

**Interfaces:**
- Consumes: `parseClientMessage` and `ServerMessage` from Task 5.
- Produces: exported `DollRoom` Durable Object and Worker `fetch(request, env)` handler.
- HTTP routes: `GET /health`, `GET /room/:roomId`, `GET /snapshot/:snapshotId`, `POST /room/:roomId/snapshot`, and WebSocket upgrade `GET /room/:roomId/connect`.

- [ ] **Step 1: Write failing persistence and broadcast tests**

```ts
it('persists an accepted operation and increments the version', async () => {
  const response = await SELF.fetch('https://worker.test/room/00000000-0000-4000-8000-000000000001', {
    headers: { Upgrade: 'websocket', Origin: 'https://hubuxi19-commits.github.io' },
  })
  expect(response.status).toBe(101)
  // Send equip, then reconnect and assert the snapshot version is 1 and contains the item.
})
```

- [ ] **Step 2: Run room tests and verify they fail**

Run: `npm --prefix worker test`

Expected: FAIL because routing and Durable Object code do not exist.

- [ ] **Step 3: Implement the SQLite-backed room**

Create one `room_state` row per Durable Object, restore it in the constructor, serialize message handling, increment `version` for every accepted operation, persist before acknowledgement, and broadcast the authoritative operation plus version. Use `ctx.acceptWebSocket()` and hibernation handlers.

- [ ] **Step 4: Implement HTTP routing and CORS**

Allow `https://hubuxi19-commits.github.io` plus configured localhost origins. Reject invalid UUID room IDs, non-WebSocket upgrades, oversized bodies, unsupported methods, and disallowed origins. Create immutable read-only snapshot records inside the same room object.

- [ ] **Step 5: Run all worker tests**

Run: `npm --prefix worker test`

Expected: PASS, including reconnect persistence, two-client broadcast, presence, validation, CORS, and snapshot immutability.

- [ ] **Step 6: Commit the room service**

```bash
git add worker/src worker/test worker/wrangler.jsonc
git commit -m "feat: add persistent realtime doll room"
```

---

### Task 7: Browser Collaboration, Optimistic Updates, and Offline Recovery

**Files:**
- Create: `src/collab/protocol.ts`
- Create: `src/collab/room-client.ts`
- Modify: `src/store/use-doll-store.ts`
- Modify: `src/App.tsx`
- Test: `src/collab/room-client.test.ts`
- Test: `src/store/use-doll-store.test.ts`

**Interfaces:**
- Produces: `RoomClient.connect(roomId)`, `RoomClient.send(operation)`, `RoomClient.close()`, connection-state callbacks, presence callbacks, and authoritative snapshot callbacks.
- Consumes: `VITE_WORKER_URL` at build time; missing configuration activates explicit offline mode.

- [ ] **Step 1: Write failing reconnect and convergence tests**

```ts
it('queues offline operations and flushes them after the authoritative snapshot', async () => {
  const client = new RoomClient({ socketFactory, storage, now })
  client.send({ type: 'equip', itemId: 'cream-cardigan' })
  socketFactory.openWithSnapshot(initialState)
  expect(socketFactory.sentTypes()).toEqual(['join', 'equip'])
})
```

- [ ] **Step 2: Run collaboration tests and verify they fail**

Run: `npm test -- src/collab src/store/use-doll-store.test.ts`

Expected: FAIL because the room client does not exist.

- [ ] **Step 3: Implement the reconnecting room client**

Persist the last authoritative snapshot and queued operations in local storage. Reconnect with delays of 1, 2, 4, 8, and 15 seconds capped at 15 seconds. On reconnect, request the server snapshot before flushing operations. Throttle transform messages to at most 10 per second and always send the final pointer-up transform.

- [ ] **Step 4: Connect optimistic state to authoritative updates**

The store applies local operations immediately, reports them to `RoomClient`, then replaces versioned room state when an authoritative snapshot arrives. Show `正在连接`, `对方在线`, `离线使用`, and `已同步` states without blocking local dress-up.

- [ ] **Step 5: Run client tests and build**

Run: `npm test && npm run build`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit collaboration integration**

```bash
git add src/collab src/store src/App.tsx
git commit -m "feat: synchronize the shared doll room"
```

---

### Task 8: End-to-End Verification, CI, and Deployment Guide

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/dress-up.spec.ts`
- Create: `e2e/realtime.spec.ts`
- Create: `.github/workflows/ci-pages.yml`
- Create: `.env.example`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check`, `npm run test:e2e`, deterministic Pages build, and copyable Cloudflare deployment steps.

- [ ] **Step 1: Write end-to-end acceptance tests**

```ts
test('two pages converge on the same outfit', async ({ browser }) => {
  const a = await browser.newPage()
  const b = await browser.newPage()
  await Promise.all([a.goto('/#room=test-room'), b.goto('/#room=test-room')])
  await a.getByRole('button', { name: '奶油针织开衫' }).click()
  await expect(b.getByRole('button', { name: '奶油针织开衫' })).toHaveAttribute('aria-pressed', 'true')
})
```

Also assert mobile category scrolling, accessory drag, 1280×1280 PNG export, refresh recovery, offline status, and read-only snapshot controls.

- [ ] **Step 2: Run end-to-end tests and verify missing integration failures**

Run: `npm run test:e2e`

Expected: Initial failures identify any remaining wiring or accessibility gaps.

- [ ] **Step 3: Fix only acceptance-test failures and add CI**

Configure CI to install dependencies, run `npm run check`, build with `BASE_PATH=/YuTian-Doll/`, upload the Pages artifact, and deploy only from `main`. Configure `VITE_WORKER_URL` through a GitHub Actions variable rather than a committed secret.

- [ ] **Step 4: Write deployment instructions**

Document these exact user-owned actions: authenticate Wrangler to the user's Cloudflare account, run the Worker deploy command, copy the resulting HTTPS URL into the repository variable `VITE_WORKER_URL`, and select GitHub Actions as the Pages source. Include local commands, troubleshooting, free-tier notes, and instructions for adding future catalog assets.

- [ ] **Step 5: Run final verification**

Run: `npm run check && npm --prefix worker test && npm run build && npm run test:e2e`

Expected: all unit, worker, build, and end-to-end checks pass.

- [ ] **Step 6: Inspect the production artifact**

Run: `npm run preview -- --host 127.0.0.1`

Expected: the production build opens at the configured Pages base path, preserves the doll image, works at a 390×844 viewport, and contains no credentials.

- [ ] **Step 7: Commit release-ready configuration**

```bash
git add .github e2e playwright.config.ts .env.example README.md package.json
git commit -m "ci: verify and publish YuTian Doll"
```

- [ ] **Step 8: Push the tested branch**

Run: `git push -u origin main`

Expected: the public repository contains the tested source, GitHub Actions starts, and the only remaining manual action is Cloudflare account authorization plus repository Pages configuration.
