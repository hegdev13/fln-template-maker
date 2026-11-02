import { useDraggable } from '@dnd-kit/core'
import { useEffect, useLayoutEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { findOverflow } from '../core/overflow'
import { RenderComponent, PageSheet, RuntimeProvider, cellProps, type Runtime, type ZoneProps } from '../core/runtime'
import type { RulerMark } from '../core/store'
import { SPANS, pageDimensions, snapEdgeSpan, spanLabel } from '../core/tree'
import type { ComponentData } from '../core/types'
import { useEditorStore, useEditorStoreApi } from './context'
import { FormatBar } from './FormatBar'
import { Rulers } from './Rulers'

const MM_PX = 96 / 25.4
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** Geometry (in the node's own CSS px) of the zone the node lives in, for the snap-grid overlay. */
interface Guide {
  zoneLeft: number
  zoneTop: number
  zoneW: number
  zoneH: number
  /** Vertical snap lines the dragged edge can land on (x from the node's left edge) and their widths. */
  lines: { x: number; span: number }[]
}

/** Page-height quarter lines shown while resizing height; offsets are in the node's CSS px from its top. */
interface HeightGuide {
  left: number
  width: number
  lines: number[]
  /** Quarter positions in screen px (for the ruler marks). */
  quarters: number[]
  /** index into lines of the quarter the bottom edge is locked to, or null when between lines */
  snapped: number | null
}
const QUARTER_LABELS = ['1/4', '1/2', '3/4']
/** Screen px within which the bottom edge locks onto a quarter line (hold Alt to disable). */
const SNAP_PX = 8

function HeightLines({ guide }: { guide: HeightGuide }) {
  return (
    <div className="ed-guide" aria-hidden>
      {guide.lines.map((y, i) => (
        <div
          key={i}
          className={`ed-hline${guide.snapped === i ? ' on' : ''}`}
          style={{ left: guide.left, width: guide.width, top: y }}
        />
      ))}
    </div>
  )
}

/** The edge being dragged moves; the opposite edge stays put. */
interface Drag {
  side: 'left' | 'right'
  /** Screen x of the moving edge if the component had width `span` (12ths); also limits how wide it can get. */
  edgeX: (span: number) => number
  maxSpan: number
}

function SnapGuide({ guide, data }: { guide: Guide; data: ComponentData }) {
  const current = data.span ?? 12
  return (
    <div className="ed-guide" aria-hidden>
      <div className="ed-guide-zone" style={{ left: guide.zoneLeft, top: guide.zoneTop, width: guide.zoneW, height: guide.zoneH }}>
        {Array.from({ length: 13 }, (_, i) => (
          <i key={i} className="ed-guide-col" style={{ left: `${(i / 12) * 100}%` }} />
        ))}
      </div>
      {guide.lines.map(({ x, span }) => (
        <div key={span} className={`ed-guide-snap${span === current ? ' on' : ''}`} style={{ left: x, top: guide.zoneTop, height: guide.zoneH }} />
      ))}
    </div>
  )
}

function EditorNode({ data }: { data: ComponentData }) {
  const selected = useEditorStore((s) => s.selectedId === data.id)
  const label = useEditorStore((s) => s.config.components[data.type]?.label ?? data.type)
  const zoom = useEditorStore((s) => s.zoom)
  const api = useEditorStoreApi()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `node:${data.id}` })
  const [resizing, setResizing] = useState<null | 'width' | 'height'>(null)
  const [guide, setGuide] = useState<Guide | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hGuide, setHGuide] = useState<HeightGuide | null>(null)
  const [nodeEl, setNodeEl] = useState<HTMLDivElement | null>(null)
  const pageW = useEditorStore((st) => pageDimensions(st.template.page).width)
  const ref = (el: HTMLDivElement | null) => {
    setNodeRef(el)
    setNodeEl(el)
  }

  // measure the zone for the grid overlay after every width change while resizing
  useLayoutEffect(() => {
    if (resizing !== 'width' || !drag || !nodeEl?.parentElement) return setGuide(null)
    const z = nodeEl.parentElement.getBoundingClientRect()
    const n = nodeEl.getBoundingClientRect()
    const spans = SPANS.filter((sp) => sp <= drag.maxSpan)
    setGuide({
      zoneLeft: (z.left - n.left) / zoom,
      zoneTop: (z.top - n.top) / zoom,
      zoneW: z.width / zoom,
      zoneH: z.height / zoom,
      lines: spans.map((span) => ({ x: (drag.edgeX(span) - n.left) / zoom, span })),
    })

    // measurements are drawn on the top ruler instead of on the page
    const sheet = nodeEl.closest('.ptb-sheet')
    if (sheet) {
      const sr = sheet.getBoundingClientRect()
      const ppm = sr.width / pageW
      const current = data.span ?? 12
      // label the active width and the familiar fractions; the other twelfths are just ticks
      const known = (sp: number) => 12 / gcd(sp, 12) <= 4 // 1/4, 1/3, 1/2, 2/3, 3/4, full
      const h: RulerMark[] = spans.map((sp) => ({
        mm: (drag.edgeX(sp) - sr.left) / ppm,
        label: sp === current || sp === 12 || known(sp) ? spanLabel(sp) : '',
        tone: sp === current ? ('active' as const) : ('normal' as const),
      }))
      api.getState().setRulerMarks({ h, v: [] })
    }
  }, [resizing, drag, data.span, data.col, zoom, nodeEl, pageW, api])

  // quarter-line labels for height resizing go on the side ruler
  useLayoutEffect(() => {
    const sheet = nodeEl?.closest('.ptb-sheet')
    if (!hGuide || !sheet) return
    const sr = sheet.getBoundingClientRect()
    const ppm = sr.width / pageW
    api.getState().setRulerMarks({
      h: [],
      v: hGuide.quarters.map((y, i) => ({ mm: (y - sr.top) / ppm, label: QUARTER_LABELS[i], tone: hGuide.snapped === i ? 'active' : 'normal' })),
    })
  }, [hGuide, nodeEl, pageW, api])

  useLayoutEffect(() => {
    if (!resizing && api.getState().rulerMarks) api.getState().setRulerMarks(null)
  }, [resizing, api])

  /**
   * Drag a side handle. That edge moves and snaps to the zone's twelfth lines (1/12 … full, measured
   * from the page margins for top-level components, not from the component itself); the opposite edge
   * stays where it is, whatever the alignment. The result is stored as an explicit start column.
   */
  const startResize = (side: 'left' | 'right') => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const handle = e.currentTarget
    const node = handle.parentElement!
    const zone = node.parentElement!
    const zr = zone.getBoundingClientRect()
    const nr = node.getBoundingClientRect()
    // measure which of the zone's 24 columns the node occupies now
    const gap = (parseFloat(getComputedStyle(zone).columnGap) || 0) * (zr.width / zone.offsetWidth)
    const pitch = (zr.width + gap) / 24
    const startCol = Math.max(1, Math.min(24, Math.round((nr.left - zr.left) / pitch) + 1))
    const endCol = Math.min(24, startCol + (data.span ?? 12) * 2 - 1)
    // the fixed edge's column line; the moving edge lands on one of the lines (2 columns per twelfth)
    const fixed = side === 'right' ? startCol - 1 : endCol
    const maxSpan = Math.floor((side === 'right' ? 24 - fixed : fixed) / 2)
    const edgeX = (s: number) => (side === 'right' ? zr.left + (fixed + 2 * s) * pitch - gap : zr.left + (fixed - 2 * s) * pitch)
    const startX = e.clientX
    const startSpan = data.span ?? 12
    // a node that was aligned (not flowing from the left) keeps its place once you drag an edge
    const pinned = data.col !== undefined || (!!data.align && data.align !== 'left')
    try { handle.setPointerCapture(e.pointerId) } catch {}
    setDrag({ side, maxSpan, edgeX })
    setResizing('width')
    const move = (ev: PointerEvent) => {
      // where the dragged edge is now, as a column-line index on the zone's 24-column grid
      const x = (side === 'right' ? nr.right : nr.left) + (ev.clientX - startX)
      const boundary = side === 'right' ? (x - zr.left + gap) / pitch : (x - zr.left) / pitch
      const span = snapEdgeSpan(side, startCol, endCol, boundary) ?? startSpan
      const col = side === 'left' ? endCol - span * 2 + 1 : pinned ? startCol : undefined
      api.getState().setLayout(data.id, span, col)
    }
    attach(handle, move)
  }

  /**
   * Drag the bottom handle; sets a minimum height in mm (double-click the handle to reset).
   * The page body is divided into quarters; the bottom edge locks onto a quarter line when close
   * (shown in red), like smart guides in slide editors. Hold Alt to resize freely.
   */
  const startResizeHeight = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const handle = e.currentTarget
    const node = handle.parentElement!
    const startY = e.clientY
    const rect = node.getBoundingClientRect()
    const body = (node.closest('.ptb-sheet-body') ?? node.parentElement!).getBoundingClientRect()
    const quarters = [1, 2, 3].map((k) => body.top + (body.height * k) / 4) // screen px
    setHGuide({ left: (body.left - rect.left) / zoom, width: body.width / zoom, lines: quarters.map((y) => (y - rect.top) / zoom), quarters, snapped: null })
    try { handle.setPointerCapture(e.pointerId) } catch {}
    setResizing('height')
    const move = (ev: PointerEvent) => {
      let bottom = rect.bottom + (ev.clientY - startY)
      let snapped: number | null = null
      if (!ev.altKey) {
        quarters.forEach((y, i) => {
          if (Math.abs(y - bottom) <= SNAP_PX && (snapped === null || Math.abs(y - bottom) < Math.abs(quarters[snapped] - bottom))) snapped = i
        })
        if (snapped !== null) bottom = quarters[snapped]
      }
      setHGuide((g) => g && { ...g, snapped })
      api.getState().setHeight(data.id, Math.max(4, (bottom - rect.top) / zoom / MM_PX))
    }
    attach(handle, move)
  }

  const attach = (handle: HTMLElement, move: (e: PointerEvent) => void) => {
    const up = () => {
      setResizing(null)
      setDrag(null)
      setHGuide(null)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  }

  const partial = (data.span ?? 12) < 12
  const { style, ...cell } = cellProps(data)

  return (
    <div
      ref={ref}
      data-node-id={data.id}
      {...cell}
      style={style}
      className={`ed-node${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${resizing ? ' resizing' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        api.getState().select(data.id)
      }}
    >
      {selected && (
        <>
          <div className="ed-node-bar" onClick={(e) => e.stopPropagation()}>
            <span className="ed-node-handle" {...listeners} {...attributes} title="Drag to move">
              ⠿ {label}
            </span>
            <span className="ed-node-width">
              {spanLabel(data.span)}
              {data.height ? ` × ${data.height}mm` : ''}
            </span>
            {partial &&
              (['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className={!data.col && (data.align ?? 'left') === a ? 'on' : ''}
                  title={`Align ${a}`}
                  onClick={() => api.getState().setAlign(data.id, a)}
                >
                  {{ left: '⇤', center: '↔', right: '⇥' }[a]}
                </button>
              ))}
            <button title="Duplicate (⌘D)" onClick={() => api.getState().duplicateComponent(data.id)}>⧉</button>
            <button title="Delete" onClick={() => api.getState().removeComponent(data.id)}>✕</button>
          </div>
          <div className="ed-resize left" onPointerDown={startResize('left')} title="Drag to resize width" />
          <div className="ed-resize right" onPointerDown={startResize('right')} title="Drag to resize width" />
          <div
            className="ed-resize bottom"
            onPointerDown={startResizeHeight}
            onDoubleClick={() => api.getState().setHeight(data.id, undefined)}
            title="Drag to resize height (double-click to reset)"
          />
          {resizing === 'width' && guide && drag && <SnapGuide guide={guide} data={data} />}
          {resizing === 'height' && hGuide && <HeightLines guide={hGuide} />}
        </>
      )}
      {!selected && (
        <span className="ed-node-handle ed-node-handle-hover" {...listeners} {...attributes} title="Drag to move">
          ⠿
        </span>
      )}
      <RenderComponent data={data} />
    </div>
  )
}

function EditorZone({ zoneKey, items, kind }: ZoneProps) {
  const target = useEditorStore((s) => (s.dropTarget?.zone === zoneKey ? s.dropTarget : null))
  const nodes = items.map((item) => <EditorNode key={item.id} data={item} />)
  const indicator = <div key="__drop" className="ed-drop-indicator" />
  if (target) nodes.splice(Math.min(target.index, nodes.length), 0, indicator)
  return (
    <div
      data-zone={zoneKey}
      className={`${kind === 'page' ? 'ptb-page-flow' : 'ptb-slot'} ed-zone${items.length === 0 ? ' empty' : ''}${target ? ' over' : ''}`}
    >
      {nodes}
      {items.length === 0 && !target && <div className="ed-empty-hint">{kind === 'page' ? 'Drag components here' : 'Drop here'}</div>}
    </div>
  )
}

export function Canvas() {
  const template = useEditorStore((s) => s.template)
  const config = useEditorStore((s) => s.config)
  const activePageId = useEditorStore((s) => s.activePageId)
  const zoom = useEditorStore((s) => s.zoom)
  const demo = useEditorStore((s) => s.demo)
  const api = useEditorStoreApi()
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)

  const rich = useMemo<NonNullable<Runtime['rich']>>(
    () => ({
      setAt: (id, path, value) => api.getState().setPropAt(id, path, value),
      setActiveEditor: (editor) => api.getState().setActiveEditor(editor),
    }),
    [api],
  )
  const rt: Runtime = { config, mode: 'edit', demo, rich, Node: EditorNode, Zone: EditorZone }

  // Page overflow: a component that runs past the bottom margin moves to the top of the next page.
  // Paused while resizing or typing (so the block under your hands does not jump away), in demo mode
  // (sample content would leave moved blocks behind).
  const resizing = useEditorStore((s) => !!s.rulerMarks)
  const typing = useEditorStore((s) => !!s.activeEditor)
  useEffect(() => {
    if (demo || resizing || typing || !scroller) return
    const timer = setTimeout(() => {
      const hit = findOverflow(scroller, template.page)
      if (hit) api.getState().spillOver(hit.pageId, hit.nodeId)
    }, 30)
    return () => clearTimeout(timer)
  }, [template, demo, resizing, typing, scroller, api])
  return (
    <div className="ed-canvas-wrap">
      <Rulers scroller={scroller} />
      <FormatBar />
      <div className="ed-canvas" ref={setScroller} onClick={() => api.getState().select(null)}>
      <RuntimeProvider value={rt}>
        <div className="ed-pages" style={{ zoom, ['--ed-zoom' as any]: zoom }}>
          {template.pages.map((page, i) => (
            <div key={page.id} className="ed-page-wrap" onClick={() => api.getState().setActivePage(page.id)}>
              <div className="ed-page-label">
                {`Page ${i + 1}`}
                {page.id === activePageId && template.pages.length > 1 ? ' •' : ''}
              </div>
              <div className={page.id === activePageId ? 'ed-page active' : 'ed-page'}>
                <PageSheet template={template} page={page} />
              </div>
            </div>
          ))}
        </div>
      </RuntimeProvider>
      </div>
    </div>
  )
}
