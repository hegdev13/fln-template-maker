import { lazy, Suspense, useRef, useState } from 'react'
import { useRuntime } from '../core/runtime'
import { isPlainText, sanitizeRichHtml } from '../core/sanitize'

// The editor (Tiptap) is editor-only; it is code-split so print/PDF pages never load it.
const RichEditor = lazy(() => import('../editor/RichEditor'))

export interface RichTextProps {
  /** Component id (the `id` prop passed to render). */
  id: string
  /** Where the value lives in the component's props, e.g. ['text'] or ['options', 2, 'text']. */
  path: (string | number)[]
  value: string | undefined
  /** Block text with several paragraphs (Text component). Default is a single inline run. */
  multiline?: boolean
}

/**
 * Text with per-letter formatting. In view/PDF it renders the saved (sanitized) HTML. In the editor,
 * clicking it edits in place; formatting is applied to the selected letters from the format bar.
 * Plain strings (older templates, demo content) render as ordinary text.
 */
export function RichText({ id, path, value = '', multiline = false }: RichTextProps) {
  const rt = useRuntime()
  const [editing, setEditing] = useState(false)
  const click = useRef<{ x: number; y: number } | null>(null)
  const Tag = multiline ? 'div' : 'span'
  const classes = `ptb-rich${multiline ? ' block' : ''}`

  const content = isPlainText(value) ? value : undefined
  const staticView = (extra = '', onClick?: (e: React.MouseEvent) => void) =>
    content !== undefined ? (
      <Tag className={`${classes}${extra}`} onClick={onClick}>
        {content}
      </Tag>
    ) : (
      <Tag className={`${classes}${extra}`} onClick={onClick} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }} />
    )

  // sample content (demo) and the PDF are read-only
  if (rt.mode !== 'edit' || !rt.rich || rt.demo) return staticView()

  if (editing) {
    return (
      <Suspense fallback={staticView(' ed-rich-static')}>
        <RichEditor id={id} path={path} value={value} multiline={multiline} at={click.current} onDone={() => setEditing(false)} />
      </Suspense>
    )
  }
  return staticView(' ed-rich-static', (e) => {
    click.current = { x: e.clientX, y: e.clientY }
    setEditing(true)
  })
}
