import { useState } from "react";
import { useEditor } from "../EditorContext";
import { VideoExportPreview } from "./videoExport/VideoExportPreview";
import { useMp4Export } from "./videoExport/useMp4Export";
import { useAudioWaveform } from "./videoExport/useAudioWaveform";
import { useVoiceRecorder } from "./videoExport/useVoiceRecorder";
import { useAudioTrim } from "./videoExport/useAudioTrim";
import { VideoAudioControls } from "./videoExport/VideoAudioControls";
import { useVideoAudioActions } from "./videoExport/useVideoAudioActions";
import { useVideoAudioPlayback } from "./videoExport/useVideoAudioPlayback";
import "./ImageMusicVideoExport.css";

export default function ImageMusicVideoExport({
  fabricCanvas,
  hasImage = false,
  imagePreviewUrl = "",
  imageDimensions = { width: 0, height: 0 },
  isActive = true,
  onBack,
}) {
  const {
    preview,
    tools,
    export: exportState,
    videoAudio,
    setVideoAudio,
  } = useEditor();
  const {
    music: { file: musicFile, url: musicUrl, duration: audioDuration },
    voice: { file: voiceFile, url: voiceUrl, duration: voiceDuration },
    startTime,
    endTime,
    musicVolume: volume,
    voiceVolume,
  } = videoAudio;

  const [error, setError] = useState("");
  const playback = useVideoAudioPlayback({
    preview,
    imagePreviewUrl,
    videoAudio,
    setVideoAudio,
    setError,
  });
  const { audioRef, voiceAudioRef, isPreviewing, stopPreview } = playback;
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
  const startPercent = sourceDuration ? (startTime / sourceDuration) * 100 : 0;
  const endPercent = sourceDuration ? (endTime / sourceDuration) * 100 : 0;

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
    watermark: exportState.watermark,
    stopPreview,
    setError,
  });

  const audioActions = useVideoAudioActions({
    videoAudio,
    setVideoAudio,
    stopPreview,
    resetExportState,
    setError,
    setIsPreviewing: playback.setIsPreviewing,
  });

  const {
    isRecordingVoice,
    handleVoiceChange,
    startVoiceRecording,
    stopVoiceRecording,
    clearVoiceOver,
  } = useVoiceRecorder({
    voiceUrl,
    musicFile,
    setVoiceFile: audioActions.setVoiceFile,
    setVoiceUrl: audioActions.setVoiceUrl,
    setVoiceDuration: audioActions.setVoiceDuration,
    setStartTime: audioActions.setStartTime,
    setEndTime: audioActions.setEndTime,
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
    setStartTime: audioActions.setStartTime,
    setEndTime: audioActions.setEndTime,
    stopPreview,
    setError,
  });

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
      <VideoAudioControls
        hasCanvasImage={hasCanvasImage}
        musicFile={musicFile}
        musicUrl={musicUrl}
        audioDuration={audioDuration}
        volume={volume}
        voiceFile={voiceFile}
        voiceUrl={voiceUrl}
        voiceDuration={voiceDuration}
        voiceVolume={voiceVolume}
        startTime={startTime}
        endTime={endTime}
        sourceDuration={sourceDuration}
        segmentDuration={segmentDuration}
        validAudioRange={validAudioRange}
        startPercent={startPercent}
        endPercent={endPercent}
        audioRef={audioRef}
        voiceAudioRef={voiceAudioRef}
        playback={playback}
        audioActions={audioActions}
        recorder={{ isRecordingVoice, handleVoiceChange, startVoiceRecording, stopVoiceRecording, clearVoiceOver }}
        trim={{ isDraggingTrim, waveformRef, handleTrimPointerDown, handleTrimPointerMove, handleTrimPointerUp, handleTrimKeyDown }}
        waveformPeaks={waveformPeaks}
        status={status}
        progressText={progressText}
        error={error}
        busy={busy}
        exportVideo={exportVideo}
      />
    </section>
  );
}