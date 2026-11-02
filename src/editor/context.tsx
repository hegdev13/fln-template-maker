import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { CustomComponentDef } from '../core/custom'
import type { EditorState, EditorStore } from '../core/store'
import type { Config } from '../core/types'

export const StoreContext = createContext<EditorStore | null>(null)

export function useEditorStore<T>(selector: (s: EditorState) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('Editor store missing')
  return useStore(store, selector)
}

export function useEditorStoreApi(): EditorStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('Editor store missing')
  return store
}

/**
 * 'page' is the normal template editor; 'component' is the custom-component builder: one page-width
 * canvas, no page controls or JSON import/export, and the name field names the component.
 */
export type EditorVariant = 'page' | 'component'
export const VariantContext = createContext<EditorVariant>('page')
export const useVariant = () => useContext(VariantContext)

/** Custom-component support, present only when the host passes `customComponents` to <Editor>. */
export interface CustomApi {
  items: CustomComponentDef[]
  /** The config without custom components; the builder offers only these (no nesting). */
  baseConfig: Config
  openNew(): void
  /** Asks for confirmation, then opens the builder on this component. */
  requestEdit(def: CustomComponentDef): void
  save(def: CustomComponentDef): Promise<void>
}
export const CustomContext = createContext<CustomApi | null>(null)
