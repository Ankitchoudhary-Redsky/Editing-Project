import { useCallback, useEffect } from 'react'
import { Textbox } from 'fabric'
import type { UseTableInteractionsOptions } from '../model/types'
import {
  fitTableTextbox,
  findTableObject,
  getImageBounds,
  tableColumnOffset,
  tableHeight,
  tableRowOffset,
  tableTextName,
  tableWidth,
} from '../operations/tableGeometry'

export function useTableInteractions({
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
}: UseTableInteractionsOptions) {
  const handleKeyboardInput = useCallback((event: KeyboardEvent) => {
    if (!(activeToolRef.current === 'draw-remove' && tableEditing && activeTableRef.current)) {
      return false
    }

    let nextText: string | null = null
    if (event.key === 'Backspace') {
      nextText = tableSelectedText.slice(0, -1)
    } else if (event.key === 'Delete') {
      nextText = ''
    } else if (event.key === 'Enter') {
      nextText = `${tableSelectedText}\n`
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      nextText = `${tableSelectedText}${event.key}`
    }

    if (nextText === null) return false
    event.preventDefault()
    setTableSelectedText(nextText)
    const table = activeTableRef.current
    const targetCanvas = canvasRef.current
    const textbox = targetCanvas
      ? findTableObject(targetCanvas, tableTextName(table.id, tableSelectedRow, tableSelectedColumn))
      : undefined
    if (textbox instanceof Textbox && targetCanvas) {
      textbox.set('text', nextText)
      table.rowHeights[tableSelectedRow] = fitTableTextbox(
        textbox,
        table.columnWidths[tableSelectedColumn],
        table.rowHeights[tableSelectedRow],
      )
      syncTableLayout(targetCanvas, table)
      targetCanvas.requestRenderAll()
      recordHistory()
    }
    return true
  }, [activeTableRef, activeToolRef, canvasRef, recordHistory, setTableSelectedText, syncTableLayout, tableEditing, tableSelectedColumn, tableSelectedRow, tableSelectedText])

  useEffect(() => {
    if (!canvas) return

    const onMouseDown = (event: { scenePoint?: { x: number; y: number } }) => {
      const point = event.scenePoint
      if (!point || activeToolRef.current !== 'draw-remove') return
      if (!imageObjectRef.current) {
        setNotice('Upload an image before using drawing tools.')
        return
      }

      const table = activeTableRef.current
      if (!table || !tableEditing) return
      const relativeX = point.x - table.left
      const relativeY = point.y - table.top

      if (relativeY >= 0 && relativeY < tableHeight(table)) {
        for (let column = 0; column < table.columns; column += 1) {
          const dividerX = table.left + tableColumnOffset(table, column + 1)
          if (Math.abs(point.x - dividerX) <= 6) {
            tableGestureRef.current = {
              mode: 'resize-column', startX: point.x, startY: point.y,
              left: table.left, top: table.top, resizeIndex: column,
              columnWidths: [...table.columnWidths], rowHeights: [...table.rowHeights], moved: false,
            }
            return
          }
        }
      }

      if (relativeX >= 0 && relativeX < tableWidth(table)) {
        for (let row = 0; row < table.rows; row += 1) {
          const dividerY = table.top + tableRowOffset(table, row + 1)
          if (Math.abs(point.y - dividerY) <= 6) {
            tableGestureRef.current = {
              mode: 'resize-row', startX: point.x, startY: point.y,
              left: table.left, top: table.top, resizeIndex: row,
              columnWidths: [...table.columnWidths], rowHeights: [...table.rowHeights], moved: false,
            }
            return
          }
        }
      }

      if (relativeX >= 0 && relativeY >= 0 && relativeX < tableWidth(table) && relativeY < tableHeight(table)) {
        let row = 0
        while (row < table.rows - 1 && relativeY >= tableRowOffset(table, row + 1)) row += 1
        let column = 0
        while (column < table.columns - 1 && relativeX >= tableColumnOffset(table, column + 1)) column += 1
        selectTableCell(row, column)
        tableGestureRef.current = {
          mode: 'move', startX: point.x, startY: point.y,
          left: table.left, top: table.top, resizeIndex: -1,
          columnWidths: [...table.columnWidths], rowHeights: [...table.rowHeights], moved: false,
        }
      }
    }

    const onMouseMove = (event: { scenePoint?: { x: number; y: number } }) => {
      const point = event.scenePoint
      const gesture = tableGestureRef.current
      const table = activeTableRef.current
      const targetCanvas = canvasRef.current
      const bounds = targetCanvas ? getImageBounds(targetCanvas, imageObjectRef.current) : null
      if (point && table && tableEditing && !gesture) {
        const isOverColumnDivider = point.y >= table.top &&
          point.y < table.top + tableHeight(table) &&
          Array.from({ length: table.columns }, (_, column) =>
            Math.abs(point.x - (table.left + tableColumnOffset(table, column + 1))) <= 6,
          ).some(Boolean)
        const isOverRowDivider = point.x >= table.left &&
          point.x < table.left + tableWidth(table) &&
          Array.from({ length: table.rows }, (_, row) =>
            Math.abs(point.y - (table.top + tableRowOffset(table, row + 1))) <= 6,
          ).some(Boolean)
        const nextHover = isOverColumnDivider ? 'column' : isOverRowDivider ? 'row' : null
        setTableResizeHover((current) => current === nextHover ? current : nextHover)
      } else {
        setTableResizeHover((current) => current === null ? current : null)
      }

      if (!point || !gesture || !table || !targetCanvas) return
      const deltaX = point.x - gesture.startX
      const deltaY = point.y - gesture.startY
      if (Math.abs(deltaX) + Math.abs(deltaY) > 2) gesture.moved = true
      if (!gesture.moved) return

      if (gesture.mode === 'resize-row') {
        const row = gesture.resizeIndex
        const otherRowsHeight = gesture.rowHeights
          .filter((_, index) => index !== row)
          .reduce((total, height) => total + height, 0)
        const maxRowHeight = Math.max(
          28,
          (bounds?.top ?? 0) + (bounds?.height ?? 0) - table.top - otherRowsHeight,
        )
        table.rowHeights = [...gesture.rowHeights]
        table.rowHeights[row] = Math.max(28, Math.min(maxRowHeight, gesture.rowHeights[row] + deltaY))
      } else if (gesture.mode === 'resize-column') {
        table.columnWidths = [...gesture.columnWidths]
        const otherColumnsWidth = gesture.columnWidths
          .filter((_, index) => index !== gesture.resizeIndex)
          .reduce((total, width) => total + width, 0)
        const maxColumnWidth = Math.max(
          32,
          (bounds?.left ?? 0) + (bounds?.width ?? 0) - table.left - otherColumnsWidth,
        )
        table.columnWidths[gesture.resizeIndex] = Math.max(
          32,
          Math.min(maxColumnWidth, gesture.columnWidths[gesture.resizeIndex] + deltaX),
        )
      } else {
        table.left = Math.max(bounds?.left ?? 0, Math.min(
          (bounds?.left ?? 0) + (bounds?.width ?? targetCanvas.getWidth()) - tableWidth(table),
          gesture.left + deltaX,
        ))
        table.top = Math.max(bounds?.top ?? 0, Math.min(
          (bounds?.top ?? 0) + (bounds?.height ?? targetCanvas.getHeight()) - tableHeight(table),
          gesture.top + deltaY,
        ))
      }
      syncTableLayout(targetCanvas, table)
      targetCanvas.requestRenderAll()
    }

    const onMouseUp = () => {
      const gesture = tableGestureRef.current
      if (!gesture) return
      tableGestureRef.current = null
      if (gesture.moved) {
        const table = activeTableRef.current
        if (table) {
          setTableRows(table.rows)
          setTableColumns(table.columns)
        }
        recordHistory(true)
      }
    }

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)
    return () => {
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
    }
  }, [activeTableRef, activeToolRef, canvas, canvasRef, imageObjectRef, recordHistory, selectTableCell, setNotice, setTableColumns, setTableResizeHover, setTableRows, syncTableLayout, tableEditing, tableGestureRef])

  return { handleKeyboardInput }
}
