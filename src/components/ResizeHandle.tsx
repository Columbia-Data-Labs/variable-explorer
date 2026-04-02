import * as React from 'react';

interface Props {
  onResizeStart: () => number;
  onResize: (newWidth: number) => void;
  direction: 'horizontal';
  invert?: boolean;
}

export const ResizeHandle: React.FC<Props> = ({ onResizeStart, onResize, direction, invert }) => {
  const handleRef = React.useRef<HTMLDivElement>(null);

  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const baseWidth = onResizeStart();

    // Use the ownerDocument so this works in detached popup windows
    const doc = handleRef.current?.ownerDocument || document;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const delta = moveEvent.clientX - startX;
      const newWidth = invert ? baseWidth - delta : baseWidth + delta;
      onResize(newWidth);
    };

    const onMouseUp = () => {
      doc.removeEventListener('mousemove', onMouseMove);
      doc.removeEventListener('mouseup', onMouseUp);
      doc.body.style.cursor = '';
      doc.body.style.userSelect = '';
    };

    doc.addEventListener('mousemove', onMouseMove);
    doc.addEventListener('mouseup', onMouseUp);
    doc.body.style.cursor = 'col-resize';
    doc.body.style.userSelect = 'none';
  }, [onResizeStart, onResize, invert]);

  return (
    <div
      ref={handleRef}
      className="ve-resize-handle"
      onMouseDown={onMouseDown}
    />
  );
};
