import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { EditorState, EditorStore } from '../core/store'

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
