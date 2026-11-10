import type { DragEvent } from 'react'
import { ImagePlus, Music2, RotateCcw, Trash } from 'lucide-react'
import { useEditor } from '../../../editor/EditorContext'

export function UploadPanel() {
  const { canvas, fabricCanvas, tools, pages } = useEditor()

  const handleUploadDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleUploadDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (pages.switching) return
    void tools.uploadFile(event.dataTransfer.files[0])
  }

  const showPageOne = canvas.hasImage || canvas.hasDocument || pages.items.length > 0 || canvas.hasDeletedPageOneImage
  const uploadedPages = [
    ...(showPageOne
      ? [{
          id: 'page-1',
          pageId: null,
          pageNumber: 1,
          imageUrl: pages.activeId === null ? canvas.imageThumbnail || pages.pageOnePreview : pages.pageOnePreview,
          fileName: 'Current image',
          width: canvas.dimensions.width,
          height: canvas.dimensions.height,
        }]
      : []),
    ...pages.items.flatMap((page, index) => {
      const pageNumber = index + 2
      return page.imageUrl
      ? [{
          id: `page-${page.id}`,
          pageId: page.id,
          pageNumber,
          imageUrl: page.imageUrl,
          fileName: page.fileName ?? `Page ${pageNumber} image`,
          width: page.width ?? 0,
          height: page.height ?? 0,
        }]
      : []
    }),
  ]

  return (
    <div className="panel-content">
      <button
        className="upload-drop"
        disabled={pages.switching}
        onClick={tools.openFilePicker}
        onDragOver={handleUploadDragOver}
        onDrop={handleUploadDrop}
      >
        <span className="upload-icon"><ImagePlus size={21} /></span>
        <strong>Upload an image</strong>
        <span>PNG, JPG or WebP · up to 30 MB</span>
        <span className="browse-button">Choose a file</span>
      </button>
      <button className="secondary-button" type="button" disabled={pages.switching} onClick={() => tools.setActive('music')}>
        <Music2 size={16} />
        Add music
      </button>
      {uploadedPages.length > 0
        ? (
          <div className="uploaded-pages-list" aria-label="Uploaded page images">
            {uploadedPages.map((page) => (
              <div className={`uploaded-item${pages.activeId === page.pageId ? ' active' : ''}`} key={page.id}>
                <button
                  type="button"
                  className="uploaded-item-select"
                  aria-pressed={pages.activeId === page.pageId}
                  aria-label={`Go to Page ${page.pageNumber}`}
                  onClick={() => pages.select(page.pageId)}
                >
                  {page.imageUrl ? (
                    <img
                      src={page.imageUrl}
                      alt=""
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
                  ) : (
                    <span className="uploaded-item-placeholder" aria-hidden="true"><ImagePlus size={18} /></span>
                  )}
                  <span className="uploaded-item-details">
                    <strong title={page.fileName}>Page {page.pageNumber}</strong>
                    <span>{page.width} × {page.height} px</span>
                  </span>
                </button>
                {page.pageId === null ? (
                  <>
                    <button className="mini-button" disabled={pages.switching} onClick={tools.openFilePicker} title={canvas.hasImage ? 'Replace image' : 'Upload image'}>
                      {canvas.hasImage ? <RotateCcw size={15} /> : <ImagePlus size={15} />}
                    </button>
                    {canvas.hasImage && (
                      <button className="mini-button" disabled={pages.switching} onClick={tools.deleteImage} title="Delete image">
                        <Trash size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button className="mini-button" disabled={pages.switching} onClick={() => pages.replace(page.pageId!)} title="Replace image">
                      <RotateCcw size={15} />
                    </button>
                    <button className="mini-button" disabled={pages.switching} onClick={() => pages.delete(page.pageId!)} title="Delete page">
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