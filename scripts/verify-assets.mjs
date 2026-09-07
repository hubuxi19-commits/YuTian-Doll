import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const expectedBaseHash = '19bc8cbf27ec0f9c4b44d8ea984983c26e6e358b534088ff2a696b4cc41832cc'
const base = await readFile(resolve('public/assets/base/doll.jpg'))
const baseHash = createHash('sha256').update(base).digest('hex')
if (baseHash !== expectedBaseHash) {
  throw new Error(`Base artwork changed: ${baseHash}`)
}

const files = (await readdir(resolve('public/assets/items'))).filter((name) => name.endsWith('.svg'))
if (files.length !== 15) {
  throw new Error(`Expected 15 SVG assets, found ${files.length}`)
}

for (const file of files) {
  const source = await readFile(resolve('public/assets/items', file), 'utf8')
  if (!source.includes('<svg') || !source.includes('viewBox=')) {
    throw new Error(`${file} is missing an SVG viewBox`)
  }
  if (/<(?:rect|image)[^>]+(?:width="1280"|width="100%")/i.test(source)) {
    throw new Error(`${file} contains a full-canvas background`)
  }
}

console.log(`Verified unchanged doll artwork and ${files.length} transparent SVG assets.`)
