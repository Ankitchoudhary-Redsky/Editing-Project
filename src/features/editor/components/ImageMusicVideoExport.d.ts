import type { Canvas } from 'fabric'

type ImageMusicVideoExportProps = {
  fabricCanvas: Canvas
  hasImage: boolean
  imagePreviewUrl: string
  imageDimensions: { width: number; height: number }
  onBack: () => void
}

export default function ImageMusicVideoExport(
  props: ImageMusicVideoExportProps,
): JSX.Element