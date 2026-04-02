import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { CommManager } from '../comm/CommManager';
import {
  ICommMessage,
  IVariableSummary,
  IDataPageMsg,
  IColumnStatsMsg,
  IColumnStats,
  ISortItem
} from '../comm/protocol';
import { VariableList } from './VariableList';
import { DataGrid } from './DataGrid';
import { MetadataSidebar } from './MetadataSidebar';
import { CellReferenceBar } from './CellReferenceBar';
import { StatusBar } from './StatusBar';
import { ResizeHandle } from './ResizeHandle';
import { SqlPanel } from './SqlPanel';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { cloneStylesheets } from '../utils/stylesheetCloner';

interface Props {
  commManager: CommManager;
  autoDetach?: boolean;
}

interface CellSelection {
  rowIndex: number;
  colName: string;
  value: any;
}

export const VariableExplorerApp: React.FC<Props> = ({ commManager }) => {
  const [connected, setConnected] = React.useState(commManager.isConnected);
  const [variables, setVariables] = React.useState<IVariableSummary[]>([]);
  const [selectedVar, setSelectedVar] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [columns, setColumns] = React.useState<any[]>([]);
  const [columnStats, setColumnStats] = React.useState<IColumnStats[]>([]);
  const [sortModel, setSortModel] = React.useState<ISortItem[]>([]);
  const [cellSelection, setCellSelection] = React.useState<CellSelection | null>(null);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [hiddenColumns, setHiddenColumns] = React.useState<Set<string>>(new Set());
  const [navPath, setNavPath] = React.useState<BreadcrumbItem[]>([]);
  const [activeTab, setActiveTab] = React.useState<'data' | 'sql'>('data');
  const [sqlDocked, setSqlDocked] = React.useState(true);
  const [sqlDockHeight, setSqlDockHeight] = React.useState(300);

  const onSqlDockResizeStart = React.useCallback(() => sqlDockHeight, [sqlDockHeight]);
  const onSqlDockResize = React.useCallback((newHeight: number) => {
    setSqlDockHeight(Math.max(100, Math.min(800, newHeight)));
  }, []);

  // Panel sizing
  const [leftWidth, setLeftWidth] = React.useState(220);
  const [rightWidth, setRightWidth] = React.useState(280);

  const onLeftResizeStart = React.useCallback(() => leftWidth, [leftWidth]);
  const onLeftResize = React.useCallback((newWidth: number) => {
    setLeftWidth(Math.max(120, Math.min(500, newWidth)));
  }, []);

  // For the right panel, dragging right = panel shrinks, so invert
  const onRightResizeStart = React.useCallback(() => rightWidth, [rightWidth]);
  const onRightResize = React.useCallback((newWidth: number) => {
    // ResizeHandle sends base + delta. For the right side,
    // we want: base - delta = base - (newWidth - base) = 2*base - newWidth
    // But we don't have base here. Instead, let's just negate in the component.
    setRightWidth(Math.max(150, Math.min(500, newWidth)));
  }, []);

  // Listen for connection changes
  React.useEffect(() => {
    const onConnectionChanged = (_: CommManager, isConnected: boolean) => {
      setConnected(isConnected);
      if (!isConnected) {
        setVariables([]);
        setSelectedVar(null);
        setRows([]);
      }
    };
    commManager.connectionChanged.connect(onConnectionChanged);
    return () => {
      commManager.connectionChanged.disconnect(onConnectionChanged);
    };
  }, [commManager]);

  // Listen for kernel messages
  React.useEffect(() => {
    const onMessage = (_: CommManager, msg: ICommMessage) => {
      switch (msg.type) {
        case 'variable_list':
          setVariables(msg.variables);
          break;
        case 'data_page': {
          const dp = msg as IDataPageMsg;
          if (dp.startRow === 0) {
            setRows(dp.rows);
          } else {
            setRows(prev => [...prev, ...dp.rows]);
          }
          setTotalRows(dp.totalRows);
          setColumns(dp.columns);
          setLoading(false);
          break;
        }
        case 'column_stats': {
          const cs = msg as IColumnStatsMsg;
          setColumnStats(cs.stats);
          break;
        }
        case 'error':
          console.error('Variable Explorer kernel error:', msg.message);
          setLoading(false);
          break;
      }
    };
    commManager.messageReceived.connect(onMessage);
    return () => {
      commManager.messageReceived.disconnect(onMessage);
    };
  }, [commManager]);

  // Fetch data for a variable, optionally at a child path
  const fetchData = React.useCallback((name: string, childKey?: string) => {
    setRows([]);
    setSortModel([]);
    setCellSelection(null);
    setHiddenColumns(new Set());
    setLoading(true);
    commManager.send({
      type: 'get_data',
      variable: name,
      startRow: 0,
      endRow: 1000,
      childKey
    });
    commManager.send({
      type: 'get_stats',
      variable: name,
      childKey
    });
  }, [commManager]);

  const onSelectVariable = React.useCallback((name: string) => {
    setSelectedVar(name);
    setNavPath([{ label: name }]);
    fetchData(name);
  }, [fetchData]);

  // Drill into a child (e.g., double-click row in container summary)
  const onDrillDown = React.useCallback((childKey: string, childLabel: string) => {
    if (!selectedVar) return;
    const newPath = [...navPath, { label: childLabel, childKey }];
    setNavPath(newPath);
    // Build the full child key chain for nested access
    const fullChildKey = newPath.slice(1).map(p => p.childKey).filter(Boolean).join('.');
    fetchData(selectedVar, fullChildKey || undefined);
  }, [selectedVar, navPath, fetchData]);

  // Navigate back to a specific depth in the breadcrumb
  const onBreadcrumbNavigate = React.useCallback((depth: number) => {
    if (!selectedVar) return;
    const newPath = navPath.slice(0, depth + 1);
    setNavPath(newPath);
    if (newPath.length <= 1) {
      // Back to root
      fetchData(selectedVar);
    } else {
      const fullChildKey = newPath.slice(1).map(p => p.childKey).filter(Boolean).join('.');
      fetchData(selectedVar, fullChildKey || undefined);
    }
  }, [selectedVar, navPath, fetchData]);

  // Check if current view is a container (showing summary, not actual data)
  const isContainerView = React.useMemo(() => {
    if (!selectedVar) return false;
    const varInfo = variables.find(v => v.name === selectedVar);
    if (!varInfo) return false;
    // Only the root level of containers shows the summary
    if (navPath.length > 1) return false;
    const drillableKinds = [
      'list_of_dataframes', 'dict_of_dataframes',
      'dict_mixed', 'dict_of_dicts'
    ];
    return drillableKinds.includes(varInfo.tabularKind);
  }, [selectedVar, variables, navPath]);

  const onLoadMore = React.useCallback((startRow: number) => {
    if (selectedVar) {
      commManager.send({
        type: 'get_data',
        variable: selectedVar,
        startRow,
        endRow: startRow + 1000,
        sortModel: sortModel.length > 0 ? sortModel : undefined
      });
    }
  }, [commManager, selectedVar, sortModel]);

  const onSortChanged = React.useCallback((newSortModel: ISortItem[]) => {
    setSortModel(newSortModel);
    setRows([]);
    setLoading(true);
    if (selectedVar) {
      commManager.send({
        type: 'get_data',
        variable: selectedVar,
        startRow: 0,
        endRow: 1000,
        sortModel: newSortModel.length > 0 ? newSortModel : undefined
      });
    }
  }, [commManager, selectedVar]);

  const onCellSelected = React.useCallback((rowIndex: number, colName: string, value: any) => {
    setCellSelection({ rowIndex, colName, value });
  }, []);

  const onCellEdit = React.useCallback((rowIndex: number, column: string, newValue: string) => {
    if (selectedVar) {
      commManager.send({
        type: 'edit_cell',
        variable: selectedVar,
        rowIndex,
        column,
        newValue
      });
    }
  }, [commManager, selectedVar]);

  const onToggleColumn = React.useCallback((colName: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(colName)) {
        next.delete(colName);
      } else {
        next.add(colName);
      }
      return next;
    });
  }, []);

  const onRefresh = React.useCallback(() => {
    commManager.refresh();
    if (selectedVar) {
      onSelectVariable(selectedVar);
    }
  }, [commManager, selectedVar, onSelectVariable]);

  const selectedVarInfo = variables.find(v => v.name === selectedVar);

  // Pop out SQL panel into its own window
  const onSqlPopOut = React.useCallback(() => {
    // Switch main window back to Data tab
    setActiveTab('data');

    const width = Math.min(1200, screen.availWidth * 0.7);
    const height = Math.min(700, screen.availHeight * 0.6);
    const left = Math.round((screen.availWidth - width) / 2);
    const top = Math.round((screen.availHeight - height) / 2);

    const win = window.open(
      '',
      'variable-explorer-sql',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    if (!win) {
      alert('Pop-up was blocked by your browser.\n\nAllow pop-ups for this site in your browser settings.');
      return;
    }

    const doc = win.document;
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SQL - Variable Explorer</title>
<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}#ve-sql-root{width:100%;height:100%}</style>
</head><body><div id="ve-sql-root"></div></body></html>`);
    doc.close();

    cloneStylesheets(document, doc);
    const parentBody = document.body;
    for (let i = 0; i < parentBody.attributes.length; i++) {
      const attr = parentBody.attributes[i];
      if (attr.name.startsWith('data-jp-')) {
        doc.body.setAttribute(attr.name, attr.value);
      }
    }
    doc.body.className = parentBody.className;

    const container = doc.getElementById('ve-sql-root')!;
    ReactDOM.render(
      React.createElement(SqlPanel, { commManager, onPopOut: undefined }),
      container
    );

    // Clean up on close
    const poll = window.setInterval(() => {
      if (win.closed) {
        window.clearInterval(poll);
        try { ReactDOM.unmountComponentAtNode(container); } catch {}
      }
    }, 500);
  }, [commManager]);

  return (
    <div className="ve-main-container">
      {/* Tab bar */}
      <div className="ve-tab-bar">
        {!sqlDocked && (
          <>
            <button
              className={`ve-tab ${activeTab === 'data' ? 've-tab-active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Data
            </button>
            <button
              className={`ve-tab ${activeTab === 'sql' ? 've-tab-active' : ''}`}
              onClick={() => setActiveTab('sql')}
            >
              SQL
            </button>
          </>
        )}
        {sqlDocked && (
          <span style={{ fontWeight: 600, fontSize: 'var(--jp-ui-font-size1)', padding: '0 8px' }}>Data</span>
        )}
        <div className="ve-tab-spacer" />
        {(activeTab === 'data' || sqlDocked) && selectedVar && (
          <>
            <button className="ve-tab-action" onClick={onRefresh} title="Refresh data">
              &#x21bb; Refresh
            </button>
            <button className="ve-tab-action" onClick={() => setShowSidebar(!showSidebar)} title="Toggle metadata sidebar">
              {showSidebar ? 'Hide' : 'Show'} Metadata
            </button>
          </>
        )}
      </div>

      {/* Both tabs always mounted, hidden with CSS to preserve state */}
      <div className="ve-tab-content" style={{ display: activeTab === 'data' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {cellSelection && (
          <CellReferenceBar
            rowIndex={cellSelection.rowIndex}
            colName={cellSelection.colName}
            value={cellSelection.value}
          />
        )}
        <div className="ve-content-area">
          <div style={{ width: leftWidth, minWidth: 120, flexShrink: 0 }}>
            <VariableList
              variables={variables}
              selectedVar={selectedVar}
              onSelect={onSelectVariable}
            />
          </div>
          <ResizeHandle direction="horizontal" onResizeStart={onLeftResizeStart} onResize={onLeftResize} />
          <div className="ve-grid-container">
            <div className="ve-grid-toolbar">
              <span className="ve-toolbar-title">
                {selectedVar || 'Select a variable'}
                {selectedVarInfo && (
                  <span style={{ fontWeight: 'normal', opacity: 0.6, marginLeft: 8, fontSize: '12px' }}>
                    {selectedVarInfo.typeName} ({selectedVarInfo.shape.map(s => s.toLocaleString()).join(' \u00d7 ')})
                  </span>
                )}
              </span>
            </div>
            {navPath.length > 1 && (
              <Breadcrumb path={navPath} onNavigate={onBreadcrumbNavigate} />
            )}
            {selectedVar && columns.length > 0 ? (
              <DataGrid
                rows={rows}
                columns={columns}
                columnStats={columnStats}
                totalRows={totalRows}
                sortModel={sortModel}
                hiddenColumns={hiddenColumns}
                loading={loading}
                isContainerView={isContainerView}
                onSortChanged={onSortChanged}
                onLoadMore={onLoadMore}
                onCellSelected={onCellSelected}
                onCellEdit={onCellEdit}
                onDrillDown={onDrillDown}
              />
            ) : (
              <div className="ve-empty-state">
                {loading ? (
                  <div className="ve-loading">
                    <div className="ve-spinner" />
                  </div>
                ) : !connected ? (
                  <>
                    <div className="ve-empty-icon">&#x1f50c;</div>
                    <div>Not connected to a kernel</div>
                    <div style={{ fontSize: '12px', marginTop: 8, opacity: 0.7 }}>
                      Open a notebook and run a cell to connect
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ve-empty-icon">&#x1f4ca;</div>
                    <div>
                      {variables.length === 0
                        ? 'No variables in kernel namespace'
                        : 'Select a DataFrame to view its contents'}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {showSidebar && selectedVar && columnStats.length > 0 && (
            <>
              <ResizeHandle direction="horizontal" onResizeStart={onRightResizeStart} onResize={onRightResize} invert={true} />
              <div style={{ width: rightWidth, minWidth: 150, flexShrink: 0 }}>
                <MetadataSidebar
                  columns={columns}
                  columnStats={columnStats}
                  hiddenColumns={hiddenColumns}
                  onToggleColumn={onToggleColumn}
                  selectedVarInfo={selectedVarInfo || null}
                />
              </div>
            </>
          )}
        </div>
        <StatusBar
          selectedVar={selectedVar}
          totalRows={totalRows}
          totalCols={columns.length}
          sortModel={sortModel}
          connected={connected}
        />
      </div>
      {/* SQL tab (full view, hidden when docked) */}
      <div style={{ display: !sqlDocked && activeTab === 'sql' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
        <SqlPanel commManager={commManager} onPopOut={onSqlPopOut} isDocked={false} onToggleDock={() => { setSqlDocked(true); setActiveTab('data'); }} />
      </div>

      {/* SQL docked below data */}
      {sqlDocked && (
        <>
          <div
            className="ve-resize-handle-horizontal"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const base = sqlDockHeight;
              const doc = (e.target as HTMLElement).ownerDocument || document;
              const onMove = (me: MouseEvent) => {
                me.preventDefault();
                setSqlDockHeight(Math.max(100, Math.min(800, base - (me.clientY - startY))));
              };
              const onUp = () => {
                doc.removeEventListener('mousemove', onMove);
                doc.removeEventListener('mouseup', onUp);
                doc.body.style.cursor = '';
                doc.body.style.userSelect = '';
              };
              doc.addEventListener('mousemove', onMove);
              doc.addEventListener('mouseup', onUp);
              doc.body.style.cursor = 'row-resize';
              doc.body.style.userSelect = 'none';
            }}
          />
          <div style={{ height: sqlDockHeight, flexShrink: 0, overflow: 'hidden', display: 'flex' }}>
            <SqlPanel commManager={commManager} onPopOut={onSqlPopOut} isDocked={true} onToggleDock={() => setSqlDocked(false)} />
          </div>
        </>
      )}
    </div>
  );
};
