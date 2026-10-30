import { useState } from 'react'
import type { DrawingMode, FilterId, ShapeKind } from '../model/types'

export function useEditorDesignSettingsState() {
  const [textValue, setTextValue] = useState('Your text here')
  const [fontFamily, setFontFamily] = useState('Georgia')
  const [fontSize, setFontSize] = useState(72)
  const [textColor, setTextColor] = useState('#273a32')
  const [textBackground, setTextBackground] = useState('#ffffff')
  const [textOpacity, setTextOpacity] = useState(100)
  const [textOutline, setTextOutline] = useState('#ffffff')
  const [textOutlineWidth, setTextOutlineWidth] = useState(0)
  const [textShadow, setTextShadow] = useState('none')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect')
  const [fillColor, setFillColor] = useState('#b9e4d1')
  const [transparentFill, setTransparentFill] = useState(false)
  const [strokeColor, setStrokeColor] = useState('#27332f')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [shapeOpacity, setShapeOpacity] = useState(90)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('original')
  const [filterIntensity, setFilterIntensity] = useState(100)
  const [backgroundRemoved, setBackgroundRemoved] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [backgroundProgress, setBackgroundProgress] = useState('')
  const [backgroundColor, setBackgroundColorState] = useState('#ffffff')
  const [drawingColor, setDrawingColor] = useState('#222222')
  const [brushSize, setBrushSize] = useState(12)
  const [activeDrawingMode, setActiveDrawingMode] = useState<DrawingMode>('pencil')

  return {
    textValue, setTextValue,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    textColor, setTextColor,
    textBackground, setTextBackground,
    textOpacity, setTextOpacity,
    textOutline, setTextOutline,
    textOutlineWidth, setTextOutlineWidth,
    textShadow, setTextShadow,
    shapeKind, setShapeKind,
    fillColor, setFillColor,
    transparentFill, setTransparentFill,
    strokeColor, setStrokeColor,
    strokeWidth, setStrokeWidth,
    shapeOpacity, setShapeOpacity,
    brightness, setBrightness,
    contrast, setContrast,
    saturation, setSaturation,
    selectedFilter, setSelectedFilter,
    filterIntensity, setFilterIntensity,
    backgroundRemoved, setBackgroundRemoved,
    isRemovingBackground, setIsRemovingBackground,
    backgroundProgress, setBackgroundProgress,
    backgroundColor, setBackgroundColorState,
    drawingColor, setDrawingColor,
    brushSize, setBrushSize,
    activeDrawingMode, setActiveDrawingMode,
  }
}