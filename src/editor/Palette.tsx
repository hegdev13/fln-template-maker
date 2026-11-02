import { useDraggable } from '@dnd-kit/core'
import { useContext } from 'react'
import { customType, isCustomType } from '../core/custom'
import { CustomContext, useEditorStore, useEditorStoreApi } from './context'

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function PaletteItem({ type, label, onEdit }: { type: string; label: string; onEdit?: () => void }) {
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
      {onEdit && (
        <button
          type="button"
          className="ed-pencil"
          title="Edit this custom component"
          aria-label={`Edit ${label}`}
          onPointerDown={(e) => e.stopPropagation()} // don't start a drag
          onDoubleClick={(e) => e.stopPropagation()} // don't add the component
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <PencilIcon />
        </button>
      )}
    </div>
  )
}

export function Palette() {
  const config = useEditorStore((s) => s.config)
  const custom = useContext(CustomContext)
  const groups = config.categories
    ? Object.values(config.categories).map((c) => ({ title: c.title ?? '', types: c.components }))
    : [{ title: 'Components', types: Object.keys(config.components) }]
  const listed = new Set(groups.flatMap((g) => g.types))
  const rest = Object.keys(config.components).filter((t) => !listed.has(t))
  if (rest.length) groups.push({ title: 'Other', types: rest })

  const editFor = (type: string) => {
    if (!custom || !isCustomType(type)) return undefined
    const def = custom.items.find((d) => customType(d.id) === type)
    return def ? () => custom.requestEdit(def) : undefined
  }

  return (
    <aside className="ed-palette">
      <div className="ed-panel-title">Components</div>
      {groups.map((g) => (
        <div key={g.title} className="ed-palette-group">
          <div className="ed-palette-group-title">{g.title}</div>
          {g.types
            .filter((t) => config.components[t])
            .map((t) => (
              <PaletteItem key={t} type={t} label={config.components[t].label} onEdit={editFor(t)} />
            ))}
          {/* make a new component from existing blocks (only when the host enabled custom components) */}
          {custom && g.title === 'Questions' && (
            <button type="button" className="ed-palette-custom" onClick={custom.openNew}>
              + Custom
            </button>
          )}
        </div>
      ))}
    </aside>
  )
}
