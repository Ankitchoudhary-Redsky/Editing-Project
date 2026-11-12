import { useRef } from 'react'
import {
  Check,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { BACKGROUND_IMAGE_NAME } from '../../model/constants'

export function BackgroundPanel() {
  const { canvas, background } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canRemove =
    canvas.hasImage &&
    !background.removed &&
    !background.isRemoving
  const canEditCanvasBackground = canvas.hasDocument && (background.removed || !canvas.hasImage)
  const hasBackgroundLayer = canvas.objects.some((object) => object.get('name') === BACKGROUND_IMAGE_NAME)

  return (
    <div className="panel-content background-content">
      <div className="background-intro">
        <span className="background-icon">
          <Sparkles size={19} />
        </span>

        <strong>Background remover</strong>

        <p className="panel-note">
          Automatically separate the main subject from its background using
          an AI model running in your browser.
        </p>
      </div>

      <button
        type="button"
        className="primary-button full-button"
        disabled={!canRemove}
        onClick={() => void background.remove()}
      >
        {background.isRemoving ? (
          <LoaderCircle className="background-spinner" size={16} />
        ) : background.removed ? (
          <Check size={16} />
        ) : (
          <Scissors size={16} />
        )}

        {background.isRemoving
          ? 'Removing background...'
          : background.removed
            ? 'Background removed'
            : 'Remove background'}
      </button>

      {background.isRemoving && (
        <div className="background-progress" role="status" aria-live="polite">
          <span>{background.progress || 'Preparing AI model...'}</span>
          <p>The first run may take longer while the model downloads.</p>
        </div>
      )}

      {!canvas.hasImage && canvas.hasDocument && (
        <p className="panel-note">
          Add an image layer to use AI background removal. You can still add a background layer behind this artwork.
        </p>
      )}

      {canEditCanvasBackground && (
        <>
          <div className="panel-separator" />

          <div className="control-section">
            <div className="panel-label-row">
              <span>Solid background color</span>
            </div>

            <label className="field-label">
              Choose a color
              <input
                type="color"
                value={background.color}
                onChange={(event) => background.setColor(event.target.value)}
              />
            </label>
          </div>

          <div className="panel-separator" />

          <div className="control-section">
            <div className="panel-label-row">
              <span>Custom background image</span>
            </div>

            <button
              type="button"
              className="secondary-button full-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={16} />
              Upload background image
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void background.uploadBackground(file)
                event.currentTarget.value = ''
              }}
            />

            <p className="panel-note">
              The uploaded image is fitted to your canvas and placed behind
              the isolated subject.
            </p>
          </div>

          {hasBackgroundLayer && (
            <button
              type="button"
              className="secondary-button full-button"
              onClick={background.clearBackground}
            >
              <RotateCcw size={15} />
              Make background transparent
            </button>
          )}
        </>
      )}

      {canEditCanvasBackground && hasBackgroundLayer && (
        <p className="panel-note">
          {background.removed ? 'Reset restores your original image.' : 'Background layers stay independent from your artwork layers.'}
        </p>
      )}

      {background.removed && (
        <button
          type="button"
          className="secondary-button full-button"
          onClick={() => void background.reset()}
        >
          <RotateCcw size={15} />
          Reset
        </button>
      )}

      {canEditCanvasBackground && (
        <button
          type="button"
          className="secondary-button full-button"
          onClick={background.clearBackground}
        >
          <Trash2 size={15} />
          Clear background
        </button>
      )}
    </div>
  )
}