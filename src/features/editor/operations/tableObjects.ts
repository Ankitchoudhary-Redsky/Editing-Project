import { Rect, Textbox, type Canvas } from 'fabric'
import type { CanvasTable } from '../model/table'
import {
  tableCellName,
  tableColumnOffset,
  tableHeight,
  tableRowOffset,
  tableTextName,
  tableWidth,
  findTableObject,
  getTableGroup,
  removeTableObject,
} from './tableGeometry'

export function createTableCellObjects(
  table: CanvasTable,
  firstRow: number,
  lastRow: number,
  firstColumn: number,
  lastColumn: number,
  borderColor: string,
) {
  const cells: Rect[] = []
  const texts: Textbox[] = []

  for (let row = firstRow; row < lastRow; row += 1) {
    for (let column = firstColumn; column < lastColumn; column += 1) {
      const left = table.left + tableColumnOffset(table, column)
      const top = table.top + tableRowOffset(table, row)
      cells.push(new Rect({
        left,
        top,
        width: table.columnWidths[column],
        height: table.rowHeights[row],
        fill: 'rgba(255,255,255,0)',
        stroke: borderColor,
        strokeWidth: 2,
        name: tableCellName(table.id, row, column),
      }))
      texts.push(new Textbox('', {
        left: left + 8,
        top: top + 7,
        width: table.columnWidths[column] - 16,
        fontFamily: 'Avenir Next',
        fontSize: 15,
        fill: '#28372f',
        splitByGrapheme: true,
        name: tableTextName(table.id, row, column),
      }))
    }
  }

  return { cells, texts }
}

export function removeTableRow(canvas: Canvas, table: CanvasTable, rowIndex: number) {
  for (let column = 0; column < table.columns; column += 1) {
    const cell = findTableObject(canvas, tableCellName(table.id, rowIndex, column))
    const text = findTableObject(canvas, tableTextName(table.id, rowIndex, column))
    if (cell) removeTableObject(canvas, cell)
    if (text) removeTableObject(canvas, text)
  }

  for (let row = rowIndex + 1; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const cell = findTableObject(canvas, tableCellName(table.id, row, column))
      const text = findTableObject(canvas, tableTextName(table.id, row, column))
      cell?.set('name', tableCellName(table.id, row - 1, column))
      text?.set('name', tableTextName(table.id, row - 1, column))
    }
  }

  table.rowHeights.splice(rowIndex, 1)
  table.rows -= 1
}

export function removeTableColumn(canvas: Canvas, table: CanvasTable, columnIndex: number) {
  for (let row = 0; row < table.rows; row += 1) {
    const cell = findTableObject(canvas, tableCellName(table.id, row, columnIndex))
    const text = findTableObject(canvas, tableTextName(table.id, row, columnIndex))
    if (cell) removeTableObject(canvas, cell)
    if (text) removeTableObject(canvas, text)
  }

  for (let column = columnIndex + 1; column < table.columns; column += 1) {
    for (let row = 0; row < table.rows; row += 1) {
      const cell = findTableObject(canvas, tableCellName(table.id, row, column))
      const text = findTableObject(canvas, tableTextName(table.id, row, column))
      cell?.set('name', tableCellName(table.id, row, column - 1))
      text?.set('name', tableTextName(table.id, row, column - 1))
    }
  }

  table.columnWidths.splice(columnIndex, 1)
  table.columns -= 1
}

export function removeTableObjects(canvas: Canvas, table: CanvasTable) {
  const group = getTableGroup(canvas, table.id)
  if (group) {
    canvas.remove(group)
    return
  }

  for (let row = 0; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const cell = findTableObject(canvas, tableCellName(table.id, row, column))
      const text = findTableObject(canvas, tableTextName(table.id, row, column))
      if (cell) removeTableObject(canvas, cell)
      if (text) removeTableObject(canvas, text)
    }
  }
}

export function findTablePosition(
  bounds: { left: number; top: number; width: number; height: number },
  table: CanvasTable,
  existingTables: CanvasTable[],
) {
  const horizontalSlots = Math.max(1, Math.floor((bounds.width - 12) / (tableWidth(table) + 20)))
  const verticalSlots = Math.max(1, Math.floor((bounds.height - 12) / (tableHeight(table) + 20)))

  for (let slot = 0; slot < horizontalSlots * verticalSlots; slot += 1) {
    const candidate = {
      left: bounds.left + 16 + (slot % horizontalSlots) * (tableWidth(table) + 20),
      top: bounds.top + 16 + Math.floor(slot / horizontalSlots) * (tableHeight(table) + 20),
    }
    const overlaps = existingTables.some((existing) =>
      candidate.left < existing.left + tableWidth(existing) &&
      candidate.left + tableWidth(table) > existing.left &&
      candidate.top < existing.top + tableHeight(existing) &&
      candidate.top + tableHeight(table) > existing.top,
    )
    if (!overlaps) return candidate
  }

  return null
}