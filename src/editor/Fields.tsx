import { useState } from 'react'
import { stripRichHtml } from '../core/sanitize'
import type { Field } from '../core/types'

interface Props {
  name: string
  field: Field
  value: any
  onChange: (v: any) => void
  /** The component's (or array item's) props, used by `showIf`. */
  siblings?: Record<string, any>
}

const STYLE_BUTTONS = [
  { key: 'bold', label: 'B', title: 'Bold', css: { fontWeight: 700 } },
  { key: 'italic', label: 'I', title: 'Italic', css: { fontStyle: 'italic' } },
  { key: 'underline', label: 'U', title: 'Underline', css: { textDecoration: 'underline' } },
  { key: 'strike', label: 'S', title: 'Strikethrough', css: { textDecoration: 'line-through' } },
] as const

export function FieldInput({ name, field, value, onChange, siblings }: Props) {
  if (field.showIf && siblings && !field.showIf(siblings)) return null
  const label = field.label ?? name
  switch (field.type) {
    case 'slot':
      return null
    case 'text':
      return (
        <label className="ed-field">
          <span>{label}</span>
          <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </label>
      )
    case 'textarea':
      return (
        <label className="ed-field">
          <span>{label}</span>
          <textarea rows={field.rows ?? 3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </label>
      )
    case 'number':
      return (
        <label className="ed-field">
          <span>{label}</span>
          <input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </label>
      )
    case 'boolean':
      return (
        <label className="ed-field row">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>{label}</span>
        </label>
      )
    case 'color':
      return (
        <label className="ed-field">
          <span>{label}</span>
          <input type="color" value={value || '#111111'} onChange={(e) => onChange(e.target.value)} />
        </label>
      )
    case 'select': {
      const idx = field.options.findIndex((o) => o.value === value)
      return (
        <label className="ed-field">
          <span>{label}</span>
          <select value={String(idx)} onChange={(e) => onChange(field.options[Number(e.target.value)].value)}>
            {field.options.map((o, i) => (
              <option key={i} value={i}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )
    }
    case 'radio':
      return (
        <div className="ed-field">
          <span>{label}</span>
          <div className="ed-radio">
            {field.options.map((o, i) => (
              <button key={i} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )
    case 'richtext':
      return (
        <div className="ed-field">
          <span>{label}</span>
          <div className="ed-richhint" title="Click the text on the page to edit it">
            {stripRichHtml(String(value ?? '')) || <em>(empty)</em>}
          </div>
        </div>
      )
    case 'styleToggles': {
      const active: string[] = Array.isArray(value) ? value : []
      return (
        <div className="ed-field">
          <span>{label}</span>
          <div className="ed-radio ed-styles">
            {STYLE_BUTTONS.map((b) => (
              <button
                key={b.key}
                type="button"
                title={b.title}
                style={b.css}
                className={active.includes(b.key) ? 'on' : ''}
                onClick={() => onChange(active.includes(b.key) ? active.filter((k) => k !== b.key) : [...active, b.key])}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )
    }
    case 'custom':
      return <>{field.render({ value, onChange, label })}</>
    case 'array':
      return <ArrayField label={label} field={field} value={value} onChange={onChange} />
  }
}

function ArrayField({
  label,
  field,
  value,
  onChange,
}: {
  label: string
  field: Extract<Field, { type: 'array' }>
  value: any
  onChange: (v: any) => void
}) {
  const items: any[] = Array.isArray(value) ? value : []
  // which rows are expanded; only the first `defaultOpen` start open, newly added rows open too
  const [open, setOpen] = useState<Set<number>>(() => new Set(Array.from({ length: field.defaultOpen ?? 1 }, (_, i) => i)))
  const toggle = (i: number, on: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev)
      on ? next.add(i) : next.delete(i)
      return next
    })
  const newItem = () => {
    const d = field.defaultItemProps
    return structuredClone(typeof d === 'function' ? d(items.length) : d)
  }

  const move = (i: number, j: number) => {
    const out = [...items]
    ;[out[i], out[j]] = [out[j], out[i]]
    onChange(out)
    setOpen((prev) => {
      const next = new Set(prev)
      const a = prev.has(i)
      const b = prev.has(j)
      a ? next.add(j) : next.delete(j)
      b ? next.add(i) : next.delete(i)
      return next
    })
  }
  const remove = (i: number) => {
    onChange(items.filter((_, k) => k !== i))
    setOpen((prev) => new Set([...prev].filter((k) => k !== i).map((k) => (k > i ? k - 1 : k))))
  }

  return (
    <div className="ed-field">
      <span>{label}</span>
      <div className="ed-array">
        {items.map((item, i) => (
          <details key={i} className="ed-array-item" open={open.has(i)} onToggle={(e) => toggle(i, (e.currentTarget as HTMLDetailsElement).open)}>
            <summary>
              <span className="sum">{field.getItemSummary?.(item, i) || `Item ${i + 1}`}</span>
              <span className="acts" onClick={(e) => e.preventDefault()}>
                <button disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                <button disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>↓</button>
                <button onClick={() => remove(i)}>✕</button>
              </span>
            </summary>
            <div className="ed-array-body">
              {Object.entries(field.arrayFields).map(([k, f]) => (
                <FieldInput
                  key={k}
                  name={k}
                  field={f}
                  value={item[k]}
                  siblings={item}
                  onChange={(v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))}
                />
              ))}
            </div>
          </details>
        ))}
        <button
          className="ed-btn"
          onClick={() => {
            onChange([...items, newItem()])
            toggle(items.length, true)
          }}
        >
          + Add item
        </button>
      </div>
    </div>
  )
}
