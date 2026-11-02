import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragMoveEvent } from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createEditorStore } from '../core/store'
import { createEmptyTemplate, isZoneInsideNode, parseZoneKey } from '../core/tree'
import type { Config, Template } from '../core/types'
import { Canvas } from './Canvas'
import { StoreContext, useEditorStore, useEditorStoreApi } from './context'
import { Inspector } from './Inspector'
import { Palette } from './Palette'

export interface EditorProps {
  config: Config
  /** Initial template (uncontrolled after mount; use the `key` prop to reset). */
  data?: Template
  /** Fires on every committed change. */
  onChange?: (template: Template) => void
  /** Extra buttons rendered in the toolbar (e.g. Save, Export PDF). Receives the live template getter. */
  actions?: (ctx: { getTemplate: () => Template }) => ReactNode
}

export function Editor({ config, data, onChange, actions }: EditorProps) {
  const store = useMemo(() => createEditorStore(config, data ?? createEmptyTemplate()), []) // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    let prev = store.getState().template
    return store.subscribe((s) => {
      if (s.template !== prev) {
        prev = s.template
        onChangeRef.current?.(s.template)
      }
    })
  }, [store])

  return (
    <StoreContext.Provider value={store}>
      <Shell actions={actions} />
    </StoreContext.Provider>
  )
}

function Shell({ actions }: { actions: EditorProps['actions'] }) {
  const api = useEditorStoreApi()
  const config = useEditorStore((s) => s.config)
  const [dragLabel, setDragLabel] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      const st = api.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? st.redo() : st.undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        st.redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) {
        e.preventDefault()
        st.removeComponent(st.selectedId)
      } else if (mod && e.key.toLowerCase() === 'd' && st.selectedId) {
        e.preventDefault()
        st.duplicateComponent(st.selectedId)
      } else if (e.key === 'Escape') st.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api])

  const locate = (x: number, y: number) => {
    const els = document.elementsFromPoint(x, y)
    let zoneEl: Element | null = null
    for (const el of els) {
      const z = el.closest('[data-zone]')
      if (z) {
        zoneEl = z
        break
      }
    }
    if (!zoneEl) {
      for (const el of els) {
        const sheet = el.closest('[data-page-id]')
        if (sheet) {
          zoneEl = sheet.querySelector('[data-zone^="p:"]')
          break
        }
      }
    }
    if (!zoneEl) return null
    const kids = Array.from(zoneEl.children).filter((c) => (c as HTMLElement).dataset.nodeId)
    const zoneW = zoneEl.getBoundingClientRect().width
    let index = kids.length
    for (let i = 0; i < kids.length; i++) {
      const r = kids[i].getBoundingClientRect()
      // partial-width items share a row with siblings, so compare horizontally within the row
      const before =
        r.width < zoneW * 0.9 ? y < r.top || (y <= r.bottom && x < r.left + r.width / 2) : y < r.top + r.height / 2
      if (before) {
        index = i
        break
      }
    }
    return { zone: (zoneEl as HTMLElement).dataset.zone!, index }
  }

  const pointer = (e: { activatorEvent: Event; delta: { x: number; y: number } }) => {
    const ev = e.activatorEvent as PointerEvent
    return { x: ev.clientX + e.delta.x, y: ev.clientY + e.delta.y }
  }

  const onDragStart = (e: { active: { id: string | number } }) => {
    const id = String(e.active.id)
    const st = api.getState()
    // stop the browser's text selection (the lingering blue haze) while dragging
    document.body.classList.add('ed-dragging')
    window.getSelection()?.removeAllRanges()
    if (id.startsWith('new:')) setDragLabel(config.components[id.slice(4)]?.label ?? id)
    else {
      const t = st.template
      void t
      setDragLabel('Move')
      st.select(id.slice(5))
    }
  }

  const onDragMove = (e: DragMoveEvent) => {
    const { x, y } = pointer(e)
    const hit = locate(x, y)
    const st = api.getState()
    const id = String(e.active.id)
    if (hit && id.startsWith('node:') && isZoneInsideNode(st.template, config, id.slice(5), parseZoneKey(hit.zone))) {
      st.setDropTarget(null)
      return
    }
    st.setDropTarget(hit)
  }

  const finish = (apply: boolean, id: string) => {
    const st = api.getState()
    const target = st.dropTarget
    st.setDropTarget(null)
    setDragLabel(null)
    document.body.classList.remove('ed-dragging')
    window.getSelection()?.removeAllRanges()
    if (!apply || !target) return
    const ref = parseZoneKey(target.zone)
    if (id.startsWith('new:')) st.addComponent(id.slice(4), ref, target.index)
    else st.moveComponent(id.slice(5), ref, target.index)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => finish(true, String(e.active.id))}
      onDragCancel={(e) => finish(false, String(e.active.id))}
    >
      <div className="ed-root">
        <Toolbar actions={actions} />
        <div className="ed-body">
          <Palette />
          <Canvas />
          <Inspector />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{dragLabel ? <div className="ed-drag-chip">{dragLabel}</div> : null}</DragOverlay>
    </DndContext>
  )
}

function Toolbar({ actions }: { actions: EditorProps['actions'] }) {
  const api = useEditorStoreApi()
  const name = useEditorStore((s) => s.template.name)
  const pages = useEditorStore((s) => s.template.pages)
  const activePageId = useEditorStore((s) => s.activePageId)
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const zoom = useEditorStore((s) => s.zoom)
  const demo = useEditorStore((s) => s.demo)
  const st = api.getState()

  return (
    <header className="ed-toolbar">
      <input
        className="ed-name"
        value={name}
        onChange={(e) => st.setName(e.target.value)}
        aria-label="Template name"
      />
      <div className="ed-group">
        <button disabled={!canUndo} onClick={() => st.undo()} title="Undo (⌘Z)">↶</button>
        <button disabled={!canRedo} onClick={() => st.redo()} title="Redo (⇧⌘Z)">↷</button>
      </div>
      <div className="ed-group">
        <button onClick={() => st.setZoom(zoom - 0.1)}>−</button>
        <span className="ed-zoom">{Math.round(zoom * 100)}%</span>
        <button onClick={() => st.setZoom(zoom + 0.1)}>+</button>
      </div>
      <div className="ed-group">
        <button
          className={demo ? 'ed-demo-on' : ''}
          title="Show sample content in place of the builder placeholders (not saved, not exported)"
          onClick={() => st.setDemo(!demo)}
        >
          Demo content: {demo ? 'on' : 'off'}
        </button>
      </div>
      <div className="ed-group">
          <button onClick={() => st.addPage(activePageId)}>+ Page</button>
          <button onClick={() => st.duplicatePage(activePageId)}>Duplicate</button>
          <button onClick={() => st.movePage(activePageId, -1)} title="Move page up">↑</button>
          <button onClick={() => st.movePage(activePageId, 1)} title="Move page down">↓</button>
          <button disabled={pages.length < 2} onClick={() => st.removePage(activePageId)}>Delete page</button>
      </div>
      <div className="ed-spacer" />
      {actions?.({ getTemplate: () => api.getState().template })}
    </header>
  )
}
