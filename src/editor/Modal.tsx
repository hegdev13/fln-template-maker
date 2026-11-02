import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title?: string
  children: ReactNode
  /** Called for Esc / backdrop click when `dismissable`. */
  onClose: () => void
  /** Large, near-full-screen dialog (the custom component builder). */
  wide?: boolean
  /** Esc and clicking outside close it. Off for dialogs that hold unsaved work. */
  dismissable?: boolean
}

export function Modal({ title, children, onClose, wide, dismissable = true }: Props) {
  useEffect(() => {
    if (!dismissable) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  return createPortal(
    <div className="ed-modal-backdrop" onMouseDown={dismissable ? onClose : undefined}>
      <div className={`ed-modal${wide ? ' wide' : ''}`} role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        {title && <div className="ed-modal-title">{title}</div>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
