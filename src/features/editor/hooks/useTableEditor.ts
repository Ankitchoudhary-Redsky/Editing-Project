import { useCallback, useRef, useState } from 'react'
import { Canvas, FabricImage, Rect, Textbox } from 'fabric'
import type { MutableRefObject } from 'react'
import type { DrawingMode, EditorTool } from '../model/types'
import type { CanvasTable, TableGesture } from '../model/table'
import { useTableInteractions } from './useTableInteractions'
import {
  getImageBounds,
  syncTableGeometry,
  tableCellName,
  tableColumnOffset,
  tableHeight,
  tableRowOffset,
  tableTextName,
  tableWidth,
} from '../operations/tableGeometry'

type UseTableEditorOptions = {
  canvas: Canvas | null
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  activeToolRef: MutableRefObject<EditorTool>
  setActiveTool: (tool: EditorTool) => void
  setActiveDrawingMode: (mode: DrawingMode) => void
  recordHistory: (immediate?: boolean) => void
  setNotice: (notice: string) => void
}

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

  const addTableCells = (
    table: CanvasTable,
    firstRow: number,
    lastRow: number,
    firstColumn: number,
    lastColumn: number,
    borderColor = tableBorderColor,
  ) => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return

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

    targetCanvas.add(...cells, ...texts)
  }

  const selectTableCell = useCallback((row: number, column: number) => {
    const table = activeTableRef.current
    const text = canvasRef.current?.getObjects().find(
      (object) => object.get('name') === tableTextName(table?.id ?? -1, row, column),
    )
    setTableSelectedRow(row)
    setTableSelectedColumn(column)
    setTableSelectedText(text instanceof Textbox ? text.text : '')
  }, [canvasRef])

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
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return

    const bounds = getImageBounds(targetCanvas, imageObjectRef.current)
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
    const horizontalSlots = Math.max(1, Math.floor((bounds.width - 12) / (tableWidth(table) + 20)))
    const verticalSlots = Math.max(1, Math.floor((bounds.height - 12) / (tableHeight(table) + 20)))
    let position: { left: number; top: number } | null = null
    for (let slot = 0; slot < horizontalSlots * verticalSlots; slot += 1) {
      const candidate = {
        left: bounds.left + 16 + (slot % horizontalSlots) * (tableWidth(table) + 20),
        top: bounds.top + 16 + Math.floor(slot / horizontalSlots) * (tableHeight(table) + 20),
      }
      const overlaps = tablesRef.current.some((existing) =>
        candidate.left < existing.left + tableWidth(existing) &&
        candidate.left + tableWidth(table) > existing.left &&
        candidate.top < existing.top + tableHeight(existing) &&
        candidate.top + tableHeight(table) > existing.top,
      )
      if (!overlaps) {
        position = candidate
        break
      }
    }
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
    syncTableLayout(targetCanvas, table)
    setTableEditing(true)
    setActiveDrawingMode('pencil')
    setTableRows(rows)
    setTableColumns(columns)
    setTableSelectedRow(0)
    setTableSelectedColumn(0)
    setTableSelectedText('')
    targetCanvas.requestRenderAll()
    recordHistory(true)
  }

  const addRow = () => {
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    if (!table || !targetCanvas) return
    const bounds = getImageBounds(targetCanvas, imageObjectRef.current)
    if (table.top + tableHeight(table) + table.cellHeight > bounds.top + bounds.height) {
      setNotice('There is no room for another table row inside the image.')
      return
    }
    table.rowHeights.push(table.cellHeight)
    addTableCells(table, table.rows, table.rows + 1, 0, table.columns)
    table.rows += 1
    syncTableLayout(targetCanvas, table)
    updateTableList(tablesRef.current)
    setTableRows(table.rows)
    setTableSelectedRow(table.rows - 1)
    setTableSelectedText('')
    targetCanvas.requestRenderAll()
    recordHistory(true)
  }

  const addColumn = () => {
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    if (!table || !targetCanvas) return
    const bounds = getImageBounds(targetCanvas, imageObjectRef.current)
    if (table.left + tableWidth(table) + table.cellWidth > bounds.left + bounds.width) {
      setNotice('There is no room for another table column inside the image.')
      return
    }
    table.columnWidths.push(table.cellWidth)
    addTableCells(table, 0, table.rows, table.columns, table.columns + 1)
    table.columns += 1
    syncTableLayout(targetCanvas, table)
    updateTableList(tablesRef.current)
    setTableColumns(table.columns)
    setTableSelectedColumn(table.columns - 1)
    setTableSelectedText('')
    targetCanvas.requestRenderAll()
    recordHistory(true)
  }

  const removeRow = () => {
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    if (!table || !targetCanvas || table.rows <= 1) return

    const removedRow = tableSelectedRow
    for (let column = 0; column < table.columns; column += 1) {
      const cell = targetCanvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, removedRow, column),
      )
      const text = targetCanvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, removedRow, column),
      )
      if (cell) targetCanvas.remove(cell)
      if (text) targetCanvas.remove(text)
    }

    for (let row = removedRow + 1; row < table.rows; row += 1) {
      for (let column = 0; column < table.columns; column += 1) {
        const cell = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableCellName(table.id, row, column),
        )
        const text = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableTextName(table.id, row, column),
        )
        cell?.set('name', tableCellName(table.id, row - 1, column))
        text?.set('name', tableTextName(table.id, row - 1, column))
      }
    }

    table.rowHeights.splice(removedRow, 1)
    table.rows -= 1
    syncTableLayout(targetCanvas, table)
    updateTableList(tablesRef.current)
    const nextRow = Math.min(removedRow, table.rows - 1)
    setTableRows(table.rows)
    selectTableCell(nextRow, tableSelectedColumn)
    targetCanvas.requestRenderAll()
    recordHistory(true)
  }

  const removeColumn = () => {
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    if (!table || !targetCanvas || table.columns <= 1) return

    const removedColumn = tableSelectedColumn
    for (let row = 0; row < table.rows; row += 1) {
      const cell = targetCanvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, removedColumn),
      )
      const text = targetCanvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, removedColumn),
      )
      if (cell) targetCanvas.remove(cell)
      if (text) targetCanvas.remove(text)
    }

    for (let column = removedColumn + 1; column < table.columns; column += 1) {
      for (let row = 0; row < table.rows; row += 1) {
        const cell = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableCellName(table.id, row, column),
        )
        const text = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableTextName(table.id, row, column),
        )
        cell?.set('name', tableCellName(table.id, row, column - 1))
        text?.set('name', tableTextName(table.id, row, column - 1))
      }
    }

    table.columnWidths.splice(removedColumn, 1)
    table.columns -= 1
    syncTableLayout(targetCanvas, table)
    updateTableList(tablesRef.current)
    const nextColumn = Math.min(removedColumn, table.columns - 1)
    setTableColumns(table.columns)
    selectTableCell(tableSelectedRow, nextColumn)
    targetCanvas.requestRenderAll()
    recordHistory(true)
  }

  const deleteTable = () => {
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    if (!table || !targetCanvas) return

    for (let row = 0; row < table.rows; row += 1) {
      for (let column = 0; column < table.columns; column += 1) {
        const cell = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableCellName(table.id, row, column),
        )
        const text = targetCanvas.getObjects().find(
          (object) => object.get('name') === tableTextName(table.id, row, column),
        )
        if (cell) targetCanvas.remove(cell)
        if (text) targetCanvas.remove(text)
      }
    }

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
    targetCanvas.requestRenderAll()
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
    create,
    select: selectTable,
    beginEditing,
    finishEditing,
    deleteTable,
    addRow,
    addColumn,
    removeRow,
    removeColumn,
    selectRow,
    selectColumn,
    setBorderColor,
  }
}
