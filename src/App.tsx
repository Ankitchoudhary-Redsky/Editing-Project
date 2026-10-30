
import { useEditorCanvasRuntime } from './features/editor/hooks/useEditorCanvasRuntime'
import { EditorContext } from './features/editor/EditorContext'
import { EditorShell } from './features/editor/components/EditorShell'
import { useEditorApplicationController } from './features/editor/hooks/useEditorApplicationController'
import { useEditorSettingsState } from './features/editor/hooks/useEditorSettingsState'
import { useEditorUiState } from './features/editor/hooks/useEditorUiState'

import './App.css'

function App() {
  const settings = useEditorSettingsState()
  const uiState = useEditorUiState()
  const runtime = useEditorCanvasRuntime({ settings, ui: uiState })
  const { contextValue, historyVersion, setUploadInputElement, setCanvasElement, setStageElement } =
    useEditorApplicationController({ settings, ui: uiState, runtime })

  return (
    <EditorContext.Provider value={contextValue}>
      <EditorShell
        historyVersion={historyVersion}
        setUploadInputElement={setUploadInputElement}
        setCanvasElement={setCanvasElement}
        setStageElement={setStageElement}
      />
    </EditorContext.Provider>
  )
}

export default App