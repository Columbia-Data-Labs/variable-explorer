import * as React from 'react';
import { IVariableSummary } from '../comm/protocol';

interface Props {
  variables: IVariableSummary[];
  selectedVar: string | null;
  onSelect: (name: string, childKey?: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatShape(shape: number[]): string {
  if (shape.length === 0) return 'scalar';
  if (shape.length === 1) return `${shape[0].toLocaleString()} items`;
  return shape.map(s => s.toLocaleString()).join(' \u00d7 ');
}

function getTypeBadgeClass(typeName: string): string {
  const lower = typeName.toLowerCase();
  if (lower === 'dataframe') return 've-type-dataframe';
  if (lower === 'series') return 've-type-series';
  if (lower === 'ndarray') return 've-type-ndarray';
  if (lower === 'list' || lower === 'tuple') return 've-type-list';
  if (lower === 'dict') return 've-type-dict';
  return 've-type-other';
}

function getKindLabel(kind: string): string {
  switch (kind) {
    case 'list_of_dicts': return 'records';
    case 'list_of_lists': return 'matrix';
    case 'list_of_dataframes': return 'container';
    case 'dict_of_dataframes': return 'container';
    case 'dict_of_lists': return 'table';
    case 'dict_of_dicts': return 'nested';
    case 'list_scalar': return 'values';
    case 'dict_scalar': return 'record';
    default: return '';
  }
}

export const VariableList: React.FC<Props> = ({ variables, selectedVar, onSelect }) => {
  const [filter, setFilter] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!filter) return variables;
    const lower = filter.toLowerCase();
    return variables.filter(
      v => v.name.toLowerCase().includes(lower) || v.typeName.toLowerCase().includes(lower)
    );
  }, [variables, filter]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.isTabular !== b.isTabular) return a.isTabular ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  return (
    <div className="ve-variable-list">
      <div className="ve-variable-list-header">
        <input
          className="ve-variable-search"
          type="text"
          placeholder="Filter objects..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="ve-variable-items">
        {sorted.length === 0 ? (
          <div style={{ padding: '12px 8px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
            {variables.length === 0 ? 'No variables' : 'No matches'}
          </div>
        ) : (
          sorted.map(v => {
            const kindLabel = getKindLabel(v.tabularKind);
            return (
              <div
                key={v.name}
                className={`ve-variable-item ${v.name === selectedVar ? 've-selected' : ''}`}
                onClick={() => v.isTabular && onSelect(v.name)}
                style={{ opacity: v.isTabular ? 1 : 0.6, cursor: v.isTabular ? 'pointer' : 'default' }}
                title={v.isTabular ? `Click to view ${v.name}` : `${v.name} (${v.typeName})`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="ve-var-name">{v.name}</span>
                  <span className={`ve-type-badge ${getTypeBadgeClass(v.typeName)}`}>
                    {v.typeName}
                  </span>
                  {kindLabel && (
                    <span className="ve-kind-label">{kindLabel}</span>
                  )}
                </div>
                <div className="ve-var-meta">
                  <span>{formatShape(v.shape)}</span>
                  <span>{formatBytes(v.memoryBytes)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
