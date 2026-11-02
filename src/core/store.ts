import { produce } from 'immer'
import { createStore } from 'zustand/vanilla'
import {
  createNode,
  duplicateNodeMut,
  findNode,
  findPageOf,
  insertNodeMut,
  moveNodeMut,
  newId,
  removeNodeMut,
  spillToNextPage,
} from './tree'
import type { ComponentData, Config, PageSettings, Template, ZoneRef } from './types'

const HISTORY_LIMIT = 100
const COALESCE_MS = 800

/** A labelled measurement drawn on a ruler (position in mm from the page's left / top edge). */
export interface RulerMark {
  mm: number
  label: string
  /** 'active' = the value currently snapped to (drawn red for height guides). */
  tone: 'normal' | 'active'
}
export interface RulerMarks {
  h: RulerMark[]
  v: RulerMark[]
}

export interface DropTarget {
  zone: string
  index: number
}

export interface EditorState {
  config: Config
  template: Template
  past: Template[]
  future: Template[]
  selectedId: string | null
  activePageId: string
  dropTarget: DropTarget | null
  lastKey: string | null
  lastAt: number

  setTemplate(t: Template): void
  /** Swaps the component config (e.g. after a custom component is saved). */
  setConfig(c: Config): void
  select(id: string | null): void
  setActivePage(id: string): void
  zoom: number
  setZoom(z: number): void
  /** Demo mode shows each component's `demoProps` sample content instead of the builder placeholders. */
  demo: boolean
  setDemo(on: boolean): void
  /** Snap/measure labels shown on the rulers while resizing. */
  rulerMarks: RulerMarks | null
  setRulerMarks(m: RulerMarks | null): void
  setDropTarget(t: DropTarget | null): void

  addComponent(type: string, zone?: ZoneRef, index?: number): string | null
  moveComponent(id: string, zone: ZoneRef, index: number): void
  removeComponent(id: string): void
  duplicateComponent(id: string): void
  updateProps(id: string, patch: Record<string, any>, coalesceKey?: string): void
  /** Writes a nested prop (used by in-place text editing); consecutive edits of one path merge into one undo step. */
  setPropAt(id: string, path: (string | number)[], value: any): void
  /** The Tiptap editor currently focused for in-place text editing (drives the format bar). */
  activeEditor: any | null
  setActiveEditor(editor: any | null): void
  /** Sets a component's width in 12ths of its zone (12 = full). */
  setSpan(id: string, span: number): void
  /**
   * Sets width (12ths) and start column in one undo step. `col` undefined clears the explicit start
   * (back to flow / align); a column also clears `align`.
   */
  setLayout(id: string, span: number, col?: number): void
  setAlign(id: string, align: 'left' | 'center' | 'right'): void
  /** Minimum height in mm; undefined clears it (natural height). */
  setHeight(id: string, mm: number | undefined): void

  /**
   * Page overflow: moves a top-level component (and those after it) to the top of the next page. Not an
   * undo step: undoing the edit that caused it brings the old layout back.
   */
  spillOver(pageId: string, nodeId: string): void
  addPage(afterPageId?: string): void
  duplicatePage(id: string): void
  removePage(id: string): void
  movePage(id: string, dir: -1 | 1): void

  setName(name: string): void
  setPage(patch: Partial<PageSettings>): void
  setMetadata(meta: Record<string, any>): void

  undo(): void
  redo(): void
}

export type EditorStore = ReturnType<typeof createEditorStore>

export function createEditorStore(config: Config, initial: Template) {
  return createStore<EditorState>((set, get) => {
    /** Applies a mutation to the template as one undoable step. */
    const commit = (mutator: (draft: Template) => void, coalesceKey?: string) => {
      const { template, past, lastKey, lastAt } = get()
      const next = produce(template, mutator)
      if (next === template) return
      const now = Date.now()
      const coalesce = !!coalesceKey && coalesceKey === lastKey && now - lastAt < COALESCE_MS
      set({
        template: next,
        past: coalesce ? past : [...past, template].slice(-HISTORY_LIMIT),
        future: [],
        lastKey: coalesceKey ?? null,
        lastAt: now,
      })
    }

    return {
      config,
      template: initial,
      past: [],
      future: [],
      selectedId: null,
      activePageId: initial.pages[0].id,
      dropTarget: null,
      lastKey: null,
      lastAt: 0,

      setConfig: (c) => {
        config = c
        set({ config: c })
      },
      setTemplate: (t) =>
        set({ template: t, past: [], future: [], selectedId: null, activePageId: t.pages[0].id, lastKey: null }),
      select: (id) => {
        const pageId = id ? findPageOf(get().template, config, id) : null
        set({ selectedId: id, activeEditor: null, ...(pageId ? { activePageId: pageId } : {}) })
      },
      setActivePage: (id) => set({ activePageId: id }),
      demo: false,
      setDemo: (on) => set({ demo: on }),
      rulerMarks: null,
      setRulerMarks: (m) => set({ rulerMarks: m }),
      zoom: 0.8,
      setZoom: (z) => set({ zoom: Math.max(0.3, Math.min(2, Math.round(z * 10) / 10)) }),
      setDropTarget: (t) => {
        const cur = get().dropTarget
        if (cur?.zone === t?.zone && cur?.index === t?.index) return
        set({ dropTarget: t })
      },

      addComponent: (type, zone, index) => {
        if (!config.components[type]) return null
        const node = createNode(config, type)
        const ref = zone ?? { pageId: get().activePageId }
        let ok = false
        commit((d) => {
          const target = 'pageId' in ref ? d.pages.find((p) => p.id === ref.pageId)?.content : undefined
          const len = target?.length ?? Infinity
          ok = insertNodeMut(d, config, ref, index ?? len, node)
        })
        if (ok) set({ selectedId: node.id })
        return ok ? node.id : null
      },
      moveComponent: (id, zone, index) => commit((d) => void moveNodeMut(d, config, id, zone, index)),
      removeComponent: (id) => {
        commit((d) => void removeNodeMut(d, config, id))
        if (!findNode(get().template, config, get().selectedId ?? '')) set({ selectedId: null })
      },
      duplicateComponent: (id) => {
        let copy: ComponentData | null = null
        commit((d) => {
          copy = duplicateNodeMut(d, config, id)
        })
        if (copy) set({ selectedId: (copy as ComponentData).id })
      },
      updateProps: (id, patch, coalesceKey) =>
        commit((d) => {
          const found = findNode(d, config, id)
          if (found) Object.assign(found.node.props, patch)
        }, coalesceKey),

      activeEditor: null,
      setActiveEditor: (editor) => set({ activeEditor: editor }),
      setPropAt: (id, path, value) =>
        commit((d) => {
          const found = findNode(d, config, id)
          if (!found || !path.length) return
          let obj: any = found.node.props
          for (let i = 0; i < path.length - 1; i++) {
            // create missing containers (e.g. a table cell in a row that doesn't exist yet)
            obj[path[i]] ??= typeof path[i + 1] === 'number' ? [] : {}
            obj = obj[path[i]]
          }
          obj[path[path.length - 1]] = value
        }, `rich:${id}:${path.join('.')}`),
      setSpan: (id, span) =>
        commit((d) => {
          const found = findNode(d, config, id)
          if (!found) return
          if (span >= 12) {
            delete found.node.span
            delete found.node.col
          } else {
            found.node.span = span
            // keep an explicit start inside the grid for the new width
            if (found.node.col) found.node.col = Math.min(found.node.col, 25 - span * 2)
          }
        }, `layout:${id}`),
      setLayout: (id, span, col) =>
        commit((d) => {
          const found = findNode(d, config, id)
          if (!found) return
          const n = found.node
          if (span >= 12) {
            delete n.span
            delete n.col
            return
          }
          n.span = span
          if (col === undefined) delete n.col
          else {
            delete n.align
            if (col <= 1) delete n.col
            else n.col = Math.min(col, 25 - span * 2)
          }
        }, `layout:${id}`),

      setAlign: (id, align) =>
        commit((d) => {
          const found = findNode(d, config, id)
          if (!found) return
          delete found.node.col // choosing an alignment replaces any dragged position
          if (align === 'left') delete found.node.align
          else found.node.align = align
        }),
      setHeight: (id, mm) =>
        commit((d) => {
          const found = findNode(d, config, id)
          if (!found) return
          if (!mm || mm <= 0) delete found.node.height
          else found.node.height = Math.round(mm * 2) / 2
        }, `height:${id}`),

      spillOver: (pageId, nodeId) => {
        const { template, selectedId } = get()
        const next = spillToNextPage(template, pageId, nodeId)
        if (next === template) return
        const pageOfSelection = selectedId ? findPageOf(next, config, selectedId) : null
        set({ template: next, ...(pageOfSelection ? { activePageId: pageOfSelection } : {}) })
      },
      addPage: (afterPageId) => {
        const page = { id: newId(), content: [] }
        commit((d) => {
          const i = afterPageId ? d.pages.findIndex((p) => p.id === afterPageId) : d.pages.length - 1
          d.pages.splice(i + 1, 0, page)
        })
        set({ activePageId: page.id })
      },
      duplicatePage: (id) => {
        const copyId = newId()
        commit((d) => {
          const i = d.pages.findIndex((p) => p.id === id)
          if (i < 0) return
          const clone = JSON.parse(JSON.stringify(d.pages[i]))
          // re-id every node in the copied page
          const reId = (nodes: ComponentData[]) =>
            nodes.forEach((n) => {
              n.id = newId()
              for (const v of Object.values(n.props)) {
                if (Array.isArray(v) && v.every((c) => c && typeof c === 'object' && 'type' in c && 'id' in c)) reId(v)
              }
            })
          reId(clone.content)
          clone.id = copyId
          d.pages.splice(i + 1, 0, clone)
        })
        set({ activePageId: copyId })
      },
      removePage: (id) => {
        commit((d) => {
          if (d.pages.length > 1) d.pages = d.pages.filter((p) => p.id !== id)
        })
        const { template, activePageId } = get()
        if (!template.pages.some((p) => p.id === activePageId)) set({ activePageId: template.pages[0].id })
        if (!findNode(template, config, get().selectedId ?? '')) set({ selectedId: null })
      },
      movePage: (id, dir) =>
        commit((d) => {
          const i = d.pages.findIndex((p) => p.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= d.pages.length) return
          ;[d.pages[i], d.pages[j]] = [d.pages[j], d.pages[i]]
        }),

      setName: (name) => commit((d) => void (d.name = name), 'name'),
      setPage: (patch) => commit((d) => void Object.assign(d.page, patch), `page:${Object.keys(patch).join(',')}`),
      setMetadata: (meta) => commit((d) => void (d.metadata = meta), 'metadata'),

      undo: () => {
        const { past, future, template } = get()
        if (!past.length) return
        set({ template: past[past.length - 1], past: past.slice(0, -1), future: [template, ...future], lastKey: null })
        fixSelection()
      },
      redo: () => {
        const { past, future, template } = get()
        if (!future.length) return
        set({ template: future[0], past: [...past, template], future: future.slice(1), lastKey: null })
        fixSelection()
      },
    }

    function fixSelection() {
      const { template, selectedId, activePageId } = get()
      if (selectedId && !findNode(template, config, selectedId)) set({ selectedId: null })
      if (!template.pages.some((p) => p.id === activePageId)) set({ activePageId: template.pages[0].id })
    }
  })
}
