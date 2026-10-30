import { useEditorDesignSettingsState } from './useEditorDesignSettingsState'
import { useEditorProjectSettingsState } from './useEditorProjectSettingsState'
import { useEditorDraftSnapshot } from './useEditorDraftSnapshot'
import { useEditorDraftRestoration } from './useEditorDraftRestoration'

export function useEditorSettingsState() {
  const projectSettings = useEditorProjectSettingsState()
  const designSettings = useEditorDesignSettingsState()
  const draftSettings = useEditorDraftSnapshot({ projectSettings, designSettings })
  const restoreDraftSettings = useEditorDraftRestoration({ projectSettings, designSettings })

  return {
    ...projectSettings,
    ...designSettings,
    draftSettings,
    restoreDraftSettings,
  }
}