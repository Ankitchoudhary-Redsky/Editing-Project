import { ImagePlus, Music2, RotateCcw, Trash } from 'lucide-react'
import { useEditor } from '../../../editor/EditorContext'

export function UploadPanel() {
  const { canvas, fabricCanvas, tools, pages } = useEditor()
  const uploadedPages = [
    ...(canvas.hasImage
      ? [{
          id: 'page-1',
          pageId: null,
          pageNumber: 1,
          imageUrl: canvas.imageThumbnail,
          fileName: 'Current image',
          width: canvas.dimensions.width,
          height: canvas.dimensions.height,
        }]
      : []),
    ...pages.items.flatMap((page, index) => page.imageUrl
      ? [{
          id: `page-${page.id}`,
          pageId: page.id,
          pageNumber: index + 2,
          imageUrl: page.imageUrl,
          fileName: page.fileName ?? `Page ${index + 2} image`,
          width: page.width ?? 0,
          height: page.height ?? 0,
        }]
      : []),
  ]

  return (
    <div className="panel-content">
      <button className="upload-drop" onClick={tools.openFilePicker}>
        <span className="upload-icon"><ImagePlus size={21} /></span>
        <strong>Upload an image</strong>
        <span>PNG, JPG or WebP · up to 30 MB</span>
        <span className="browse-button">Choose a file</span>
      </button>
      <button className="secondary-button" type="button" onClick={() => tools.setActive('music')}>
        <Music2 size={16} />
        Add music
      </button>
      {uploadedPages.length > 0
        ? (
          <div className="uploaded-pages-list" aria-label="Uploaded page images">
            {uploadedPages.map((page) => (
              <div className="uploaded-item" key={page.id}>
                <img
                  src={page.imageUrl}
                  alt={`Page ${page.pageNumber} thumbnail`}
                  draggable
                  onDragStart={(event) => {
                    const sourcePage = page.pageId === null
                      ? undefined
                      : pages.items.find((item) => item.id === page.pageId)
                    const imageUrl = sourcePage?.imageUrl ?? (
                      page.pageId === null && fabricCanvas
                        ? fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })
                        : undefined
                    )
                    if (!imageUrl) {
                      event.preventDefault()
                      return
                    }

                    event.dataTransfer.effectAllowed = 'copy'
                    event.dataTransfer.setData('application/x-estudio-page-image', JSON.stringify({
                      imageUrl,
                      fileName: sourcePage?.fileName ?? page.fileName,
                      width: sourcePage?.width ?? page.width,
                      height: sourcePage?.height ?? page.height,
                    }))
                  }}
                />
                <div>
                  <strong title={page.fileName}>Page {page.pageNumber}</strong>
                  <span>{page.width} × {page.height} px</span>
                </div>
                {page.pageId === null ? (
                  <>
                    <button className="mini-button" onClick={tools.openFilePicker} title="Replace image">
                      <RotateCcw size={15} />
                    </button>
                    <button className="mini-button" onClick={tools.deleteImage} title="Delete image">
                      <Trash size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="mini-button" onClick={() => pages.replace(page.pageId!)} title="Replace image">
                      <RotateCcw size={15} />
                    </button>
                    <button className="mini-button" onClick={() => pages.delete(page.pageId!)} title="Delete page">
                      <Trash size={15} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )
        : <p className="panel-note">Your images stay on this device. Nothing is uploaded to a server.</p>}
      <div className="panel-separator" />
      <div className="panel-label-row"><span>Document</span><span>{canvas.dimensions.width} × {canvas.dimensions.height}</span></div>
    </div>
  )
}