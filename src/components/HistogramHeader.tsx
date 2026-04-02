import * as React from 'react';
import { IColumnStats, INumericHistogram, ICategoricalHistogram, IBooleanHistogram } from '../comm/protocol';
import { drawHistogram } from '../utils/histogramRenderer';

interface Props {
  displayName: string;
  stats?: IColumnStats;
  column?: any;
  setSort?: (sort: string, multiSort: boolean) => void;
  enableSorting?: boolean;
  api?: any;
}

function getTooltipText(
  histogram: INumericHistogram | ICategoricalHistogram | IBooleanHistogram,
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number
): string | null {
  const fmt = (v: number) => {
    if (Number.isInteger(v) && Math.abs(v) < 1e6) return v.toLocaleString();
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (histogram.type === 'numeric') {
    const { counts, edges } = histogram;
    const binIndex = Math.floor((mouseX / canvasWidth) * counts.length);
    if (binIndex < 0 || binIndex >= counts.length) return null;
    return `${fmt(edges[binIndex])} \u2013 ${fmt(edges[binIndex + 1])}: ${counts[binIndex].toLocaleString()}`;
  }

  if (histogram.type === 'categorical') {
    const { labels, counts } = histogram;
    const barCount = Math.min(labels.length, 8);
    // Bars are drawn horizontally, stacked vertically
    const barHeight = canvasHeight / barCount;
    const barIndex = Math.floor(mouseY / barHeight);
    if (barIndex < 0 || barIndex >= barCount) return null;
    return `${labels[barIndex]}: ${counts[barIndex].toLocaleString()}`;
  }

  if (histogram.type === 'boolean') {
    const total = histogram.trueCount + histogram.falseCount + histogram.nullCount;
    if (total === 0) return null;
    const trueWidth = (histogram.trueCount / total) * canvasWidth;
    const falseWidth = (histogram.falseCount / total) * canvasWidth;
    if (mouseX < trueWidth) {
      return `True: ${histogram.trueCount.toLocaleString()} (${Math.round(100 * histogram.trueCount / total)}%)`;
    } else if (mouseX < trueWidth + falseWidth) {
      return `False: ${histogram.falseCount.toLocaleString()} (${Math.round(100 * histogram.falseCount / total)}%)`;
    } else {
      return `Null: ${histogram.nullCount.toLocaleString()} (${Math.round(100 * histogram.nullCount / total)}%)`;
    }
  }

  return null;
}

export const HistogramHeader: React.FC<Props> = ({
  displayName,
  stats,
  column,
  setSort,
  api
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [sortState, setSortState] = React.useState<'asc' | 'desc' | null>(null);
  const [tooltip, setTooltip] = React.useState<{ text: string; x: number; y: number } | null>(null);

  // Draw histogram when stats change
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stats?.histogram) return;
    drawHistogram(canvas, stats.histogram);
  }, [stats]);

  // Track sort state
  React.useEffect(() => {
    if (!column || !api) return;
    const onSortChanged = () => {
      const colState = api.getColumnState?.();
      if (colState) {
        const myState = colState.find((s: any) => s.colId === column.getColId());
        setSortState(myState?.sort || null);
      }
    };
    api.addEventListener?.('sortChanged', onSortChanged);
    return () => {
      api.removeEventListener?.('sortChanged', onSortChanged);
    };
  }, [column, api]);

  const handleClick = (e: React.MouseEvent) => {
    if (!setSort) return;
    let nextSort: string;
    if (sortState === null) {
      nextSort = 'asc';
    } else if (sortState === 'asc') {
      nextSort = 'desc';
    } else {
      nextSort = '';
    }
    setSort(nextSort, e.shiftKey);
  };

  const handleCanvasMouseMove = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!stats?.histogram || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const text = getTooltipText(stats.histogram, mouseX, mouseY, rect.width, rect.height);
    if (text) {
      setTooltip({ text, x: e.clientX, y: rect.top - 4 });
    } else {
      setTooltip(null);
    }
  }, [stats]);

  const handleCanvasMouseLeave = React.useCallback(() => {
    setTooltip(null);
  }, []);

  const sortIcon = sortState === 'asc' ? ' \u25b2' : sortState === 'desc' ? ' \u25bc' : '';

  return (
    <div className="ve-histogram-header" style={{ width: '100%' }}>
      <div className="ve-header-label" onClick={handleClick} title={`Click to sort by ${displayName}`}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        {sortIcon && <span className="ve-sort-icon">{sortIcon}</span>}
      </div>
      {stats?.histogram && (
        <div style={{ position: 'relative', width: '100%' }}>
          <canvas
            ref={canvasRef}
            width={120}
            height={30}
            style={{ width: '100%', height: '30px', cursor: 'crosshair' }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
          {tooltip && (
            <div
              ref={tooltipRef}
              className="ve-histogram-tooltip"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
            >
              {tooltip.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
