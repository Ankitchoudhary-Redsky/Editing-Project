export const chartCategories = [
  { name: 'Bar charts', types: ['bar', 'row', 'grouped', 'stacked', 'stacked100', 'column'] },
  { name: 'Line charts', types: ['line', 'multi-line', 'smooth-line', 'stepped-line', 'area', 'stacked-area', 'stacked-area100'] },
  { name: 'Pie and donut charts', types: ['pie', 'donut', 'semi-donut'] },
  { name: 'Other charts', types: ['scatter', 'bubble', 'radar', 'polar', 'histogram', 'waterfall', 'funnel', 'treemap', 'heatmap', 'combo'] },
] as const

export type ChartType = (typeof chartCategories)[number]['types'][number]

export const chartTypeLabels: Record<ChartType, string> = {
  bar: 'Vertical bar', row: 'Horizontal row', grouped: 'Grouped bar', stacked: 'Stacked bar',
  stacked100: '100% stacked bar', column: 'Column', line: 'Line', 'multi-line': 'Multi-line',
  'smooth-line': 'Smooth line', 'stepped-line': 'Stepped line', area: 'Area',
  'stacked-area': 'Stacked area', 'stacked-area100': '100% stacked area', pie: 'Pie',
  donut: 'Donut', 'semi-donut': 'Semi-circle donut', scatter: 'Scatter plot', bubble: 'Bubble',
  radar: 'Radar', polar: 'Polar area', histogram: 'Histogram', waterfall: 'Waterfall',
  funnel: 'Funnel', treemap: 'Treemap', heatmap: 'Heatmap', combo: 'Combo (bar + line)',
}

export type ChartConfig = {
  version: 1
  type: ChartType
  rows: string[][]
  labelColumn: number
  valueColumns: number[]
  aggregation: 'none' | 'sum' | 'average' | 'count' | 'minimum' | 'maximum'
  colors: string[]
  title: string
  subtitle: string
  titleAlign: 'left' | 'center' | 'right'
  titleWeight: 'normal' | 'bold'
  showTitle: boolean
  showLegend: boolean
  legendPosition: 'top' | 'bottom' | 'left' | 'right'
  legendAlign: 'left' | 'center' | 'right'
  legendSpacing: number
  showXAxis: boolean
  showYAxis: boolean
  showGrid: boolean
  showVerticalGrid: boolean
  gridStyle: 'solid' | 'dashed' | 'dotted'
  gridWidth: number
  axisLineColor: string
  axisLineWidth: number
  xLabelRotation: number
  showDataLabels: boolean
  showMarkers: boolean
  markerShape: 'circle' | 'square' | 'diamond'
  showAreaFill: boolean
  lineOpacity: number
  showCategoryNames: boolean
  showValues: boolean
  showPercentages: boolean
  transparent: boolean
  background: string
  titleColor: string
  labelColor: string
  gridColor: string
  fontSize: number
  titleSize: number
  lineWidth: number
  markerSize: number
  barRadius: number
  barWidth: number
  groupSpacing: number
  sliceSpacing: number
  chartPadding: number
  donutHole: number
  decimals: number
  numberFormat: 'number' | 'percent' | 'currency'
  unit: string
  axisMin: string
  axisMax: string
  xAxisTitle: string
  yAxisTitle: string
  border: boolean
  borderColor: string
  borderRadius: number
  shadow: boolean
}

export const sampleRows = [
  ['Year', 'Mobile', 'Desktop', 'Tablet'],
  ['2021', '12', '10', '8'],
  ['2022', '14', '12', '9'],
  ['2023', '15', '16', '13'],
  ['2024', '18', '17', '15'],
  ['2025', '24', '20', '16'],
  ['2026', '28', '23', '18'],
]

export const chartPalette = ['#4385f5', '#a47be5', '#f1b45f', '#45a989', '#e16e74', '#3eabb6']

export function createChartConfig(type: ChartType = 'line'): ChartConfig {
  return {
    version: 1, type, rows: sampleRows.map((row) => [...row]), labelColumn: 0,
    valueColumns: [1, 2, 3], aggregation: 'none', colors: [...chartPalette],
    title: 'Monthly visitors', subtitle: '', titleAlign: 'center', titleWeight: 'bold',
    showTitle: true, showLegend: true, legendPosition: 'top', legendAlign: 'center', legendSpacing: 145,
    showXAxis: true, showYAxis: true, showGrid: true, showVerticalGrid: false,
    gridStyle: 'dashed', gridWidth: 1, axisLineColor: '#58655f', axisLineWidth: 1, xLabelRotation: 0,
    showDataLabels: false, showCategoryNames: true, showValues: false,
    showMarkers: true, markerShape: 'circle', showAreaFill: true, lineOpacity: 100,
    showPercentages: false, transparent: false, background: '#ffffff',
    titleColor: '#26332e', labelColor: '#58655f', gridColor: '#e5e9e6',
    fontSize: 13, titleSize: 22, lineWidth: 3, markerSize: 5, barRadius: 4,
    barWidth: 36, groupSpacing: 24, sliceSpacing: 2, chartPadding: 0,
    donutHole: 58, decimals: 0, numberFormat: 'number', unit: '', axisMin: '', axisMax: '', xAxisTitle: '', yAxisTitle: '',
    border: false, borderColor: '#dce3de', borderRadius: 8, shadow: false,
  }
}

export function getChartSeries(config: ChartConfig) {
  const headers = config.rows[0] ?? []
  const rows = config.rows.slice(1)
  const labelIndex = Math.max(0, Math.min(config.labelColumn, Math.max(headers.length - 1, 0)))
  const columns = config.valueColumns.filter((column) => column !== labelIndex && column >= 0 && column < headers.length)
  const rawLabels = rows.map((row, index) => row[labelIndex]?.trim() || `Item ${index + 1}`)
  const labels = config.aggregation === 'none' ? rawLabels : [...new Set(rawLabels)]
  return {
    labels,
    series: columns.map((column, seriesIndex) => ({
      name: headers[column]?.trim() || `Series ${seriesIndex + 1}`,
      color: config.colors[seriesIndex % config.colors.length] ?? chartPalette[seriesIndex % chartPalette.length],
      values: config.aggregation === 'none'
        ? rows.map((row) => Number.parseFloat((row[column] ?? '').replace(/[^\d.-]/g, '')) || 0)
        : labels.map((label) => {
          const values = rows.flatMap((row, index) => rawLabels[index] === label && row[column]?.trim() !== ''
            ? [Number.parseFloat((row[column] ?? '').replace(/[^\d.-]/g, '')) || 0]
            : [])
          if (config.aggregation === 'count') return values.length
          if (!values.length) return 0
          if (config.aggregation === 'minimum') return Math.min(...values)
          if (config.aggregation === 'maximum') return Math.max(...values)
          const sum = values.reduce((total, value) => total + value, 0)
          return config.aggregation === 'average' ? sum / values.length : sum
        }),
    })),
  }
}