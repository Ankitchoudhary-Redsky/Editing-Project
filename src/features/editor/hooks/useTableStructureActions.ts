import { Textbox } from 'fabric'
import type { CanvasTable, UseTableStructureActionsOptions } from '../model/types'
import {
  createTableCellObjects,
  findTablePosition,
  removeTableColumn,
  removeTableObjects,
  removeTableRow,
} from '../operations/tableObjects'
import {
  getImageBounds,
  tableCellName,
  tableHeight,
  tableTextName,
  tableWidth,
} from '../operations/tableGeometry'

export function useTableStructureActions({
  canvasRef,
  imageObjectRef,
  tablesRef,
  activeTableRef,
  nextTableIdRef,
  tableBorderColor,
  tableSelectedRow,
  tableSelectedColumn,
  setActiveTableId,
  setTableBorderColor,
  setTableRows,
  setTableColumns,
  setTableSelectedRow,
  setTableSelectedColumn,
  setTableSelectedText,
  setTableEditing,
  updateTableList,
  syncTableLayout,
  selectTableCell,
  setActiveTool,
  setActiveDrawingMode,
  recordHistory,
  setNotice,
}: UseTableStructureActionsOptions) {
  const addTableCells = (
    table: CanvasTable,
    firstRow: number,
    lastRow: number,
    firstColumn: number,
    lastColumn: number,
    borderColor = tableBorderColor,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { cells, texts } = createTableCellObjects(
      table,
      firstRow,
      lastRow,
      firstColumn,
      lastColumn,
      borderColor,
    )
    canvas.add(...cells, ...texts)
  }

  const selectTable = (id: number) => {
    const table = tablesRef.current.find((candidate) => candidate.id === id)
    if (!table) return

    activeTableRef.current = table
    setActiveTableId(table.id)
    setTableRows(table.rows)
    setTableColumns(table.columns)
    setTableSelectedRow(0)
    setTableSelectedColumn(0)
    const text = canvasRef.current?.getObjects().find(
      (object) => object.get('name') === tableTextName(table.id, 0, 0),
    )
    setTableSelectedText(text instanceof Textbox ? text.text : '')
    const cell = canvasRef.current?.getObjects().find(
      (object) => object.get('name') === tableCellName(table.id, 0, 0),
    )
    if (typeof cell?.stroke === 'string') setTableBorderColor(cell.stroke)
    setActiveTool('draw-remove')
    setActiveDrawingMode('pencil')
    setTableEditing(true)
    canvasRef.current?.requestRenderAll()
  }

  const create = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const bounds = getImageBounds(canvas, imageObjectRef.current)
    const rows = 3
    const columns = 3
    const cellWidth = Math.min(150, (bounds.width - 32) / columns)
    const cellHeight = Math.min(54, bounds.height / rows)
    if (cellWidth < 32 || cellHeight < 28) {
      setNotice('The image is too small to fit a table.')
      return
    }
    const table: CanvasTable = {
      id: nextTableIdRef.current + 1,
      left: 0,
      top: 0,
      cellWidth,
      cellHeight,
      columnWidths: Array(columns).fill(cellWidth),
      rowHeights: Array(rows).fill(cellHeight),
      rows,
      columns,
    }
    const position = findTablePosition(bounds, table, tablesRef.current)
    if (!position) {
      setNotice('There is no room for another table inside the image.')
      return
    }
    table.left = position.left
    table.top = position.top
    nextTableIdRef.current = table.id
    tablesRef.current = [...tablesRef.current, table]
    updateTableList(tablesRef.current)
    activeTableRef.current = table
    setActiveTableId(table.id)
    addTableCells(table, 0, rows, 0, columns)
    syncTableLayout(canvas, table)
    setTableEditing(true)
    setActiveDrawingMode('pencil')
    setTableRows(rows)
    setTableColumns(columns)
    setTableSelectedRow(0)
    setTableSelectedColumn(0)
    setTableSelectedText('')
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const addRow = () => {
    const table = activeTableRef.current
    const canvas = canvasRef.current
    if (!table || !canvas) return
    const bounds = getImageBounds(canvas, imageObjectRef.current)
    if (table.top + tableHeight(table) + table.cellHeight > bounds.top + bounds.height) {
      setNotice('There is no room for another table row inside the image.')
      return
    }
    table.rowHeights.push(table.cellHeight)
    addTableCells(table, table.rows, table.rows + 1, 0, table.columns)
    table.rows += 1
    syncTableLayout(canvas, table)
    updateTableList(tablesRef.current)
    setTableRows(table.rows)
    setTableSelectedRow(table.rows - 1)
    setTableSelectedText('')
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const addColumn = () => {
    const table = activeTableRef.current
    const canvas = canvasRef.current
    if (!table || !canvas) return
    const bounds = getImageBounds(canvas, imageObjectRef.current)
    if (table.left + tableWidth(table) + table.cellWidth > bounds.left + bounds.width) {
      setNotice('There is no room for another table column inside the image.')
      return
    }
    table.columnWidths.push(table.cellWidth)
    addTableCells(table, 0, table.rows, table.columns, table.columns + 1)
    table.columns += 1
    syncTableLayout(canvas, table)
    updateTableList(tablesRef.current)
    setTableColumns(table.columns)
    setTableSelectedColumn(table.columns - 1)
    setTableSelectedText('')
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const removeRow = () => {
    const table = activeTableRef.current
    const canvas = canvasRef.current
    if (!table || !canvas || table.rows <= 1) return
    const removedRow = tableSelectedRow
    removeTableRow(canvas, table, removedRow)
    syncTableLayout(canvas, table)
    updateTableList(tablesRef.current)
    const nextRow = Math.min(removedRow, table.rows - 1)
    setTableRows(table.rows)
    selectTableCell(nextRow, tableSelectedColumn)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const removeColumn = () => {
    const table = activeTableRef.current
    const canvas = canvasRef.current
    if (!table || !canvas || table.columns <= 1) return
    const removedColumn = tableSelectedColumn
    removeTableColumn(canvas, table, removedColumn)
    syncTableLayout(canvas, table)
    updateTableList(tablesRef.current)
    const nextColumn = Math.min(removedColumn, table.columns - 1)
    setTableColumns(table.columns)
    selectTableCell(tableSelectedRow, nextColumn)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const deleteTable = () => {
    const table = activeTableRef.current
    const canvas = canvasRef.current
    if (!table || !canvas) return
    removeTableObjects(canvas, table)
    tablesRef.current = tablesRef.current.filter((candidate) => candidate.id !== table.id)
    updateTableList(tablesRef.current)
    activeTableRef.current = null
    if (tablesRef.current.length > 0) {
      selectTable(tablesRef.current.at(-1)!.id)
    } else {
      setActiveTableId(null)
      setTableRows(0)
      setTableColumns(0)
      setTableSelectedText('')
      setTableEditing(false)
    }
    setActiveDrawingMode('pencil')
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const beginEditing = () => {
    if (!activeTableRef.current) return
    setActiveTool('draw-remove')
    setTableEditing(true)
    canvasRef.current?.requestRenderAll()
    setActiveDrawingMode('pencil')
  }

  const finishEditing = () => {
    setTableEditing(false)
    canvasRef.current?.requestRenderAll()
    setActiveDrawingMode('pencil')
  }

  return {
    selectTable,
    create,
    addRow,
    addColumn,
    removeRow,
    removeColumn,
    deleteTable,
    beginEditing,
    finishEditing,
  }
}