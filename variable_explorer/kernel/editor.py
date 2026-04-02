"""Cell value editing — write back to the DataFrame in the kernel."""

from __future__ import annotations

from typing import Any


def edit_cell(df: Any, row_index: int, column: str, new_value: str) -> dict:
    """Modify a cell value in a DataFrame.

    Returns a result dict with success/error info.
    """
    try:
        import pandas as pd

        if not isinstance(df, pd.DataFrame):
            return {
                'type': 'edit_result',
                'success': False,
                'rowIndex': row_index,
                'column': column,
                'error': 'Only DataFrame editing is supported'
            }

        if column not in df.columns:
            return {
                'type': 'edit_result',
                'success': False,
                'rowIndex': row_index,
                'column': column,
                'error': f"Column '{column}' not found"
            }

        # Convert value to match column dtype
        dtype = df[column].dtype
        converted = _convert_value(new_value, dtype)

        # Apply the edit
        df.iat[row_index, df.columns.get_loc(column)] = converted

        return {
            'type': 'edit_result',
            'success': True,
            'rowIndex': row_index,
            'column': column,
        }

    except Exception as e:
        return {
            'type': 'edit_result',
            'success': False,
            'rowIndex': row_index,
            'column': column,
            'error': str(e)
        }


def _convert_value(value_str: str, dtype: Any) -> Any:
    """Convert a string value to the appropriate dtype."""
    import pandas as pd
    import numpy as np

    # Handle empty/null
    if value_str in ('', 'null', 'None', 'NaN', 'nan', 'NA'):
        if pd.api.types.is_numeric_dtype(dtype):
            return np.nan
        if pd.api.types.is_bool_dtype(dtype):
            return pd.NA
        return None

    # Bool
    if pd.api.types.is_bool_dtype(dtype):
        return value_str.lower() in ('true', '1', 'yes')

    # Integer
    if pd.api.types.is_integer_dtype(dtype):
        return dtype.type(int(float(value_str)))

    # Float
    if pd.api.types.is_float_dtype(dtype):
        return dtype.type(float(value_str))

    # Datetime
    if pd.api.types.is_datetime64_any_dtype(dtype):
        return pd.Timestamp(value_str)

    # String/object
    return value_str
