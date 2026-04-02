"""SQL query execution using DuckDB against DataFrames in the namespace."""

from __future__ import annotations

from typing import Any


def check_duckdb_available() -> bool:
    """Check if duckdb is installed."""
    try:
        import duckdb
        return True
    except ImportError:
        return False


def execute_sql(query: str, user_ns: dict, save_as: str | None = None) -> dict:
    """Execute a SQL query against DataFrames in the user namespace.

    All pandas DataFrames in the namespace are registered as tables.
    The query runs via DuckDB (zero-copy Arrow scan, very fast).

    Args:
        query: SQL query string
        user_ns: the IPython user namespace
        save_as: if provided, save the result DataFrame to this variable name

    Returns:
        dict with type 'sql_result' containing columns, rows, etc.
    """
    try:
        import duckdb
    except ImportError:
        return {
            'type': 'sql_error',
            'error': 'DuckDB is not installed. Run: pip install duckdb',
        }

    try:
        import pandas as pd

        conn = duckdb.connect()

        # Register all DataFrames as tables
        registered = []
        for name, obj in user_ns.items():
            if isinstance(obj, pd.DataFrame) and not name.startswith('_'):
                try:
                    conn.register(name, obj)
                    registered.append(name)
                except Exception:
                    pass

        # Execute the query
        relation = conn.execute(query)
        result_df = relation.fetchdf()

        # Save to namespace if requested
        if save_as and save_as.strip():
            user_ns[save_as.strip()] = result_df

        # Serialize the result (cap at 10000 rows for display)
        display_df = result_df.head(10000)
        columns = []
        for col in display_df.columns:
            dtype = display_df[col].dtype
            columns.append({
                'name': str(col),
                'dtype': str(dtype),
                'isNumeric': pd.api.types.is_numeric_dtype(dtype) and not pd.api.types.is_bool_dtype(dtype),
                'isBool': pd.api.types.is_bool_dtype(dtype),
                'isDatetime': pd.api.types.is_datetime64_any_dtype(dtype),
            })

        rows = []
        for idx, (_, row) in enumerate(display_df.iterrows()):
            record = {'__row_index__': idx}
            for col, val in row.items():
                record[str(col)] = _serialize_value(val)
            rows.append(record)

        return {
            'type': 'sql_result',
            'columns': columns,
            'rows': rows,
            'totalRows': len(result_df),
            'displayedRows': len(display_df),
            'tables': registered,
            'savedAs': save_as if save_as and save_as.strip() else None,
        }

    except Exception as e:
        return {
            'type': 'sql_error',
            'error': str(e),
        }


def get_available_tables(user_ns: dict) -> dict:
    """Return a list of DataFrames available as SQL tables."""
    import pandas as pd

    tables = []
    for name, obj in user_ns.items():
        if isinstance(obj, pd.DataFrame) and not name.startswith('_'):
            tables.append({
                'name': name,
                'rows': len(obj),
                'columns': len(obj.columns),
                'columnNames': [str(c) for c in obj.columns],
            })

    return {
        'type': 'sql_tables',
        'tables': tables,
        'duckdbAvailable': check_duckdb_available(),
    }


def _serialize_value(val: Any) -> Any:
    """Convert a value to JSON-safe type."""
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
    if isinstance(val, str) and len(val) > 500:
        return val[:500] + '...'
    return val
