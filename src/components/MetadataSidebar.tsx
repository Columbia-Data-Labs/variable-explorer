import * as React from 'react';
import { IColumnDef, IColumnStats, IVariableSummary } from '../comm/protocol';

interface Props {
  columns: IColumnDef[];
  columnStats: IColumnStats[];
  hiddenColumns: Set<string>;
  onToggleColumn: (colName: string) => void;
  selectedVarInfo: IVariableSummary | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const MetadataSidebar: React.FC<Props> = ({
  columns,
  columnStats,
  hiddenColumns,
  onToggleColumn,
  selectedVarInfo
}) => {
  const [filter, setFilter] = React.useState('');
  const [selectedCol, setSelectedCol] = React.useState<string | null>(null);
  const [propertiesHeight, setPropertiesHeight] = React.useState(220);
  const handleRef = React.useRef<HTMLDivElement>(null);

  const statsMap = React.useMemo(() => {
    const map: Record<string, IColumnStats> = {};
    for (const s of columnStats) {
      map[s.name] = s;
    }
    return map;
  }, [columnStats]);

  const filtered = React.useMemo(() => {
    if (!filter) return columns;
    const lower = filter.toLowerCase();
    return columns.filter(c => c.name.toLowerCase().includes(lower));
  }, [columns, filter]);

  const selectedStats = selectedCol ? statsMap[selectedCol] : null;
  const selectedColDef = selectedCol ? columns.find(c => c.name === selectedCol) : null;

  // Horizontal resize for properties panel
  const onHandleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const baseHeight = propertiesHeight;
    const doc = handleRef.current?.ownerDocument || document;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const delta = startY - moveEvent.clientY; // dragging up = increase height
      setPropertiesHeight(Math.max(80, Math.min(500, baseHeight + delta)));
    };

    const onMouseUp = () => {
      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);
      doc.body.style.cursor = '';
      doc.body.style.userSelect = '';
    };

    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', onMouseUp);
    doc.body.style.cursor = 'row-resize';
    doc.body.style.userSelect = 'none';
  }, [propertiesHeight]);

  return (
    <div className="ve-metadata-sidebar">
      <div className="ve-metadata-header">
        <span>Columns</span>
        <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.6 }}>
          {columns.length}
        </span>
      </div>
      <input
        className="ve-metadata-search"
        type="text"
        placeholder="Filter columns..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <div className="ve-metadata-columns">
        {filtered.map(col => {
          return (
            <div
              key={col.name}
              className="ve-metadata-column-item"
              onClick={() => setSelectedCol(col.name)}
              style={{
                cursor: 'pointer',
                background: col.name === selectedCol ? 'var(--jp-layout-color2)' : undefined
              }}
            >
              <input
                type="checkbox"
                checked={!hiddenColumns.has(col.name)}
                onChange={() => onToggleColumn(col.name)}
                onClick={e => e.stopPropagation()}
              />
              <span className="ve-col-name" title={col.name}>
                {col.name}
              </span>
              <span className="ve-col-type">{col.dtype}</span>
            </div>
          );
        })}
      </div>

      {/* Horizontal resize handle */}
      <div
        ref={handleRef}
        className="ve-resize-handle-horizontal"
        onMouseDown={onHandleMouseDown}
      />

      {/* Properties panel */}
      <div className="ve-properties-panel" style={{ height: propertiesHeight, minHeight: 80 }}>
        {selectedStats && selectedColDef ? (
          <>
            <h4>Column: {selectedCol}</h4>
            <table className="ve-properties-table">
              <tbody>
                <tr><td>Name</td><td>{selectedColDef.name}</td></tr>
                <tr><td>Type</td><td>{selectedColDef.dtype}</td></tr>
                <tr><td>Nulls</td><td>{selectedStats.nullCount.toLocaleString()}</td></tr>
                <tr><td>Unique</td><td>{selectedStats.uniqueCount.toLocaleString()}</td></tr>
                {selectedStats.histogram?.type === 'numeric' && (
                  <>
                    <tr><td>Min</td><td>{selectedStats.histogram.min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td></tr>
                    <tr><td>Max</td><td>{selectedStats.histogram.max.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td></tr>
                    <tr><td>Mean</td><td>{selectedStats.histogram.mean.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td></tr>
                    <tr><td>Std</td><td>{selectedStats.histogram.std.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td></tr>
                  </>
                )}
                {selectedStats.histogram?.type === 'boolean' && (
                  <>
                    <tr><td>True</td><td>{selectedStats.histogram.trueCount.toLocaleString()}</td></tr>
                    <tr><td>False</td><td>{selectedStats.histogram.falseCount.toLocaleString()}</td></tr>
                  </>
                )}
                {selectedStats.histogram?.type === 'categorical' && (
                  <>
                    <tr><td>Top values</td><td>
                      {selectedStats.histogram.labels.slice(0, 5).map((label, i) => (
                        <div key={i} style={{ fontSize: '11px' }}>
                          {label}: {selectedStats.histogram!.type === 'categorical'
                            ? (selectedStats.histogram as any).counts[i]?.toLocaleString()
                            : ''}
                        </div>
                      ))}
                    </td></tr>
                  </>
                )}
              </tbody>
            </table>
          </>
        ) : selectedVarInfo ? (
          <>
            <h4>Dataset</h4>
            <table className="ve-properties-table">
              <tbody>
                <tr><td>Name</td><td>{selectedVarInfo.name}</td></tr>
                <tr><td>Type</td><td>{selectedVarInfo.typeName}</td></tr>
                <tr>
                  <td>Shape</td>
                  <td>{selectedVarInfo.shape.map(s => s.toLocaleString()).join(' \u00d7 ')}</td>
                </tr>
                <tr><td>Memory</td><td>{formatBytes(selectedVarInfo.memoryBytes)}</td></tr>
                <tr><td>Variables</td><td>{columns.length}</td></tr>
                <tr><td>Observations</td><td>{selectedVarInfo.shape[0]?.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ fontSize: '12px', opacity: 0.5, textAlign: 'center', paddingTop: 12 }}>
            Click a column for details
          </div>
        )}
      </div>
    </div>
  );
};
