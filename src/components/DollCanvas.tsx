import Konva from 'konva'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Image as KonvaImage, Layer, Stage, Transformer } from 'react-konva'
import { CANVAS_SIZE } from '../domain/types'
import { useDollStore } from '../store/use-doll-store'
import { getRenderableItems } from './canvas-model'
import { catalog } from '../domain/catalog'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.slice(1)}`

function useAssetImage(source: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    const next = new window.Image()
    next.crossOrigin = 'anonymous'
    next.onload = () => setImage(next)
    next.src = source
    return () => {
      next.onload = null
    }
  }, [source])
  return image
}

type AssetLayerProps = ReturnType<typeof getRenderableItems>[number] & {
  selected: boolean
  interactive: boolean
  onSelect: () => void
}

function AssetLayer({ item, transform, selected, interactive, onSelect }: AssetLayerProps) {
  const image = useAssetImage(assetUrl(item.asset))
  const dispatch = useDollStore((state) => state.dispatch)
  const shapeRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (selected && shapeRef.current && transformerRef.current) {
      transformerRef.current.nodes([shapeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selected, image])

  if (!image) return null
  const movable = item.movable && transform
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height

  const commitTransform = () => {
    const node = shapeRef.current
    if (!node || !movable || !interactive) return
    dispatch({
      type: 'transform',
      itemId: item.id,
      x: node.x(),
      y: node.y(),
      scale: node.scaleX(),
      rotation: node.rotation(),
    })
  }

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={movable ? transform.x : 0}
        y={movable ? transform.y : 0}
        width={movable ? imageWidth : CANVAS_SIZE}
        height={movable ? imageHeight : CANVAS_SIZE}
        offsetX={movable ? imageWidth / 2 : 0}
        offsetY={movable ? imageHeight / 2 : 0}
        scaleX={movable ? transform.scale : 1}
        scaleY={movable ? transform.scale : 1}
        rotation={movable ? transform.rotation : 0}
        draggable={Boolean(movable && interactive)}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={commitTransform}
        onTransformEnd={commitTransform}
        shadowColor={selected ? '#c57f8c' : undefined}
        shadowBlur={selected ? 14 : 0}
        shadowOpacity={selected ? 0.35 : 0}
      />
      {selected && movable ? (
        <Transformer
          name="ui-only"
          ref={transformerRef}
          rotateEnabled
          flipEnabled={false}
          keepRatio
          borderStroke="#c57f8c"
          anchorFill="#fffaf3"
          anchorStroke="#9f6570"
          anchorSize={22}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 40 || newBox.width > 900 ? oldBox : newBox
          }
        />
      ) : null}
    </>
  )
}

type DollCanvasProps = {
  stageRef?: RefObject<Konva.Stage | null>
  readOnly?: boolean
}

export function DollCanvas({ stageRef, readOnly = false }: DollCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [displaySize, setDisplaySize] = useState(640)
  const baseImage = useAssetImage(assetUrl('/assets/base/doll.jpg'))
  const { room, selectedItemId, selectItem } = useDollStore()
  const renderableItems = getRenderableItems(room, catalog)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const update = () => setDisplaySize(Math.min(container.clientWidth, 720))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const ratio = displaySize / CANVAS_SIZE

  return (
    <div className="canvas-shell" ref={containerRef}>
      <div className="tape tape-left" aria-hidden="true" />
      <div className="tape tape-right" aria-hidden="true" />
      <Stage
        ref={stageRef}
        width={displaySize}
        height={displaySize}
        scaleX={ratio}
        scaleY={ratio}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) selectItem(null)
        }}
        onTouchStart={(event) => {
          if (event.target === event.target.getStage()) selectItem(null)
        }}
      >
        <Layer>
          {baseImage ? <KonvaImage image={baseImage} width={CANVAS_SIZE} height={CANVAS_SIZE} listening={false} /> : null}
          {renderableItems.map((entry) => (
            <AssetLayer
              key={entry.item.id}
              {...entry}
              interactive={!readOnly}
              selected={!readOnly && selectedItemId === entry.item.id}
              onSelect={() => { if (!readOnly) selectItem(entry.item.id) }}
            />
          ))}
        </Layer>
      </Stage>
      <span className="canvas-note">为今天的她，挑一身温柔吧</span>
    </div>
  )
}
