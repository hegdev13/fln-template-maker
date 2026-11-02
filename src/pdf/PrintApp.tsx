import { useEffect, useRef, useState } from 'react'
import { Document } from '../core/runtime'
import { resolveTemplate } from '../core/resolve'
import { parseTemplate } from '../core/schema'
import { findOverflow } from '../core/overflow'
import { spillToNextPage } from '../core/tree'
import type { Config, Template } from '../core/types'

export interface PrintPayload {
  template: Template
  seed?: string | number
}

/**
 * Print entry: resolves dynamic data, then renders pages. Sets window.__PTB_READY__ when done.
 * Usable in a browser directly (window.print) or by exportPdf().
 */
export function PrintApp({ config, payload }: { config: Config; payload: PrintPayload }) {
  const [doc, setDoc] = useState<Template | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let t = parseTemplate(payload.template)
        t = await resolveTemplate(t, config, { seed: payload.seed ?? 'default' })
        if (!cancelled) setDoc(t)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config, payload])

  // Page overflow: move a component that runs past the bottom margin to the top of the next page, and
  // measure again until every page fits. Waits for fonts so measurements are final.
  useEffect(() => {
    if (!doc || !rootRef.current) return
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled || !rootRef.current) return
      const hit = findOverflow(rootRef.current, doc.page)
      if (hit) setDoc(spillToNextPage(doc, hit.pageId, hit.nodeId))
      else setSettled(true)
    })
    return () => {
      cancelled = true
    }
  }, [doc])

  useEffect(() => {
    if (settled) requestAnimationFrame(() => ((window as any).__PTB_READY__ = true))
  }, [settled])

  if (error) return <pre style={{ color: '#b00' }}>Failed to render: {error}</pre>
  if (!doc) return null
  return (
    <div ref={rootRef}>
      <Document template={doc} config={config} />
    </div>
  )
}
