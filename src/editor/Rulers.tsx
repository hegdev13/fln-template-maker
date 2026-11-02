import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { pageDimensions } from '../core/tree'
import { useEditorStore } from './context'

/** Ruler thickness in px. Keep in sync with --ed-ruler in editor.css. */
export const RULER = 24
/** Space between a ruler and the page, where snap labels are drawn. Keep in sync with .ed-canvas padding. */
const GAP = 48

interface Geometry {
  /** Ruler-local px of the active page's left / top edge. */
  left: number
  top: number
  pxPerMm: number
  width: number
  height: number
  /** Selected component's extent in mm from the page's left / top edge. */
  sel: { x0: number; x1: number; y0: number; y1: number } | null
}

/**
 * Top and side rulers (mm) aligned to the active page. Measurements are drawn here, from the ruler
 * toward the page: the selected component's extent, and snap labels while resizing.
 */
export function Rulers({ scroller }: { scroller: HTMLDivElement | null }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const template = useEditorStore((s) => s.template)
  const activePageId = useEditorStore((s) => s.activePageId)
  const selectedId = useEditorStore((s) => s.selectedId)
  const zoom = useEditorStore((s) => s.zoom)
  const marks = useEditorStore((s) => s.rulerMarks)
  const [geo, setGeo] = useState<Geometry | null>(null)
  const page = pageDimensions(template.page)

  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root || !scroller) return
    const wrap = root.getBoundingClientRect()
    const sheet = scroller.querySelector<HTMLElement>(`.ptb-sheet[data-page-id="${activePageId}"]`)
    if (!sheet) return setGeo(null)
    const sr = sheet.getBoundingClientRect()
    const pxPerMm = sr.width / page.width
    let sel: Geometry['sel'] = null
    if (selectedId) {
      const el = sheet.querySelector<HTMLElement>(`[data-node-id="${selectedId}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        sel = { x0: (r.left - sr.left) / pxPerMm, x1: (r.right - sr.left) / pxPerMm, y0: (r.top - sr.top) / pxPerMm, y1: (r.bottom - sr.top) / pxPerMm }
      }
    }
    setGeo({ left: sr.left - wrap.left - RULER, top: sr.top - wrap.top - RULER, pxPerMm, width: wrap.width - RULER, height: wrap.height - RULER, sel })
  }, [scroller, activePageId, selectedId, page.width])

  // re-measure after every render that can move things, and on scroll/resize
  useLayoutEffect(measure, [measure, template, zoom, marks])
  useEffect(() => {
    if (!scroller) return
    scroller.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(scroller)
    window.addEventListener('resize', measure)
    return () => {
      scroller.removeEventListener('scroll', measure)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [scroller, measure])

  return (
    <div ref={rootRef} className="ed-rulers">
      <div className="ed-ruler-corner">mm</div>
      {geo && (
        <>
          <svg className="ed-ruler ed-ruler-h" width={geo.width} height={RULER}>
            <Ticks axis="h" geo={geo} lengthMm={page.width} />
            {geo.sel && <Band axis="h" geo={geo} a={geo.sel.x0} b={geo.sel.x1} />}
            {marks?.h.map((m, i) => <Mark key={i} axis="h" geo={geo} mark={m} />)}
            {geo.sel && <SizeCapsule axis="h" geo={geo} a={geo.sel.x0} b={geo.sel.x1} />}
          </svg>
          {marks && (
            <svg className="ed-callouts ed-callouts-h" width={geo.width} height={GAP}>
              {marks.h.map((m, i) => <Callout key={i} axis="h" geo={geo} mark={m} />)}
            </svg>
          )}
          <svg className="ed-ruler ed-ruler-v" width={RULER} height={geo.height}>
            <Ticks axis="v" geo={geo} lengthMm={page.height} />
            {geo.sel && <Band axis="v" geo={geo} a={geo.sel.y0} b={geo.sel.y1} />}
            {marks?.v.map((m, i) => <Mark key={i} axis="v" geo={geo} mark={m} />)}
            {geo.sel && <SizeCapsule axis="v" geo={geo} a={geo.sel.y0} b={geo.sel.y1} />}
          </svg>
          {marks && (
            <svg className="ed-callouts ed-callouts-v" width={GAP} height={geo.height}>
              {marks.v.map((m, i) => <Callout key={i} axis="v" geo={geo} mark={m} />)}
            </svg>
          )}
        </>
      )}
    </div>
  )
}

/** Position along the ruler (ruler-local px) for a mm value. */
const at = (axis: 'h' | 'v', geo: Geometry, mm: number) => (axis === 'h' ? geo.left : geo.top) + mm * geo.pxPerMm

function Ticks({ axis, geo, lengthMm }: { axis: 'h' | 'v'; geo: Geometry; lengthMm: number }) {
  const span = axis === 'h' ? geo.width : geo.height
  const start = Math.max(0, Math.floor(-(axis === 'h' ? geo.left : geo.top) / geo.pxPerMm))
  const end = Math.min(lengthMm, Math.ceil((span - (axis === 'h' ? geo.left : geo.top)) / geo.pxPerMm))
  const minor = geo.pxPerMm >= 2.2 // draw 1mm ticks only when there's room
  const labelEvery = geo.pxPerMm * 10 >= 26 ? 10 : 50
  const out = []
  for (let mm = start; mm <= end; mm++) {
    const major = mm % 10 === 0
    if (!major && !minor && mm % 5 !== 0) continue
    const p = at(axis, geo, mm)
    const len = major ? 12 : mm % 5 === 0 ? 8 : 4
    out.push(
      axis === 'h' ? (
        <line key={mm} x1={p} x2={p} y1={RULER} y2={RULER - len} className="ed-tick" />
      ) : (
        <line key={mm} y1={p} y2={p} x1={RULER} x2={RULER - len} className="ed-tick" />
      ),
    )
    if (major && mm % labelEvery === 0) {
      out.push(
        axis === 'h' ? (
          <text key={`t${mm}`} x={p + 2} y={9} className="ed-ticklabel">{mm}</text>
        ) : (
          <text key={`t${mm}`} x={9} y={p + 3} className="ed-ticklabel" transform={`rotate(-90 9 ${p + 3})`}>{mm}</text>
        ),
      )
    }
  }
  return <>{out}</>
}

/** Highlights the selected component's extent on the ruler. */
function Band({ axis, geo, a, b }: { axis: 'h' | 'v'; geo: Geometry; a: number; b: number }) {
  const p0 = at(axis, geo, a)
  const p1 = at(axis, geo, b)
  return axis === 'h' ? (
    <g>
      <rect x={p0} y={0} width={Math.max(1, p1 - p0)} height={RULER} className="ed-band" />
      <line x1={p0} x2={p0} y1={0} y2={RULER} className="ed-band-edge" />
      <line x1={p1} x2={p1} y1={0} y2={RULER} className="ed-band-edge" />
    </g>
  ) : (
    <g>
      <rect x={0} y={p0} width={RULER} height={Math.max(1, p1 - p0)} className="ed-band" />
      <line y1={p0} y2={p0} x1={0} x2={RULER} className="ed-band-edge" />
      <line y1={p1} y2={p1} x1={0} x2={RULER} className="ed-band-edge" />
    </g>
  )
}

/** The selected component's size (mm) in a white capsule drawn above the ruler's ticks and band. */
function SizeCapsule({ axis, geo, a, b }: { axis: 'h' | 'v'; geo: Geometry; a: number; b: number }) {
  const label = String(Math.round((b - a) * 10) / 10)
  const mid = (at(axis, geo, a) + at(axis, geo, b)) / 2
  const w = label.length * 6.5 + 14
  const h = 16
  const o = (RULER - h) / 2
  return axis === 'h' ? (
    <g className="ed-capsule">
      <rect x={mid - w / 2} y={o} width={w} height={h} rx={h / 2} />
      <text x={mid} y={o + 11.5} textAnchor="middle">{label}</text>
    </g>
  ) : (
    <g className="ed-capsule">
      <rect x={o} y={mid - w / 2} width={h} height={w} rx={h / 2} />
      <text x={RULER / 2 + 3.5} y={mid} textAnchor="middle" transform={`rotate(-90 ${RULER / 2 + 3.5} ${mid})`}>{label}</text>
    </g>
  )
}

/** The snap line itself, drawn across the ruler. */
function Mark({ axis, geo, mark }: { axis: 'h' | 'v'; geo: Geometry; mark: { mm: number; label: string; tone: 'normal' | 'active' } }) {
  const p = at(axis, geo, mark.mm)
  const cls = mark.tone === 'active' ? 'ed-mark on' : 'ed-mark'
  return (
    <g className={cls}>
      {axis === 'h' ? <line x1={p} x2={p} y1={0} y2={RULER} /> : <line y1={p} y2={p} x1={0} x2={RULER} />}
    </g>
  )
}

/** Label box in the gap between the ruler and the page, with a pointer to the exact spot on the ruler. */
function Callout({ axis, geo, mark }: { axis: 'h' | 'v'; geo: Geometry; mark: { mm: number; label: string; tone: 'normal' | 'active' } }) {
  if (!mark.label) return null
  const p = at(axis, geo, mark.mm)
  const cls = mark.tone === 'active' ? 'ed-callout on' : 'ed-callout'
  const w = mark.label.length * 6.5 + 10
  const h = 16
  return axis === 'h' ? (
    <g className={cls}>
      <polygon points={`${p - 4},7 ${p + 4},7 ${p},0`} />
      <rect x={p - w / 2} y={7} width={w} height={h} rx={3} />
      <text x={p} y={18.5} textAnchor="middle">{mark.label}</text>
    </g>
  ) : (
    <g className={cls}>
      <polygon points={`7,${p - 4} 7,${p + 4} 0,${p}`} />
      <rect x={7} y={p - h / 2} width={w} height={h} rx={3} />
      <text x={7 + w / 2} y={p + 3.5} textAnchor="middle">{mark.label}</text>
    </g>
  )
}
