import { Canvas, Textbox, FabricImage } from 'fabric'
import type { CanvasTable } from '../model/table'

export function getImageBounds(canvas: Canvas, image: FabricImage | null) {
  const bounds = image?.getBoundingRect() ?? {
    left: 0,
    top: 0,
    width: canvas.getWidth(),
    height: canvas.getHeight(),
  }
  const left = Math.max(0, bounds.left)
  const top = Math.max(0, bounds.top)
  const right = Math.min(canvas.getWidth(), bounds.left + bounds.width)
  const bottom = Math.min(canvas.getHeight(), bounds.top + bounds.height)
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

export function tableCellName(tableId: number, row: number, column: number) {
  return `__pixel_studio_table_cell__${tableId}__${row}__${column}`
}

export function tableTextName(tableId: number, row: number, column: number) {
  return `__pixel_studio_table_text__${tableId}__${row}__${column}`
}

export function tableColumnOffset(table: CanvasTable, column: number) {
  return table.columnWidths.slice(0, column).reduce((total, width) => total + width, 0)
}

export function tableRowOffset(table: CanvasTable, row: number) {
  return table.rowHeights.slice(0, row).reduce((total, height) => total + height, 0)
}

export function tableWidth(table: CanvasTable) {
  return table.columnWidths.reduce((total, width) => total + width, 0)
}

export function tableHeight(table: CanvasTable) {
  return table.rowHeights.reduce((total, height) => total + height, 0)
}

export function fitTableTextbox(textbox: Textbox, cellWidth: number, cellHeight: number) {
  textbox.set({ width: Math.max(8, cellWidth - 16), fontSize: 15 })
  textbox.initDimensions()
  textbox.setCoords()
  return Math.max(cellHeight, textbox.height + 12)
}

export function syncTableGeometry(
  canvas: Canvas,
  table: CanvasTable,
  bounds: ReturnType<typeof getImageBounds>,
) {
  for (let row = 0; row < table.rows; row += 1) {
    const maxRowHeight = Math.max(
      28,
      bounds.top + bounds.height - table.top - tableRowOffset(table, row) -
        table.rowHeights.slice(row + 1).reduce((total, height) => total + height, 0),
    )
    let requiredRowHeight = Math.min(table.rowHeights[row] || table.cellHeight, maxRowHeight)
    for (let column = 0; column < table.columns; column += 1) {
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      if (text instanceof Textbox) {
        requiredRowHeight = Math.max(
          requiredRowHeight,
          Math.min(
            maxRowHeight,
            fitTableTextbox(text, table.columnWidths[column], requiredRowHeight),
          ),
        )
      }
    }
    table.rowHeights[row] = requiredRowHeight
  }

  for (let row = 0; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const left = table.left + tableColumnOffset(table, column)
      const top = table.top + tableRowOffset(table, row)
      const cell = canvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, column),
      )
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      cell?.set({ left, top, width: table.columnWidths[column], height: table.rowHeights[row] })
      cell?.setCoords()
      if (text instanceof Textbox) {
        text.set({ left: left + 8, top: top + 7 })
        fitTableTextbox(text, table.columnWidths[column], table.rowHeights[row])
      }
    }
  }
}