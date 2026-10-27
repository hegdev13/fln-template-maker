import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useRuntime } from '../core/runtime'
import type { ComponentConfig } from '../core/types'
import { RichText } from './RichText'
import { textStyle, typographyDefaults, typographyFields, type TypographyProps } from './typography'

const MM_PX = 96 / 25.4
const MIN_COL_PCT = 5
const MIN_ROW_MM = 4

export interface TableProps extends TypographyProps {
  rows: number
  cols: number
  /** cells[row][col] — rich text (inline HTML) or plain text. Missing = empty. */
  cells: (string | null)[][]
  /** Column widths in % (sum 100). Empty or wrong length = equal columns. */
  colWidths: number[]
  /** Per-row minimum heights in mm. Missing entries use `rowHeight`. */
  rowHeights: number[]
  /** Default minimum row height in mm. */
  rowHeight: number
  headerRow: boolean
  borders: 'all' | 'outer' | 'none'
  align: 'left' | 'center' | 'right'
  /** Cell padding in mm. */
  padding: number
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n) || lo))

export const Table: ComponentConfig<TableProps> = {
  label: 'Table',
  category: 'Layout',
  hasRichText: true, // cells are rich text but aren't listed in `fields`
  fields: {
    rows: { type: 'number', label: 'Rows', min: 1, max: 30 },
    cols: { type: 'number', label: 'Columns', min: 1, max: 12 },
    headerRow: { type: 'boolean', label: 'Header row (first row shaded and bold)' },
    borders: {
      type: 'select',
      label: 'Borders',
      options: [
        { label: 'All cells', value: 'all' },
        { label: 'Outside only', value: 'outer' },
        { label: 'None', value: 'none' },
      ],
    },
    align: {
      type: 'radio',
      label: 'Text align',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    rowHeight: { type: 'number', label: 'Row height (mm, minimum)', min: MIN_ROW_MM, max: 100 },
    padding: { type: 'number', label: 'Cell padding (mm)', min: 0, max: 15 },
    ...typographyFields,
  },
  defaultProps: {
    rows: 3,
    cols: 3,
    cells: [],
    colWidths: [],
    rowHeights: [],
    rowHeight: 10,
    headerRow: false,
    borders: 'all',
    align: 'left',
    padding: 2,
    ...typographyDefaults(),
  },
  demoProps: {
    headerRow: true,
    cells: [
      ['Number', 'Double', 'Triple'],
      ['1', '2', '3'],
      ['2', '4', '6'],
    ],
  },
  render: function TableRender(props) {
    const rt = useRuntime()
    const editable = rt.mode === 'edit' && !!rt.rich && !rt.demo
    const wrapRef = useRef<HTMLDivElement>(null)
    const rows = clamp(props.rows, 1, 30)
    const cols = clamp(props.cols, 1, 12)
    const widths = props.colWidths?.length === cols ? props.colWidths : Array<number>(cols).fill(100 / cols)
    const heights = Array.from({ length: rows }, (_, r) => props.rowHeights?.[r] ?? props.rowHeight)

    /** Drag the right edge of column `i`: it and its neighbour trade width. */
    const dragColumn = (i: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.preventDefault()
      const handle = e.currentTarget
      const tableW = wrapRef.current!.getBoundingClientRect().width
      const startX = e.clientX
      const start = [...widths]
      try { handle.setPointerCapture(e.pointerId) } catch {}
      const move = (ev: PointerEvent) => {
        const d = Math.max(-(start[i] - MIN_COL_PCT), Math.min(start[i + 1] - MIN_COL_PCT, ((ev.clientX - startX) / tableW) * 100))
        const next = [...start]
        next[i] = Math.round((start[i] + d) * 2) / 2
        next[i + 1] = Math.round((start[i + 1] - d) * 2) / 2
        rt.rich!.setAt(props.id, ['colWidths'], next)
      }
      track(handle, move)
    }

    /** Drag the bottom edge of row `r` to set its minimum height. */
    const dragRow = (r: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.preventDefault()
      const handle = e.currentTarget
      const tr = handle.closest('tr')!
      const scale = tr.getBoundingClientRect().height / tr.offsetHeight || 1 // editor zoom
      const startY = e.clientY
      const startMm = tr.offsetHeight / MM_PX
      try { handle.setPointerCapture(e.pointerId) } catch {}
      const move = (ev: PointerEvent) => {
        const mm = Math.max(MIN_ROW_MM, startMm + (ev.clientY - startY) / scale / MM_PX)
        const next = [...heights]
        next[r] = Math.round(mm * 2) / 2
        rt.rich!.setAt(props.id, ['rowHeights'], next)
      }
      track(handle, move)
    }

    return (
      <div ref={wrapRef} className={`ptb-table-wrap borders-${props.borders}`} style={textStyle(props)}>
        <table className="ptb-table">
          <colgroup>
            {widths.map((w, i) => (
              <col key={i} style={{ width: `${w}%` }} />
            ))}
          </colgroup>
          <tbody>
            {heights.map((h, r) => (
              <tr key={r} style={{ height: `${h}mm` }}>
                {widths.map((_, c) => (
                  <td
                    key={c}
                    className={props.headerRow && r === 0 ? 'ptb-th' : undefined}
                    style={{ padding: `${props.padding}mm`, textAlign: props.align }}
                  >
                    <RichText id={props.id} path={['cells', r, c]} value={props.cells?.[r]?.[c] ?? ''} />
                    {editable && c < cols - 1 && (
                      <div className="ptb-colh" onPointerDown={dragColumn(c)} onDoubleClick={() => rt.rich!.setAt(props.id, ['colWidths'], [])} title="Drag to resize columns (double-click to equalise)" />
                    )}
                    {editable && (
                      <div className="ptb-rowh" onPointerDown={dragRow(r)} onDoubleClick={() => rt.rich!.setAt(props.id, ['rowHeights'], [])} title="Drag to resize this row (double-click to reset rows)" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
}

/** Calls `move` on pointer moves until the pointer is released. */
function track(handle: HTMLElement, move: (e: PointerEvent) => void) {
  const up = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', up)
    handle.removeEventListener('pointercancel', up)
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
  handle.addEventListener('pointercancel', up)
}
