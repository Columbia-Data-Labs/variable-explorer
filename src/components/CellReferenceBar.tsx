import * as React from 'react';

interface Props {
  rowIndex: number;
  colName: string;
  value: any;
}

export const CellReferenceBar: React.FC<Props> = ({ rowIndex, colName, value }) => {
  const displayValue = value == null ? 'null' : String(value);

  return (
    <div className="ve-cell-reference-bar">
      <span className="ve-cell-location">
        Row {rowIndex.toLocaleString()} / Col: {colName}
      </span>
      <span className="ve-cell-value" title={displayValue}>
        {displayValue}
      </span>
    </div>
  );
};
