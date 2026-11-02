import { z } from 'zod'
import { componentSchema } from './schema'
import type { ComponentConfig, ComponentData, Config } from './types'

/**
 * Custom components: reusable blocks an author builds from the built-in components (a school's page
 * header, a worked-example frame…). Each one is saved as a JSON file (see `custom-components/`) and
 * shows up in the palette as a component of its own, with type `custom:<id>`.
 *
 * Placing one drops a copy of its saved blocks into the page (inside a container), so every use can be
 * edited in place. Editing the definition later changes what is added from then on; components already
 * placed keep their own content.
 */
export interface CustomComponentDef {
  version: 1
  /** Slug; also the file name (`custom-components/<id>.json`) and the type suffix. */
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  /** The saved blocks (built-in component types only). */
  content: ComponentData[]
}

export const CUSTOM_PREFIX = 'custom:'
export const customType = (id: string) => `${CUSTOM_PREFIX}${id}`
export const isCustomType = (type: string) => type.startsWith(CUSTOM_PREFIX)

export const CUSTOM_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export const customComponentSchema: z.ZodType<CustomComponentDef> = z.object({
  version: z.literal(1),
  id: z.string().regex(CUSTOM_ID_RE),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  content: z.array(componentSchema).min(1),
})

/** "Page header (school)" -> "page-header-school". */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'component'
  )
}

/** A slug that isn't in `taken` ("page-header", "page-header-2", …). */
export function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** The component config a definition registers: a plain container whose slot starts with the saved blocks. */
export function customComponentConfig(def: CustomComponentDef): ComponentConfig {
  return {
    label: def.name,
    category: 'Custom',
    fields: { content: { type: 'slot' } },
    // createNode() gives every placed copy fresh ids for these blocks
    defaultProps: { content: def.content },
    render: ({ content }) => content,
  }
}

/** Returns a config with every definition added as a component, listed in a "Custom" palette group. */
export function withCustomComponents(config: Config, defs: CustomComponentDef[]): Config {
  if (!defs.length) return config
  const components = { ...config.components }
  for (const def of defs) components[customType(def.id)] = customComponentConfig(def)
  return {
    ...config,
    components,
    categories: {
      ...config.categories,
      custom: { title: 'Custom', components: defs.map((d) => customType(d.id)) },
    },
  }
}
