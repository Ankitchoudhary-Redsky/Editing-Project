import { useEffect, useState } from 'react'
import type { FabricObject } from 'fabric'

export function useEditorUiState() {
  const [hasDocument, setHasDocument] = useState(false)
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null)
  const [objects, setObjects] = useState<FabricObject[]>([])
  const [hasImage, setHasImage] = useState(false)
  const [selectedIsImage, setSelectedIsImage] = useState(false)
  const [imageThumbnail, setImageThumbnail] = useState('')
  const [draggingFile, setDraggingFile] = useState(false)
  const [notice, setNotice] = useState('')
  const [cropActive, setCropActive] = useState(false)
  const [cropRotation, setCropRotation] = useState(0)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(timer)
  }, [notice])

  return {
    hasDocument, setHasDocument,
    selectedObject, setSelectedObject,
    objects, setObjects,
    hasImage, setHasImage,
    selectedIsImage, setSelectedIsImage,
    imageThumbnail, setImageThumbnail,
    draggingFile, setDraggingFile,
    notice, setNotice,
    cropActive, setCropActive,
    cropRotation, setCropRotation,
    dimensions, setDimensions,
    draftReady, setDraftReady,
  }
}