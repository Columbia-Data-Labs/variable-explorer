import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { CommManager } from '../comm/CommManager';
import {
  ICommMessage,
  ISqlResultMsg,
  ISqlErrorMsg,
  ISqlTablesResultMsg,
  ISqlTableInfo,
  IColumnDef
} from '../comm/protocol';

interface Props {
  commManager: CommManager;
  onPopOut?: () => void;
  isDocked?: boolean;
  onToggleDock?: () => void;
}

export const SqlPanel: React.FC<Props> = ({ commManager, onPopOut, isDocked, onToggleDock }) => {
  const [query, setQuery] = React.useState('SELECT * FROM ');
  const [saveAs, setSaveAs] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultColumns, setResultColumns] = React.useState<IColumnDef[]>([]);
  const [resultRows, setResultRows] = React.useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [savedAs, setSavedAs] = React.useState<string | null>(null);
  const [tables, setTables] = React.useState<ISqlTableInfo[]>([]);
  const [duckdbAvailable, setDuckdbAvailable] = React.useState(true);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Request table list on mount
  React.useEffect(() => {
    commManager.send({ type: 'sql_tables' });
  }, [commManager]);

  // Listen for SQL responses
  React.useEffect(() => {
    const onMessage = (_: CommManager, msg: ICommMessage) => {
      if (msg.type === 'sql_result') {
        const r = msg as ISqlResultMsg;
        setResultColumns(r.columns);
        setResultRows(r.rows);
        setTotalRows(r.totalRows);
        setSavedAs(r.savedAs);
        setTables(r.tables.map(t => ({ name: t, rows: 0, columns: 0, columnNames: [] })));
        setError(null);
        setRunning(false);
      } else if (msg.type === 'sql_error') {
        const e = msg as ISqlErrorMsg;
        setError(e.error);
        setResultColumns([]);
        setResultRows([]);
        setRunning(false);
      } else if (msg.type === 'sql_tables') {
        const t = msg as ISqlTablesResultMsg;
        setTables(t.tables);
        setDuckdbAvailable(t.duckdbAvailable);
      }
    };
    commManager.messageReceived.connect(onMessage);
    return () => {
      commManager.messageReceived.disconnect(onMessage);
    };
  }, [commManager]);

  const executeQuery = React.useCallback(() => {
    if (!query.trim()) return;
    setRunning(true);
    setError(null);
    setSavedAs(null);
    commManager.send({
      type: 'sql_execute',
      query: query.trim(),
      saveAs: saveAs.trim() || undefined
    });
  }, [commManager, query, saveAs]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  }, [executeQuery]);

  // Insert table name at cursor
  const insertTableName = React.useCallback((name: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newQuery = query.substring(0, start) + name + query.substring(end);
    setQuery(newQuery);
    // Refocus and set cursor after inserted name
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + name.length;
    }, 0);
  }, [query]);

  // Save SQL to file
  const saveScript = React.useCallback(() => {
    const blob = new Blob([query], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = (textareaRef.current?.ownerDocument || document).createElement('a');
    a.href = url;
    a.download = 'query.sql';
    a.click();
    URL.revokeObjectURL(url);
  }, [query]);

  // Open SQL from file
  const openScript = React.useCallback(() => {
    const doc = textareaRef.current?.ownerDocument || document;
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.sql,.txt';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setQuery(text);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // Copy results to clipboard as TSV
  const copyResults = React.useCallback(() => {
    if (resultColumns.length === 0 || resultRows.length === 0) return;
    const headers = resultColumns.map(c => c.name).join('\t');
    const rowLines = resultRows.map(row =>
      resultColumns.map(c => {
        const val = row[c.name];
        return val == null ? '' : String(val);
      }).join('\t')
    );
    const tsv = [headers, ...rowLines].join('\n');
    const doc = textareaRef.current?.ownerDocument || document;
    if (doc.defaultView?.navigator?.clipboard) {
      doc.defaultView.navigator.clipboard.writeText(tsv);
    }
  }, [resultColumns, resultRows]);

  // Build AG Grid column defs for results
  const colDefs: ColDef[] = React.useMemo(() => {
    const indexCol: ColDef = {
      headerName: '#',
      valueGetter: (params: any) => params.node?.rowIndex ?? '',
      width: 60,
      pinned: 'left',
      sortable: false,
      cellStyle: { color: 'var(--jp-ui-font-color2)', fontSize: '11px' }
    };
    const dataCols: ColDef[] = resultColumns.map(col => ({
      headerName: col.name,
      field: col.name,
      sortable: true,
      resizable: true,
    }));
    return [indexCol, ...dataCols];
  }, [resultColumns]);

  const isDark = document.body.getAttribute('data-jp-theme-light') === 'false';
  const themeClass = isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

  if (!duckdbAvailable) {
    return (
      <div className="ve-sql-panel">
        <div className="ve-sql-no-duckdb">
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: 8 }}>SQL Query Engine</div>
          <div style={{ marginBottom: 12, opacity: 0.8 }}>
            DuckDB is required to query your DataFrames with SQL.
          </div>
          <code style={{
            display: 'block',
            padding: '8px 12px',
            background: 'var(--jp-layout-color2)',
            borderRadius: 4,
            fontSize: '13px'
          }}>
            pip install duckdb
          </code>
          <div style={{ marginTop: 12, fontSize: '12px', opacity: 0.6 }}>
            Then restart your kernel and reopen the Variable Explorer.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ve-sql-panel">
      <div className="ve-sql-top">
        {/* Table list sidebar */}
        <div className="ve-sql-tables">
          <div className="ve-sql-tables-header">Tables</div>
          <div className="ve-sql-tables-list">
            {tables.map(t => (
              <div
                key={t.name}
                className="ve-sql-table-item"
                onClick={() => insertTableName(t.name)}
                title={`${t.name} (${t.rows} rows, ${t.columns} cols)\nColumns: ${t.columnNames.join(', ')}\nClick to insert`}
              >
                <span className="ve-sql-table-name">{t.name}</span>
                {t.rows > 0 && (
                  <span className="ve-sql-table-meta">
                    {t.rows} &times; {t.columns}
                  </span>
                )}
              </div>
            ))}
            {tables.length === 0 && (
              <div style={{ padding: 8, fontSize: '11px', opacity: 0.5 }}>
                No DataFrames in namespace
              </div>
            )}
          </div>
        </div>

        {/* Query editor */}
        <div className="ve-sql-editor">
          <textarea
            ref={textareaRef}
            className="ve-sql-textarea"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SELECT * FROM my_dataframe WHERE ..."
            spellCheck={false}
          />
          <div className="ve-sql-controls">
            <button
              className="ve-sql-run-btn"
              onClick={executeQuery}
              disabled={running || !query.trim()}
            >
              {running ? 'Running...' : '\u25b6 Run (Ctrl+Enter)'}
            </button>
            <button className="ve-tab-action" onClick={openScript} title="Open a .sql file">
              Open
            </button>
            <button className="ve-tab-action" onClick={saveScript} title="Save query to .sql file">
              Save
            </button>
            <div className="ve-sql-save-as">
              <label>Save result as:</label>
              <input
                type="text"
                className="ve-sql-save-input"
                value={saveAs}
                onChange={e => setSaveAs(e.target.value)}
                placeholder="object_name"
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {onToggleDock && (
                <button
                  className="ve-tab-action"
                  onClick={onToggleDock}
                  title={isDocked ? 'Show SQL as a separate tab' : 'Dock SQL below data'}
                >
                  {isDocked ? '\u2B71 Undock' : '\u2B73 Dock Below'}
                </button>
              )}
              {onPopOut && (
                <button
                  className="ve-tab-action"
                  onClick={onPopOut}
                  title="Open SQL editor in a separate window"
                >
                  &#x2197; Pop Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results area */}
      <div className="ve-sql-results">
        {error && (
          <div className="ve-sql-error">
            <strong>Error:</strong> {error}
          </div>
        )}
        {savedAs && (
          <div className="ve-sql-saved">
            Result saved as <strong>{savedAs}</strong> ({totalRows.toLocaleString()} rows)
          </div>
        )}
        {resultRows.length > 0 ? (
          <div className={themeClass} style={{ width: '100%', height: '100%' }}>
            <AgGridReact
              rowData={resultRows}
              columnDefs={colDefs}
              headerHeight={32}
              rowHeight={28}
              animateRows={false}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              defaultColDef={{ sortable: true, resizable: true, minWidth: 60 }}
            />
          </div>
        ) : !error && (
          <div className="ve-sql-placeholder">
            {running ? (
              <div className="ve-loading"><div className="ve-spinner" /></div>
            ) : (
              <div style={{ opacity: 0.5 }}>
                Write a SQL query and press Ctrl+Enter to run it.
                <br />
                All DataFrames in your namespace are available as tables.
              </div>
            )}
          </div>
        )}
        {resultRows.length > 0 && (
          <div className="ve-sql-result-status">
            {totalRows.toLocaleString()} rows returned
            {totalRows > 10000 && ' (showing first 10,000)'}
          </div>
        )}
      </div>
    </div>
  );
};
