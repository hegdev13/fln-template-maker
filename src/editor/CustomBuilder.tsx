import { useContext, useMemo, useState } from 'react'
import { slugify, uniqueId, type CustomComponentDef } from '../core/custom'
import { createEmptyTemplate } from '../core/tree'
import { CustomContext } from './context'
import { Editor } from './Editor'
import { Modal } from './Modal'

/**
 * Pop-up for making (or editing) a custom component. It is a full editor on a single page-width
 * canvas using only the built-in components; Save turns the blocks into a component of their own.
 */
export function CustomBuilder({ def, onClose }: { def?: CustomComponentDef; onClose: () => void }) {
  const custom = useContext(CustomContext)!
  const [saving, setSaving] = useState(false)
  const initial = useMemo(() => {
    const t = createEmptyTemplate(def?.name ?? '')
    if (def) t.pages[0].content = structuredClone(def.content)
    return t
  }, [def])

  return (
    <Modal wide dismissable={false} onClose={onClose} title={def ? `Edit custom component` : 'New custom component'}>
      <div className="ed-builder">
        <Editor
          variant="component"
          config={custom.baseConfig}
          data={initial}
          actions={({ getTemplate }) => (
            <div className="ed-group">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={async () => {
                  const t = getTemplate()
                  const name = t.name.trim()
                  const content = t.pages[0].content
                  if (!name) return alert('Give the component a name first.')
                  if (!content.length) return alert('Add at least one block to the component.')
                  const now = new Date().toISOString()
                  const next: CustomComponentDef = {
                    version: 1,
                    id: def?.id ?? uniqueId(slugify(name), custom.items.map((d) => d.id)),
                    name,
                    ...(def?.description ? { description: def.description } : {}),
                    createdAt: def?.createdAt ?? now,
                    updatedAt: now,
                    content,
                  }
                  setSaving(true)
                  try {
                    await custom.save(next)
                    onClose()
                  } catch (err) {
                    alert(`Could not save the component: ${(err as Error).message}`)
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? 'Saving…' : 'Save component'}
              </button>
            </div>
          )}
        />
      </div>
    </Modal>
  )
}
