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

export function BackgroundPanel() {
  const { canvas, background } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canRemove =
    canvas.hasImage &&
    !background.removed &&
    !background.isRemoving

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

      {!canvas.hasImage && (
        <p className="panel-note">
          Upload an image first to enable background removal.
        </p>
      )}

      {background.removed && (
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

          <button
            type="button"
            className="secondary-button full-button"
            onClick={background.clearBackground}
          >
            <RotateCcw size={15} />
            Make background transparent
          </button>
        </>
      )}

      {background.removed && (
        <p className="panel-note">
          Reset restores your original image.
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

      {background.removed && (
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