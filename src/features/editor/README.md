# Editor Feature Map

The editor is grouped by responsibility so individual features can be changed or temporarily removed without editing unrelated UI.

## Components

- `components/EditorHeader.tsx`: project name, undo/redo, preview, and export actions.
- `components/ToolRail.tsx`: feature navigation.
- `components/ToolPanel.tsx`: maps the active tool to its panel.
- `components/panels/UploadPanel.tsx`: upload and current-image controls.
- `components/panels/CropPanel.tsx`: crop ratio and apply/cancel controls.
- `components/panels/ResizePanel.tsx`: document dimensions and presets.
- `components/panels/TextPanel.tsx`: text creation and typography controls.
- `components/panels/ShapesPanel.tsx`: shape creation and appearance controls.
- `components/panels/AdjustmentsPanel.tsx`: image filters.
- `components/panels/LayersPanel.tsx`: object selection, ordering, duplication, and deletion.
- `components/EditorWorkspace.tsx`: canvas, zoom, empty state, and drag/drop area.
- `components/EditorDialogs.tsx`: preview, export, and status notification dialogs.

## Operations And Model

- `operations/`: Fabric.js operations for crop, text, shapes, image loading, and image adjustments.
- `model/types.ts`: editor feature and context types.
- `model/constants.ts`: tool definitions, supported ratios, shape labels, and history serialization.
- `model/objectName.ts`: consistent layer naming.
- `EditorContext.tsx`: typed access to the active editor state and actions.
- `../../App.tsx`: owns document state, Fabric lifecycle, history coordination, keyboard shortcuts, and connects the feature components.

To temporarily hide a feature from the editor, remove its entry from `model/constants.ts` (`editorTools`) and its panel case from `components/ToolPanel.tsx`. Keep the corresponding operation module if you plan to restore it later.