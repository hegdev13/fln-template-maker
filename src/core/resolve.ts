import { createRng, hashString } from './rng'
import { slotNames } from './tree'
import type { ComponentData, Config, Template } from './types'

export interface ResolveOptions {
  seed: string | number
  /** Extra metadata merged over template.metadata for resolvers. */
  metadata?: Record<string, any>
}

/**
 * Runs every component's `resolveData` hook (async, concurrent) and returns a NEW template
 * with the resolved props. The input is never mutated, and the result should be rendered /
 * exported, not saved. Deterministic: same template + seed => same output (given pure resolvers).
 */
export async function resolveTemplate(template: Template, config: Config, opts: ResolveOptions): Promise<Template> {
  const metadata = { ...template.metadata, ...opts.metadata }

  const resolveNode = async (node: ComponentData): Promise<ComponentData> => {
    const cfg = config.components[node.type]
    let props = node.props
    if (cfg?.resolveData) {
      const rng = createRng(hashString(`${opts.seed}:${node.id}`))
      props = await cfg.resolveData(props, { seed: opts.seed, rng, metadata, id: node.id, type: node.type })
    }
    props = { ...props }
    await Promise.all(
      slotNames(config, node.type).map(async (slot) => {
        props[slot] = await Promise.all((props[slot] ?? []).map(resolveNode))
      }),
    )
    return { ...node, props }
  }

  const pages = await Promise.all(
    template.pages.map(async (p) => ({ ...p, content: await Promise.all(p.content.map(resolveNode)) })),
  )
  return { ...template, pages }
}
