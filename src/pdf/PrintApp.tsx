import { useEffect, useState } from 'react'
import { Document } from '../core/runtime'
import { resolveTemplate } from '../core/resolve'
import { parseTemplate } from '../core/schema'
import { slotNames } from '../core/tree'
import type { ComponentData, Config, Template } from '../core/types'

export interface PrintPayload {
  template: Template
  seed?: string | number
  answerKey?: boolean
}

function applyAnswerKey(nodes: ComponentData[], config: Config): ComponentData[] {
  return nodes.map((n) => {
    const props = { ...n.props }
    if ('showAnswers' in (config.components[n.type]?.defaultProps ?? {})) props.showAnswers = true
    for (const slot of slotNames(config, n.type)) props[slot] = applyAnswerKey(props[slot] ?? [], config)
    return { ...n, props }
  })
}

/**
 * Print entry: resolves dynamic data, then renders pages. Sets window.__PTB_READY__ when done.
 * Usable in a browser directly (window.print) or by exportPdf().
 */
export function PrintApp({ config, payload }: { config: Config; payload: PrintPayload }) {
  const [doc, setDoc] = useState<Template | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let t = parseTemplate(payload.template)
        t = await resolveTemplate(t, config, { seed: payload.seed ?? 'default' })
        if (payload.answerKey) t = { ...t, pages: t.pages.map((p) => ({ ...p, content: applyAnswerKey(p.content, config) })) }
        if (!cancelled) setDoc(t)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config, payload])

  useEffect(() => {
    if (doc) requestAnimationFrame(() => ((window as any).__PTB_READY__ = true))
  }, [doc])

  if (error) return <pre style={{ color: '#b00' }}>Failed to render: {error}</pre>
  if (!doc) return null
  return <Document template={doc} config={config} />
}
