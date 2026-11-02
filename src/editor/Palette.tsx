import { useDraggable } from '@dnd-kit/core'
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
        </div>
      ))}
    </aside>
  )
}
