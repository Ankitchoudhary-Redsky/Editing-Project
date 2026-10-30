import { Canvas, FabricImage, FabricObject, Group, Point, Textbox } from 'fabric'
import type { CanvasTable } from '../model/table'

FabricObject.customProperties = Array.from(
  new Set([...FabricObject.customProperties, 'name']),
)

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

export function tableGroupName(tableId: number) {
  return `__pixel_studio_table_group__${tableId}`
}

export function getTableId(object: FabricObject) {
  const name = object.get('name')
  const match = typeof name === 'string'
    ? /^__pixel_studio_table_(?:group__(\d+)|(?:cell|text)__(\d+)__\d+__\d+)$/.exec(name)
    : null
  return match ? Number(match[1] ?? match[2]) : null
}

export function getCanvasObjects(canvas: Canvas) {
  const objects: FabricObject[] = []
  const visit = (object: FabricObject) => {
    objects.push(object)
    if (object instanceof Group) object.getObjects().forEach(visit)
  }
  canvas.getObjects().forEach(visit)
  return objects
}

export function findTableObject(canvas: Canvas, name: string) {
  return getCanvasObjects(canvas).find((object) => object.get('name') === name)
}

export function getTableGroup(canvas: Canvas, tableId: number) {
  return canvas.getObjects().find(
    (object) => object.get('name') === tableGroupName(tableId),
  ) as Group | undefined
}

export function createTableGroup(tableId: number, objects: FabricObject[]) {
  const group = new Group(objects, {
    selectable: false,
    evented: false,
  })
  group.set('name', tableGroupName(tableId))
  return group
}

export function groupUngroupedTables(canvas: Canvas) {
  const roots = canvas.getObjects()
  const legacyTables = new Map<number, { objects: FabricObject[]; lastIndex: number }>()

  roots.forEach((object, index) => {
    const tableId = getTableId(object)
    if (tableId === null || object instanceof Group) return
    const table = legacyTables.get(tableId) ?? { objects: [], lastIndex: index }
    table.objects.push(object)
    table.lastIndex = index
    legacyTables.set(tableId, table)
  })

  if (!legacyTables.size) return

  const groupedTables = new Map<number, Group>()
  for (const [tableId, table] of legacyTables) {
    groupedTables.set(tableId, createTableGroup(tableId, table.objects))
  }

  const groupedRootObjects = new Set(
    [...legacyTables.values()].flatMap((table) => table.objects),
  )
  const orderedObjects = roots.flatMap((object, index) => {
    if (!groupedRootObjects.has(object)) return [object]
    const tableId = getTableId(object)
    const table = tableId === null ? undefined : legacyTables.get(tableId)
    return table?.lastIndex === index && tableId !== null
      ? [groupedTables.get(tableId)!]
      : []
  })
  canvas.remove(...roots)
  canvas.add(...orderedObjects)
}

export function removeTableObject(canvas: Canvas, object: FabricObject) {
  if (object.group instanceof Group) object.group.remove(object)
  else canvas.remove(object)
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
      const text = findTableObject(canvas, tableTextName(table.id, row, column))
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
      const cell = findTableObject(canvas, tableCellName(table.id, row, column))
      const text = findTableObject(canvas, tableTextName(table.id, row, column))
      cell?.set({ width: table.columnWidths[column], height: table.rowHeights[row] })
      cell?.setXY(new Point(left, top))
      cell?.setCoords()
      if (text instanceof Textbox) {
        text.setXY(new Point(left + 8, top + 7))
        fitTableTextbox(text, table.columnWidths[column], table.rowHeights[row])
      }
    }
  }
}