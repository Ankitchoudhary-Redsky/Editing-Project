import { useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { ImagePlus, LoaderCircle, Trash, Upload } from 'lucide-react'

import { useEditor } from '../../../editor/EditorContext'
import { loadLocalImage } from '../../operations/loadLocalImage'

type MediaAsset = {
  id: string
  name: string
  source: string
  thumbnail: string
  width: number
  height: number
}

const MEDIA_LIBRARY_KEY = 'pixel-studio-media-library'
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function isSupportedImage(file: File) {
  return SUPPORTED_IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name)
}

function createAssetId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function LibraryPanel() {
  const { canvas, fabricCanvas, tools } = useEditor()
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<MediaAsset[]>(() => {
    if (typeof localStorage === 'undefined') return []
    try {
      const stored = localStorage.getItem(MEDIA_LIBRARY_KEY)
      return stored ? JSON.parse(stored) as MediaAsset[] : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(false)
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(MEDIA_LIBRARY_KEY, JSON.stringify(assets))
  }, [assets])

  const uploadToLibrary = async (files: FileList | null) => {
    if (!files?.length) return
    setLoading(true)
    const nextAssets: MediaAsset[] = []
    const rejected: string[] = []

    try {
      for (const file of Array.from(files)) {
        if (!isSupportedImage(file) || file.size > 30 * 1024 * 1024) {
          rejected.push(file.name)
          continue
        }
        const loaded = await loadLocalImage(file)
        if (assets.some((asset) => asset.source === loaded.source) || nextAssets.some((asset) => asset.source === loaded.source)) continue
        nextAssets.push({
          id: createAssetId(),
          name: file.name,
          source: loaded.source,
          thumbnail: loaded.thumbnail,
          width: loaded.dimensions.width,
          height: loaded.dimensions.height,
        })
      }
      if (nextAssets.length) setAssets((current) => [...nextAssets, ...current])
      if (rejected.length) tools.setNotice(`Unsupported or oversized image: ${rejected[0]}`)
    } catch (error) {
      tools.setNotice(error instanceof Error ? error.message : 'Some images could not be added.')
    } finally {
      setLoading(false)
    }
  }

  const addAssetToCanvas = async (asset: MediaAsset) => {
    setActiveAssetId(asset.id)
    try {
      if (!canvas.hasImage) {
        const response = await fetch(asset.source)
        const blob = await response.blob()
        const file = new File([blob], asset.name, { type: blob.type || 'image/png' })
        await tools.uploadFile(file)
        return
      }
      if (!fabricCanvas) return
      const image = await FabricImage.fromURL(asset.source)
      const maxWidth = fabricCanvas.getWidth() * 0.52
      const maxHeight = fabricCanvas.getHeight() * 0.52
      const scale = Math.min(1, maxWidth / (image.width || 1), maxHeight / (image.height || 1))
      image.set({
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        name: asset.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Uploaded image',
        mediaAssetId: asset.id,
        isLibraryImage: true,
        selectable: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: true,
      })
      fabricCanvas.add(image)
      fabricCanvas.setActiveObject(image)
      fabricCanvas.requestRenderAll()
    } catch {
      tools.setNotice('This media asset could not be added to the canvas.')
    }
  }

  return (
    <div className="panel-content">
      <input
        ref={mediaInputRef}
        className="media-library-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          void uploadToLibrary(event.target.files)
          event.currentTarget.value = ''
        }}
      />
      <button className="primary-button media-upload-button" type="button" onClick={() => mediaInputRef.current?.click()} disabled={loading}>
        {loading ? <LoaderCircle className="media-loading-icon" size={16} /> : <Upload size={16} />}
        {loading ? 'Processing images...' : 'Upload files'}
      </button>
      <p className="panel-note">Add images to your library, then click any thumbnail to place a new copy on the canvas.</p>
      <div className="media-library-heading">
        <strong>Images</strong>
        <span>{assets.length} saved</span>
      </div>
      {assets.length ? (
        <div className="media-library-grid">
          {assets.map((asset) => (
            <div className={`media-asset ${activeAssetId === asset.id ? 'active' : ''}`} key={asset.id}>
              <button type="button" className="media-asset-select" onClick={() => void addAssetToCanvas(asset)} title={`Add ${asset.name} to canvas`}>
                <img src={asset.thumbnail} alt={asset.name} />
              </button>
              <button
                type="button"
                className="media-asset-delete"
                onClick={() => {
                  setAssets((current) => current.filter((item) => item.id !== asset.id))
                  setActiveAssetId((current) => current === asset.id ? null : current)
                }}
                title="Remove from library"
                aria-label={`Remove ${asset.name}`}
              >
                <Trash size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="media-library-empty">
          <ImagePlus size={18} />
          <span>Uploaded images will appear here</span>
        </div>
      )}
    </div>
  )
}
