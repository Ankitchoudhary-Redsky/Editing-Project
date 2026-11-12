import { useEffect } from 'react'
import type { UseEditorKeyboardShortcutsOptions } from '../model/types'

export function useEditorKeyboardShortcuts({
  undo,
  redo,
  deleteSelected,
  handleTableKeyboardInput,
}: UseEditorKeyboardShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement

      if (
        target.matches('input, textarea, select') ||
        target.isContentEditable
      ) {
        return
      }

      if (handleTableKeyboardInput(event)) return

      const command = event.metaKey || event.ctrlKey

      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          void redo()
        } else {
          void undo()
        }
      } else if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        void redo()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, deleteSelected, handleTableKeyboardInput])
}