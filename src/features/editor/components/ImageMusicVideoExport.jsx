
import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useEditor } from "../EditorContext";
import { drawProjectWatermark } from "../operations/projectWatermark";
import {
  ArrowLeft,
  Image as ImageIcon,
  Music2,
  Play,
  Square,
  Mic,
  MicOff,
  Trash2,
} from "lucide-react";
import "./ImageMusicVideoExport.css";

const FPS = 30;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const WAVEFORM_BAR_COUNT = 160;

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getAudioExtension(file) {
  const extension = file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  if (extension) return extension.toLowerCase();

  const extensionsByType = {
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-wav": "wav",
  };

  return extensionsByType[file.type] || "audio";
}

export default function ImageMusicVideoExport({
  fabricCanvas,
  hasImage = false,
  imagePreviewUrl = "",
  imageDimensions = { width: 0, height: 0 },
  isActive = true,
  onBack,
}) {
  const { preview, tools, project, export: exportState, videoAudio, setVideoAudio } = useEditor();
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

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const [waveformPeaks, setWaveformPeaks] = useState([]);
  const [isDraggingTrim, setIsDraggingTrim] = useState(false);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const voiceStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);

  const waveformRef = useRef(null);
  const trimDragRef = useRef(null);

  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);
  const segmentDuration = endTime - startTime;
  const sourceDuration = musicFile ? audioDuration : voiceDuration;
  const waveformFile = musicFile || voiceFile;
  const busy = status === "recording" || status === "converting";

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

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      voiceAudioRef.current?.pause();

      if (voiceRecorderRef.current?.state === "recording") {
        voiceRecorderRef.current.stop();
      }

      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());

      ffmpegRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let audioContext;

    async function createWaveform() {
      if (!waveformFile) {
        setWaveformPeaks([]);
        return;
      }

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        setWaveformPeaks([]);
        return;
      }

      try {
        audioContext = new AudioContextClass();

        const audioBuffer = await audioContext.decodeAudioData(
          await waveformFile.arrayBuffer()
        );

        const peaks = Array.from(
          { length: WAVEFORM_BAR_COUNT },
          (_, index) => {
            const start = Math.floor(
              (index * audioBuffer.length) / WAVEFORM_BAR_COUNT
            );

            const end = Math.max(
              start + 1,
              Math.floor(
                ((index + 1) * audioBuffer.length) / WAVEFORM_BAR_COUNT
              )
            );

            let peak = 0;

            for (
              let channel = 0;
              channel < audioBuffer.numberOfChannels;
              channel += 1
            ) {
              const samples = audioBuffer.getChannelData(channel);

              for (let sample = start; sample < end; sample += 1) {
                peak = Math.max(peak, Math.abs(samples[sample] || 0));
              }
            }

            return peak;
          }
        );

        if (!cancelled) {
          setWaveformPeaks(peaks);
        }
      } catch {
        if (!cancelled) {
          setWaveformPeaks([]);
        }
      } finally {
        if (audioContext && audioContext.state !== "closed") {
          await audioContext.close().catch(() => {});
        }
      }
    }

    createWaveform();

    return () => {
      cancelled = true;

      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [waveformFile]);

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
    setStatus("idle");
    setProgressText("");
    setError("");
  }

  function setVoiceAudioFile(file) {
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setError("Please select a valid voice-over audio file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Voice-over audio must be 50 MB or smaller.");
      return;
    }

    stopPreview();
    setVoiceDuration(0);

    if (!musicFile) {
      setStartTime(0);
      setEndTime(0);
    }

    if (voiceUrl) {
      URL.revokeObjectURL(voiceUrl);
    }

    const url = URL.createObjectURL(file);

    setVoiceFile(file);
    setVoiceUrl(url);
    setError("");
  }

  function handleVoiceChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setVoiceAudioFile(file);
  }

  async function startVoiceRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Voice recording is not supported in this browser. Please upload an audio file instead."
      );
      return;
    }

    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];

      const preferredType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError(
          "Voice recording failed. Please try again or upload an audio file."
        );

        setIsRecordingVoice(false);

        stream.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";

        const blob = new Blob(voiceChunksRef.current, {
          type: mimeType,
        });

        const extension = mimeType.includes("mp4") ? "m4a" : "webm";

        if (blob.size > 0) {
          setVoiceAudioFile(
            new File([blob], `voice-over-${Date.now()}.${extension}`, {
              type: mimeType,
            })
          );
        }

        stream.getTracks().forEach((track) => track.stop());

        if (voiceStreamRef.current === stream) {
          voiceStreamRef.current = null;
        }

        setIsRecordingVoice(false);
      };

      recorder.start();
      setIsRecordingVoice(true);
    } catch (recordingError) {
      setError(
        recordingError?.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access or upload an audio file."
          : "Could not access the microphone. Please upload an audio file instead."
      );

      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
      setIsRecordingVoice(false);
    }
  }

  function stopVoiceRecording() {
    if (voiceRecorderRef.current?.state === "recording") {
      voiceRecorderRef.current.stop();
    }
  }

  function clearVoiceOver() {
    stopPreview();

    if (voiceUrl) {
      URL.revokeObjectURL(voiceUrl);
    }

    setVoiceUrl("");
    setVoiceFile(null);
    setVoiceDuration(0);

    if (!musicFile) {
      setStartTime(0);
      setEndTime(0);
    }

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

  function updateStartTime(value) {
    stopPreview();

    setStartTime(Math.max(0, Math.min(value, endTime - 1)));
    setError("");
  }

  function updateEndTime(value) {
    stopPreview();

    setEndTime(Math.min(sourceDuration, Math.max(value, startTime + 1)));
    setError("");
  }

  function getTimeFromPointer(clientX) {
    const bounds = waveformRef.current?.getBoundingClientRect();

    if (!bounds || !sourceDuration) return 0;

    const progress = Math.max(
      0,
      Math.min(1, (clientX - bounds.left) / bounds.width)
    );

    return Math.round(progress * sourceDuration);
  }

  function handleTrimPointerDown(event) {
    if (!sourceDuration || busy) return;

    const bounds = waveformRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const trimTarget = event.target.closest?.("[data-trim-part]");
    let part = trimTarget?.dataset.trimPart;

    if (!part) {
      const pointerTime = getTimeFromPointer(event.clientX);

      part =
        Math.abs(pointerTime - startTime) <=
        Math.abs(pointerTime - endTime)
          ? "start"
          : "end";
    }

    stopPreview();
    setError("");

    trimDragRef.current = {
      pointerId: event.pointerId,
      part,
      startX: event.clientX,
      startTime,
      endTime,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingTrim(true);

    event.preventDefault();
  }

  function handleTrimPointerMove(event) {
    const drag = trimDragRef.current;
    const bounds = waveformRef.current?.getBoundingClientRect();

    if (!drag || drag.pointerId !== event.pointerId || !bounds) return;

    const delta =
      ((event.clientX - drag.startX) / bounds.width) * sourceDuration;

    if (drag.part === "move") {
      const duration = drag.endTime - drag.startTime;

      const nextStart = Math.max(
        0,
        Math.min(sourceDuration - duration, drag.startTime + delta)
      );

      setStartTime(nextStart);
      setEndTime(nextStart + duration);
      return;
    }

    const pointerTime = getTimeFromPointer(event.clientX);

    if (drag.part === "start") {
      setStartTime(Math.max(0, Math.min(pointerTime, endTime - 1)));
    } else {
      setEndTime(Math.min(sourceDuration, Math.max(pointerTime, startTime + 1)));
    }
  }

  function handleTrimPointerUp(event) {
    if (trimDragRef.current?.pointerId !== event.pointerId) return;

    trimDragRef.current = null;
    setIsDraggingTrim(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleTrimKeyDown(event, part) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();

    const direction = event.key === "ArrowRight" ? 1 : -1;

    if (part === "start") {
      updateStartTime(startTime + direction);
    } else {
      updateEndTime(endTime + direction);
    }
  }

  async function loadFFmpeg() {
    if (ffmpegLoadedRef.current) {
      return ffmpegRef.current;
    }

    setProgressText("Loading MP4 converter...");

    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    const baseURL =
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    ffmpegRef.current = ffmpeg;
    ffmpegLoadedRef.current = true;

    return ffmpeg;
  }

  function createRecordingCanvas(sourceCanvas) {
    const originalWidth = sourceCanvas.width;
    const originalHeight = sourceCanvas.height;

    if (!originalWidth || !originalHeight) {
      throw new Error("The Fabric canvas has no image dimensions.");
    }

    const scale = Math.min(
      1,
      MAX_WIDTH / originalWidth,
      MAX_HEIGHT / originalHeight
    );

    const width = Math.max(
      2,
      Math.floor((originalWidth * scale) / 2) * 2
    );

    const height = Math.max(
      2,
      Math.floor((originalHeight * scale) / 2) * 2
    );

    const outputCanvas = document.createElement("canvas");

    outputCanvas.width = width;
    outputCanvas.height = height;

    const context = outputCanvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create the video canvas.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(sourceCanvas, 0, 0, width, height);

    return {
      outputCanvas,
      context,
      width,
      height,
    };
  }

  async function recordVideo(durationSeconds) {
    const sourceCanvas = fabricCanvas.toCanvasElement(1);
    if (exportState.watermark) {
      drawProjectWatermark(sourceCanvas, project.name);
    }

    const { outputCanvas, context } =
      createRecordingCanvas(sourceCanvas);

    const videoStream = outputCanvas.captureStream(FPS);
    const tracks = videoStream.getTracks();

    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      tracks.forEach((track) => track.stop());

      throw new Error("This browser does not support WebM recording.");
    }

    const recorder = new MediaRecorder(videoStream, { mimeType });
    const chunks = [];

    let animationFrame = 0;
    let timeoutId;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrame);
      tracks.forEach((track) => track.stop());
    };

    function drawFrame() {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

      context.drawImage(
        sourceCanvas,
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );

      animationFrame = requestAnimationFrame(drawFrame);
    }

    const stopRecording = () =>
      new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onerror = () => {
          cleanup();
          reject(new Error("Video recording failed."));
        };

        recorder.onstop = () => {
          cleanup();

          const blob = new Blob(chunks, { type: mimeType });

          if (blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error("Video recording returned an empty file."));
          }
        };

        drawFrame();
        recorder.start(1000);

        timeoutId = window.setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, durationSeconds * 1000 + 300);
      });

    try {
      return await stopRecording();
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  async function exportVideo() {
    if (!hasCanvasImage) {
      setError("Please add an image to the editor before exporting.");
      return;
    }

    if (
      (!musicFile && !voiceFile) ||
      (musicFile && (!audioRef.current || audioDuration <= 0)) ||
      (!musicFile && (!voiceAudioRef.current || voiceDuration <= 0))
    ) {
      setError("Please add background music or a voice-over first.");
      return;
    }

    if (!validAudioRange) {
      setError("Choose a valid audio segment before exporting.");
      return;
    }

    if (
      typeof fabricCanvas.toCanvasElement !== "function" ||
      typeof HTMLCanvasElement.prototype.captureStream !== "function" ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Canvas video recording is not supported in this browser.");
      return;
    }

    let ffmpeg;
    const temporaryFiles = [];

    try {
      stopPreview();

      setError("");
      setStatus("recording");
      setProgressText("Rendering edited image...");

      const webmBlob = await recordVideo(segmentDuration + 2);

      setStatus("converting");
      ffmpeg = await loadFFmpeg();

      setProgressText(
        musicFile && voiceFile
          ? "Mixing music and voice-over, then converting to MP4..."
          : musicFile
            ? "Trimming music and converting to MP4..."
            : "Trimming voice-over and converting to MP4..."
      );

      await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));
      temporaryFiles.push("input.webm");

      const ffmpegArgs = ["-y", "-i", "input.webm"];

      if (musicFile) {
        const audioInput = `input-audio.${getAudioExtension(musicFile)}`;

        await ffmpeg.writeFile(audioInput, await fetchFile(musicFile));
        temporaryFiles.push(audioInput);
        ffmpegArgs.push("-i", audioInput);
      } else {
        const voiceInput = `input-voice.${getAudioExtension(voiceFile)}`;

        await ffmpeg.writeFile(voiceInput, await fetchFile(voiceFile));
        temporaryFiles.push(voiceInput);
        ffmpegArgs.push("-i", voiceInput);
      }

      let audioFilter;

      if (musicFile && voiceFile) {
        const voiceInput = `input-voice.${getAudioExtension(voiceFile)}`;

        await ffmpeg.writeFile(voiceInput, await fetchFile(voiceFile));
        temporaryFiles.push(voiceInput);

        ffmpegArgs.push("-i", voiceInput);

        audioFilter =
          `[1:a:0]atrim=start=${startTime}:end=${endTime},` +
          `asetpts=PTS-STARTPTS,volume=${volume / 100}[music];` +
          `[2:a:0]atrim=duration=${segmentDuration},` +
          `asetpts=PTS-STARTPTS,volume=${voiceVolume / 100}[voice];` +
          `[music][voice]amix=inputs=2:duration=first:` +
          `dropout_transition=0:normalize=0[audio]`;
      } else if (musicFile) {
        audioFilter =
          `[1:a:0]atrim=start=${startTime}:end=${endTime},` +
          `asetpts=PTS-STARTPTS,volume=${volume / 100}[audio]`;
      } else {
        audioFilter =
          `[1:a:0]atrim=start=${startTime}:end=${endTime},` +
          `asetpts=PTS-STARTPTS,volume=${voiceVolume / 100}[audio]`;
      }

      ffmpegArgs.push(
        "-filter_complex",
        audioFilter,
        "-map",
        "0:v:0",
        "-map",
        "[audio]"
      );

      temporaryFiles.push("output.mp4");

      await ffmpeg.exec([
        ...ffmpegArgs,
        "-t",
        String(segmentDuration),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-r",
        String(FPS),
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "44100",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);

      const output = await ffmpeg.readFile("output.mp4");

      const mp4Blob = new Blob([output], {
        type: "video/mp4",
      });

      if (!mp4Blob.size) {
        throw new Error("MP4 conversion returned an empty file.");
      }

      const previewUrl = URL.createObjectURL(mp4Blob);

      const link = document.createElement("a");

      link.href = previewUrl;
      link.download = `photo-video-${Math.floor(startTime)}-${Math.floor(
        endTime
      )}.mp4`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus("done");
      setProgressText("MP4 video downloaded successfully.");

      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
    } catch (err) {
      console.error("Video export failed:", err);

      setStatus("error");

      setError(
        err?.message ||
          "Video export failed. Try a smaller image or a supported audio file."
      );

      setProgressText("");
    } finally {
      if (ffmpeg) {
        await Promise.all(
          temporaryFiles.map((file) =>
            ffmpeg.deleteFile(file).catch(() => {})
          )
        );
      }
    }
  }

  return (
    <section
      className="music-export"
      style={{ display: isActive ? undefined : "none" }}
      aria-hidden={!isActive}
    >
      <div className="music-preview-panel">
        <button
          type="button"
          className="music-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to editor
        </button>

        <div className="music-preview-frame">
          {hasCanvasImage && imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Selected image preview"
            />
          ) : (
            <div className="empty-prompt">
              <div className="empty-art">
                <div className="empty-sun" />
                <div className="empty-mountain one" />
                <div className="empty-mountain two" />
                <span className="empty-sparkle">✳</span>
              </div>

              <h1>Your next idea starts here</h1>

              <p>
                Drop an image to begin, or choose one from your computer.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => tools.openFilePicker()}
              >
                <ImageIcon size={16} />
                Upload an image
              </button>

              <span className="empty-format">PNG · JPG · WEBP</span>
            </div>
          )}
        </div>

        <div className="music-preview-caption">
          <span className="music-preview-icon">
            <ImageIcon size={16} />
          </span>

          <span>
            <strong>Selected image</strong>

            <small>
              {imageDimensions.width} × {imageDimensions.height} px
            </small>
          </span>
        </div>
      </div>

      <div className="music-export-controls">
        <div className="music-export-heading">
          <div>
            <span className="music-eyebrow">
              <Music2 size={13} />
              VIDEO STUDIO
            </span>

            <h2>Image to Video</h2>

            <p>
              Add a soundtrack and export your edited image as an MP4.
            </p>
          </div>

          <span className="mp4-badge">MP4</span>
        </div>

        <div className="music-export-field">
            <label htmlFor="background-music">Background music (optional)</label>

          <input
            id="background-music"
            type="file"
            accept="audio/*"
            onChange={handleMusicChange}
            disabled={busy}
          />

          {musicFile && (
            <p className="music-file-name">
              Selected: {musicFile.name}
            </p>
          )}
        </div>

        <div className="voice-over-section">
          <div className="voice-over-heading">
            <Mic size={16} aria-hidden="true" />
            <h3>Voice-over</h3>
          </div>

          <p className="voice-over-description">
            Record your voice or upload an existing recording. Add background
            music too, or use the voice-over as the only audio track.
          </p>

          <div className="voice-over-file">
            <label htmlFor="voice-over-audio">
              Upload voice-over audio
            </label>

            <input
              id="voice-over-audio"
              type="file"
              accept="audio/*"
              onChange={handleVoiceChange}
              disabled={busy || isRecordingVoice}
            />
          </div>

          <div className="voice-over-actions">
            {!isRecordingVoice ? (
              <button
                type="button"
                className="voice-over-button voice-over-button--record"
                onClick={startVoiceRecording}
                disabled={busy}
              >
                <Mic size={14} />
                Record voice-over
              </button>
            ) : (
              <button
                type="button"
                className="voice-over-button voice-over-button--recording"
                onClick={stopVoiceRecording}
                disabled={busy}
              >
                <MicOff size={14} />
                Stop recording
              </button>
            )}

            {voiceFile && (
              <button
                type="button"
                className="voice-over-button"
                onClick={clearVoiceOver}
                disabled={busy || isRecordingVoice}
              >
                <Trash2 size={14} />
                Remove voice-over
              </button>
            )}
          </div>

          {voiceFile && (
            <p className="voice-over-file-name">
              Selected: {voiceFile.name}
            </p>
          )}

          <p className="voice-over-status" role="status">
            {isRecordingVoice
              ? "Recording in progress. Speak into your microphone, then select Stop recording."
              : voiceFile
                ? musicFile
                  ? "Voice-over ready. It will mix with the selected background music."
                  : "Voice-over ready as the only audio track. Add music if you want a background soundtrack."
                : "Optional: record a voice-over or upload an audio file (50 MB maximum). It can be used by itself or mixed with music."}
          </p>

          {voiceUrl && (
            <audio
              ref={voiceAudioRef}
              src={voiceUrl}
              preload="metadata"
              className="voice-over-audio"
              onLoadedMetadata={handleVoiceMetadata}
              onTimeUpdate={handleVoiceTimeUpdate}
              onError={handleVoiceAudioError}
            />
          )}

          {voiceFile && <div className="voice-over-volume">
            <div className="voice-over-volume-label">
              <label htmlFor="voice-over-volume">
                Voice-over volume
              </label>

              <strong>{voiceVolume}%</strong>
            </div>

            <input
              id="voice-over-volume"
              type="range"
              min="0"
              max="100"
              value={voiceVolume}
              onChange={(event) => {
                const nextVolume = Number(event.target.value);

                setVoiceVolume(nextVolume);

                if (voiceAudioRef.current) {
                  voiceAudioRef.current.volume = nextVolume / 100;
                }
              }}
              disabled={busy}
            />
          </div>}
        </div>

        {musicUrl && (
          <audio
            ref={audioRef}
            src={musicUrl}
            preload="metadata"
            className="music-audio"
            onLoadedMetadata={handleAudioMetadata}
            onTimeUpdate={handlePreviewTimeUpdate}
            onEnded={() => setIsPreviewing(false)}
            onError={handleAudioError}
          />
        )}

        <div className="music-segment-section">
          <div className="music-segment-heading">
            <strong>Audio segment</strong>

            <span>
              {sourceDuration > 0
                ? formatTime(sourceDuration)
                : "--:--"}{" "}
              total
            </span>
          </div>

          <div
            className="music-trim-control"
            aria-label="Audio trim range"
          >
            <div className="music-trim-readout">
              <div>
                <span>Start</span>
                <strong>{formatTime(startTime)}</strong>
              </div>

              <div>
                <span>Selected</span>

                <strong>
                  {validAudioRange
                    ? formatTime(segmentDuration)
                    : "--:--"}
                </strong>
              </div>

              <div>
                <span>End</span>
                <strong>{formatTime(endTime)}</strong>
              </div>
            </div>

            <div
              className={`music-waveform ${
                isDraggingTrim ? "is-dragging" : ""
              } ${
                !sourceDuration || busy ? "is-disabled" : ""
              }`}
              ref={waveformRef}
              onPointerDown={handleTrimPointerDown}
              onPointerMove={handleTrimPointerMove}
              onPointerUp={handleTrimPointerUp}
              onPointerCancel={handleTrimPointerUp}
              role="group"
              aria-label="Drag the trim handles to choose the audio segment"
            >
              {waveformPeaks.length > 0 ? (
                <div
                  className="music-waveform-bars"
                  aria-hidden="true"
                >
                  {waveformPeaks.map((peak, index) => (
                    <span
                      key={index}
                      style={{
                        height: `${Math.max(8, peak * 100)}%`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="music-waveform-placeholder">
                  {sourceDuration
                    ? "Waveform unavailable"
                    : "Upload audio to trim"}
                </span>
              )}

              <div
                className="music-waveform-dim is-before"
                style={{ width: `${startPercent}%` }}
              />

              <div
                className="music-waveform-dim is-after"
                style={{ left: `${endPercent}%` }}
              />

              <div
                className="music-trim-selection"
                style={{
                  left: `${startPercent}%`,
                  width: `${endPercent - startPercent}%`,
                }}
              >
                <div
                  className="music-trim-window"
                  data-trim-part="move"
                  title="Drag to move the selected segment"
                />

                <button
                  type="button"
                  className="music-trim-handle is-start"
                  data-trim-part="start"
                  style={{ left: 0 }}
                  role="slider"
                  aria-label="Audio start time"
                  aria-valuemin={0}
                  aria-valuemax={Math.max(0, endTime - 1)}
                  aria-valuenow={Math.round(startTime)}
                  aria-valuetext={formatTime(startTime)}
                  onKeyDown={(event) =>
                    handleTrimKeyDown(event, "start")
                  }
                  disabled={!sourceDuration || busy}
                >
                  <span />
                </button>

                <button
                  type="button"
                  className="music-trim-handle is-end"
                  data-trim-part="end"
                  style={{ right: 0 }}
                  role="slider"
                  aria-label="Audio end time"
                  aria-valuemin={Math.min(
                    sourceDuration,
                    startTime + 1
                  )}
                  aria-valuemax={sourceDuration}
                  aria-valuenow={Math.round(endTime)}
                  aria-valuetext={formatTime(endTime)}
                  onKeyDown={(event) =>
                    handleTrimKeyDown(event, "end")
                  }
                  disabled={!sourceDuration || busy}
                >
                  <span />
                </button>
              </div>
            </div>

            <div
              className="music-waveform-scale"
              aria-hidden="true"
            >
              <span>00:00</span>
              <span>{formatTime(sourceDuration)}</span>
            </div>
          </div>

          <div className="music-preview-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={playPreview}
              disabled={(!musicFile && !voiceFile) || !validAudioRange || busy}
            >
              <Play size={14} />
              Play preview
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={stopPreview}
              disabled={!isPreviewing || busy}
            >
              <Square size={13} />
              Stop preview
            </button>
          </div>
        </div>

        {musicFile && <div className="music-export-field">
          <label htmlFor="music-volume">
            Music volume: {volume}%
          </label>

          <input
            id="music-volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(event) => {
              const nextVolume = Number(event.target.value);

              setVolume(nextVolume);

              if (audioRef.current) {
                audioRef.current.volume = nextVolume / 100;
              }
            }}
            disabled={busy}
          />

          <p className="field-hint">
            Video duration:{" "}
            {validAudioRange
              ? formatTime(segmentDuration)
              : "--:--"}
          </p>
        </div>}

        <button
          type="button"
          className="export-mp4-button"
          onClick={exportVideo}
          disabled={
            !hasCanvasImage ||
            (!musicFile && !voiceFile) ||
            (musicFile && audioDuration <= 0) ||
            (!musicFile && voiceDuration <= 0) ||
            !validAudioRange ||
            busy ||
            isRecordingVoice
          }
        >
          {status === "recording"
            ? "Rendering video..."
            : status === "converting"
              ? "Converting to MP4..."
              : "Export MP4 Video"}
        </button>

        {progressText && (
          <p className="export-status" role="status">
            {progressText}
          </p>
        )}

        {status === "done" && (
          <p className="export-success" role="status">
            Your MP4 export is ready.
          </p>
        )}

        {error && (
          <p className="export-error" role="alert">
            {error}
          </p>
        )}

        <p className="export-note">
          Large videos can take time to process. Keep this tab open until
          the download starts.
        </p>
      </div>
    </section>
  );
}
