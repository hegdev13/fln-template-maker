import type { ComponentData, Config, PageSettings, Template, ZoneRef } from './types'

// NOTE: functions named *Mut mutate their template argument; call them on an immer draft
// (or a structuredClone) and never on state you want to keep immutable.

export const newId = () => Math.random().toString(36).slice(2, 10)

export const defaultPageSettings: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  margin: 15,
  gap: 4,
}

export function createEmptyTemplate(name = 'Untitled template'): Template {
  return {
    version: 1,
    name,
    page: { ...defaultPageSettings },
    metadata: {},
    pages: [{ id: newId(), content: [] }],
  }
}

// ---------------------------------------------------------------- zones

export function zoneKey(ref: ZoneRef): string {
  return 'pageId' in ref ? `p:${ref.pageId}` : `s:${ref.parentId}:${ref.slot}`
}

export function parseZoneKey(key: string): ZoneRef {
  if (key.startsWith('p:')) return { pageId: key.slice(2) }
  const [, parentId, ...rest] = key.split(':')
  return { parentId, slot: rest.join(':') }
}

export function slotNames(config: Config, type: string): string[] {
  const fields = config.components[type]?.fields ?? {}
  return Object.keys(fields).filter((k) => fields[k].type === 'slot')
}

export function getZone(template: Template, ref: ZoneRef, config?: Config): ComponentData[] | undefined {
  if ('pageId' in ref) return template.pages.find((p) => p.id === ref.pageId)?.content
  const found = config ? findNode(template, config, ref.parentId) : null
  const arr = found?.node.props[ref.slot]
  return Array.isArray(arr) ? arr : undefined
}

// ---------------------------------------------------------------- traversal

export function walk(
  template: Template,
  config: Config,
  fn: (node: ComponentData, zone: ZoneRef, index: number) => void,
) {
  const visit = (nodes: ComponentData[], zone: ZoneRef) => {
    nodes.forEach((node, i) => {
      fn(node, zone, i)
      for (const slot of slotNames(config, node.type)) {
        const children = node.props[slot]
        if (Array.isArray(children)) visit(children, { parentId: node.id, slot })
      }
    })
  }
  for (const page of template.pages) visit(page.content, { pageId: page.id })
}

export function findNode(template: Template, config: Config, id: string) {
  let hit: { node: ComponentData; zone: ZoneRef; index: number } | null = null
  walk(template, config, (node, zone, index) => {
    if (!hit && node.id === id) hit = { node, zone, index }
  })
  return hit as { node: ComponentData; zone: ZoneRef; index: number } | null
}

export function findPageOf(template: Template, config: Config, id: string): string | null {
  let current = findNode(template, config, id)
  while (current) {
    if ('pageId' in current.zone) return current.zone.pageId
    current = findNode(template, config, current.zone.parentId)
  }
  return null
}

export function subtreeIds(config: Config, node: ComponentData): Set<string> {
  const ids = new Set<string>([node.id])
  for (const slot of slotNames(config, node.type)) {
    for (const child of node.props[slot] ?? []) subtreeIds(config, child).forEach((i) => ids.add(i))
  }
  return ids
}

/** True when `ref` is inside the subtree of `nodeId` (dropping a node into itself). */
export function isZoneInsideNode(template: Template, config: Config, nodeId: string, ref: ZoneRef): boolean {
  if ('pageId' in ref) return false
  const found = findNode(template, config, nodeId)
  return !!found && subtreeIds(config, found.node).has(ref.parentId)
}

// ---------------------------------------------------------------- creation

/** True when the component has text that can be formatted per letter. */
export function hasRichText(config: Config, type: string): boolean {
  const cfg = config.components[type]
  if (!cfg) return false
  if (cfg.hasRichText !== undefined) return cfg.hasRichText
  return Object.values(cfg.fields).some(
    (f) => f.type === 'richtext' || (f.type === 'array' && Object.values(f.arrayFields).some((a) => a.type === 'richtext')),
  )
}

/** Gives every node in these (cloned) trees a new id, so copies of preset content never share ids. */
function freshIds(config: Config, nodes: ComponentData[]) {
  for (const n of nodes) {
    n.id = newId()
    for (const slot of slotNames(config, n.type)) {
      if (Array.isArray(n.props[slot])) freshIds(config, n.props[slot])
    }
  }
}

export function createNode(config: Config, type: string, props?: Record<string, any>): ComponentData {
  const cfg = config.components[type]
  if (!cfg) throw new Error(`Unknown component type "${type}"`)
  const base = structuredClone(cfg.defaultProps ?? {})
  for (const slot of slotNames(config, type)) {
    base[slot] = base[slot] ?? []
    freshIds(config, base[slot]) // a component's default content (e.g. a custom component's blocks) is per-copy
  }
  return { id: newId(), type, props: { ...base, ...props } }
}

export function cloneWithNewIds(config: Config, node: ComponentData): ComponentData {
  // JSON clone (not structuredClone): callers pass immer drafts, which are Proxies structuredClone rejects.
  const props = JSON.parse(JSON.stringify(node.props))
  for (const slot of slotNames(config, node.type)) {
    props[slot] = (node.props[slot] ?? []).map((c: ComponentData) => cloneWithNewIds(config, c))
  }
  const copy: ComponentData = { id: newId(), type: node.type, props }
  if (node.span) copy.span = node.span
  if (node.align) copy.align = node.align
  if (node.col) copy.col = node.col
  if (node.height) copy.height = node.height
  return copy
}

// ---------------------------------------------------------------- widths

/** Allowed widths in 12ths of the zone: every twelfth, 1/12 … full. */
export const SPANS: number[] = Array.from({ length: 12 }, (_, i) => i + 1)

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
/** "1/12", "1/6", "1/4", "1/3", "5/12", "1/2" … "11/12", "Full". */
export const spanLabel = (span = 12) => (span >= 12 ? 'Full' : `${span / gcd(span, 12)}/${12 / gcd(span, 12)}`)

/**
 * Snaps a width ratio (0..1 of the parent zone) to the nearest allowed span no wider than `maxSpan`
 * (the room left in the zone). Returns undefined when nothing fits.
 */
export function nearestSpan(ratio: number, maxSpan = 12): number | undefined {
  const fits = SPANS.filter((s) => s <= maxSpan)
  if (!fits.length) return undefined
  return fits.reduce((best, s) => (Math.abs(s / 12 - ratio) < Math.abs(best / 12 - ratio) ? s : best))
}

/**
 * Resizing by an edge on the zone's 24-column grid. The opposite edge is fixed (`startCol`..`endCol`
 * are the component's current 1-based columns); `boundary` is where the pointer has dragged the moving
 * edge, as a column-line index (0..24, fractional). Returns the span (in 12ths) whose edge lands on the
 * nearest line, limited to the room available, or undefined if nothing fits.
 */
export function snapEdgeSpan(side: 'left' | 'right', startCol: number, endCol: number, boundary: number): number | undefined {
  const fixed = side === 'right' ? startCol - 1 : endCol
  const room = side === 'right' ? 24 - fixed : fixed
  let best: number | undefined
  for (const s of SPANS) {
    if (s * 2 > room) break
    const line = side === 'right' ? fixed + s * 2 : fixed - s * 2
    if (best === undefined || Math.abs(line - boundary) < Math.abs((side === 'right' ? fixed + best * 2 : fixed - best * 2) - boundary)) best = s
  }
  return best
}

// ---------------------------------------------------------------- mutations

export function insertNodeMut(template: Template, config: Config, ref: ZoneRef, index: number, node: ComponentData) {
  const zone = getZone(template, ref, config)
  if (!zone) return false
  zone.splice(Math.max(0, Math.min(index, zone.length)), 0, node)
  return true
}

export function removeNodeMut(template: Template, config: Config, id: string): ComponentData | null {
  const found = findNode(template, config, id)
  if (!found) return null
  const zone = getZone(template, found.zone, config)!
  return zone.splice(found.index, 1)[0]
}

/** Moves a node; `index` is the insertion index in the destination *before* removal. */
export function moveNodeMut(template: Template, config: Config, id: string, ref: ZoneRef, index: number): boolean {
  if (isZoneInsideNode(template, config, id, ref)) return false
  const found = findNode(template, config, id)
  if (!found) return false
  const sameZone = zoneKey(found.zone) === zoneKey(ref)
  const node = removeNodeMut(template, config, id)!
  const adjusted = sameZone && found.index < index ? index - 1 : index
  return insertNodeMut(template, config, ref, adjusted, node)
}

export function duplicateNodeMut(template: Template, config: Config, id: string): ComponentData | null {
  const found = findNode(template, config, id)
  if (!found) return null
  const copy = cloneWithNewIds(config, found.node)
  insertNodeMut(template, config, found.zone, found.index + 1, copy)
  return copy
}

// ---------------------------------------------------------------- page geometry

const SIZES_MM: Record<string, [number, number]> = {
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  Letter: [215.9, 279.4],
  Legal: [215.9, 355.6],
}

/** Page width/height in mm after applying size + orientation. */
export function pageDimensions(page: PageSettings): { width: number; height: number } {
  const [w, h] = page.size === 'Custom' ? [page.customWidth ?? 210, page.customHeight ?? 297] : SIZES_MM[page.size]
  return page.orientation === 'landscape' ? { width: h, height: w } : { width: w, height: h }
}

/**
 * Moves a top-level component, and every component after it, to the top of the next page (creating
 * one when this is the last page). Used when a page overflows. Pure: never mutates `template`.
 * The first component of a page never moves (it could not fit on a fresh page either).
 */
export function spillToNextPage(template: Template, pageId: string, nodeId: string): Template {
  const pi = template.pages.findIndex((p) => p.id === pageId)
  if (pi < 0) return template
  const content = template.pages[pi].content
  const ci = content.findIndex((n) => n.id === nodeId)
  if (ci <= 0) return template
  const moved = content.slice(ci)
  const pages = [...template.pages]
  pages[pi] = { ...pages[pi], content: content.slice(0, ci) }
  if (pi + 1 < pages.length) pages[pi + 1] = { ...pages[pi + 1], content: [...moved, ...pages[pi + 1].content] }
  else pages.push({ id: newId(), content: moved })
  return { ...template, pages }
}
