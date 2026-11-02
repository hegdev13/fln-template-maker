import { useMemo, useState } from 'react'
import { SPANS, findNode, spanLabel } from '../core/tree'
import type { PageSettings } from '../core/types'
import { useEditorStore, useEditorStoreApi, useVariant } from './context'
import { FieldInput } from './Fields'

export function Inspector() {
  const selectedId = useEditorStore((s) => s.selectedId)
  return (
    <aside className="ed-inspector">
      {selectedId ? <ComponentPanel id={selectedId} /> : <DocumentPanel />}
    </aside>
  )
}

function ComponentPanel({ id }: { id: string }) {
  const template = useEditorStore((s) => s.template)
  const config = useEditorStore((s) => s.config)
  const api = useEditorStoreApi()
  const demo = useEditorStore((s) => s.demo)
  const node = useMemo(() => findNode(template, config, id)?.node, [template, config, id])
  if (!node) return null
  const cfg = config.components[node.type]
  if (!cfg) return <div className="ed-panel-title">Unknown component</div>
  return (
    <>
      <div className="ed-panel-title">{cfg.label}</div>
      {demo && cfg.demoProps && (
        <div className="ed-note">Demo content is showing on the page. Turn it off in the toolbar to see what you are editing.</div>
      )}
      <label className="ed-field">
        <span>Width</span>
        <select value={node.span ?? 12} onChange={(e) => api.getState().setSpan(id, Number(e.target.value))}>
          {SPANS.map((s) => (
            <option key={s} value={s}>
              {spanLabel(s)}
            </option>
          ))}
        </select>
      </label>
      {(node.span ?? 12) < 12 && (
        <div className="ed-field">
          <span>Align in row</span>
          <div className="ed-radio">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} className={!node.col && (node.align ?? 'left') === a ? 'on' : ''} onClick={() => api.getState().setAlign(id, a)}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="ed-field">
        <span>Min height (mm)</span>
        <div className="ed-field row">
          <input
            type="number"
            min={4}
            placeholder="auto"
            value={node.height ?? ''}
            onChange={(e) => api.getState().setHeight(id, e.target.value === '' ? undefined : Number(e.target.value))}
          />
          <button className="ed-btn" onClick={() => api.getState().setHeight(id, undefined)}>Auto</button>
        </div>
      </div>
      {Object.entries(cfg.fields).map(([name, field]) => (
        <FieldInput
          key={name}
          name={name}
          field={field}
          siblings={node.props}
          value={node.props[name]}
          onChange={(v) => api.getState().updateProps(id, { [name]: v }, `${id}:${name}`)}
        />
      ))}
    </>
  )
}

const SIZES: PageSettings['size'][] = ['A3', 'A4', 'A5', 'Letter', 'Legal', 'Custom']

function DocumentPanel() {
  const component = useVariant() === 'component'
  if (component) {
    return (
      <>
        <div className="ed-panel-title">Custom component</div>
        <div className="ed-hint">
          Build the component from the blocks on the left. Name it in the toolbar, then Save: it becomes a component in the
          palette. The canvas is a full page width so layouts match where you will use it.
        </div>
      </>
    )
  }
  const template = useEditorStore((s) => s.template)
  const api = useEditorStoreApi()
  const st = api.getState()
  const p = template.page
  const [metaText, setMetaText] = useState(() => JSON.stringify(template.metadata, null, 2))
  const [metaErr, setMetaErr] = useState(false)

  return (
    <>
      <div className="ed-panel-title">Document</div>
      <label className="ed-field">
        <span>Name</span>
        <input value={template.name} onChange={(e) => st.setName(e.target.value)} />
      </label>
      <label className="ed-field">
        <span>Page size</span>
        <select value={p.size} onChange={(e) => st.setPage({ size: e.target.value as PageSettings['size'] })}>
          {SIZES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {p.size === 'Custom' && (
        <div className="ed-field row">
          <input type="number" value={p.customWidth ?? 210} onChange={(e) => st.setPage({ customWidth: Number(e.target.value) })} />
          ×
          <input type="number" value={p.customHeight ?? 297} onChange={(e) => st.setPage({ customHeight: Number(e.target.value) })} />
          mm
        </div>
      )}
      <div className="ed-field">
        <span>Orientation</span>
        <div className="ed-radio">
          {(['portrait', 'landscape'] as const).map((o) => (
            <button key={o} className={p.orientation === o ? 'on' : ''} onClick={() => st.setPage({ orientation: o })}>
              {o}
            </button>
          ))}
        </div>
      </div>
      <label className="ed-field">
        <span>Margin (mm)</span>
        <input type="number" min={0} value={p.margin} onChange={(e) => st.setPage({ margin: Number(e.target.value) })} />
      </label>
      <label className="ed-field">
        <span>Block gap (mm)</span>
        <input type="number" min={0} value={p.gap} onChange={(e) => st.setPage({ gap: Number(e.target.value) })} />
      </label>
      <label className="ed-field">
        <span>Metadata (JSON, passed to resolvers)</span>
        <textarea
          rows={5}
          value={metaText}
          style={metaErr ? { borderColor: '#c00' } : undefined}
          onChange={(e) => {
            setMetaText(e.target.value)
            try {
              const v = JSON.parse(e.target.value)
              setMetaErr(false)
              st.setMetadata(v)
            } catch {
              setMetaErr(true)
            }
          }}
        />
      </label>
      <div className="ed-hint">Select a component on the page to edit its properties.</div>
    </>
  )
}
