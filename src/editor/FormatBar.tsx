import { useEffect, useReducer } from 'react'
import { FONT_STACKS } from '../components/typography'
import { findNode, hasRichText } from '../core/tree'
import { useEditorStore } from './context'

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64]

/**
 * Formatting for the selected letters of whichever text is being edited on the page.
 * Buttons use mousedown-preventDefault so the text keeps focus and its selection.
 */
export function FormatBar() {
  const editor = useEditorStore((s) => s.activeEditor)
  // only offer text formatting when the selected component actually has text (or text is being edited)
  const hasText = useEditorStore((s) => {
    const node = s.selectedId ? findNode(s.template, s.config, s.selectedId)?.node : null
    return !!node && hasRichText(s.config, node.type)
  })
  // snap labels use the same gap; step aside while they are showing
  const marking = useEditorStore((s) => !!s.rulerMarks)
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!editor) return
    editor.on('transaction', bump)
    return () => void editor.off('transaction', bump)
  }, [editor])

  if (!editor && !hasText) return null

  const on = (name: string) => !!editor?.isActive(name)
  const attrs = editor?.getAttributes('textStyle') ?? {}
  const size = parseFloat(attrs.fontSize) || ''
  const family = Object.entries(FONT_STACKS).find(([, stack]) => stack === attrs.fontFamily)?.[0] ?? ''
  const run = (fn: (chain: any) => any) => editor && fn(editor.chain().focus()).run()
  const keep = (e: React.MouseEvent) => e.preventDefault()

  const toggle = (name: string, label: string, title: string, css: React.CSSProperties, cmd: string) => (
    <button key={name} type="button" title={title} style={css} className={on(name) ? 'on' : ''} onMouseDown={keep} onClick={() => run((c) => c[cmd]())}>
      {label}
    </button>
  )

  return (
    <div className={`ed-formatbar${editor ? '' : ' idle'}${marking ? ' dim' : ''}`} aria-label="Text formatting">
      <span className="ed-formatbar-title">Text</span>
      {toggle('bold', 'B', 'Bold (⌘B)', { fontWeight: 700 }, 'toggleBold')}
      {toggle('italic', 'I', 'Italic (⌘I)', { fontStyle: 'italic' }, 'toggleItalic')}
      {toggle('underline', 'U', 'Underline (⌘U)', { textDecoration: 'underline' }, 'toggleUnderline')}
      {toggle('strike', 'S', 'Strikethrough', { textDecoration: 'line-through' }, 'toggleStrike')}
      <select
        title="Font size (pt)"
        value={String(size)}
        disabled={!editor}
        onChange={(e) => run((c) => (e.target.value ? c.setFontSize(`${e.target.value}pt`) : c.unsetFontSize()))}
      >
        <option value="">Size</option>
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s} pt
          </option>
        ))}
      </select>
      <select
        title="Font"
        value={family}
        disabled={!editor}
        onChange={(e) => run((c) => (e.target.value ? c.setFontFamily(FONT_STACKS[e.target.value as keyof typeof FONT_STACKS]) : c.unsetFontFamily()))}
      >
        <option value="">Font</option>
        <option value="sans">Sans-serif</option>
        <option value="serif">Serif</option>
        <option value="mono">Monospace</option>
      </select>
      <button type="button" disabled={!editor} title="Remove size and font changes from the selection" onMouseDown={keep} onClick={() => run((c) => c.unsetFontSize().unsetFontFamily())}>
        Reset
      </button>
      <button type="button" disabled={!editor} title="Clear all formatting from the selection" onMouseDown={keep} onClick={() => run((c) => c.unsetAllMarks())}>
        Clear
      </button>
    </div>
  )
}
