"""JSON-safe serialization for comm messages."""

from __future__ import annotations

from typing import Any


def safe_serialize(data: Any) -> Any:
    """Recursively convert data to JSON-safe types."""
    if data is None:
        return None

    if isinstance(data, dict):
        return {str(k): safe_serialize(v) for k, v in data.items()}

    if isinstance(data, (list, tuple)):
        return [safe_serialize(item) for item in data]

    if isinstance(data, bool):
        return data

    if isinstance(data, int):
        return data

    if isinstance(data, float):
        import math
        if math.isnan(data) or math.isinf(data):
            return None
        return data

    if isinstance(data, str):
        return data

    # numpy types
    try:
        import numpy as np
        if isinstance(data, np.integer):
            return int(data)
        if isinstance(data, np.floating):
            v = float(data)
            if np.isnan(v) or np.isinf(v):
                return None
            return v
        if isinstance(data, np.bool_):
            return bool(data)
        if isinstance(data, np.ndarray):
            return data.tolist()
    except ImportError:
        pass

    # pandas types
    try:
        import pandas as pd
        if isinstance(data, pd.Timestamp):
            return data.isoformat()
        if pd.isna(data):
            return None
    except (ImportError, TypeError, ValueError):
        pass

    # datetime
    if hasattr(data, 'isoformat'):
        return data.isoformat()

    # bytes
    if isinstance(data, bytes):
        return data.decode('utf-8', errors='replace')

    # Fallback
    try:
        return str(data)
    except Exception:
        return '<unserializable>'
