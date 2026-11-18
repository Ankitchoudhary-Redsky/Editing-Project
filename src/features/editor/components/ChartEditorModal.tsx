import { useEffect } from "react";
import { Download, Plus, Trash2, X } from "lucide-react";
import {
  chartCategories,
  chartTypeLabels,
  type ChartConfig,
  type ChartType,
} from "../model/charts";
import { renderChartSvg } from "../operations/renderChartSvg";

type ChartModalProps = {
  config: ChartConfig;
  onChange: (patch: Partial<ChartConfig>) => void;
  onClose: () => void;
  onExport: (format: "svg" | "png" | "jpg" | "pdf" | "copy") => void;
};

const svgUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function ChartModal({
  config,
  onChange,
  onClose,
  onExport,
}: ChartModalProps) {
  const headers = config.rows[0] ?? [];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateRows = (input: string[][]) => {
    const width = Math.max(1, ...input.map((row) => row.length));
    const rows = input.map((row) =>
      Array.from({ length: width }, (_, index) => row[index] ?? ""),
    );
    const valueColumns = config.valueColumns.filter(
      (column) => column < width && column !== config.labelColumn,
    );
    onChange({
      rows,
      valueColumns:
        valueColumns.length || width <= 1
          ? valueColumns
          : Array.from({ length: width - 1 }, (_, index) =>
              index >= config.labelColumn ? index + 1 : index,
            ),
    });
  };

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    const rows = config.rows.map((row) => [...row]);
    rows[rowIndex][columnIndex] = value;
    updateRows(rows);
  };

  const addColumn = () => {
    const column = headers.length;
    const rows = config.rows.map((row, index) => [
      ...row,
      index === 0 ? `Column ${column + 1}` : "",
    ]);
    onChange({ rows, valueColumns: [...config.valueColumns, column] });
  };

  const pasteCells = (
    event: React.ClipboardEvent<HTMLDivElement>,
    startRow: number,
    startColumn: number,
  ) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    const pastedRows = text
      .replace(/\r/g, "")
      .replace(/\n$/, "")
      .split("\n")
      .map((row) => row.split("\t"));
    const width = Math.max(
      headers.length,
      startColumn + Math.max(...pastedRows.map((row) => row.length)),
    );
    const rowCount = Math.max(config.rows.length, startRow + pastedRows.length);
    const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
      Array.from(
        { length: width },
        (_, columnIndex) => config.rows[rowIndex]?.[columnIndex] ?? "",
      ),
    );
    pastedRows.forEach((row, rowOffset) =>
      row.forEach((value, columnOffset) => {
        rows[startRow + rowOffset][startColumn + columnOffset] = value;
      }),
    );
    updateRows(rows);
  };

  return (
    <div
      className="chart-editor-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-editor-title"
    >
      <header className="chart-editor-header">
        <div>
          <span className="chart-editor-eyebrow">Chart editor</span>
          <h2 id="chart-editor-title">{chartTypeLabels[config.type]}</h2>
        </div>
        <div className="chart-editor-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onExport("svg")}
          >
            <Download size={15} /> Export SVG
          </button>
          <button
            type="button"
            className="mini-button"
            title="Close chart editor"
            aria-label="Close chart editor"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="chart-editor-layout">
        <section
          className="chart-editor-left"
          aria-label="Chart preview and setup"
        >
          <div className="chart-editor-preview-section">
            <div className="chart-editor-section-heading">
              <h3>Preview</h3>
              <span>Updates as you edit</span>
            </div>
            <div className="chart-editor-preview">
              <img
                src={svgUrl(renderChartSvg(config))}
                alt="Live chart preview"
              />
            </div>
          </div>

          <section className="chart-editor-setup">
            <div className="chart-editor-section-heading">
              <h3>Chart setup</h3>
            </div>
            <div className="chart-editor-setup-grid">
              <label className="field-label">
                Chart type
                <select
                  value={config.type}
                  onChange={(event) =>
                    onChange({ type: event.target.value as ChartType })
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
              <label className="field-label">
                Category labels
                <select
                  value={config.labelColumn}
                  onChange={(event) => {
                    const labelColumn = Number(event.target.value);
                    onChange({
                      labelColumn,
                      valueColumns: config.valueColumns.filter(
                        (column) => column !== labelColumn,
                      ),
                    });
                  }}
                >
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Column ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Aggregation
                <select
                  value={config.aggregation}
                  onChange={(event) =>
                    onChange({
                      aggregation: event.target
                        .value as ChartConfig["aggregation"],
                    })
                  }
                >
                  {(
                    [
                      "none",
                      "sum",
                      "average",
                      "count",
                      "minimum",
                      "maximum",
                    ] as const
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value[0].toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Chart title
                <input
                  value={config.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                />
              </label>
              <label className="field-label">
                X-axis title
                <input
                  value={config.xAxisTitle}
                  onChange={(event) =>
                    onChange({ xAxisTitle: event.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Y-axis title
                <input
                  value={config.yAxisTitle}
                  onChange={(event) =>
                    onChange({ yAxisTitle: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="chart-editor-values">
              <span className="chart-editor-label">Value columns</span>
              <div className="chart-editor-value-options">
                {headers.map(
                  (header, index) =>
                    index !== config.labelColumn && (
                      <label key={index} className="check-row">
                        <input
                          type="checkbox"
                          checked={config.valueColumns.includes(index)}
                          onChange={(event) =>
                            onChange({
                              valueColumns: event.target.checked
                                ? [...config.valueColumns, index]
                                : config.valueColumns.filter(
                                    (column) => column !== index,
                                  ),
                            })
                          }
                        />
                        {header || `Column ${index + 1}`}
                      </label>
                    ),
                )}
              </div>
            </div>
          </section>
        </section>

        <section
          className="chart-editor-sheet"
          aria-label="Chart data spreadsheet"
        >
          <div className="chart-editor-section-heading chart-editor-sheet-heading">
            <div>
              <h3>Data</h3>
              <span>
                Edit cells directly; paste spreadsheet ranges with tabs.
              </span>
            </div>
            <div className="chart-editor-sheet-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  updateRows([
                    ...config.rows,
                    Array.from(
                      { length: Math.max(1, headers.length) },
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
                onClick={addColumn}
              >
                <Plus size={14} /> Column
              </button>
            </div>
          </div>
          <div
            className="chart-editor-grid-wrap"
            onPaste={(event) => {
              const target = event.target;
              if (!(target instanceof HTMLInputElement)) return;
              const rowIndex = Number(target.dataset.rowIndex);
              const columnIndex = Number(target.dataset.columnIndex);
              if (Number.isInteger(rowIndex) && Number.isInteger(columnIndex))
                pasteCells(event, rowIndex, columnIndex);
            }}
          >
            <table className="chart-editor-grid">
              <thead>
                <tr>
                  <th className="chart-editor-row-number">#</th>
                  {headers.map((header, columnIndex) => (
                    <th key={columnIndex}>
                      <input
                        aria-label={`Column ${columnIndex + 1} name`}
                        data-row-index={0}
                        data-column-index={columnIndex}
                        value={header}
                        onChange={(event) =>
                          updateCell(0, columnIndex, event.target.value)
                        }
                      />
                      <button
                        type="button"
                        title={`Delete ${header || `column ${columnIndex + 1}`}`}
                        aria-label={`Delete column ${columnIndex + 1}`}
                        onClick={() => {
                          if (headers.length <= 1) return;
                          const rows = config.rows.map((row) =>
                            row.filter((_, index) => index !== columnIndex),
                          );
                          const labelColumn =
                            config.labelColumn > columnIndex
                              ? config.labelColumn - 1
                              : config.labelColumn === columnIndex
                                ? 0
                                : config.labelColumn;
                          const valueColumns = config.valueColumns
                            .filter((column) => column !== columnIndex)
                            .map((column) =>
                              column > columnIndex ? column - 1 : column,
                            );
                          onChange({ rows, labelColumn, valueColumns });
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </th>
                  ))}
                  <th className="chart-editor-add-column">
                    <button
                      type="button"
                      title="Add column"
                      aria-label="Add column"
                      onClick={addColumn}
                    >
                      <Plus size={15} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.rows.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th className="chart-editor-row-number">{rowIndex + 1}</th>
                    {headers.map((_, columnIndex) => (
                      <td key={columnIndex}>
                        <input
                          aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                          data-row-index={rowIndex + 1}
                          data-column-index={columnIndex}
                          value={row[columnIndex] ?? ""}
                          onChange={(event) =>
                            updateCell(
                              rowIndex + 1,
                              columnIndex,
                              event.target.value,
                            )
                          }
                        />
                      </td>
                    ))}
                    <td className="chart-editor-row-action">
                      <button
                        type="button"
                        title="Delete row"
                        aria-label={`Delete row ${rowIndex + 1}`}
                        onClick={() =>
                          updateRows(
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
          <div className="chart-editor-sheet-footer">
            {config.rows.length - 1} data rows · {headers.length} columns
          </div>
        </section>
      </div>
    </div>
  );
}
