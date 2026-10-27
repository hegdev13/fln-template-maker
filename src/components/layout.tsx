import type { ReactNode } from 'react'
import type { ComponentConfig } from '../core/types'

export interface ColumnsProps {
  count: 2 | 3 | 4
  gap: number
  col1: ReactNode
  col2: ReactNode
  col3: ReactNode
  col4: ReactNode
}
export const Columns: ComponentConfig<ColumnsProps> = {
  label: 'Columns',
  category: 'Layout',
  fields: {
    count: {
      type: 'select',
      label: 'Columns',
      options: [
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    gap: { type: 'number', label: 'Gap (mm)', min: 0, max: 40 },
    col1: { type: 'slot' },
    col2: { type: 'slot' },
    col3: { type: 'slot' },
    col4: { type: 'slot' },
  },
  defaultProps: { count: 2, gap: 6, col1: null, col2: null, col3: null, col4: null },
  render: ({ count, gap, col1, col2, col3, col4 }) => {
    const cols = [col1, col2, col3, col4].slice(0, count)
    return (
      <div className="ptb-columns" style={{ gridTemplateColumns: `repeat(${count}, 1fr)`, gap: `${gap}mm` }}>
        {cols.map((c, i) => (
          <div key={i}>{c}</div>
        ))}
      </div>
    )
  },
}

export interface BoxProps {
  title: string
  border: 'solid' | 'dashed' | 'none'
  radius: number
  padding: number
  content: ReactNode
}
export const Box: ComponentConfig<BoxProps> = {
  label: 'Box',
  category: 'Layout',
  fields: {
    title: { type: 'text', label: 'Title (optional)' },
    border: {
      type: 'select',
      label: 'Border',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'None', value: 'none' },
      ],
    },
    radius: { type: 'number', label: 'Corner radius (mm)', min: 0, max: 20 },
    padding: { type: 'number', label: 'Padding (mm)', min: 0, max: 30 },
    content: { type: 'slot' },
  },
  defaultProps: { title: '', border: 'solid', radius: 3, padding: 4, content: null },
  render: ({ title, border, radius, padding, content }) => (
    <div
      className="ptb-box"
      style={{
        border: border === 'none' ? 'none' : `1.5px ${border} #222`,
        borderRadius: `${radius}mm`,
        padding: `${padding}mm`,
      }}
    >
      {title && <div className="ptb-box-title">{title}</div>}
      {content}
    </div>
  ),
}
