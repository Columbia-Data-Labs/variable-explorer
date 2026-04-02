"""Kernel-side DataFrame sorting."""

from __future__ import annotations

from typing import Any


def apply_sort(df: Any, sort_model: list[dict]) -> Any:
    """Apply multi-column sort to a DataFrame.

    sort_model: [{'colId': 'price', 'sort': 'asc'}, ...]
    Special: colId '__index__' sorts by the DataFrame's index.
    Returns a new sorted DataFrame (does not modify the original).
    """
    if not sort_model:
        return df

    # Handle index sort
    index_sorts = [s for s in sort_model if s['colId'] == '__index__']
    col_sorts = [s for s in sort_model if s['colId'] != '__index__']

    # If sorting by index
    if index_sorts:
        ascending = index_sorts[0]['sort'] == 'asc'
        try:
            return df.sort_index(ascending=ascending, na_position='last')
        except Exception:
            return df

    # Regular column sort
    if not col_sorts:
        return df

    cols = [s['colId'] for s in col_sorts]
    ascending = [s['sort'] == 'asc' for s in col_sorts]

    # Validate columns exist
    valid_cols = []
    valid_asc = []
    for col, asc in zip(cols, ascending):
        if col in df.columns:
            valid_cols.append(col)
            valid_asc.append(asc)

    if not valid_cols:
        return df

    try:
        return df.sort_values(by=valid_cols, ascending=valid_asc, na_position='last')
    except Exception:
        return df
