import { useRef, useState, type DragEvent } from "react";
import {
  Check,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import type { CanvasLibraryItem } from "../collaboration/canvasDocumentService";

type UploadLandingProps = {
  restoring: boolean;
  onUpload: (
    file: File,
    onProgress: (progress: number) => void,
  ) => Promise<string | null>;
  onUploadStart: () => void;
  onUploadFinish: () => void;
  libraryItems: CanvasLibraryItem[];
  libraryLoading: boolean;
  libraryError: string;
  onRefreshLibrary: (force?: boolean) => void;
  onOpenDocument: (documentId: string) => void;
  openingDocumentId: string;
  initialView?: "upload" | "workspace";
  workspaceOnly?: boolean;
  onClose?: () => void;
};

export function UploadLanding({
  restoring,
  onUpload,
  onUploadStart,
  onUploadFinish,
  libraryItems,
  libraryLoading,
  libraryError,
  onRefreshLibrary,
  onOpenDocument,
  openingDocumentId,
  initialView = "upload",
  workspaceOnly = false,
  onClose,
}: UploadLandingProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"upload" | "workspace">(initialView);
  const [search, setSearch] = useState("");

  const matchingItems = libraryItems.filter((item) =>
    `${item.name} ${item.storage_path}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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
      <header className="upload-landing-header">
        <span className="upload-brand-mark">
          <ImagePlus size={18} />
        </span>
        <span className="upload-brand-name">estudio</span>
        <span className="upload-local-label">LOCAL IMAGE EDITOR</span>
        {onClose && (
          <button
            type="button"
            className="workspace-dialog-close"
            onClick={onClose}
            aria-label="Close workspace"
            title="Close workspace"
          >
            <X size={19} />
          </button>
        )}
      </header>
      <div className="upload-landing-main">
        {!workspaceOnly && (
          <nav className="workspace-tabs" aria-label="Start options">
            <button
              type="button"
              className={view === "upload" ? "active" : ""}
              aria-pressed={view === "upload"}
              onClick={() => setView("upload")}
            >
              <Upload size={15} /> Upload
            </button>
            <button
              type="button"
              className={view === "workspace" ? "active" : ""}
              aria-pressed={view === "workspace"}
              onClick={() => {
                setView("workspace");
                void onRefreshLibrary();
              }}
            >
              <FolderOpen size={15} /> Workspace
              {libraryItems.length > 0 && <span>{libraryItems.length}</span>}
            </button>
          </nav>
        )}
        {!workspaceOnly && view === "upload" ? (
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
                ? "Opening shared document"
                : busy
                  ? "Preparing your image"
                  : dragging
                    ? "Drop to open your image"
                    : "Start with a photo"}
            </h1>
            <p className="upload-description">
              {restoring
                ? "Loading the original image and saved canvas…"
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
                  <span>
                    {progress >= 100 ? "Image ready" : "Loading image"}
                  </span>
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
        ) : (
          <section
            className="workspace-library"
            aria-label="Saved image workspace"
          >
            <header className="workspace-library-heading">
              <div>
                <span className="upload-eyebrow">Your saved images</span>
                <h1>Workspace</h1>
              </div>
              <button
                type="button"
                className="workspace-refresh"
                title="Refresh saved images"
                aria-label="Refresh saved images"
                onClick={() => onRefreshLibrary(true)}
                disabled={libraryLoading}
              >
                <RefreshCw
                  size={16}
                  className={libraryLoading ? "spinning" : ""}
                />
              </button>
            </header>
            <label className="workspace-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search images or storage paths"
                aria-label="Search saved images"
              />
            </label>
            {libraryError && libraryItems.length === 0 ? (
              <div className="workspace-library-message" role="status">
                <strong>Workspace unavailable</strong>
                <span>{libraryError}</span>
              </div>
            ) : libraryLoading && libraryItems.length === 0 ? (
              <div className="workspace-library-message" role="status">
                <LoaderCircle size={20} className="upload-spinner" />
                <span>Loading saved images…</span>
              </div>
            ) : matchingItems.length === 0 ? (
              <div className="workspace-library-message">
                <FolderOpen size={25} />
                <strong>
                  {search ? "No matching images" : "No saved images yet"}
                </strong>
                <span>
                  {search
                    ? "Try a different name or path."
                    : "Upload an image to add it to this workspace."}
                </span>
              </div>
            ) : (
              <div className="workspace-image-grid">
                {libraryError && libraryItems.length > 0 && (
                  <p className="workspace-library-warning" role="status">
                    {libraryError}
                  </p>
                )}
                {matchingItems.map((item) => (
                  <button
                    type="button"
                    className={`workspace-image-item${openingDocumentId === item.id ? " opening" : ""}`}
                    key={item.id}
                    onClick={() => onOpenDocument(item.id)}
                    disabled={Boolean(openingDocumentId)}
                    title={`Open ${item.name}`}
                  >
                    <span className="workspace-image-preview">
                      <img src={item.imageUrl} alt="" loading="lazy" />
                      {openingDocumentId === item.id && (
                        <span className="workspace-image-opening">
                          <LoaderCircle size={18} />
                        </span>
                      )}
                    </span>
                    <span className="workspace-image-meta">
                      <strong>{item.name || "Untitled image"}</strong>
                      <small className="workspace-image-path">
                        {item.storage_bucket}/{item.storage_path}
                      </small>
                      {item.storageOnly && (
                        <small className="workspace-storage-only-label">
                          Original only · saved edits unavailable
                        </small>
                      )}
                      <small>
                        Updated {new Date(item.updated_at).toLocaleDateString()}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        {!workspaceOnly && view === "upload" && (
          <p className="upload-privacy-note">
            Local drafts stay in this browser. Shared originals use your
            Supabase Storage bucket.
          </p>
        )}
      </div>
      <footer className="upload-landing-footer">
        <span>PHOTO EDITING STUDIO</span>
        <span>Make room for a little imagination.</span>
      </footer>
    </section>
  );
}
