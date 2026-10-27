import type { ReactNode } from 'react'
import type { Rng } from './rng'

/** A placed component instance. Slot props hold nested ComponentData[]. */
export interface ComponentData {
  id: string
  type: string
  props: Record<string, any>
  /** Width in 12ths of the parent zone (12 = full width). Omitted = 12. */
  span?: number
  /** Position of a narrower-than-full component within its row. Omitted = left. */
  align?: 'left' | 'center' | 'right'
  /**
   * Explicit start column (1–24 of the zone's 24-column grid). Set when a side handle is dragged so
   * the component keeps the edge you didn't touch; overrides `align`. Omitted = flow / aligned.
   */
  col?: number
  /** Minimum height in mm (set by vertical resize). Omitted = natural height. */
  height?: number
}

export interface PageData {
  id: string
  content: ComponentData[]
}

export type PageSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom'

export interface PageSettings {
  size: PageSize
  orientation: 'portrait' | 'landscape'
  /** Only used when size === 'Custom' (mm, portrait orientation). */
  customWidth?: number
  customHeight?: number
  /** Page margin in mm. */
  margin: number
  /** Vertical gap between top-level blocks in mm. */
  gap: number
}

export interface Template {
  version: 1
  name: string
  page: PageSettings
  /** Free-form bag for host apps (e.g. a level id, a locale). Passed to resolvers. */
  metadata: Record<string, any>
  pages: PageData[]
}

// ---------------------------------------------------------------- fields

export interface FieldBase {
  label?: string
  /** Hide the field unless this returns true for the component's (or array item's) current props. */
  showIf?: (props: Record<string, any>) => boolean
}
export type Field =
  | (FieldBase & { type: 'text' })
  | (FieldBase & { type: 'textarea'; rows?: number })
  | (FieldBase & { type: 'number'; min?: number; max?: number; step?: number })
  | (FieldBase & { type: 'boolean' })
  | (FieldBase & { type: 'color' })
  | (FieldBase & { type: 'select'; options: { label: string; value: any }[] })
  | (FieldBase & { type: 'radio'; options: { label: string; value: any }[] })
  | (FieldBase & {
      type: 'array'
      arrayFields: Record<string, Field>
      /** Props for a newly added item; a function receives the new item's index (for "Option 3"). */
      defaultItemProps: Record<string, any> | ((index: number) => Record<string, any>)
      getItemSummary?: (item: any, index: number) => string
      /** How many items start expanded in the inspector (default 1). */
      defaultOpen?: number
    })
  /**
   * Text with per-letter formatting, stored as sanitized HTML (inline fragment, or <p> blocks when
   * `multiline`). Edited directly on the page; render it with <RichText>. The inspector shows a hint.
   */
  | (FieldBase & { type: 'richtext'; multiline?: boolean })
  /** Bold / italic / underline / strike buttons. Value is a string[] of active keys. */
  | (FieldBase & { type: 'styleToggles' })
  /** Nested drop area. Value is ComponentData[]; the render function receives a ReactNode. */
  | (FieldBase & { type: 'slot' })
  | (FieldBase & {
      type: 'custom'
      render: (args: { value: any; onChange: (v: any) => void; label?: string }) => ReactNode
    })

// ---------------------------------------------------------------- config

export interface ResolveContext {
  /** Seed for deterministic randomisation. Same seed => same output. */
  seed: string | number
  /** Per-component RNG derived from seed + component id (stable regardless of order). */
  rng: Rng
  metadata: Record<string, any>
  id: string
  type: string
}

export interface ComponentConfig<P extends Record<string, any> = any> {
  label: string
  category?: string
  fields: Record<string, Field>
  defaultProps: P
  /**
   * Whether this component shows text that can be formatted per letter (drives the format bar).
   * Defaults to true when any field is `richtext` (or an array of them); set it for components
   * that render <RichText> without a field, like the table's cells.
   */
  hasRichText?: boolean
  /** Sample content merged over props when the editor's Demo mode is on (never saved). */
  demoProps?: Partial<P>
  /**
   * Called by resolveTemplate() before preview/export. Return the props to render
   * (never persisted into the template). Use for fetching data / shuffling.
   */
  resolveData?: (props: P, ctx: ResolveContext) => P | Promise<P>
  /** Slot fields arrive as ReactNode. */
  render: (props: P & { id: string }) => ReactNode
  /** Avoid page-splitting hints etc. can be added here later. */
}

export interface Config {
  components: Record<string, ComponentConfig>
  categories?: Record<string, { title?: string; components: string[] }>
}

export type ZoneRef = { pageId: string } | { parentId: string; slot: string }
