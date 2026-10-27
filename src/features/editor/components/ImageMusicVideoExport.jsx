
import { useEffect, useRef, useState } from "react";
import { useEditor } from "../EditorContext";
import { editorHeadings } from "../model/editorCopy";
import { VideoExportPreview } from "./videoExport/VideoExportPreview";
import { VoiceOverControls } from "./videoExport/VoiceOverControls";
import { AudioSegmentControls } from "./videoExport/AudioSegmentControls";
import { useMp4Export } from "./videoExport/useMp4Export";
import { useAudioWaveform } from "./videoExport/useAudioWaveform";
import { useVoiceRecorder } from "./videoExport/useVoiceRecorder";
import { useAudioTrim } from "./videoExport/useAudioTrim";
import { MusicTrackInput } from "./videoExport/MusicTrackInput";
import { MusicTrackAudio } from "./videoExport/MusicTrackAudio";
import { MusicTrackVolume } from "./videoExport/MusicTrackVolume";
import { Mp4ExportStatus } from "./videoExport/Mp4ExportStatus";
import { formatTime } from "./videoExport/videoExportUtils";
import { Music2 } from "lucide-react";
import "./ImageMusicVideoExport.css";

export default function ImageMusicVideoExport({
  fabricCanvas,
  hasImage = false,
  imagePreviewUrl = "",
  imageDimensions = { width: 0, height: 0 },
  isActive = true,
  onBack,
}) {
  const { preview, tools, videoAudio, setVideoAudio } = useEditor();
  const {
    music: { file: musicFile, url: musicUrl, duration: audioDuration },
    voice: { file: voiceFile, url: voiceUrl, duration: voiceDuration },
    startTime,
    endTime,
    musicVolume: volume,
    voiceVolume,
  } = videoAudio;

  const updateMusicTrack = (updates) =>
    setVideoAudio((current) => ({
      ...current,
      music: { ...current.music, ...updates },
    }));
  const updateVoiceTrack = (updates) =>
    setVideoAudio((current) => ({
      ...current,
      voice: { ...current.voice, ...updates },
    }));
  const setMusicFile = (file) => updateMusicTrack({ file });
  const setMusicUrl = (url) => updateMusicTrack({ url });
  const setAudioDuration = (duration) => updateMusicTrack({ duration });
  const setVoiceFile = (file) => updateVoiceTrack({ file });
  const setVoiceUrl = (url) => updateVoiceTrack({ url });
  const setVoiceDuration = (duration) => updateVoiceTrack({ duration });
  const setStartTime = (value) =>
    setVideoAudio((current) => ({ ...current, startTime: value }));
  const setEndTime = (value) =>
    setVideoAudio((current) => ({ ...current, endTime: value }));
  const setVolume = (musicVolume) =>
    setVideoAudio((current) => ({ ...current, musicVolume }));
  const setVoiceVolume = (voiceVolume) =>
    setVideoAudio((current) => ({ ...current, voiceVolume }));

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const voiceAudioRef = useRef(null);

  const segmentDuration = endTime - startTime;
  const sourceDuration = musicFile ? audioDuration : voiceDuration;
  const waveformFile = musicFile || voiceFile;
  const waveformPeaks = useAudioWaveform(waveformFile);

  const hasCanvasImage = Boolean(
    hasImage &&
      fabricCanvas &&
      fabricCanvas.getObjects().some((object) => object.type === "image")
  );

  const validAudioRange =
    Number.isFinite(sourceDuration) &&
    sourceDuration > 0 &&
    startTime >= 0 &&
    startTime < endTime &&
    endTime <= sourceDuration;

  const startPercent = sourceDuration
    ? (startTime / sourceDuration) * 100
    : 0;

  const endPercent = sourceDuration
    ? (endTime / sourceDuration) * 100
    : 0;

  useEffect(() => {
    preview.setVideo({
      imageUrl: imagePreviewUrl,
      audioUrl: musicFile ? musicUrl : voiceUrl,
      audioTrackLabel: musicFile ? "Music" : "Voice-over",
      startTime,
      endTime,
      volume: musicFile ? volume : voiceVolume,
      voiceOverUrl: musicFile ? voiceUrl || undefined : undefined,
      voiceOverVolume: voiceVolume,
      voiceOverStartTime: 0,
    });
  }, [
    endTime,
    imagePreviewUrl,
    musicUrl,
    preview.setVideo,
    startTime,
    volume,
    voiceFile,
    voiceUrl,
    voiceVolume,
  ]);

  useEffect(() => {
    if (preview.open && preview.mode === "video") {
      stopPreview();
    }
  }, [preview.mode, preview.open]);

  function stopPreview() {
    audioRef.current?.pause();
    voiceAudioRef.current?.pause();
    setIsPreviewing(false);
  }

  const {
    isRecordingVoice,
    handleVoiceChange,
    startVoiceRecording,
    stopVoiceRecording,
    clearVoiceOver,
  } = useVoiceRecorder({
    voiceUrl,
    musicFile,
    setVoiceFile,
    setVoiceUrl,
    setVoiceDuration,
    setStartTime,
    setEndTime,
    stopPreview,
    setError,
  });

  const { status, progressText, busy, exportVideo, resetExportState } = useMp4Export({
    fabricCanvas,
    hasCanvasImage,
    audioRef,
    voiceAudioRef,
    musicFile,
    voiceFile,
    audioDuration,
    voiceDuration,
    startTime,
    endTime,
    validAudioRange,
    volume,
    voiceVolume,
    stopPreview,
    setError,
  });

  const {
    isDraggingTrim,
    waveformRef,
    handleTrimPointerDown,
    handleTrimPointerMove,
    handleTrimPointerUp,
    handleTrimKeyDown,
  } = useAudioTrim({
    sourceDuration,
    busy,
    startTime,
    endTime,
    setStartTime,
    setEndTime,
    stopPreview,
    setError,
  });

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      voiceAudioRef.current?.pause();

    };
  }, []);

  function handleMusicChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    stopPreview();

    if (!file.type.startsWith("audio/")) {
      setError("Please select a valid audio file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Audio file must be 50 MB or smaller.");
      return;
    }

    if (musicUrl) {
      URL.revokeObjectURL(musicUrl);
    }

    const url = URL.createObjectURL(file);

    setMusicFile(file);
    setMusicUrl(url);
    setAudioDuration(0);
    setStartTime(0);
    setEndTime(0);
    resetExportState();
    setError("");
  }

  function handleVoiceMetadata(event) {
    const loadedDuration = event.currentTarget.duration;

    if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
      setVoiceDuration(0);
      setError("Could not read the duration of this voice-over.");
      return;
    }

    setVoiceDuration(loadedDuration);

    if (!musicFile) {
      setStartTime(0);
      setEndTime(loadedDuration);
    }

    setError("");
  }

  function handleAudioMetadata(event) {
    const loadedDuration = event.currentTarget.duration;

    if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
      setAudioDuration(0);
      setError("Could not read the duration of this audio file.");
      return;
    }

    setAudioDuration(loadedDuration);
    setStartTime(0);
    setEndTime(loadedDuration);
    setError("");
  }

  function handleVoiceAudioError() {
    setVoiceDuration(0);
    setIsPreviewing(false);
    setError("This voice-over file could not be loaded or is not supported.");
  }

  function handleAudioError() {
    setAudioDuration(0);
    setIsPreviewing(false);
    setError("This audio file could not be loaded or is not supported.");
  }

  async function playPreview() {
    const primaryAudio = musicFile
      ? audioRef.current
      : voiceAudioRef.current;

    if (!primaryAudio || !validAudioRange) return;

    primaryAudio.pause();
    primaryAudio.currentTime = startTime;
    primaryAudio.volume = musicFile
      ? volume / 100
      : voiceVolume / 100;

    try {
      await primaryAudio.play();

      if (musicFile && voiceAudioRef.current && voiceUrl) {
        voiceAudioRef.current.currentTime = 0;
        voiceAudioRef.current.volume = voiceVolume / 100;

        await voiceAudioRef.current.play().catch(() => {});
      }

      setIsPreviewing(true);
      setError("");
    } catch {
      setIsPreviewing(false);
      setError("Audio preview could not be started.");
    }
  }

  function handlePreviewTimeUpdate(event) {
    const audio = event.currentTarget;

    if (isPreviewing && audio.currentTime >= endTime) {
      audio.pause();
      audio.currentTime = endTime;

      voiceAudioRef.current?.pause();

      setIsPreviewing(false);
    }
  }

  function handleVoiceTimeUpdate(event) {
    if (!musicFile) {
      handlePreviewTimeUpdate(event);
    }
  }

  return (
    <section
      className="music-export"
      style={{ display: isActive ? undefined : "none" }}
      aria-hidden={!isActive}
    >
      <VideoExportPreview
        hasCanvasImage={hasCanvasImage}
        imagePreviewUrl={imagePreviewUrl}
        imageDimensions={imageDimensions}
        onBack={onBack}
        onUpload={() => tools.openFilePicker()}
      />

      <div className="music-export-controls">
        <div className="music-export-heading">
          <div>
            <span className="music-eyebrow">
              <Music2 size={13} />
              VIDEO STUDIO
            </span>

            <h2>{editorHeadings.imageToVideo}</h2>

            <p>
              Add a soundtrack and export your edited image as an MP4.
            </p>
          </div>

          <span className="mp4-badge">MP4</span>
        </div>

        <MusicTrackInput
          musicFile={musicFile}
          busy={busy}
          onChange={handleMusicChange}
        />

        <VoiceOverControls
          voiceFile={voiceFile}
          musicFile={musicFile}
          voiceUrl={voiceUrl}
          voiceVolume={voiceVolume}
          isRecordingVoice={isRecordingVoice}
          busy={busy}
          voiceAudioRef={voiceAudioRef}
          onFileChange={handleVoiceChange}
          onRecord={startVoiceRecording}
          onStopRecording={stopVoiceRecording}
          onRemove={clearVoiceOver}
          onMetadata={handleVoiceMetadata}
          onTimeUpdate={handleVoiceTimeUpdate}
          onError={handleVoiceAudioError}
          onVolumeChange={(event) => {
            const nextVolume = Number(event.target.value)
            setVoiceVolume(nextVolume)
            if (voiceAudioRef.current) voiceAudioRef.current.volume = nextVolume / 100
          }}
        />

        <MusicTrackAudio
          musicUrl={musicUrl}
          audioRef={audioRef}
          onLoadedMetadata={handleAudioMetadata}
          onTimeUpdate={handlePreviewTimeUpdate}
          onEnded={() => setIsPreviewing(false)}
          onError={handleAudioError}
        />

        <AudioSegmentControls
          sourceDuration={sourceDuration}
          formatTime={formatTime}
          startTime={startTime}
          endTime={endTime}
          validAudioRange={validAudioRange}
          segmentDuration={segmentDuration}
          isDraggingTrim={isDraggingTrim}
          busy={busy}
          waveformRef={waveformRef}
          onTrimPointerDown={handleTrimPointerDown}
          onTrimPointerMove={handleTrimPointerMove}
          onTrimPointerUp={handleTrimPointerUp}
          waveformPeaks={waveformPeaks}
          startPercent={startPercent}
          endPercent={endPercent}
          onTrimKeyDown={handleTrimKeyDown}
          canPlayPreview={Boolean(musicFile || voiceFile)}
          onPlayPreview={playPreview}
          isPreviewing={isPreviewing}
          onStopPreview={stopPreview}
        />

        <MusicTrackVolume
          musicFile={musicFile}
          volume={volume}
          validAudioRange={validAudioRange}
          segmentDuration={segmentDuration}
          formatTime={formatTime}
          busy={busy}
          onVolumeChange={(event) => {
            const nextVolume = Number(event.target.value)
            setVolume(nextVolume)
            if (audioRef.current) audioRef.current.volume = nextVolume / 100
          }}
        />

        <Mp4ExportStatus
          status={status}
          progressText={progressText}
          error={error}
          onExport={exportVideo}
          disabled={
            !hasCanvasImage ||
            (!musicFile && !voiceFile) ||
            (musicFile && audioDuration <= 0) ||
            (!musicFile && voiceDuration <= 0) ||
            !validAudioRange ||
            busy ||
            isRecordingVoice
          }
        />
      </div>
    </section>
  );
}
