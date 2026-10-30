import { useCallback, useRef, useState } from 'react'
import { Canvas, Textbox } from 'fabric'
import type { CanvasTable, TableGesture, UseTableEditorOptions } from '../model/types'
import { useTableInteractions } from './useTableInteractions'
import {
  getImageBounds,
  syncTableGeometry,
  tableCellName,
  tableTextName,
} from '../operations/tableGeometry'
import { useTableStructureActions } from './useTableStructureActions'

export function useTableEditor({
  canvas,
  canvasRef,
  imageObjectRef,
  activeToolRef,
  setActiveTool,
  setActiveDrawingMode,
  recordHistory,
  setNotice,
}: UseTableEditorOptions) {
  const activeTableRef = useRef<CanvasTable | null>(null)
  const tablesRef = useRef<CanvasTable[]>([])
  const nextTableIdRef = useRef(0)
  const tableGestureRef = useRef<TableGesture | null>(null)

  const [tableList, setTableList] = useState<Array<{ id: number; rows: number; columns: number }>>([])
  const [activeTableId, setActiveTableId] = useState<number | null>(null)
  const [tableRows, setTableRows] = useState(0)
  const [tableColumns, setTableColumns] = useState(0)
  const [tableSelectedRow, setTableSelectedRow] = useState(0)
  const [tableSelectedColumn, setTableSelectedColumn] = useState(0)
  const [tableSelectedText, setTableSelectedText] = useState('')
  const [tableBorderColor, setTableBorderColor] = useState('#537a67')
  const [tableEditing, setTableEditing] = useState(false)
  const [tableResizeHover, setTableResizeHover] = useState<'row' | 'column' | null>(null)

  const updateTableList = useCallback((tables: CanvasTable[]) => {
    setTableList(tables.map(({ id, rows, columns }) => ({ id, rows, columns })))
  }, [])

  const syncTableLayout = useCallback((targetCanvas: Canvas, table: CanvasTable) => {
    syncTableGeometry(targetCanvas, table, getImageBounds(targetCanvas, imageObjectRef.current))
  }, [imageObjectRef])

  const restore = useCallback((targetCanvas: Canvas) => {
    const cells = targetCanvas.getObjects().flatMap((object) => {
      const name = object.get('name')
      const match = typeof name === 'string'
        ? /^__pixel_studio_table_cell__(\d+)__(\d+)__(\d+)$/.exec(name)
        : null
      return match
        ? [{ object, id: Number(match[1]), row: Number(match[2]), column: Number(match[3]) }]
        : []
    })

    if (cells.length === 0) {
      activeTableRef.current = null
      tablesRef.current = []
      setTableList([])
      setActiveTableId(null)
      setTableRows(0)
      setTableColumns(0)
      setTableSelectedRow(0)
      setTableSelectedColumn(0)
      setTableSelectedText('')
      setTableEditing(false)
      return
    }

    const previousActiveId = activeTableRef.current?.id
    const tableWasMissing = activeTableRef.current === null
    const tableIds = [...new Set(cells.map((cell) => cell.id))].sort((left, right) => left - right)
    const restoredTables = tableIds.flatMap((id) => {
      const tableCells = cells.filter((cell) => cell.id === id)
      const rows = Math.max(...tableCells.map((cell) => cell.row)) + 1
      const columns = Math.max(...tableCells.map((cell) => cell.column)) + 1
      const findCell = (row: number, column: number) =>
        tableCells.find((cell) => cell.row === row && cell.column === column)?.object
      const firstCell = findCell(0, 0)
      if (!firstCell) return []

      const cellWidth = firstCell.width || 1
      const cellHeight = firstCell.height || 1
      return [{
        id,
        left: firstCell.left ?? 0,
        top: firstCell.top ?? 0,
        cellWidth,
        cellHeight,
        columnWidths: Array.from({ length: columns }, (_, column) =>
          findCell(0, column)?.width || cellWidth,
        ),
        rowHeights: Array.from({ length: rows }, (_, row) =>
          findCell(row, 0)?.height || cellHeight,
        ),
        rows,
        columns,
      }]
    })
    tablesRef.current = restoredTables
    updateTableList(restoredTables)
    nextTableIdRef.current = Math.max(nextTableIdRef.current, ...tableIds)
    const table = restoredTables.find((candidate) => candidate.id === previousActiveId)
      ?? restoredTables.at(-1)
    activeTableRef.current = table ?? null
    setActiveTableId(table?.id ?? null)
    if (tableWasMissing) setTableEditing(Boolean(table))
    if (!table) return

    setTableRows(table.rows)
    setTableColumns(table.columns)

    const selectedRow = Math.min(tableSelectedRow, table.rows - 1)
    const selectedColumn = Math.min(tableSelectedColumn, table.columns - 1)
    setTableSelectedRow(selectedRow)
    setTableSelectedColumn(selectedColumn)
    const text = targetCanvas.getObjects().find(
      (object) => object.get('name') === tableTextName(table.id, selectedRow, selectedColumn),
    )
    setTableSelectedText(text instanceof Textbox ? text.text : '')

    const firstCell = targetCanvas.getObjects().find(
      (object) => object.get('name') === tableCellName(table.id, 0, 0),
    )
    if (typeof firstCell?.stroke === 'string') {
      setTableBorderColor(firstCell.stroke)
    }
  }, [tableSelectedColumn, tableSelectedRow, updateTableList])

  const reset = useCallback(() => {
    activeTableRef.current = null
    tablesRef.current = []
    tableGestureRef.current = null
    setTableList([])
    setActiveTableId(null)
    setTableRows(0)
    setTableColumns(0)
    setTableSelectedRow(0)
    setTableSelectedColumn(0)
    setTableSelectedText('')
    setTableEditing(false)
  }, [])

  const selectTableCell = useCallback((row: number, column: number) => {
    const table = activeTableRef.current
    const text = canvasRef.current?.getObjects().find(
      (object) => object.get('name') === tableTextName(table?.id ?? -1, row, column),
    )
    setTableSelectedRow(row)
    setTableSelectedColumn(column)
    setTableSelectedText(text instanceof Textbox ? text.text : '')
  }, [canvasRef])

  const structure = useTableStructureActions({
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
  })

  const selectRow = (row: number) => {
    setTableSelectedRow(row)
    const table = activeTableRef.current
    const text = canvasRef.current?.getObjects().find(
      (object) => object.get('name') === tableTextName(table?.id ?? -1, row, tableSelectedColumn),
    )
    setTableSelectedText(text instanceof Textbox ? text.text : '')
  }

  const selectColumn = (column: number) => {
    setTableSelectedColumn(column)
    const table = activeTableRef.current
    const text = canvasRef.current?.getObjects().find(
      (object) => object.get('name') === tableTextName(table?.id ?? -1, tableSelectedRow, column),
    )
    setTableSelectedText(text instanceof Textbox ? text.text : '')
  }

  const setBorderColor = (color: string) => {
    setTableBorderColor(color)
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    if (!table || !targetCanvas) return

    for (let row = 0; row < table.rows; row += 1) {
      for (let column = 0; column < table.columns; column += 1) {
        const cell = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableCellName(table.id, row, column),
        )
        cell?.set('stroke', color)
        cell?.setCoords()
      }
    }
    targetCanvas.requestRenderAll()
    recordHistory()
  }

  const { handleKeyboardInput } = useTableInteractions({
    canvas,
    canvasRef,
    imageObjectRef,
    activeToolRef,
    activeTableRef,
    tableGestureRef,
    tableEditing,
    tableSelectedRow,
    tableSelectedColumn,
    tableSelectedText,
    setTableRows,
    setTableColumns,
    setTableSelectedText,
    setTableResizeHover,
    recordHistory,
    setNotice,
    syncTableLayout,
    selectTableCell,
  })

  return {
    tables: tableList,
    activeId: activeTableId,
    rows: tableRows,
    columns: tableColumns,
    selectedRow: tableSelectedRow,
    selectedColumn: tableSelectedColumn,
    borderColor: tableBorderColor,
    editing: tableEditing,
    resizeHover: tableResizeHover,
    isEditingTable: tableEditing && activeTableId !== null,
    restore,
    reset,
    handleKeyboardInput,
    create: structure.create,
    select: structure.selectTable,
    beginEditing: structure.beginEditing,
    finishEditing: structure.finishEditing,
    deleteTable: structure.deleteTable,
    addRow: structure.addRow,
    addColumn: structure.addColumn,
    removeRow: structure.removeRow,
    removeColumn: structure.removeColumn,
    selectRow,
    selectColumn,
    setBorderColor,
  }
}
