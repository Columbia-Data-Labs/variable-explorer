"""Kernel-side DataFrame sorting."""

from __future__ import annotations

from typing import Any


def apply_sort(df: Any, sort_model: list[dict]) -> Any:
    """Apply multi-column sort to a DataFrame.

    sort_model: [{'colId': 'price', 'sort': 'asc'}, ...]
    Returns a new sorted DataFrame (does not modify the original).
    """
    if not sort_model:
        return df

    cols = [s['colId'] for s in sort_model]
    ascending = [s['sort'] == 'asc' for s in sort_model]

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
