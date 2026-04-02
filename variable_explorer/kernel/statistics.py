"""Column statistics and histogram computation."""

from __future__ import annotations

from typing import Any


def compute_column_stats(var_name: str, obj: Any) -> dict:
    """Compute statistics for all columns of a DataFrame-like object."""
    import pandas as pd
    import numpy as np

    # Convert to DataFrame
    if isinstance(obj, pd.Series):
        df = obj.to_frame()
    elif isinstance(obj, pd.DataFrame):
        df = obj
    else:
        try:
            df = pd.DataFrame(obj)
        except Exception:
            return {
                'type': 'column_stats',
                'variable': var_name,
                'stats': []
            }

    stats = []
    for col in df.columns:
        series = df[col]
        info: dict[str, Any] = {
            'name': str(col),
            'dtype': str(series.dtype),
            'nullCount': int(series.isna().sum()),
            'uniqueCount': int(series.nunique()),
        }

        try:
            info['histogram'] = _compute_histogram(series)
        except Exception:
            info['histogram'] = None

        stats.append(info)

    return {
        'type': 'column_stats',
        'variable': var_name,
        'stats': stats,
    }


def _compute_histogram(series) -> dict | None:
    """Compute histogram data for a single column."""
    import pandas as pd
    import numpy as np

    dtype = series.dtype

    # Boolean
    if pd.api.types.is_bool_dtype(dtype):
        return {
            'type': 'boolean',
            'trueCount': int(series.sum()),
            'falseCount': int((~series).sum()),
            'nullCount': int(series.isna().sum()),
        }

    # Numeric (not bool)
    if pd.api.types.is_numeric_dtype(dtype):
        clean = series.dropna()
        if len(clean) == 0:
            return None

        # Compute histogram bins
        n_bins = min(20, max(5, len(clean) // 10))
        try:
            counts, edges = np.histogram(clean, bins=n_bins)
            return {
                'type': 'numeric',
                'counts': counts.tolist(),
                'edges': edges.tolist(),
                'min': float(clean.min()),
                'max': float(clean.max()),
                'mean': float(clean.mean()),
                'std': float(clean.std()),
            }
        except Exception:
            return None

    # Categorical / object / string
    if pd.api.types.is_categorical_dtype(dtype) or dtype == object or pd.api.types.is_string_dtype(dtype):
        vc = series.value_counts().head(10)
        if len(vc) == 0:
            return None
        return {
            'type': 'categorical',
            'labels': [str(label) for label in vc.index.tolist()],
            'counts': vc.values.tolist(),
        }

    return None
