import { useEffect, useRef, useState } from "react";
import {
  Clipboard,
  Download,
  FileSpreadsheet,
  Plus,
  Redo2,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { FabricImage, type FabricObject } from "fabric";
import { useEditor } from "../../EditorContext";
import {
  chartCategories,
  chartPalette,
  chartTypeLabels,
  createChartConfig,
  getChartSeries,
  type ChartConfig,
  type ChartType,
} from "../../model/charts";
import { renderChartSvg } from "../../operations/renderChartSvg";

const svgUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function getChartConfig(
  object: FabricObject | null | undefined,
): ChartConfig | null {
  if (!object) return null;
  const serialized = object.get("chartConfigJson");
  const legacy = object.get("chartConfig");
  if (
    object.get("name") !== "Chart" &&
    typeof serialized !== "string" &&
    (!legacy || typeof legacy !== "object")
  )
    return null;
  const normalize = (value: Partial<ChartConfig>) => {
    const type =
      typeof value.type === "string" && value.type in chartTypeLabels
        ? value.type
        : "line";
    return {
      ...createChartConfig(type as ChartType),
      ...value,
      type: type as ChartType,
    };
  };
  if (typeof serialized === "string") {
    try {
      return normalize(JSON.parse(serialized) as Partial<ChartConfig>);
    } catch {
      return null;
    }
  }
  if (!legacy || typeof legacy !== "object") return null;
  const defaults = createChartConfig(
    typeof legacy.type === "string" && legacy.type in chartTypeLabels
      ? (legacy.type as ChartType)
      : "line",
  );
  const values = Object.fromEntries(
    Object.keys(defaults)
      .filter((key) => key in legacy)
      .map((key) => [key, legacy[key]]),
  );
  return normalize(values as Partial<ChartConfig>);
}

const isChart = (
  object: FabricObject | null | undefined,
): object is FabricObject => getChartConfig(object) !== null;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function ChartMiniPreview({ type }: { type: ChartType }) {
  const colors = ["#4385f5", "#a47be5", "#f1b45f", "#45a989"];
  const points = "4,23 13,16 22,19 31,8 40,12";
  let marks;

  switch (type) {
    case "bar":
      marks = (
        <>
          {[8, 17, 12, 22].map((height, index) => (
            <rect
              key={index}
              x={4 + index * 10}
              y={25 - height}
              width="6"
              height={height}
              rx="1"
              fill={colors[index]}
            />
          ))}
        </>
      );
      break;
    case "row":
      marks = (
        <>
          {[17, 11, 23, 15].map((width, index) => (
            <rect
              key={index}
              x="3"
              y={3 + index * 6}
              width={width}
              height="3.5"
              rx="1"
              fill={colors[0]}
            />
          ))}
        </>
      );
      break;
    case "grouped":
    case "combo":
      marks = (
        <>
          {[0, 1, 2].flatMap((group) =>
            [0, 1].map((seriesIndex) => (
              <rect
                key={`${group}-${seriesIndex}`}
                x={5 + group * 12 + seriesIndex * 4}
                y={24 - [10, 17, 13][group] * (seriesIndex ? 0.55 : 1)}
                width="3"
                height={[10, 17, 13][group] * (seriesIndex ? 0.55 : 1)}
                rx=".7"
                fill={colors[seriesIndex]}
              />
            )),
          )}
          {type === "combo" && (
            <polyline
              points="5,15 17,9 29,12 40,4"
              fill="none"
              stroke="#e16e74"
              strokeWidth="1.7"
            />
          )}
        </>
      );
      break;
    case "stacked":
    case "stacked100":
      marks = (
        <>
          {[0, 1, 2].map((group) => (
            <g key={group}>
              <rect
                x={6 + group * 12}
                y={type === "stacked100" ? 3 : 24 - [17, 21, 14][group]}
                width="8"
                height={type === "stacked100" ? 21 : [17, 21, 14][group]}
                fill={colors[0]}
                rx="1"
              />
              <rect
                x={6 + group * 12}
                y={type === "stacked100" ? 3 : 24 - [17, 21, 14][group]}
                width="8"
                height={
                  type === "stacked100" ? [8, 12, 6][group] : [7, 9, 5][group]
                }
                fill={colors[1]}
                rx="1"
              />
            </g>
          ))}
        </>
      );
      break;
    case "column":
      marks = (
        <>
          <path
            d="M4 4 V25 H41 M4 10 H41 M4 17 H41"
            fill="none"
            stroke="#dce3de"
            strokeWidth=".8"
          />
          <rect x="8" y="16" width="6" height="9" rx="1" fill={colors[0]} />
          <rect x="19" y="8" width="6" height="17" rx="1" fill={colors[1]} />
          <rect x="30" y="12" width="6" height="13" rx="1" fill={colors[2]} />
        </>
      );
      break;
    case "line":
    case "multi-line":
    case "smooth-line":
    case "stepped-line":
      marks = (
        <>
          {type === "multi-line" && (
            <polyline
              points="4,18 13,20 22,12 31,16 40,6"
              fill="none"
              stroke={colors[1]}
              strokeWidth="1.6"
            />
          )}
          {type === "smooth-line" ? (
            <path
              d="M4 23 C10 23 10 13 17 15 S25 21 31 10 S37 10 40 7"
              fill="none"
              stroke={colors[0]}
              strokeWidth="2"
            />
          ) : type === "stepped-line" ? (
            <polyline
              points="4,23 13,23 13,16 22,16 22,19 31,19 31,8 40,8"
              fill="none"
              stroke={colors[0]}
              strokeWidth="2"
            />
          ) : (
            type !== "multi-line" && (
              <polyline
                points={points}
                fill="none"
                stroke={colors[0]}
                strokeWidth="2"
              />
            )
          )}
          {type !== "smooth-line" && type !== "stepped-line" && (
            <>
              {[4, 13, 22, 31, 40].map((x, index) => (
                <circle
                  key={x}
                  cx={x}
                  cy={[23, 16, 19, 8, 12][index]}
                  r="1.5"
                  fill={colors[0]}
                />
              ))}
            </>
          )}
        </>
      );
      break;
    case "area":
    case "stacked-area":
    case "stacked-area100":
      marks = (
        <>
          {type !== "area" && (
            <path
              d={
                type === "stacked-area100"
                  ? "M4 23 L4 14 L13 10 L22 14 L31 8 L40 11 L40 23 Z"
                  : "M4 23 L4 19 L13 16 L22 18 L31 12 L40 14 L40 23 Z"
              }
              fill={colors[1]}
              opacity=".8"
            />
          )}
          <path
            d="M4 23 L4 18 L13 11 L22 15 L31 5 L40 9 L40 23 Z"
            fill={colors[0]}
            opacity=".55"
          />
          <polyline
            points={points}
            fill="none"
            stroke={colors[0]}
            strokeWidth="1.6"
          />
        </>
      );
      break;
    case "pie":
    case "donut":
    case "semi-donut":
      marks = (
        <>
          {type === "semi-donut" ? (
            <path
              d="M5 24 A17 17 0 0 1 39 24 L31 24 A9 9 0 0 0 13 24 Z"
              fill={colors[0]}
            />
          ) : (
            <>
              <path d="M22 15 L22 3 A12 12 0 0 1 33 21 Z" fill={colors[0]} />
              <path d="M22 15 L33 21 A12 12 0 0 1 13 25 Z" fill={colors[1]} />
              <path d="M22 15 L13 25 A12 12 0 0 1 22 3 Z" fill={colors[2]} />
              {type === "donut" && <circle cx="22" cy="15" r="5" fill="#fff" />}
            </>
          )}
        </>
      );
      break;
    case "scatter":
    case "bubble":
      marks = (
        <>
          {[
            [7, 20, 1.7],
            [14, 10, type === "bubble" ? 4 : 1.7],
            [22, 17, 2.2],
            [31, 7, type === "bubble" ? 5 : 1.7],
            [38, 19, 2],
          ].map(([cx, cy, radius], index) => (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={radius}
              fill={colors[index % colors.length]}
              opacity=".9"
            />
          ))}
        </>
      );
      break;
    case "radar":
      marks = (
        <>
          <polygon
            points="22,3 38,11 33,25 13,25 6,12"
            fill={colors[0]}
            opacity=".2"
            stroke={colors[0]}
          />
          <polygon
            points="22,8 32,13 29,21 16,20 12,13"
            fill="none"
            stroke={colors[1]}
            strokeWidth="1.5"
          />
        </>
      );
      break;
    case "polar":
      marks = (
        <>
          {[0, 1, 2, 3, 4].map((index) => (
            <path
              key={index}
              d={`M22 15 L${22 + [0, 10, 11, -8, -15][index]} ${15 + [-12, -6, 8, 9, -1][index]} A12 12 0 0 1 ${22 + [10, 11, -8, -15, 0][index]} ${15 + [-6, 8, 9, -1, -12][index]} Z`}
              fill={colors[index % colors.length]}
            />
          ))}
        </>
      );
      break;
    case "histogram":
      marks = (
        <>
          {[8, 16, 21, 13, 7].map((height, index) => (
            <rect
              key={index}
              x={3 + index * 8}
              y={25 - height}
              width="8"
              height={height}
              fill={colors[0]}
              stroke="#fff"
              strokeWidth=".7"
            />
          ))}
        </>
      );
      break;
    case "waterfall":
      marks = (
        <>
          {[
            [3, 12, 8],
            [12, 8, 7],
            [21, 11, 8],
            [30, 5, 11],
            [39, 3, 22],
          ].map(([x, y, height], index) => (
            <rect
              key={index}
              x={x}
              y={y}
              width="6"
              height={height}
              rx=".6"
              fill={
                index === 4 ? colors[0] : index === 1 ? "#e16e74" : colors[1]
              }
            />
          ))}
          <path
            d="M9 12 H12 M18 15 H21 M27 11 H30 M36 5 H39"
            stroke="#87928b"
            strokeDasharray="1 1"
          />
        </>
      );
      break;
    case "funnel":
      marks = (
        <>
          {[
            [4, 25],
            [8, 18],
            [12, 11],
            [16, 4],
          ].map(([y, width], index) => (
            <path
              key={index}
              d={`M${22 - width / 2} ${y} H${22 + width / 2} L${22 + width / 2 - 2} ${y + 4} H${22 - width / 2 + 2} Z`}
              fill={colors[index]}
            />
          ))}
        </>
      );
      break;
    case "treemap":
      marks = (
        <>
          <rect x="3" y="3" width="19" height="12" rx="1" fill={colors[0]} />
          <rect x="23" y="3" width="18" height="8" rx="1" fill={colors[1]} />
          <rect x="23" y="12" width="8" height="13" rx="1" fill={colors[2]} />
          <rect x="32" y="12" width="9" height="13" rx="1" fill={colors[3]} />
          <rect x="3" y="16" width="19" height="9" rx="1" fill={colors[2]} />
        </>
      );
      break;
    case "heatmap":
      marks = (
        <>
          {Array.from({ length: 12 }, (_, index) => (
            <rect
              key={index}
              x={4 + (index % 4) * 9}
              y={4 + Math.floor(index / 4) * 8}
              width="7"
              height="6"
              rx="1"
              fill={
                [
                  "#dce9ff",
                  "#85aef5",
                  "#f1b45f",
                  "#4385f5",
                  "#a47be5",
                  "#45a989",
                ][[2, 5, 8, 10, 3, 7, 1, 11, 4, 9, 6, 0][index]]
              }
            />
          ))}
        </>
      );
      break;
    default:
      marks = (
        <polyline
          points={points}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
        />
      );
  }

  return (
    <svg className="chart-mini" viewBox="0 0 44 30" aria-hidden="true">
      {marks}
    </svg>
  );
}

export function ChartPanel() {
  const { fabricCanvas, canvas, history } = useEditor();
  const activeObject = canvas.selected;
  const selectedChart = isChart(activeObject) ? activeObject : null;
  const [config, setConfig] = useState<ChartConfig>(
    () => getChartConfig(selectedChart) ?? createChartConfig(),
  );
  const [tab, setTab] = useState<"data" | "customize">("data");
  const [search, setSearch] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dataHistory, setDataHistory] = useState<string[]>(() => [
    JSON.stringify(config.rows),
  ]);
  const [dataHistoryIndex, setDataHistoryIndex] = useState(0);
  const [draggedSeries, setDraggedSeries] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const renderSequence = useRef(0);
  const currentConfig = useRef(config);

  useEffect(() => {
    currentConfig.current = config;
  }, [config]);

  useEffect(() => {
    if (!selectedChart) return;
    setTab("data");
    setShowLibrary(false);
    const restored = getChartConfig(selectedChart);
    if (
      !restored ||
      JSON.stringify(restored) === JSON.stringify(currentConfig.current)
    )
      return;
    setConfig(restored);
    currentConfig.current = restored;
    setDataHistory([JSON.stringify(restored.rows)]);
    setDataHistoryIndex(0);
  }, [selectedChart]);

  const updateSelectedImage = async (next: ChartConfig) => {
    const activeCanvas = fabricCanvas;
    const old = activeCanvas?.getActiveObject();
    if (!activeCanvas || !isChart(old)) return;
    const sequence = ++renderSequence.current;
    const replacement = await FabricImage.fromURL(svgUrl(renderChartSvg(next)));
    if (
      sequence !== renderSequence.current ||
      !activeCanvas.getObjects().includes(old)
    )
      return;
    const position = activeCanvas.getObjects().indexOf(old);
    replacement.set({
      name: "Chart",
      chartType: next.type,
      chartConfigJson: JSON.stringify(next),
      left: old.left,
      top: old.top,
      scaleX: old.scaleX,
      scaleY: old.scaleY,
      angle: old.angle,
      flipX: old.flipX,
      flipY: old.flipY,
      opacity: old.opacity,
      originX: old.originX,
      originY: old.originY,
      selectable: true,
      evented: true,
      cornerColor: "#32745d",
      transparentCorners: false,
      lockUniScaling: true,
      objectCaching: false,
    });
    activeCanvas.remove(old);
    activeCanvas.add(replacement);
    activeCanvas.moveObjectTo(replacement, position);
    activeCanvas.setActiveObject(replacement);
    activeCanvas.requestRenderAll();
    activeCanvas.fire("object:modified", { target: replacement });
  };

  const changeConfig = (patch: Partial<ChartConfig>) => {
    const next = { ...currentConfig.current, ...patch };
    currentConfig.current = next;
    setConfig(next);
    void updateSelectedImage(next);
  };

  const changeRows = (input: string[][]) => {
    const width = Math.max(1, ...input.map((row) => row.length));
    const rows = input.map((row) =>
      Array.from({ length: width }, (_, index) => row[index] ?? ""),
    );
    const nextHistory = [
      ...dataHistory.slice(0, dataHistoryIndex + 1),
      JSON.stringify(rows),
    ].slice(-30);
    setDataHistory(nextHistory);
    setDataHistoryIndex(nextHistory.length - 1);
    const valueColumns = config.valueColumns.filter(
      (column) => column < width && column !== config.labelColumn,
    );
    changeConfig({
      rows,
      valueColumns: valueColumns.length
        ? valueColumns
        : Array.from({ length: Math.max(0, width - 1) }, (_, index) =>
          index >= config.labelColumn ? index + 1 : index,
        ),
    });
  };

  const duplicateChart = async () => {
    if (!fabricCanvas || !selectedChart) return;
    const duplicate = await selectedChart.clone([
      "chartConfigJson",
      "chartType",
      "name",
    ]);
    duplicate.set({
      left: (selectedChart.left ?? 0) + 24,
      top: (selectedChart.top ?? 0) + 24,
    });
    fabricCanvas.add(duplicate);
    fabricCanvas.setActiveObject(duplicate);
    fabricCanvas.requestRenderAll();
  };

  const deleteChart = () => {
    if (!fabricCanvas || !selectedChart) return;
    fabricCanvas.remove(selectedChart);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  };

  const restoreData = (index: number) => {
    if (index < 0 || index >= dataHistory.length) return;
    setDataHistoryIndex(index);
    changeConfig({ rows: JSON.parse(dataHistory[index]) as string[][] });
  };

  const createChart = async (type: ChartType) => {
    if (!fabricCanvas || busy || !canvas.hasImage) return;
    if (selectedChart && !showLibrary) {
      changeConfig({ type });
      return;
    }
    setBusy(true);
    const next = createChartConfig(type);
    try {
      const image = await FabricImage.fromURL(svgUrl(renderChartSvg(next)));
      const scale = Math.min(
        1,
        (fabricCanvas.getWidth() * 0.82) / image.width,
        (fabricCanvas.getHeight() * 0.82) / image.height,
      );
      const chartCount = fabricCanvas
        .getObjects()
        .filter((object) => object.get("name") === "Chart").length;
      const offset = chartCount * 22;
      image.set({
        name: "Chart",
        chartType: type,
        chartConfigJson: JSON.stringify(next),
        left: Math.min(
          fabricCanvas.getWidth() - image.width * scale,
          (fabricCanvas.getWidth() - image.width * scale) / 2 + offset,
        ),
        top: Math.min(
          fabricCanvas.getHeight() - image.height * scale,
          (fabricCanvas.getHeight() - image.height * scale) / 2 + offset,
        ),
        originX: "left",
        originY: "top",
        cornerColor: "#32745d",
        transparentCorners: false,
        lockUniScaling: true,
        objectCaching: false,
      });
      image.scale(scale);
      fabricCanvas.add(image);
      fabricCanvas.setActiveObject(image);
      fabricCanvas.requestRenderAll();
      currentConfig.current = next;
      setConfig(next);
      setDataHistory([JSON.stringify(next.rows)]);
      setDataHistoryIndex(0);
      setShowLibrary(false);
    } finally {
      setBusy(false);
    }
  };

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    const rows = config.rows.map((row) => [...row]);
    rows[rowIndex][columnIndex] = value;
    changeRows(rows);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      let rows: string[][];
      if (/\.xlsx?$/i.test(file.name)) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        rows = XLSX.utils
          .sheet_to_json<
            unknown[]
          >(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, defval: "" })
          .map((row) => row.map(String));
      } else {
        const workbook = XLSX.read(await file.text(), { type: "string" });
        rows = XLSX.utils
          .sheet_to_json<
            unknown[]
          >(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, defval: "" })
          .map((row) => row.map(String));
      }
      if (rows.length) changeRows(rows);
    } catch {
      // Unsupported or malformed spreadsheet files should not disturb the current chart.
    }
  };

  const exportData = () => {
    const csv = config.rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      "chart-data.csv",
    );
  };

  const exportChart = async (
    format: "svg" | "png" | "jpg" | "pdf" | "copy",
  ) => {
    const svg = renderChartSvg(config);
    if (format === "svg") {
      saveBlob(new Blob([svg], { type: "image/svg+xml" }), "chart.svg");
      return;
    }
    const image = new Image();
    image.src = svgUrl(svg);
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });
    const output = document.createElement("canvas");
    output.width = image.naturalWidth * 2;
    output.height = image.naturalHeight * 2;
    const context = output.getContext("2d");
    if (!context) return;
    if (format === "jpg") {
      context.fillStyle = config.background;
      context.fillRect(0, 0, output.width, output.height);
    }
    context.drawImage(image, 0, 0, output.width, output.height);
    if (format === "copy") {
      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, "image/png"),
      );
      if (blob && navigator.clipboard?.write)
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
    } else if (format === "pdf") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(
          `<img src="${output.toDataURL("image/png")}" style="width:100%" onload="window.print()">`,
        );
        printWindow.document.close();
      }
    } else {
      output.toBlob(
        (blob) => {
          if (blob) saveBlob(blob, `chart.${format}`);
        },
        format === "jpg" ? "image/jpeg" : "image/png",
        0.96,
      );
    }
  };

  const series = getChartSeries(config).series;
  const pieType = ["pie", "donut", "semi-donut"].includes(config.type);
  const colorItems = pieType
    ? getChartSeries(config).labels.map((name, index) => ({
      name,
      color:
        config.colors[index % config.colors.length] ??
        chartPalette[index % chartPalette.length],
    }))
    : series;
  const filteredCategories = chartCategories
    .map((category) => ({
      ...category,
      types: category.types.filter((type) =>
        chartTypeLabels[type].toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((category) => category.types.length);

  return (
    <div className="chart-panel-shell">
      <nav className="chart-tabs" aria-label="Chart editor tabs">
        <button
          type="button"
          className={tab === "data" ? "active" : ""}
          onClick={() => setTab("data")}
        >
          Data
        </button>
        <button
          type="button"
          className={tab === "customize" ? "active" : ""}
          onClick={() => setTab("customize")}
        >
          Customize
        </button>
      </nav>
      {tab === "data" ? (
        <div className="panel-content chart-panel">
          {selectedChart && (
            <div className="chart-section-title">
              <strong>{chartTypeLabels[config.type]}</strong>
              <span className="chart-object-actions">
                <button
                  className="mini-button"
                  type="button"
                  title="Add another chart"
                  aria-label="Add another chart"
                  onClick={() => setShowLibrary((visible) => !visible)}
                >
                  <Plus size={15} />
                </button>
                <button
                  className="mini-button"
                  type="button"
                  title="Duplicate chart"
                  aria-label="Duplicate chart"
                  onClick={() => void duplicateChart()}
                >
                  <Clipboard size={14} />
                </button>
                <button
                  className="mini-button danger-action"
                  type="button"
                  title="Delete chart"
                  aria-label="Delete chart"
                  onClick={deleteChart}
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          )}
          {(!selectedChart || showLibrary) && (
            <div
              className={`chart-library${selectedChart ? " chart-library-overlay" : ""}`}
            >
              {selectedChart && (
                <div className="chart-library-heading">
                  <strong>Chart types</strong>
                  <button
                    className="mini-button"
                    type="button"
                    title="Close chart types"
                    aria-label="Close chart types"
                    onClick={() => setShowLibrary(false)}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {!canvas.hasImage && (
                <p className="panel-note">
                  Upload an image to enable chart options.
                </p>
              )}
              <label className="chart-search">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search chart types"
                />
              </label>
              {filteredCategories.map((category) => (
                <section className="chart-category" key={category.name}>
                  <h4>{category.name}</h4>
                  <div className="chart-type-grid">
                    {category.types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className="chart-type-choice"
                        disabled={busy || !canvas.hasImage}
                        onClick={() => void createChart(type)}
                        title={
                          canvas.hasImage
                            ? `${selectedChart && showLibrary ? "Add" : "Create"} ${chartTypeLabels[type]}`
                            : "Upload an image to enable chart options"
                        }
                      >
                        <ChartMiniPreview type={type} />
                        <span>{chartTypeLabels[type]}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {selectedChart && (
            <>
              <div className="chart-section-title">
                <span>Live chart data</span>
              </div>
              <div
                className="chart-data-table-wrap"
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text/plain");
                  if (!text.includes("\t") && !text.includes("\n")) return;
                  event.preventDefault();
                  changeRows(
                    text
                      .trim()
                      .split(/\r?\n/)
                      .map((line) => line.split("\t")),
                  );
                }}
              >
                <table className="chart-data-table">
                  <thead>
                    <tr>
                      {config.rows[0]?.map((header, column) => (
                        <th key={column}>
                          <div className="chart-table-heading">
                            <input
                              aria-label={`Column ${column + 1} header`}
                              value={header}
                              onChange={(event) =>
                                updateCell(0, column, event.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="chart-table-icon danger-action"
                              title={`Delete ${header || `column ${column + 1}`}`}
                              onClick={() =>
                                changeRows(
                                  config.rows.map((row) =>
                                    row.filter((_, index) => index !== column),
                                  ),
                                )
                              }
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </th>
                      ))}
                      <th>
                        <button
                          type="button"
                          className="chart-table-icon"
                          title="Add column"
                          onClick={() =>
                            changeRows(config.rows.map((row) => [...row, ""]))
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.rows.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {config.rows[0]?.map((_, column) => (
                          <td key={column}>
                            <input
                              aria-label={`Row ${rowIndex + 1}, column ${column + 1}`}
                              value={row[column] ?? ""}
                              onChange={(event) =>
                                updateCell(
                                  rowIndex + 1,
                                  column,
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            type="button"
                            className="chart-table-icon danger-action"
                            title="Delete row"
                            onClick={() =>
                              changeRows(
                                config.rows.filter(
                                  (_, index) => index !== rowIndex + 1,
                                ),
                              )
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="chart-data-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    changeRows([
                      ...config.rows,
                      Array.from(
                        { length: config.rows[0]?.length ?? 1 },
                        () => "",
                      ),
                    ])
                  }
                >
                  <Plus size={14} /> Row
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => fileInput.current?.click()}
                >
                  <FileSpreadsheet size={14} /> Import
                </button>
                <button
                  type="button"
                  className="mini-button"
                  onClick={exportData}
                  title="Export data as CSV"
                >
                  <Download size={15} />
                </button>
                <button
                  type="button"
                  className="mini-button"
                  disabled={dataHistoryIndex <= 0}
                  title="Undo data change"
                  onClick={() => restoreData(dataHistoryIndex - 1)}
                >
                  <Undo2 size={15} />
                </button>
                <button
                  type="button"
                  className="mini-button"
                  disabled={dataHistoryIndex >= dataHistory.length - 1}
                  title="Redo data change"
                  onClick={() => restoreData(dataHistoryIndex + 1)}
                >
                  <Redo2 size={15} />
                </button>
              </div>
              <input
                ref={fileInput}
                hidden
                type="file"
                accept=".csv,.tsv,.xls,.xlsx,text/csv"
                onChange={(event) => {
                  void importFile(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <details className="chart-setup" open>
                <summary>Chart setup</summary>
                <label className="field-label">
                  Labels
                  <select
                    value={config.labelColumn}
                    onChange={(event) => {
                      const labelColumn = Number(event.target.value);
                      changeConfig({
                        labelColumn,
                        valueColumns: config.valueColumns.filter(
                          (column) => column !== labelColumn,
                        ),
                      });
                    }}
                  >
                    {config.rows[0]?.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Values
                  <select
                    multiple
                    value={config.valueColumns.map(String)}
                    onChange={(event) =>
                      changeConfig({
                        valueColumns: Array.from(
                          event.currentTarget.selectedOptions,
                          (option) => Number(option.value),
                        ),
                      })
                    }
                  >
                    {config.rows[0]?.map(
                      (header, index) =>
                        index !== config.labelColumn && (
                          <option key={index} value={index}>
                            {header || `Column ${index + 1}`}
                          </option>
                        ),
                    )}
                  </select>
                </label>
                <label className="field-label">
                  Aggregate data
                  <select
                    value={config.aggregation}
                    onChange={(event) =>
                      changeConfig({
                        aggregation: event.target
                          .value as ChartConfig["aggregation"],
                      })
                    }
                  >
                    {[
                      "none",
                      "sum",
                      "average",
                      "count",
                      "minimum",
                      "maximum",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value[0].toUpperCase() + value.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="chart-series-list">
                  <span className="field-label">
                    Data series <small>Drag to reorder</small>
                  </span>
                  {series.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="chart-series-row"
                      draggable
                      onDragStart={() => setDraggedSeries(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedSeries === null || draggedSeries === index)
                          return;
                        const valueColumns = [...config.valueColumns];
                        const [movedColumn] = valueColumns.splice(
                          draggedSeries,
                          1,
                        );
                        valueColumns.splice(index, 0, movedColumn);
                        const colors = [...config.colors];
                        const [movedColor] = colors.splice(draggedSeries, 1);
                        colors.splice(index, 0, movedColor);
                        setDraggedSeries(null);
                        changeConfig({ valueColumns, colors });
                      }}
                    >
                      <span className="chart-series-grip">⠿</span>
                      <i style={{ background: item.color }} />
                      <span>{item.name}</span>
                      <button
                        type="button"
                        className="chart-table-icon danger-action"
                        title={`Remove ${item.name}`}
                        onClick={() =>
                          changeConfig({
                            valueColumns: config.valueColumns.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button full-button"
                  onClick={() => {
                    const candidate =
                      config.rows[0]?.findIndex(
                        (_, index) =>
                          index !== config.labelColumn &&
                          !config.valueColumns.includes(index),
                      ) ?? -1;
                    if (candidate >= 0)
                      changeConfig({
                        valueColumns: [...config.valueColumns, candidate],
                      });
                    else
                      changeRows(
                        config.rows.map((row, index) => [
                          ...row,
                          index === 0
                            ? `Series ${config.valueColumns.length + 1}`
                            : "0",
                        ]),
                      );
                  }}
                >
                  <Plus size={14} /> Add data series
                </button>
              </details>
              <div className="chart-export-controls">
                <button
                  type="button"
                  className="secondary-button full-button"
                  onClick={() => void exportChart("svg")}
                >
                  <Download size={14} /> Export SVG
                </button>
                <button
                  type="button"
                  className="mini-button"
                  title="Copy chart as PNG"
                  onClick={() => void exportChart("copy")}
                >
                  <Clipboard size={15} />
                </button>
                <button
                  type="button"
                  className="mini-button"
                  title="Undo canvas change"
                  disabled={!history.canUndo}
                  onClick={history.undo}
                >
                  <Undo2 size={15} />
                </button>
                <button
                  type="button"
                  className="mini-button"
                  title="Redo canvas change"
                  disabled={!history.canRedo}
                  onClick={history.redo}
                >
                  <Redo2 size={15} />
                </button>
              </div>
              <div className="chart-export-formats">
                {(["png", "jpg", "pdf"] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => void exportChart(format)}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : !canvas.hasImage ? (
        <div className="panel-content chart-panel">
          <p className="panel-note">Upload an image to enable chart options.</p>
        </div>
      ) : (
        <div className="panel-content chart-panel chart-customize">
          <label className="field-label">
            Chart type
            <select
              value={config.type}
              onChange={(event) =>
                changeConfig({ type: event.target.value as ChartType })
              }
            >
              {chartCategories
                .flatMap((category) => category.types)
                .map((type) => (
                  <option key={type} value={type}>
                    {chartTypeLabels[type]}
                  </option>
                ))}
            </select>
          </label>
          <details open>
            <summary>Title and labels</summary>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showTitle}
                onChange={(event) =>
                  changeConfig({ showTitle: event.target.checked })
                }
              />{" "}
              Show title
            </label>
            <label className="field-label">
              Title
              <input
                value={config.title}
                onChange={(event) =>
                  changeConfig({ title: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Subtitle
              <input
                value={config.subtitle}
                onChange={(event) =>
                  changeConfig({ subtitle: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Title alignment
              <select
                value={config.titleAlign}
                onChange={(event) =>
                  changeConfig({
                    titleAlign: event.target.value as ChartConfig["titleAlign"],
                  })
                }
              >
                {["left", "center", "right"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Title weight
              <select
                value={config.titleWeight}
                onChange={(event) =>
                  changeConfig({
                    titleWeight: event.target
                      .value as ChartConfig["titleWeight"],
                  })
                }
              >
                <option value="normal">Regular</option>
                <option value="bold">Bold</option>
              </select>
            </label>
            <label className="field-label">
              Title size
              <input
                type="range"
                min="14"
                max="34"
                value={config.titleSize}
                onChange={(event) =>
                  changeConfig({ titleSize: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Title color
              <input
                type="color"
                value={config.titleColor}
                onChange={(event) =>
                  changeConfig({ titleColor: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Label size
              <input
                type="range"
                min="9"
                max="20"
                value={config.fontSize}
                onChange={(event) =>
                  changeConfig({ fontSize: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Label color
              <input
                type="color"
                value={config.labelColor}
                onChange={(event) =>
                  changeConfig({ labelColor: event.target.value })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showDataLabels}
                onChange={(event) =>
                  changeConfig({ showDataLabels: event.target.checked })
                }
              />{" "}
              Show data labels
            </label>
            <label className="field-label">
              Decimal precision
              <input
                type="number"
                min="0"
                max="4"
                value={config.decimals}
                onChange={(event) =>
                  changeConfig({
                    decimals: Math.max(
                      0,
                      Math.min(4, Number(event.target.value)),
                    ),
                  })
                }
              />
            </label>
            <label className="field-label">
              Number format
              <select
                value={config.numberFormat}
                onChange={(event) =>
                  changeConfig({
                    numberFormat: event.target
                      .value as ChartConfig["numberFormat"],
                  })
                }
              >
                <option value="number">Number</option>
                <option value="percent">Percentage</option>
                <option value="currency">Currency (USD)</option>
              </select>
            </label>
            {config.numberFormat === "number" && (
              <label className="field-label">
                Unit suffix
                <input
                  value={config.unit}
                  placeholder="e.g. users"
                  onChange={(event) =>
                    changeConfig({ unit: event.target.value })
                  }
                />
              </label>
            )}
          </details>
          <details open>
            <summary>Colors and series</summary>
            <div className="chart-palette">
              {chartPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  style={{ background: color }}
                  title={color}
                  onClick={() =>
                    changeConfig({
                      colors: chartPalette.map(
                        (_, index) =>
                          chartPalette[
                          (chartPalette.indexOf(color) + index) %
                          chartPalette.length
                          ],
                      ),
                    })
                  }
                />
              ))}
            </div>
            {colorItems.map((item, index) => (
              <label className="chart-color-row" key={`${item.name}-${index}`}>
                <span>{item.name}</span>
                <input
                  type="color"
                  value={item.color}
                  onChange={(event) => {
                    const colors = [...config.colors];
                    colors[index] = event.target.value;
                    changeConfig({ colors });
                  }}
                />
                <input
                  aria-label={`${item.name} HEX color`}
                  value={item.color}
                  onChange={(event) => {
                    const colors = [...config.colors];
                    colors[index] = event.target.value;
                    changeConfig({ colors });
                  }}
                />
              </label>
            ))}
            <label className="field-label">
              Chart background
              <input
                type="color"
                value={config.background}
                onChange={(event) =>
                  changeConfig({ background: event.target.value })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.transparent}
                onChange={(event) =>
                  changeConfig({ transparent: event.target.checked })
                }
              />{" "}
              Transparent background
            </label>
          </details>
          <details open>
            <summary>Legend</summary>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={(event) =>
                  changeConfig({ showLegend: event.target.checked })
                }
              />{" "}
              Show legend
            </label>
            <label className="field-label">
              Position
              <select
                value={config.legendPosition}
                onChange={(event) =>
                  changeConfig({
                    legendPosition: event.target
                      .value as ChartConfig["legendPosition"],
                  })
                }
              >
                {["top", "bottom", "left", "right"].map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Alignment
              <select
                value={config.legendAlign}
                onChange={(event) =>
                  changeConfig({
                    legendAlign: event.target
                      .value as ChartConfig["legendAlign"],
                  })
                }
              >
                {["left", "center", "right"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Item spacing
              <input
                type="range"
                min="80"
                max="210"
                value={config.legendSpacing}
                onChange={(event) =>
                  changeConfig({ legendSpacing: Number(event.target.value) })
                }
              />
            </label>
          </details>
          <details>
            <summary>Axes and grid</summary>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showXAxis}
                onChange={(event) =>
                  changeConfig({ showXAxis: event.target.checked })
                }
              />{" "}
              Show X axis
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showYAxis}
                onChange={(event) =>
                  changeConfig({ showYAxis: event.target.checked })
                }
              />{" "}
              Show Y axis
            </label>
            <label className="field-label">
              X-axis title
              <input
                value={config.xAxisTitle}
                onChange={(event) =>
                  changeConfig({ xAxisTitle: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Y-axis title
              <input
                value={config.yAxisTitle}
                onChange={(event) =>
                  changeConfig({ yAxisTitle: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Minimum
              <input
                type="number"
                value={config.axisMin}
                onChange={(event) =>
                  changeConfig({ axisMin: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Maximum
              <input
                type="number"
                value={config.axisMax}
                onChange={(event) =>
                  changeConfig({ axisMax: event.target.value })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(event) =>
                  changeConfig({ showGrid: event.target.checked })
                }
              />{" "}
              Show grid lines
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showVerticalGrid}
                onChange={(event) =>
                  changeConfig({ showVerticalGrid: event.target.checked })
                }
              />{" "}
              Show vertical grid lines
            </label>
            <label className="field-label">
              Grid style
              <select
                value={config.gridStyle}
                onChange={(event) =>
                  changeConfig({
                    gridStyle: event.target.value as ChartConfig["gridStyle"],
                  })
                }
              >
                {["solid", "dashed", "dotted"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Grid thickness
              <input
                type="range"
                min="1"
                max="4"
                value={config.gridWidth}
                onChange={(event) =>
                  changeConfig({ gridWidth: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Grid color
              <input
                type="color"
                value={config.gridColor}
                onChange={(event) =>
                  changeConfig({ gridColor: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Axis line color
              <input
                type="color"
                value={config.axisLineColor}
                onChange={(event) =>
                  changeConfig({ axisLineColor: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Axis line thickness
              <input
                type="range"
                min="1"
                max="4"
                value={config.axisLineWidth}
                onChange={(event) =>
                  changeConfig({ axisLineWidth: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              X label rotation
              <input
                type="range"
                min="-60"
                max="60"
                step="15"
                value={config.xLabelRotation}
                onChange={(event) =>
                  changeConfig({ xLabelRotation: Number(event.target.value) })
                }
              />
            </label>
          </details>
          <details>
            <summary>Series styling</summary>
            <label className="field-label">
              Line thickness
              <input
                type="range"
                min="1"
                max="8"
                value={config.lineWidth}
                onChange={(event) =>
                  changeConfig({ lineWidth: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Line opacity
              <input
                type="range"
                min="10"
                max="100"
                value={config.lineOpacity}
                onChange={(event) =>
                  changeConfig({ lineOpacity: Number(event.target.value) })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showMarkers}
                onChange={(event) =>
                  changeConfig({ showMarkers: event.target.checked })
                }
              />{" "}
              Show point markers
            </label>
            <label className="field-label">
              Marker shape
              <select
                value={config.markerShape}
                onChange={(event) =>
                  changeConfig({
                    markerShape: event.target
                      .value as ChartConfig["markerShape"],
                  })
                }
              >
                {["circle", "square", "diamond"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Point size
              <input
                type="range"
                min="0"
                max="12"
                value={config.markerSize}
                onChange={(event) =>
                  changeConfig({ markerSize: Number(event.target.value) })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.showAreaFill}
                onChange={(event) =>
                  changeConfig({ showAreaFill: event.target.checked })
                }
              />{" "}
              Fill area under lines
            </label>
            <label className="field-label">
              Bar corner radius
              <input
                type="range"
                min="0"
                max="16"
                value={config.barRadius}
                onChange={(event) =>
                  changeConfig({ barRadius: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Bar width
              <input
                type="range"
                min="12"
                max="70"
                value={config.barWidth}
                onChange={(event) =>
                  changeConfig({ barWidth: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Group spacing
              <input
                type="range"
                min="0"
                max="65"
                value={config.groupSpacing}
                onChange={(event) =>
                  changeConfig({ groupSpacing: Number(event.target.value) })
                }
              />
            </label>
            {["pie", "donut", "semi-donut"].includes(config.type) && (
              <>
                <label className="field-label">
                  Donut hole
                  <input
                    type="range"
                    min="20"
                    max="78"
                    value={config.donutHole}
                    onChange={(event) =>
                      changeConfig({ donutHole: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field-label">
                  Slice spacing
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={config.sliceSpacing}
                    onChange={(event) =>
                      changeConfig({ sliceSpacing: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={config.showPercentages}
                    onChange={(event) =>
                      changeConfig({ showPercentages: event.target.checked })
                    }
                  />{" "}
                  Show percentages
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={config.showCategoryNames}
                    onChange={(event) =>
                      changeConfig({ showCategoryNames: event.target.checked })
                    }
                  />{" "}
                  Show category names
                </label>
              </>
            )}
          </details>
          <details>
            <summary>Background and effects</summary>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.border}
                onChange={(event) =>
                  changeConfig({ border: event.target.checked })
                }
              />{" "}
              Chart border
            </label>
            <label className="field-label">
              Border color
              <input
                type="color"
                value={config.borderColor}
                onChange={(event) =>
                  changeConfig({ borderColor: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              Corner radius
              <input
                type="range"
                min="0"
                max="24"
                value={config.borderRadius}
                onChange={(event) =>
                  changeConfig({ borderRadius: Number(event.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Inner padding
              <input
                type="range"
                min="0"
                max="40"
                value={config.chartPadding}
                onChange={(event) =>
                  changeConfig({ chartPadding: Number(event.target.value) })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={config.shadow}
                onChange={(event) =>
                  changeConfig({ shadow: event.target.checked })
                }
              />{" "}
              Soft shadow
            </label>
          </details>
          <div className="chart-reset-row">
            <button
              type="button"
              className="secondary-button"
              onClick={() => changeConfig(createChartConfig(config.type))}
            >
              Reset style
            </button>
            <span>Changes update on canvas</span>
          </div>
        </div>
      )}
    </div>
  );
}
