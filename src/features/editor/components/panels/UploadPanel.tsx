import type { DragEvent } from 'react'
import { ImagePlus, Music2, RotateCcw, Trash } from 'lucide-react'
import { useEditor } from '../../../editor/EditorContext'
import { editorCopy } from '../../model/editorCopy'

export function UploadPanel() {
  const { canvas, fabricCanvas, tools, pages } = useEditor()

  const openPageOneUpload = async () => {
    await pages.select(null)
    tools.openFilePicker()
  }

  const deletePageOneImage = () => pages.deleteFirst()

  const selectPageAndScroll = async (pageId: number | null) => {
    await pages.select(pageId)
    const pageSelector = pageId === null
      ? '[data-editor-page-id="first"]'
      : `[data-editor-page-id="${pageId}"]`
    document.querySelector<HTMLElement>(pageSelector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

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

  const showPageOne = !canvas.hasDeletedPageOneImage && (
    canvas.hasImage || canvas.hasDocument || pages.items.length > 0
  )
  const showPageOneDelete = pages.items.length > 0 || (pages.activeId === null && canvas.hasDocument)
  const addedPageNumberOffset = canvas.hasDeletedPageOneImage ? 1 : 2
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
      const pageNumber = index + addedPageNumberOffset
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
        <strong>{editorCopy.uploadImage}</strong>
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
                  onClick={() => void selectPageAndScroll(page.pageId)}
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
                        const imageUrl = page.pageId === pages.activeId && fabricCanvas
                          ? fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })
                          : page.imageUrl
                        if (!imageUrl) {
                          event.preventDefault()
                          return
                        }

                        event.dataTransfer.effectAllowed = 'copy'
                        const payload = JSON.stringify({
                          imageUrl,
                          fileName: sourcePage?.fileName ?? page.fileName,
                          width: sourcePage?.width ?? page.width,
                          height: sourcePage?.height ?? page.height,
                        })
                        event.dataTransfer.setData('application/x-estudio-page-image', payload)
                        event.dataTransfer.setData('text/plain', payload)
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
                    <button className="mini-button" disabled={pages.switching} onClick={openPageOneUpload} title={canvas.hasImage ? 'Replace image' : 'Upload image'}>
                      {canvas.hasImage ? <RotateCcw size={15} /> : <ImagePlus size={15} />}
                    </button>
                    {showPageOneDelete && (
                      <button className="mini-button" disabled={pages.switching} onClick={deletePageOneImage} title="Delete page">
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