import * as React from 'react';

export interface BreadcrumbItem {
  label: string;
  childKey?: string;
}

interface Props {
  path: BreadcrumbItem[];
  onNavigate: (depth: number) => void;
}

export const Breadcrumb: React.FC<Props> = ({ path, onNavigate }) => {
  if (path.length <= 1) return null;

  return (
    <div className="ve-breadcrumb">
      {path.map((item, i) => {
        const isLast = i === path.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="ve-breadcrumb-sep">&rsaquo;</span>}
            {isLast ? (
              <span className="ve-breadcrumb-current">{item.label}</span>
            ) : (
              <span
                className="ve-breadcrumb-link"
                onClick={() => onNavigate(i)}
                title={`Go back to ${item.label}`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
