export type CanvasTable = {
  id: number
  left: number
  top: number
  cellWidth: number
  cellHeight: number
  columnWidths: number[]
  rowHeights: number[]
  rows: number
  columns: number
}

export type TableGesture = {
  mode: 'move' | 'resize-row' | 'resize-column'
  startX: number
  startY: number
  left: number
  top: number
  resizeIndex: number
  columnWidths: number[]
  rowHeights: number[]
  moved: boolean
}