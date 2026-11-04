import { getChartSeries, type ChartConfig } from '../model/charts'

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char)
const n = (value: number) => Number.isFinite(value) ? Number(value.toFixed(2)) : 0

export function renderChartSvg(config: ChartConfig, width = 760, height = 480) {
  const { labels, series } = getChartSeries(config)
  const safeLabels = labels.slice(0, 100)
  const colors = config.colors.length ? config.colors : ['#4385f5']
  const bg = config.transparent ? 'none' : config.background
  const font = `font-family="Arial, sans-serif" font-size="${config.fontSize}" fill="${config.labelColor}"`
  const titleX = config.titleAlign === 'left' ? 28 : config.titleAlign === 'right' ? width - 28 : width / 2
  const titleAnchor = config.titleAlign === 'left' ? 'start' : config.titleAlign === 'right' ? 'end' : 'middle'
  const title = config.showTitle && config.title ? `<text x="${titleX}" y="38" text-anchor="${titleAnchor}" font-family="Arial,sans-serif" font-size="${config.titleSize}" font-weight="${config.titleWeight === 'bold' ? 700 : 400}" fill="${config.titleColor}">${esc(config.title)}</text>` : ''
  const subtitleY = config.showTitle && config.title ? 62 : 34
  const subtitle = config.subtitle ? `<text x="${width / 2}" y="${subtitleY}" text-anchor="middle" ${font}>${esc(config.subtitle)}</text>` : ''
  const isPie = ['pie', 'donut', 'semi-donut'].includes(config.type)
  const sideLegend = config.showLegend && ['left', 'right'].includes(config.legendPosition)
  const plot = { x: (sideLegend && config.legendPosition === 'left' ? 164 : 82) + config.chartPadding, y: (config.showTitle ? 94 : 70) + config.chartPadding, w: width - (sideLegend ? 248 : 122) - config.chartPadding * 2, h: height - (config.showTitle ? 170 : 146) - config.chartPadding * 2 }
  const legendEntries = isPie
    ? safeLabels.map((name, index) => ({ name, color: colors[index % colors.length] }))
    : series.map((item) => ({ name: item.name, color: item.color }))
  const legendItems = legendEntries.map((item, index) => {
    const x = sideLegend ? 0 : index * config.legendSpacing
    const y = sideLegend ? index * 25 : 0
    return `<g transform="translate(${x},${y})"><circle r="6" fill="${item.color}"/><text x="11" y="4" ${font}>${esc(item.name)}</text></g>`
  }).join('')
  const legendWidth = Math.max(0, legendEntries.length - 1) * config.legendSpacing + 120
  const legendX = config.legendPosition === 'left' ? 12 : config.legendPosition === 'right' ? width - 150 : config.legendAlign === 'left' ? plot.x : config.legendAlign === 'right' ? plot.x + plot.w - legendWidth : plot.x + (plot.w - legendWidth) / 2
  const legendY = config.legendPosition === 'bottom' ? height - 33 : config.legendPosition === 'top' ? 78 : plot.y + 8
  const legend = config.showLegend && legendEntries.length ? `<g transform="translate(${legendX},${legendY})">${legendItems}</g>` : ''
  const percentStacked = config.type === 'stacked100' || config.type === 'stacked-area100'
  const allValues = series.flatMap((item) => item.values.slice(0, safeLabels.length))
  const stacked = ['stacked', 'stacked100', 'stacked-area', 'stacked-area100'].includes(config.type)
  const stackedTotals = safeLabels.map((_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0))
  const waterfallTotals = series[0]?.values.slice(0, safeLabels.length).reduce<number[]>((totals, value) => {
    totals.push((totals.at(-1) ?? 0) + value)
    return totals
  }, [0]) ?? [0]
  const dataMaximum = config.type === 'waterfall'
    ? Math.max(0, ...waterfallTotals)
    : stacked && !percentStacked ? Math.max(0, ...stackedTotals) : Math.max(0, ...allValues)
  const dataMinimum = config.type === 'waterfall'
    ? Math.min(0, ...waterfallTotals)
    : ['scatter', 'bubble'].includes(config.type) ? Math.min(0, ...allValues) : 0
  const maxData = Math.max(1, ...allValues.map(Math.abs), ...stackedTotals.map(Math.abs), ...waterfallTotals.map(Math.abs))
  const minData = config.axisMin === '' ? dataMinimum : Number(config.axisMin)
  const maxValue = config.axisMax === ''
    ? Math.max(minData + 1, percentStacked ? 100 : dataMaximum + (dataMaximum - minData || 1) * 0.12)
    : Math.max(Number(config.axisMax), minData + 1)
  const valueRange = maxValue - minData
  const yForValue = (value: number) => plot.y + plot.h - ((value - minData) / valueRange) * plot.h
  const format = (value: number) => {
    const rounded = value.toFixed(config.decimals)
    return config.numberFormat === 'currency' ? `$${rounded}` : config.numberFormat === 'percent' ? `${rounded}%` : `${rounded}${config.unit ? ` ${config.unit}` : ''}`
  }
  const isLine = ['line', 'multi-line', 'smooth-line', 'stepped-line', 'area', 'stacked-area', 'stacked-area100'].includes(config.type)
  const isArea = ['area', 'stacked-area', 'stacked-area100'].includes(config.type)
  const isRow = config.type === 'row'
  let marks: string

  if (isPie) {
    const pieValues = series[0]?.values ?? []
    const total = pieValues.reduce((sum, value) => sum + Math.max(0, value), 0) || 1
    const cx = width / 2
    const cy = config.type === 'semi-donut' ? height - 28 : height / 2 + 8
    const radius = Math.min(width * 0.25, height * (config.type === 'semi-donut' ? 0.7 : 0.33))
    let angle = config.type === 'semi-donut' ? Math.PI : -Math.PI / 2
    const endLimit = config.type === 'semi-donut' ? Math.PI * 2 : Math.PI * 1.5
    marks = pieValues.map((value, index) => {
      const share = Math.max(0, value) / total
      const next = Math.min(endLimit, angle + share * (config.type === 'semi-donut' ? Math.PI : Math.PI * 2))
      if (next <= angle) return ''
      const x1 = cx + radius * Math.cos(angle), y1 = cy + radius * Math.sin(angle)
      const x2 = cx + radius * Math.cos(next), y2 = cy + radius * Math.sin(next)
      const large = next - angle > Math.PI ? 1 : 0
      const path = `M ${n(cx)} ${n(cy)} L ${n(x1)} ${n(y1)} A ${radius} ${radius} 0 ${large} 1 ${n(x2)} ${n(y2)} Z`
      const labelAngle = angle + (next - angle) / 2
      const labelRadius = radius * 0.66
      const labelParts = [config.showCategoryNames ? esc(safeLabels[index] ?? '') : '', config.showPercentages ? `${Math.round(share * 100)}%` : config.showValues ? format(value) : ''].filter(Boolean)
      const label = labelParts.length
        ? `<text x="${n(cx + Math.cos(labelAngle) * labelRadius)}" y="${n(cy + Math.sin(labelAngle) * labelRadius)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#fff">${labelParts.join(' · ')}</text>` : ''
      angle = next
      return `<path d="${path}" fill="${colors[index % colors.length]}" stroke="${bg === 'none' ? '#fff' : bg}" stroke-width="${config.sliceSpacing}"/>${label}`
    }).join('')
    if (config.type !== 'pie') marks += `<circle cx="${cx}" cy="${cy}" r="${radius * config.donutHole / 100}" fill="${bg}"/>`
  } else if (['scatter', 'bubble'].includes(config.type)) {
    const groupW = plot.w / Math.max(1, safeLabels.length)
    const dash = config.gridStyle === 'solid' ? '' : config.gridStyle === 'dotted' ? '1 4' : '4 5'
    const grid = config.showGrid ? Array.from({ length: 5 }, (_, index) => {
      const y = plot.y + plot.h * index / 4
      const value = maxValue - valueRange * index / 4
      return `<path d="M ${plot.x} ${n(y)} H ${plot.x + plot.w}" stroke="${config.gridColor}" stroke-width="${config.gridWidth}" ${dash ? `stroke-dasharray="${dash}"` : ''}/><text x="${plot.x - 12}" y="${n(y + 4)}" text-anchor="end" ${font}>${format(value)}</text>`
    }).join('') : ''
    const xLabels = config.showXAxis ? safeLabels.map((label, index) => `<text x="${n(plot.x + groupW * (index + .5))}" y="${plot.y + plot.h + 24}" text-anchor="middle" ${font}>${esc(label.slice(0, 14))}</text>`).join('') : ''
    const axes = `${config.showYAxis ? `<path d="M ${plot.x} ${plot.y} V ${plot.y + plot.h}" stroke="${config.axisLineColor}" stroke-width="${config.axisLineWidth}"/>` : ''}${config.showXAxis ? `<path d="M ${plot.x} ${plot.y + plot.h} H ${plot.x + plot.w}" stroke="${config.axisLineColor}" stroke-width="${config.axisLineWidth}"/>` : ''}`
    const points = series.flatMap((item, seriesIndex) => item.values.slice(0, safeLabels.length).map((value, index) => {
      const x = plot.x + (safeLabels.length < 2 ? 0.5 : index / (safeLabels.length - 1)) * plot.w
      const y = yForValue(value)
      const radius = config.type === 'bubble' ? 5 + Math.min(15, Math.abs(value) / maxData * 15) : config.markerSize
      return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius)}" fill="${colors[seriesIndex % colors.length]}" opacity=".8"/>`
    })).join('')
    marks = `${grid}${axes}${points}${xLabels}`
    if (config.xAxisTitle) marks += `<text x="${plot.x + plot.w / 2}" y="${height - 18}" text-anchor="middle" ${font}>${esc(config.xAxisTitle)}</text>`
    if (config.yAxisTitle) marks += `<text transform="translate(22 ${plot.y + plot.h / 2}) rotate(-90)" text-anchor="middle" ${font}>${esc(config.yAxisTitle)}</text>`
  } else if (config.type === 'radar' || config.type === 'polar') {
    const cx = width / 2, cy = plot.y + plot.h / 2, radius = Math.min(plot.w, plot.h) * 0.42
    const points = (values: number[]) => values.map((value, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, values.length)
      const r = radius * Math.max(0, value) / maxData
      return `${n(cx + Math.cos(angle) * r)},${n(cy + Math.sin(angle) * r)}`
    }).join(' ')
    const rings = [0.25, 0.5, 0.75, 1].map((scale) => `<circle cx="${cx}" cy="${cy}" r="${radius * scale}" fill="none" stroke="${config.gridColor}"/>`).join('')
    if (config.type === 'polar') {
      const values = series[0]?.values ?? []
      marks = values.map((value, index) => {
        const start = -Math.PI / 2 + index * Math.PI * 2 / Math.max(1, values.length) + .025
        const end = -Math.PI / 2 + (index + 1) * Math.PI * 2 / Math.max(1, values.length) - .025
        const outer = radius * Math.max(0, value) / maxData
        const x1 = cx + Math.cos(start) * outer, y1 = cy + Math.sin(start) * outer
        const x2 = cx + Math.cos(end) * outer, y2 = cy + Math.sin(end) * outer
        return `<path d="M ${cx} ${cy} L ${n(x1)} ${n(y1)} A ${n(outer)} ${n(outer)} 0 0 1 ${n(x2)} ${n(y2)} Z" fill="${colors[index % colors.length]}"/>`
      }).join('')
    } else {
      marks = rings + series.map((item) => `<polygon points="${points(item.values)}" fill="${item.color}" fill-opacity=".2" stroke="${item.color}" stroke-width="${config.lineWidth}"/>`).join('')
    }
  } else if (config.type === 'heatmap') {
    const cellW = plot.w / Math.max(1, safeLabels.length), cellH = plot.h / Math.max(1, series.length)
    const heatValues = series.flatMap((item) => item.values.slice(0, safeLabels.length))
    const heatMin = Math.min(...heatValues, 0), heatMax = Math.max(...heatValues, 1)
    const cells = series.map((item, row) => item.values.slice(0, safeLabels.length).map((value, col) => {
      const intensity = (value - heatMin) / (heatMax - heatMin || 1)
      return `<rect x="${n(plot.x + col * cellW + 1)}" y="${n(plot.y + row * cellH + 1)}" width="${n(Math.max(0, cellW - 2))}" height="${n(Math.max(0, cellH - 2))}" rx="3" fill="${item.color}" opacity="${0.16 + intensity * 0.84}"/>`
    }).join('')).join('')
    const xLabels = config.showXAxis ? safeLabels.map((label, index) => `<text x="${n(plot.x + cellW * (index + .5))}" y="${plot.y + plot.h + 24}" text-anchor="middle" ${font}>${esc(label.slice(0, 14))}</text>`).join('') : ''
    const yLabels = config.showYAxis ? series.map((item, index) => `<text x="${plot.x - 10}" y="${n(plot.y + cellH * (index + .5) + 4)}" text-anchor="end" ${font}>${esc(item.name)}</text>`).join('') : ''
    const axes = `${config.showYAxis ? `<path d="M ${plot.x} ${plot.y} V ${plot.y + plot.h}" stroke="${config.axisLineColor}" stroke-width="${config.axisLineWidth}"/>` : ''}${config.showXAxis ? `<path d="M ${plot.x} ${plot.y + plot.h} H ${plot.x + plot.w}" stroke="${config.axisLineColor}" stroke-width="${config.axisLineWidth}"/>` : ''}`
    marks = `${cells}${axes}${xLabels}${yLabels}`
    if (config.xAxisTitle) marks += `<text x="${plot.x + plot.w / 2}" y="${height - 18}" text-anchor="middle" ${font}>${esc(config.xAxisTitle)}</text>`
    if (config.yAxisTitle) marks += `<text transform="translate(22 ${plot.y + plot.h / 2}) rotate(-90)" text-anchor="middle" ${font}>${esc(config.yAxisTitle)}</text>`
  } else if (config.type === 'treemap') {
    const values = safeLabels.map((_, index) => Math.max(0, series[0]?.values[index] ?? 0))
    const tiles: { index: number; x: number; y: number; w: number; h: number }[] = []
    const partition = (indices: number[], x: number, y: number, w: number, h: number) => {
      if (!indices.length) return
      if (indices.length === 1) {
        tiles.push({ index: indices[0], x, y, w, h })
        return
      }
      const total = indices.reduce((sum, index) => sum + values[index], 0)
      let splitAt = 1
      let accumulated = values[indices[0]]
      while (splitAt < indices.length - 1 && accumulated < total / 2) accumulated += values[indices[splitAt++]]
      const ratio = total ? accumulated / total : splitAt / indices.length
      if (w >= h) {
        const split = w * ratio
        partition(indices.slice(0, splitAt), x, y, split, h)
        partition(indices.slice(splitAt), x + split, y, w - split, h)
      } else {
        const split = h * ratio
        partition(indices.slice(0, splitAt), x, y, w, split)
        partition(indices.slice(splitAt), x, y + split, w, h - split)
      }
    }
    partition(safeLabels.map((_, index) => index), plot.x, plot.y, plot.w, plot.h)
    marks = tiles.map(({ index, x, y, w, h }) => {
      const label = safeLabels[index]
      const value = values[index]
      const labelText = w > 42 && h > 24 ? `<text x="${n(x + 7)}" y="${n(y + 17)}" font-family="Arial,sans-serif" font-size="12" fill="#fff">${esc(label.slice(0, 16))}</text>` : ''
      const valueText = config.showValues && w > 46 && h > 38 ? `<text x="${n(x + 7)}" y="${n(y + 33)}" font-family="Arial,sans-serif" font-size="11" fill="#fff">${format(value)}</text>` : ''
      return `<rect x="${n(x + 1)}" y="${n(y + 1)}" width="${n(Math.max(0, w - 2))}" height="${n(Math.max(0, h - 2))}" fill="${colors[index % colors.length]}"/><title>${esc(label)}: ${format(value)}</title>${labelText}${valueText}`
    }).join('')
  } else if (config.type === 'funnel') {
    marks = safeLabels.map((label, index) => {
      const value = series[0]?.values[index] ?? 0
      const fraction = Math.max(.18, value / maxData)
      const x = config.type === 'treemap' ? plot.x + index * plot.w / safeLabels.length : plot.x + (1 - fraction) * plot.w / 2
      const w = config.type === 'treemap' ? plot.w / safeLabels.length - 3 : fraction * plot.w
      const y = plot.y + index * plot.h / safeLabels.length
      const h = config.type === 'treemap' ? plot.h : plot.h / safeLabels.length - 5
      return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${config.barRadius}" fill="${colors[index % colors.length]}"/><text x="${n(x + 10)}" y="${n(y + h / 2 + 4)}" font-family="Arial,sans-serif" font-size="12" fill="#fff">${esc(label)}${config.showValues ? ` · ${format(value)}` : ''}</text>`
    }).join('')
  } else {
    const steps = 5
    const dash = config.gridStyle === 'solid' ? '' : config.gridStyle === 'dotted' ? '1 4' : '4 5'
    const grid = config.showGrid ? Array.from({ length: steps }, (_, index) => {
      const y = plot.y + plot.h * index / (steps - 1)
      const value = maxValue - (maxValue - minData) * index / (steps - 1)
      return `<path d="M ${plot.x} ${n(y)} H ${plot.x + plot.w}" stroke="${config.gridColor}" stroke-width="${config.gridWidth}" ${dash ? `stroke-dasharray="${dash}"` : ''}/><text x="${plot.x - 12}" y="${n(y + 4)}" text-anchor="end" ${font}>${format(value)}</text>`
    }).join('') : ''
    const groupW = plot.w / Math.max(1, safeLabels.length)
    const verticalGrid = config.showVerticalGrid ? safeLabels.map((_, index) => {
      const x = plot.x + groupW * (index + .5)
      return `<path d="M ${n(x)} ${plot.y} V ${plot.y + plot.h}" stroke="${config.gridColor}" stroke-width="${config.gridWidth}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
    }).join('') : ''
    const barW = Math.min(config.barWidth, groupW * (1 - config.groupSpacing / 100) / Math.max(1, stacked ? 1 : series.length))
    const xLabels = config.showXAxis ? safeLabels.map((label, index) => {
      const x = n(plot.x + groupW * (index + .5)), y = plot.y + plot.h + 24
      return `<text x="${x}" y="${y}" text-anchor="${config.xLabelRotation > 0 ? 'start' : config.xLabelRotation < 0 ? 'end' : 'middle'}" transform="${config.xLabelRotation ? `rotate(${config.xLabelRotation} ${x} ${y})` : ''}" ${font}>${esc(label.slice(0, 14))}</text>`
    }).join('') : ''
    const barMarks = series.map((item, seriesIndex) => item.values.slice(0, safeLabels.length).map((value, index) => {
      const x = plot.x + groupW * index + groupW / 2
      const effective = percentStacked ? value / (series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0) || 1) * 100 : value
      if (isLine) return ''
      const yHeight = Math.max(1, (effective / maxValue) * plot.h)
      const y = yForValue(effective)
      if (isRow) return `<rect x="${plot.x}" y="${n(plot.y + index * plot.h / safeLabels.length + 4)}" width="${n(Math.max(1, value / maxValue * plot.w))}" height="${n(plot.h / safeLabels.length * .62)}" rx="${config.barRadius}" fill="${item.color}"/>`
      const offset = stacked ? 0 : (seriesIndex - (series.length - 1) / 2) * barW
      const base = stacked ? plot.y + plot.h - series.slice(0, seriesIndex).reduce((sum, entry) => {
        const total = series.reduce((inner, current) => inner + (current.values[index] ?? 0), 0) || 1
        return sum + (percentStacked ? (entry.values[index] ?? 0) / total * 100 : (entry.values[index] ?? 0)) / maxValue * plot.h
      }, 0) : plot.y + plot.h
      const barY = stacked ? base - yHeight : y
      if (config.type === 'waterfall') {
        if (seriesIndex > 0) return ''
        const start = item.values.slice(0, index).reduce((sum, current) => sum + current, 0)
        const end = start + value
        const startY = yForValue(start)
        const endY = yForValue(end)
        const rect = `<rect x="${n(x - barW / 2)}" y="${n(Math.min(startY, endY))}" width="${n(barW)}" height="${n(Math.max(1, Math.abs(startY - endY)))}" rx="${config.barRadius}" fill="${value < 0 ? '#e16e74' : item.color}"/>`
        const connector = index > 0 ? `<path d="M ${n(x - groupW / 2)} ${n(startY)} H ${n(x - barW / 2)}" stroke="${config.axisLineColor}" stroke-dasharray="3 3"/>` : ''
        const label = config.showDataLabels ? `<text x="${n(x)}" y="${n(Math.min(startY, endY) - 5)}" text-anchor="middle" ${font}>${format(value)}</text>` : ''
        return `${connector}${rect}${label}`
      }
      if (config.type === 'combo' && seriesIndex > 0) return ''
      return `<rect x="${n(x + offset - barW / 2)}" y="${n(barY)}" width="${n(barW)}" height="${n(yHeight)}" rx="${config.barRadius}" fill="${item.color}"/>${config.showDataLabels ? `<text x="${n(x + offset)}" y="${n(barY - 6)}" text-anchor="middle" ${font}>${format(value)}</text>` : ''}`
    }).join('')).join('')
    const lineMarks = series.map((item, seriesIndex) => {
      if (config.type === 'combo' && seriesIndex === 0) return ''
      const coords = item.values.slice(0, safeLabels.length).map((value, index) => {
        const prior = stacked ? series.slice(0, seriesIndex).reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0) : 0
        const total = series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0) || 1
        const displayed = percentStacked ? (prior + value) / total * 100 : prior + value
        return { x: plot.x + groupW * (index + .5), y: plot.y + plot.h - (displayed / maxValue) * plot.h }
      })
      if (!coords.length) return ''
      const path = coords.map((point, index) => {
        if (!index) return `M ${n(point.x)} ${n(point.y)}`
        const previous = coords[index - 1]
        if (config.type === 'stepped-line') return `H ${n(point.x)} V ${n(point.y)}`
        if (config.type === 'smooth-line') return `C ${n((previous.x + point.x) / 2)} ${n(previous.y)}, ${n((previous.x + point.x) / 2)} ${n(point.y)}, ${n(point.x)} ${n(point.y)}`
        return `L ${n(point.x)} ${n(point.y)}`
      }).join(' ')
      const lower = stacked ? item.values.slice(0, safeLabels.length).map((_, index) => {
        const prior = series.slice(0, seriesIndex).reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0)
        const total = series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0) || 1
        const displayed = percentStacked ? prior / total * 100 : prior
        return { x: plot.x + groupW * (index + .5), y: plot.y + plot.h - displayed / maxValue * plot.h }
      }) : [{ x: coords.at(-1)?.x ?? 0, y: plot.y + plot.h }, { x: coords[0].x, y: plot.y + plot.h }]
      const area = isArea ? `<path d="${path} ${[...lower].reverse().map((point) => `L ${n(point.x)} ${n(point.y)}`).join(' ')} Z" fill="${item.color}" opacity=".28"/>` : ''
      const points = config.showMarkers ? coords.map((point) => {
        if (config.markerShape === 'square') return `<rect x="${n(point.x - config.markerSize)}" y="${n(point.y - config.markerSize)}" width="${config.markerSize * 2}" height="${config.markerSize * 2}" fill="${item.color}"/>`
        if (config.markerShape === 'diamond') return `<path d="M ${n(point.x)} ${n(point.y - config.markerSize)} L ${n(point.x + config.markerSize)} ${n(point.y)} L ${n(point.x)} ${n(point.y + config.markerSize)} L ${n(point.x - config.markerSize)} ${n(point.y)} Z" fill="${item.color}"/>`
        return `<circle cx="${n(point.x)}" cy="${n(point.y)}" r="${config.markerSize}" fill="${item.color}"/>`
      }).join('') : ''
      return `${config.showAreaFill ? area : ''}<path d="${path}" fill="none" stroke="${item.color}" stroke-opacity="${config.lineOpacity / 100}" stroke-width="${config.lineWidth}" stroke-linejoin="round" stroke-linecap="round"/>${points}`
    }).join('')
    const yAxis = config.showYAxis ? `<path d="M ${plot.x} ${plot.y} V ${plot.y + plot.h}" stroke="${config.axisLineColor}" stroke-width="${config.axisLineWidth}"/>` : ''
    const xAxisY = config.type === 'waterfall' ? yForValue(0) : plot.y + plot.h
    const xAxis = config.showXAxis ? `<path d="M ${plot.x} ${n(xAxisY)} H ${plot.x + plot.w}" stroke="${config.axisLineColor}" stroke-width="${config.axisLineWidth}"/>` : ''
    marks = `${grid}${verticalGrid}${yAxis}${xAxis}${barMarks}${lineMarks}${xLabels}`
    if (config.xAxisTitle) marks += `<text x="${plot.x + plot.w / 2}" y="${height - 18}" text-anchor="middle" ${font}>${esc(config.xAxisTitle)}</text>`
    if (config.yAxisTitle) marks += `<text transform="translate(22 ${plot.y + plot.h / 2}) rotate(-90)" text-anchor="middle" ${font}>${esc(config.yAxisTitle)}</text>`
  }

  const border = config.border ? `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${config.borderRadius}" fill="none" stroke="${config.borderColor}"/>` : ''
  const legendTransform = config.legendPosition === 'bottom' ? `translate(0,0)` : `translate(0,0)`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${config.shadow ? '<filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity=".14"/></filter>' : ''}</defs><rect width="100%" height="100%" rx="${config.borderRadius}" fill="${bg}" ${config.shadow ? 'filter="url(#shadow)"' : ''}/>${title}${subtitle}<g>${marks}</g><g transform="${legendTransform}">${legend}</g>${border}</svg>`
}