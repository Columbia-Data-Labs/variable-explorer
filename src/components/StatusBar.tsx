import * as React from 'react';
import { ISortItem } from '../comm/protocol';

interface Props {
  selectedVar: string | null;
  totalRows: number;
  totalCols: number;
  sortModel: ISortItem[];
  connected: boolean;
}

export const StatusBar: React.FC<Props> = ({
  selectedVar,
  totalRows,
  totalCols,
  sortModel,
  connected
}) => {
  const sortDisplay = sortModel.length > 0
    ? sortModel.map(s => `${s.colId} ${s.sort}`).join(', ')
    : 'none';

  return (
    <div className="ve-status-bar">
      <span className="ve-status-item" style={{ color: connected ? 'var(--jp-success-color1)' : 'var(--jp-error-color1)' }}>
        {connected ? '\u25cf Connected' : '\u25cb Disconnected'}
      </span>
      {selectedVar && (
        <>
          <span className="ve-status-separator">|</span>
          <span className="ve-status-item">Vars: {totalCols}</span>
          <span className="ve-status-separator">|</span>
          <span className="ve-status-item">Obs: {totalRows.toLocaleString()}</span>
          <span className="ve-status-separator">|</span>
          <span className="ve-status-item">Sorted: {sortDisplay}</span>
        </>
      )}
    </div>
  );
};
