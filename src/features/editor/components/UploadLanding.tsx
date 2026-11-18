import { useRef, useState, type DragEvent } from "react";
import { Check, ImagePlus, LoaderCircle, Upload } from "lucide-react";

type UploadLandingProps = {
  restoring: boolean;
  onUpload: (
    file: File,
    onProgress: (progress: number) => void,
  ) => Promise<string | null>;
  onUploadStart: () => void;
  onUploadFinish: () => void;
};

export function UploadLanding({
  restoring,
  onUpload,
  onUploadStart,
  onUploadFinish,
}: UploadLandingProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file || restoring || busy) return;
    setError("");
    setProgress(0);
    setBusy(true);
    onUploadStart();
    try {
      const result = await onUpload(file, setProgress);
      if (result) {
        setError(result);
        setProgress(0);
        return;
      }
      setProgress(100);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The image could not be opened.",
      );
      setProgress(0);
    } finally {
      setBusy(false);
      onUploadFinish();
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  };

  return (
    <section className="upload-landing" aria-label="Start editing">
      {/* <header className="upload-landing-header">
        <span className="upload-brand-mark">
          <ImagePlus size={18} />
        </span>
        <span className="upload-brand-name">estudio</span>
        <span className="upload-local-label">LOCAL IMAGE EDITOR</span>
      </header> */}
      <div className="upload-landing-main">
        <div
          className={`upload-dropzone${dragging ? " is-dragging" : ""}${busy ? " is-loading" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.stopPropagation();
            if (event.currentTarget === event.target) setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <div className="upload-art" aria-hidden="true">
            {busy && progress >= 100 ? (
              <Check size={30} />
            ) : busy ? (
              <LoaderCircle className="upload-spinner" size={30} />
            ) : (
              <ImagePlus size={30} strokeWidth={1.5} />
            )}
          </div>
          <span className="upload-eyebrow">A new canvas</span>
          <h1>
            {restoring
              ? "Checking your saved work"
              : busy
                ? "Preparing your image"
                : dragging
                  ? "Drop to open your image"
                  : "Start with a photo"}
          </h1>
          <p className="upload-description">
            {restoring
              ? "Restoring your latest local project…"
              : busy
                ? "Reading and preparing the image on this device."
                : "Bring an image into the studio, then make it yours."}
          </p>

          {busy ? (
            <div
              className="upload-progress-block"
              role="status"
              aria-live="polite"
            >
              <div className="upload-progress-label">
                <span>{progress >= 100 ? "Image ready" : "Loading image"}</span>
                <strong>{progress}%</strong>
              </div>
              <div
                className="upload-progress-track"
                role="progressbar"
                aria-label="Image loading progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="upload-primary-button"
                disabled={restoring}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={17} /> Choose an image
              </button>
              <span className="upload-drop-hint">
                or drop it anywhere in this frame
              </span>
            </>
          )}

          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              void upload(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {error && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
          <div className="upload-file-meta">
            <span>PNG</span>
            <i />
            <span>JPG</span>
            <i />
            <span>WEBP</span>
            <i />
            <span>UP TO 30 MB</span>
          </div>
        </div>
        <p className="upload-privacy-note">
          Your image stays on this device. Nothing is uploaded to a server.
        </p>
      </div>
      <footer className="upload-landing-footer">
        <span>PHOTO EDITING STUDIO</span>
        <span>Make room for a little imagination.</span>
      </footer>
    </section>
  );
}
