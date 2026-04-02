"""Paginated data extraction from DataFrame-like objects."""

from __future__ import annotations

from typing import Any

from .sorter import apply_sort


def get_data_page(
    var_name: str,
    obj: Any,
    start_row: int,
    end_row: int,
    sort_model: list[dict] | None = None,
    child_key: str | None = None
) -> dict:
    """Extract a page of data from a DataFrame-like object.

    child_key: for containers (list/dict of DataFrames), which child to show.
               e.g. "0" for list index, or "my_key" for dict key.
    """
    import pandas as pd

    # If accessing a child of a container
    if child_key is not None:
        obj = _get_child(obj, child_key)
        if obj is None:
            return {
                'type': 'error',
                'message': f"Child '{child_key}' not found",
                'requestType': 'get_data'
            }

    # Convert to DataFrame if needed
    df = _to_dataframe(obj)
    if df is None:
        return {
            'type': 'error',
            'message': f"Cannot convert {type(obj).__name__} to tabular format",
            'requestType': 'get_data'
        }

    total_rows = len(df)

    if sort_model:
        df = apply_sort(df, sort_model)

    page = df.iloc[start_row:end_row]
    columns = _get_column_defs(df)
    rows = _serialize_rows(page, start_row)

    return {
        'type': 'data_page',
        'variable': var_name,
        'startRow': start_row,
        'totalRows': total_rows,
        'columns': columns,
        'rows': rows,
    }


def _get_child(obj: Any, key: str) -> Any:
    """Access a child element from a container."""
    if isinstance(obj, dict):
        return obj.get(key)
    if isinstance(obj, (list, tuple)):
        try:
            return obj[int(key)]
        except (ValueError, IndexError):
            return None
    return None


def _to_dataframe(obj: Any):
    """Convert various types to pandas DataFrame."""
    try:
        import pandas as pd

        if isinstance(obj, pd.DataFrame):
            return obj

        if isinstance(obj, pd.Series):
            return obj.to_frame()

        # numpy array
        try:
            import numpy as np
            if isinstance(obj, np.ndarray):
                if obj.ndim == 1:
                    return pd.DataFrame({'values': obj})
                elif obj.ndim == 2:
                    return pd.DataFrame(obj, columns=[f'col_{i}' for i in range(obj.shape[1])])
        except ImportError:
            pass

        # Dict types
        if isinstance(obj, dict):
            values = list(obj.values())
            if not values:
                return pd.DataFrame()

            # Dict of lists → standard conversion
            if all(isinstance(v, (list, tuple)) for v in values):
                return pd.DataFrame(obj)

            # Dict of dicts → each key becomes a row
            if all(isinstance(v, dict) for v in values):
                return pd.DataFrame.from_dict(obj, orient='index')

            # Dict of DataFrames → show summary table
            if all(isinstance(v, pd.DataFrame) for v in values):
                rows = []
                for k, v in obj.items():
                    rows.append({
                        'key': str(k),
                        'type': 'DataFrame',
                        'rows': len(v),
                        'columns': len(v.columns),
                        'memory': f"{v.memory_usage(deep=True).sum():,.0f} B",
                        'column_names': ', '.join(str(c) for c in v.columns[:10]),
                    })
                return pd.DataFrame(rows)

            # Dict with scalar values → single-row or key-value table
            try:
                return pd.DataFrame([obj])
            except Exception:
                return pd.DataFrame({
                    'key': [str(k) for k in obj.keys()],
                    'value': [str(v) for v in obj.values()],
                    'type': [type(v).__name__ for v in obj.values()]
                })

        # List types
        if isinstance(obj, (list, tuple)):
            if not obj:
                return pd.DataFrame()

            # List of DataFrames → show summary table
            if all(isinstance(v, pd.DataFrame) for v in obj):
                rows = []
                for i, v in enumerate(obj):
                    rows.append({
                        'index': i,
                        'type': 'DataFrame',
                        'rows': len(v),
                        'columns': len(v.columns),
                        'memory': f"{v.memory_usage(deep=True).sum():,.0f} B",
                        'column_names': ', '.join(str(c) for c in v.columns[:10]),
                    })
                return pd.DataFrame(rows)

            # List of dicts → standard conversion (JSON-like data)
            if all(isinstance(v, dict) for v in obj):
                return pd.DataFrame(obj)

            # List of lists/tuples → tabular
            if all(isinstance(v, (list, tuple)) for v in obj):
                max_cols = max(len(v) for v in obj)
                cols = [f'col_{i}' for i in range(max_cols)]
                # Pad shorter rows with None
                padded = [list(v) + [None] * (max_cols - len(v)) for v in obj]
                return pd.DataFrame(padded, columns=cols)

            # Simple list of scalars → single column
            return pd.DataFrame({'value': obj})

        return None

    except Exception:
        return None


def _get_column_defs(df) -> list[dict]:
    """Build column definitions from a DataFrame."""
    import pandas as pd

    columns = []
    for col in df.columns:
        dtype = df[col].dtype
        columns.append({
            'name': str(col),
            'dtype': str(dtype),
            'isNumeric': pd.api.types.is_numeric_dtype(dtype) and not pd.api.types.is_bool_dtype(dtype),
            'isBool': pd.api.types.is_bool_dtype(dtype),
            'isDatetime': pd.api.types.is_datetime64_any_dtype(dtype),
        })
    return columns


def _serialize_rows(page, start_row: int) -> list[dict]:
    """Serialize DataFrame rows to list of dicts, preserving the real index."""
    rows = []
    for idx, (real_index, row) in enumerate(page.iterrows()):
        record: dict[str, Any] = {
            '__row_index__': start_row + idx,
            '__pandas_index__': _serialize_value(real_index),
        }
        for col, val in row.items():
            record[str(col)] = _serialize_value(val)
        rows.append(record)
    return rows


def _serialize_value(val: Any) -> Any:
    """Convert a single value to JSON-safe type."""
    if val is None:
        return None

    import pandas as pd
    import numpy as np

    if pd.isna(val):
        return None

    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        v = float(val)
        if np.isnan(v) or np.isinf(v):
            return None
        return v
    if isinstance(val, (np.bool_,)):
        return bool(val)

    if isinstance(val, pd.Timestamp):
        return val.isoformat()
    if hasattr(val, 'isoformat'):
        return val.isoformat()

    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')

    if isinstance(val, str) and len(val) > 500:
        return val[:500] + '...'

    return val
