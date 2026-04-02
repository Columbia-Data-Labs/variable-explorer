import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  SortChangedEvent,
  CellClickedEvent,
  CellEditRequestEvent,
  BodyScrollEndEvent
} from 'ag-grid-community';
import { IColumnDef, IColumnStats, ISortItem } from '../comm/protocol';
import { HistogramHeader } from './HistogramHeader';
import { numericHeatmap, booleanColor } from '../utils/colorScales';

const IndexHeader: React.FC<{
  onIndexSort: (direction: 'asc' | 'desc' | null) => void;
  sortModel: ISortItem[];
}> = ({ onIndexSort, sortModel }) => {
  // Check if there's an active index sort
  const indexSort = sortModel.find(s => s.colId === '__index__');
  const currentDir = indexSort?.sort || null;
  // If other columns are sorted but not index, show no arrow
  const hasOtherSorts = sortModel.some(s => s.colId !== '__index__');

  const handleClick = () => {
    if (currentDir === null || hasOtherSorts) {
      // No index sort or other sorts active → go to ascending (original order, clear other sorts)
      onIndexSort('asc');
    } else if (currentDir === 'asc') {
      onIndexSort('desc');
    } else {
      onIndexSort('asc');
    }
  };

  const arrow = currentDir === 'asc' ? ' \u25b2' : currentDir === 'desc' ? ' \u25bc' : '';
  const tooltip = currentDir === 'desc'
    ? 'Click to sort index ascending (original order)'
    : currentDir === 'asc'
    ? 'Click to reverse index order'
    : 'Click to reset to original index order';

  return (
    <div
      onClick={handleClick}
      title={tooltip}
      style={{
        cursor: 'pointer',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: '12px',
      }}
    >
      Index{arrow}
    </div>
  );
};

interface Props {
  rows: Record<string, any>[];
  columns: IColumnDef[];
  columnStats: IColumnStats[];
  totalRows: number;
  sortModel: ISortItem[];
  hiddenColumns: Set<string>;
  loading: boolean;
  isContainerView?: boolean;
  onSortChanged: (sortModel: ISortItem[]) => void;
  onLoadMore: (startRow: number) => void;
  onCellSelected: (rowIndex: number, colName: string, value: any) => void;
  onCellEdit: (rowIndex: number, column: string, newValue: string) => void;
  onDrillDown?: (childKey: string, childLabel: string) => void;
}

export const DataGrid: React.FC<Props> = ({
  rows,
  columns,
  columnStats,
  totalRows,
  sortModel,
  hiddenColumns,
  loading,
  isContainerView,
  onSortChanged,
  onLoadMore,
  onCellSelected,
  onCellEdit,
  onDrillDown
}) => {
  const gridRef = React.useRef<AgGridReact>(null);
  const gridWrapperRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<{
    startRow: number; startColIdx: number;
    endRow: number; endColIdx: number;
    dragging: boolean;
    colFields: string[];
  } | null>(null);

  // Build a stats lookup map
  const statsMap = React.useMemo(() => {
    const map: Record<string, IColumnStats> = {};
    for (const s of columnStats) {
      map[s.name] = s;
    }
    return map;
  }, [columnStats]);

  // Build AG Grid column definitions
  const colDefs: ColDef[] = React.useMemo(() => {
    // Row index column
    const indexCol: ColDef = {
      headerName: 'Index',
      colId: '__index__',
      field: '__pandas_index__',
      headerComponent: IndexHeader,
      headerComponentParams: {
        sortModel,
        onIndexSort: (direction: 'asc' | 'desc' | null) => {
          // Clear AG Grid's visual sort state
          gridRef.current?.api?.applyColumnState({ defaultState: { sort: null } });
          if (direction) {
            onSortChanged([{ colId: '__index__', sort: direction }]);
          } else {
            onSortChanged([]);
          }
        }
      },
      width: 80,
      pinned: 'left',
      sortable: false,
      resizable: true,
      cellStyle: {
        color: 'var(--jp-ui-font-color2)',
        fontWeight: '500',
        fontSize: '11px'
      }
    };

    const dataCols: ColDef[] = columns
      .filter(c => !hiddenColumns.has(c.name))
      .map(col => {
        const stats = statsMap[col.name];
        const def: ColDef = {
          headerName: col.name,
          field: col.name,
          sortable: true,
          resizable: true,
          editable: true,
          minWidth: 80,
          headerComponent: HistogramHeader,
          headerComponentParams: {
            displayName: col.name,
            stats: stats
          }
        };

        // Conditional formatting
        if (col.isNumeric && stats?.histogram && stats.histogram.type === 'numeric') {
          const h = stats.histogram;
          def.cellStyle = (params: any) => {
            if (params.value == null) {
              return { backgroundColor: 'var(--jp-layout-color2)', opacity: 0.5 };
            }
            return {
              backgroundColor: numericHeatmap(params.value, h.min, h.max),
              color: 'var(--jp-ui-font-color0)'
            };
          };
        } else if (col.isBool) {
          def.cellStyle = (params: any) => {
            if (params.value == null) {
              return { backgroundColor: 'var(--jp-layout-color2)', opacity: 0.5 };
            }
            return {
              backgroundColor: booleanColor(params.value),
              color: '#fff',
              fontWeight: '600',
              textAlign: 'center'
            };
          };
        }

        // Format numbers
        if (col.isNumeric) {
          def.valueFormatter = (params: any) => {
            if (params.value == null) return '';
            const val = Number(params.value);
            if (Number.isInteger(val)) return val.toLocaleString();
            return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
          };
        }

        // Format dates
        if (col.isDatetime) {
          def.valueFormatter = (params: any) => {
            if (params.value == null) return '';
            return new Date(params.value).toLocaleString();
          };
        }

        return def;
      });

    // In container views, add ▶ icon to the 'type' column
    if (isContainerView && onDrillDown) {
      for (const col of dataCols) {
        if (col.field === 'type') {
          col.cellRenderer = (params: any) => {
            if (!params.value) return '';
            return `\u25b6 ${params.value}`;
          };
          col.cellStyle = {
            cursor: 'pointer',
            color: 'var(--jp-brand-color1)',
            fontWeight: '600',
          };
        }
      }
    }

    return [indexCol, ...dataCols];
  }, [columns, statsMap, hiddenColumns, isContainerView, onDrillDown, onSortChanged]);

  // Handle sort
  const handleSortChanged = React.useCallback((event: SortChangedEvent) => {
    const colState = event.api.getColumnState();
    const newSortModel: ISortItem[] = colState
      .filter((c: any) => c.sort && c.colId !== '__index__')
      .sort((a: any, b: any) => (a.sortIndex || 0) - (b.sortIndex || 0))
      .map((c: any) => ({
        colId: c.colId,
        sort: c.sort as 'asc' | 'desc'
      }));
    onSortChanged(newSortModel);
  }, [onSortChanged]);

  // Handle cell click
  const handleCellClicked = React.useCallback((event: CellClickedEvent) => {
    // Container view: any click drills down
    if (isContainerView && onDrillDown) {
      const data = event.data;
      const key = String(data?.index ?? data?.key ?? event.rowIndex);
      onDrillDown(key, `[${key}]`);
      return;
    }
    // Normal view: update cell reference bar
    if (event.colDef.field && event.rowIndex != null) {
      onCellSelected(event.rowIndex, event.colDef.field, event.value);
    }
  }, [onCellSelected, isContainerView, onDrillDown]);

  // Handle cell edit
  const handleCellEditRequest = React.useCallback((event: CellEditRequestEvent) => {
    if (event.colDef.field && event.rowIndex != null) {
      onCellEdit(event.rowIndex, event.colDef.field, String(event.newValue));
      // Optimistic update
      const rowNode = event.api.getRowNode(String(event.rowIndex));
      if (rowNode) {
        rowNode.setDataValue(event.colDef.field, event.newValue);
      }
    }
  }, [onCellEdit]);

  // Infinite scroll: load more rows when scrolled near bottom
  const handleBodyScrollEnd = React.useCallback((event: BodyScrollEndEvent) => {
    if (loading) return;
    const lastRow = event.api.getLastDisplayedRow();
    if (lastRow >= rows.length - 200 && rows.length < totalRows) {
      onLoadMore(rows.length);
    }
  }, [loading, rows.length, totalRows, onLoadMore]);

  // --- Range selection (Excel-like) ---
  const getColFields = React.useCallback((): string[] => {
    const api = gridRef.current?.api;
    if (!api) return [];
    const allCols = api.getAllDisplayedColumns?.() || [];
    return allCols.map((c: any) => c.getColId()).filter((id: string) => id !== '__index__');
  }, []);

  const clearSelectionHighlight = React.useCallback(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;
    wrapper.querySelectorAll('.ve-cell-selected').forEach(el => el.classList.remove('ve-cell-selected'));
  }, []);

  const applySelectionHighlight = React.useCallback(() => {
    const sel = selectionRef.current;
    const wrapper = gridWrapperRef.current;
    if (!sel || !wrapper) return;

    clearSelectionHighlight();

    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startColIdx, sel.endColIdx);
    const maxCol = Math.max(sel.startColIdx, sel.endColIdx);

    const allRows = wrapper.querySelectorAll('.ag-row');
    allRows.forEach((rowEl: Element) => {
      const rowIdx = parseInt(rowEl.getAttribute('row-index') || '-1');
      if (rowIdx < minRow || rowIdx > maxRow) return;
      const cells = rowEl.querySelectorAll('.ag-cell');
      cells.forEach((cellEl: Element) => {
        const colId = cellEl.getAttribute('col-id');
        if (!colId || colId === '__index__') return;
        const colIdx = sel.colFields.indexOf(colId);
        if (colIdx >= minCol && colIdx <= maxCol) {
          cellEl.classList.add('ve-cell-selected');
        }
      });
    });
  }, [clearSelectionHighlight]);

  const handleGridMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (isContainerView) return;
    if (e.button !== 0) return; // Left click only
    const cellEl = (e.target as HTMLElement).closest('.ag-cell');
    const rowEl = (e.target as HTMLElement).closest('.ag-row');
    if (!cellEl || !rowEl) return;

    const colId = cellEl.getAttribute('col-id');
    const rowIdx = parseInt(rowEl.getAttribute('row-index') || '-1');
    if (!colId || colId === '__index__' || rowIdx < 0) return;

    const colFields = getColFields();
    const colIdx = colFields.indexOf(colId);
    if (colIdx < 0) return;

    selectionRef.current = {
      startRow: rowIdx, startColIdx: colIdx,
      endRow: rowIdx, endColIdx: colIdx,
      dragging: true, colFields
    };
    applySelectionHighlight();
  }, [isContainerView, getColFields, applySelectionHighlight]);

  const handleGridMouseMove = React.useCallback((e: React.MouseEvent) => {
    const sel = selectionRef.current;
    if (!sel || !sel.dragging) return;

    const cellEl = (e.target as HTMLElement).closest('.ag-cell');
    const rowEl = (e.target as HTMLElement).closest('.ag-row');
    if (!cellEl || !rowEl) return;

    const colId = cellEl.getAttribute('col-id');
    const rowIdx = parseInt(rowEl.getAttribute('row-index') || '-1');
    if (!colId || colId === '__index__' || rowIdx < 0) return;

    const colIdx = sel.colFields.indexOf(colId);
    if (colIdx < 0) return;

    sel.endRow = rowIdx;
    sel.endColIdx = colIdx;
    applySelectionHighlight();
  }, [applySelectionHighlight]);

  const handleGridMouseUp = React.useCallback(() => {
    if (selectionRef.current) {
      selectionRef.current.dragging = false;
    }
  }, []);

  // Copy selected range as TSV
  const copySelection = React.useCallback(() => {
    const sel = selectionRef.current;
    if (!sel) return;
    const doc = gridWrapperRef.current?.ownerDocument || document;
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startColIdx, sel.endColIdx);
    const maxCol = Math.max(sel.startColIdx, sel.endColIdx);
    const selectedFields = sel.colFields.slice(minCol, maxCol + 1);
    const lines: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      if (r < rows.length) {
        lines.push(selectedFields.map(f => {
          const v = rows[r][f];
          return v == null ? '' : String(v);
        }).join('\t'));
      }
    }
    const tsv = lines.join('\n');
    if (tsv && doc.defaultView?.navigator?.clipboard) {
      doc.defaultView.navigator.clipboard.writeText(tsv);
    }
  }, [rows]);

  // Ctrl+C: copy selected range
  React.useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;
    const doc = wrapper.ownerDocument || document;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectionRef.current) {
          e.preventDefault();
          copySelection();
        }
      }
    };
    doc.addEventListener('keydown', handleKeyDown);
    return () => doc.removeEventListener('keydown', handleKeyDown);
  }, [copySelection]);

  // Right-click context menu
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    if (!selectionRef.current) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Close context menu on any click
  React.useEffect(() => {
    if (!contextMenu) return;
    const doc = gridWrapperRef.current?.ownerDocument || document;
    const close = () => setContextMenu(null);
    doc.addEventListener('mousedown', close);
    return () => doc.removeEventListener('mousedown', close);
  }, [contextMenu]);

  // Detect JupyterLab dark theme
  const isDark = document.body.getAttribute('data-jp-theme-light') === 'false';
  const themeClass = isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

  return (
    <div
      className="ve-grid-wrapper"
      ref={gridWrapperRef}
      onMouseDown={handleGridMouseDown}
      onMouseMove={handleGridMouseMove}
      onMouseUp={handleGridMouseUp}
      onContextMenu={handleContextMenu}
    >
      <div className={themeClass} style={{ width: '100%', height: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={{
            sortable: true,
            resizable: true,
            minWidth: 60
          }}
          headerHeight={64}
          rowHeight={isContainerView ? 36 : 28}
          animateRows={false}
          suppressMovableColumns={false}
          suppressCellFocus={false}
          readOnlyEdit={!isContainerView}
          rowClass={isContainerView ? 've-drillable-row' : undefined}
          onSortChanged={handleSortChanged}
          onCellClicked={handleCellClicked}
          onCellEditRequest={isContainerView ? undefined : handleCellEditRequest}
          onBodyScrollEnd={handleBodyScrollEnd}
          onRowDoubleClicked={isContainerView && onDrillDown ? (event: any) => {
            const data = event.data;
            const key = String(data?.index ?? data?.key ?? event.rowIndex);
            onDrillDown(key, `[${key}]`);
          } : undefined}
          getRowId={(params: any) => String(params.data.__row_index__ ?? params.node?.rowIndex ?? 0)}
          loading={loading}
        />
      </div>
      {contextMenu && (
        <div
          className="ve-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className="ve-context-menu-item"
            onMouseDown={(e) => {
              e.stopPropagation();
              copySelection();
              setContextMenu(null);
            }}
          >
            Copy
          </div>
        </div>
      )}
    </div>
  );
};
