import { createContext, useContext, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { pageDimensions, slotNames, zoneKey } from './tree'
import type { ComponentData, Config, PageData, Template } from './types'

export interface ZoneProps {
  zoneKey: string
  items: ComponentData[]
  /** 'page' zones are page bodies; 'slot' zones are nested drop areas. */
  kind: 'page' | 'slot'
}

export interface Runtime {
  config: Config
  mode: 'edit' | 'view'
  /** Editor demo mode: merge each component's demoProps over its props. */
  demo?: boolean
  /** Present only in the editor: lets <RichText> edit text in place. */
  rich?: {
    /** Writes a (possibly nested) prop of a component, e.g. ('abc', ['options', 2, 'text'], html). */
    setAt(id: string, path: (string | number)[], value: any): void
    setActiveEditor(editor: any | null): void
  }
  /** Renders one component. The editor swaps this for a draggable/selectable wrapper. */
  Node: ComponentType<{ data: ComponentData }>
  /** Renders a list of components. The editor swaps this for a droppable area. */
  Zone: ComponentType<ZoneProps>
}

const RuntimeContext = createContext<Runtime | null>(null)

export const RuntimeProvider = RuntimeContext.Provider

export function useRuntime(): Runtime {
  const rt = useContext(RuntimeContext)
  if (!rt) throw new Error('RuntimeProvider missing')
  return rt
}

/** Components can use this to hide editor-only placeholder hints in PDF output. */
export function useRenderMode() {
  return useRuntime().mode
}

/**
 * Grid placement for a component. Zones are 24-column grids; `span` is in 12ths, so a span of 6
 * (half width) covers 12 columns and every alignment lands on a whole column.
 */
export function cellProps(data: ComponentData): { style?: CSSProperties; 'data-sized'?: string } {
  const span = data.span ?? 12
  const style: CSSProperties = {}
  if (span < 12) {
    const cols = span * 2
    if (data.col) style.gridColumn = `${Math.min(data.col, 25 - cols)} / span ${cols}`
    else if (data.align === 'center') style.gridColumn = `${13 - span} / span ${cols}`
    else if (data.align === 'right') style.gridColumn = `${25 - cols} / span ${cols}`
    else style.gridColumn = `span ${cols}`
  }
  if (data.height) style.minHeight = `${data.height}mm`
  return {
    style: Object.keys(style).length ? style : undefined,
    ...(data.height ? { 'data-sized': '' } : {}),
  }
}

export function ViewZone({ items, kind }: ZoneProps) {
  const { Node } = useRuntime()
  return (
    <div className={kind === 'page' ? 'ptb-page-flow' : 'ptb-slot'}>
      {items.map((item) => (
        <div key={item.id} className="ptb-cell" {...cellProps(item)}>
          <Node data={item} />
        </div>
      ))}
    </div>
  )
}

/** Renders a component through its config, converting slot arrays to ReactNodes. */
export function RenderComponent({ data }: { data: ComponentData }) {
  const { config, Zone, demo } = useRuntime()
  const cfg = config.components[data.type]
  if (!cfg) return <div className="ptb-missing">Unknown component “{data.type}”</div>
  const props: Record<string, any> = { ...data.props, ...(demo ? cfg.demoProps : undefined), id: data.id }
  for (const slot of slotNames(config, data.type)) {
    props[slot] = (
      <Zone zoneKey={zoneKey({ parentId: data.id, slot })} items={data.props[slot] ?? []} kind="slot" />
    ) as ReactNode
  }
  // Rendered as a component (not called) so render functions may use hooks.
  const Render = cfg.render as ComponentType<any>
  return <Render {...props} />
}

/** One physical sheet. Used by the editor canvas, preview and print output alike. */
export function PageSheet({ template, page }: { template: Template; page: PageData }) {
  const { Zone } = useRuntime()
  const { width, height } = pageDimensions(template.page)
  return (
    <div
      className="ptb-sheet"
      data-page-id={page.id}
      style={{
        width: `${width}mm`,
        height: `${height}mm`,
        padding: `${template.page.margin}mm`,
        ['--ptb-gap' as any]: `${template.page.gap}mm`,
      }}
    >
      <div className="ptb-sheet-body">
        <Zone zoneKey={zoneKey({ pageId: page.id })} items={page.content} kind="page" />
      </div>
    </div>
  )
}

export function Document({ template, config }: { template: Template; config: Config }) {
  const rt: Runtime = { config, mode: 'view', Node: RenderComponent, Zone: ViewZone }
  return (
    <RuntimeProvider value={rt}>
      {template.pages.map((p) => (
        <PageSheet key={p.id} template={template} page={p} />
      ))}
    </RuntimeProvider>
  )
}
