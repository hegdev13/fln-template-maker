import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import { useEditorStore, useEditorStoreApi } from './context'

function PaletteItem({ type, label }: { type: string; label: string }) {
  const api = useEditorStoreApi()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `new:${type}` })
  return (
    <div
      ref={setNodeRef}
      className={`ed-palette-item${isDragging ? ' dragging' : ''}`}
      {...listeners}
      {...attributes}
      onDoubleClick={() => api.getState().addComponent(type)}
      title="Drag onto the page, or double-click to append"
    >
      <span className="grip">⠿</span> {label}
    </div>
  )
}

export function Palette() {
  const config = useEditorStore((s) => s.config)
  const [wip, setWip] = useState(false)
  const groups = config.categories
    ? Object.values(config.categories).map((c) => ({ title: c.title ?? '', types: c.components }))
    : [{ title: 'Components', types: Object.keys(config.components) }]
  const listed = new Set(groups.flatMap((g) => g.types))
  const rest = Object.keys(config.components).filter((t) => !listed.has(t))
  if (rest.length) groups.push({ title: 'Other', types: rest })

  return (
    <aside className="ed-palette">
      <div className="ed-panel-title">Components</div>
      {groups.map((g) => (
        <div key={g.title} className="ed-palette-group">
          <div className="ed-palette-group-title">{g.title}</div>
          {g.types
            .filter((t) => config.components[t])
            .map((t) => (
              <PaletteItem key={t} type={t} label={config.components[t].label} />
            ))}
          {/* placeholder for host-defined custom question types; not wired up yet */}
          {g.title === 'Questions' && (
            <button type="button" className="ed-palette-custom" onClick={() => setWip(true)}>
              + Custom
            </button>
          )}
        </div>
      ))}
      {wip && (
        <div className="ed-modal-backdrop" onClick={() => setWip(false)}>
          <div className="ed-modal" role="dialog" aria-label="Custom question" onClick={(e) => e.stopPropagation()}>
            <div className="ed-modal-title">Custom question</div>
            <p>Work in progress.</p>
            <button type="button" className="ed-btn" autoFocus onClick={() => setWip(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
