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

interface Props {
  rows: Record<string, any>[];
  columns: IColumnDef[];
  columnStats: IColumnStats[];
  totalRows: number;
  sortModel: ISortItem[];
  hiddenColumns: Set<string>;
  loading: boolean;
  onSortChanged: (sortModel: ISortItem[]) => void;
  onLoadMore: (startRow: number) => void;
  onCellSelected: (rowIndex: number, colName: string, value: any) => void;
  onCellEdit: (rowIndex: number, column: string, newValue: string) => void;
}

export const DataGrid: React.FC<Props> = ({
  rows,
  columns,
  columnStats,
  totalRows,
  sortModel,
  hiddenColumns,
  loading,
  onSortChanged,
  onLoadMore,
  onCellSelected,
  onCellEdit
}) => {
  const gridRef = React.useRef<AgGridReact>(null);

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
      headerName: '#',
      colId: '__index__',
      valueGetter: (params: any) => {
        return params.node?.rowIndex != null ? params.node.rowIndex : '';
      },
      width: 70,
      pinned: 'left',
      sortable: true,
      resizable: false,
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

    return [indexCol, ...dataCols];
  }, [columns, statsMap, hiddenColumns]);

  // Handle sort
  const handleSortChanged = React.useCallback((event: SortChangedEvent) => {
    const colState = event.api.getColumnState();
    const sorted = colState.filter((c: any) => c.sort);

    // If the index column (#) is being sorted, clear all sorts → reset to original order
    if (sorted.some((c: any) => c.colId === '__index__')) {
      event.api.applyColumnState({ defaultState: { sort: null } });
      onSortChanged([]);
      return;
    }

    const newSortModel: ISortItem[] = sorted
      .sort((a: any, b: any) => (a.sortIndex || 0) - (b.sortIndex || 0))
      .map((c: any) => ({
        colId: c.colId,
        sort: c.sort as 'asc' | 'desc'
      }));
    onSortChanged(newSortModel);
  }, [onSortChanged]);

  // Handle cell click
  const handleCellClicked = React.useCallback((event: CellClickedEvent) => {
    if (event.colDef.field && event.rowIndex != null) {
      onCellSelected(event.rowIndex, event.colDef.field, event.value);
    }
  }, [onCellSelected]);

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

  // Detect JupyterLab dark theme
  const isDark = document.body.getAttribute('data-jp-theme-light') === 'false';
  const themeClass = isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

  return (
    <div className="ve-grid-wrapper">
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
          rowHeight={28}
          animateRows={false}
          suppressMovableColumns={false}
          readOnlyEdit={true}
          onSortChanged={handleSortChanged}
          onCellClicked={handleCellClicked}
          onCellEditRequest={handleCellEditRequest}
          onBodyScrollEnd={handleBodyScrollEnd}
          getRowId={(params: any) => String(params.data.__row_index__ ?? params.node?.rowIndex ?? 0)}
          loading={loading}
        />
      </div>
    </div>
  );
};
