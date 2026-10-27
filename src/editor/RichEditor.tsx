import Document from '@tiptap/extension-document'
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { useRuntime } from '../core/runtime'
import { isPlainText, sanitizeRichHtml } from '../core/sanitize'

interface Props {
  id: string
  path: (string | number)[]
  value: string
  multiline: boolean
  /** Screen position of the click that started editing, so the caret lands where the user clicked. */
  at: { x: number; y: number } | null
  onDone: () => void
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Stored value -> Tiptap document HTML. */
function toDoc(value: string, multiline: boolean): string {
  if (!multiline) return `<p>${isPlainText(value) ? esc(value) : sanitizeRichHtml(value)}</p>`
  if (/<p[ >]/i.test(value)) return sanitizeRichHtml(value)
  return value
    .split('\n')
    .map((line) => `<p>${esc(line)}</p>`)
    .join('')
}

/** Tiptap document -> stored value (inline fragment for single-line, <p> blocks for multiline). */
function fromDoc(html: string, empty: boolean, multiline: boolean): string {
  if (empty) return ''
  return multiline ? html : html.replace(/^<p>([\s\S]*)<\/p>$/, '$1')
}

/** In-place text editor. Formatting buttons live in the FormatBar, which drives rt.rich's active editor. */
export default function RichEditor({ id, path, value, multiline, at, onDone }: Props) {
  const rt = useRuntime()
  const rich = rt.rich!
  const wrapRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const editor = useEditor({
    extensions: [
      // single-line fields hold exactly one paragraph, so Enter / multi-line paste can't break the layout
      multiline ? StarterKit.configure(base) : StarterKit.configure({ ...base, document: false }),
      ...(multiline ? [] : [Document.extend({ content: 'paragraph' })]),
      TextStyle,
      FontSize,
      FontFamily,
    ],
    content: toDoc(value, multiline),
    editorProps: {
      handleKeyDown: (_view, e) => {
        if (e.key === 'Escape') {
          doneRef.current()
          return true
        }
        return !multiline && e.key === 'Enter'
      },
    },
    onUpdate: ({ editor }) => rich.setAt(id, path, fromDoc(editor.getHTML(), editor.isEmpty, multiline)),
    onFocus: ({ editor }) => rich.setActiveEditor(editor),
  })

  // put the caret where the user clicked
  useEffect(() => {
    if (!editor) return
    // the view only exists once EditorContent has mounted it
    const go = () => {
      let pos: number | undefined
      try {
        pos = at ? editor.view.posAtCoords({ left: at.x, top: at.y })?.pos : undefined
      } catch {}
      editor.commands.focus(pos ?? 'end')
      rich.setActiveEditor(editor)
    }
    if (editor.isInitialized) go()
    else editor.on('create', go)
    return () => {
      editor.off('create', go)
      rich.setActiveEditor(null)
    }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // finish editing when the user clicks anywhere except this text or the format bar
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Element
      if (wrapRef.current?.contains(t) || t.closest?.('.ed-formatbar')) return
      doneRef.current()
    }
    document.addEventListener('mousedown', down, true)
    return () => document.removeEventListener('mousedown', down, true)
  }, [])

  return (
    <div ref={wrapRef} className={`ptb-rich ed-rich-editor${multiline ? ' block' : ''}`} onClick={(e) => e.stopPropagation()}>
      <EditorContent editor={editor} />
    </div>
  )
}

/** Keep only the formatting marks the print output supports. */
const base = {
  heading: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  listKeymap: false,
  codeBlock: false,
  code: false,
  horizontalRule: false,
  link: false,
  dropcursor: false,
  gapcursor: false,
} as const
