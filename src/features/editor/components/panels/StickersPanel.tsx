import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Sparkles } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { addAnimatedSticker, addEmojiSticker } from '../../operations/animatedSticker'
import { stickerCollections, type StickerPreset } from '../../model/stickers'

export function StickersPanel() {
  const { canvas, fabricCanvas, tools } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState<string[]>([])

  const handleStickerUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.includes('gif')) {
      tools.setNotice('Please select an animated GIF file.')
      return
    }

    if (!fabricCanvas || !canvas.hasDocument) {
      tools.setNotice('Please open an image in the editor first.')
      return
    }

    try {
      setLoading(true)
      await addAnimatedSticker(fabricCanvas, file)
      tools.setNotice('Animated sticker added to the canvas.')
    } catch (error) {
      console.error('Failed to add animated sticker:', error)
      tools.setNotice('Could not add this GIF. Please try another file.')
    } finally {
      setLoading(false)
    }
  }

  const handlePresetClick = (sticker: StickerPreset) => {
    if (!fabricCanvas || !canvas.hasDocument) {
      tools.setNotice('Please open an image before adding a sticker.')
      return
    }

    addEmojiSticker(fabricCanvas, sticker.emoji, sticker.motion)
    tools.setNotice(`${sticker.name} added to the canvas.`)
  }

  const toggleCollection = (title: string) => {
    setExpandedCollections((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title],
    )
  }

  return (
    <div className="sticker-panel-content">
      <div className="sticker-upload-row">
        <div>
          <h4>Animated stickers</h4>
          <p>Pick a sticker or add your own GIF.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/gif,.gif"
          hidden
          onChange={handleStickerUpload}
        />
        <button
          type="button"
          className="sticker-upload-button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload an animated GIF sticker"
          title="Upload GIF sticker"
        >
          {loading ? <LoaderCircle className="sticker-loading" size={18} /> : <ImagePlus size={18} />}
        </button>
      </div>

      {!canvas.hasDocument && (
        <p className="sticker-empty-note">Open an image to place stickers on your canvas.</p>
      )}

      <div className="sticker-collections">
        {stickerCollections.map((collection) => {
          const expanded = expandedCollections.includes(collection.title)
          const stickers = expanded
            ? collection.stickers
            : collection.stickers.slice(0, 4)

          return (
            <section className="sticker-collection" key={collection.title}>
              <div className="sticker-collection-heading">
                <h4>{collection.title}</h4>
                <button
                  type="button"
                  onClick={() => toggleCollection(collection.title)}
                  aria-expanded={expanded}
                >
                  {expanded ? 'Show less' : 'See all'}
                </button>
              </div>
              <div className="sticker-grid">
                {stickers.map((sticker) => (
                  <button
                    className={`sticker-tile tone-${sticker.tone}`}
                    type="button"
                    key={sticker.name}
                    aria-label={`Add ${sticker.name}`}
                    title={`Add ${sticker.name}`}
                    onClick={() => handlePresetClick(sticker)}
                  >
                    <span className={`sticker-preview motion-${sticker.motion}`} aria-hidden="true">
                      {sticker.emoji}
                    </span>
                    <span className="sticker-tile-name">{sticker.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="sticker-panel-footer">
        <Sparkles size={14} />
        <span>Animated on canvas · Select to move or resize</span>
      </div>
    </div>
  )
}