"""Namespace introspection — scan user variables and extract metadata."""

from __future__ import annotations

import sys
from typing import Any

# Types/modules to skip
_SKIP_TYPES = (type, type(sys), type(lambda: None))
_SKIP_PREFIXES = ('_', '__')
_SKIP_NAMES = {
    'In', 'Out', 'get_ipython', 'exit', 'quit',
    '_dh', '_ih', '_oh', '_sh', '_i', '_ii', '_iii',
}


def get_variable_list(user_ns: dict) -> list[dict]:
    """Scan the user namespace and return metadata for each variable."""
    variables = []

    for name, obj in user_ns.items():
        if name in _SKIP_NAMES:
            continue
        if any(name.startswith(p) for p in _SKIP_PREFIXES):
            continue
        if isinstance(obj, _SKIP_TYPES):
            continue

        try:
            info = _inspect_variable(name, obj)
            if info is not None:
                variables.append(info)
        except Exception:
            pass

    return variables


def _inspect_variable(name: str, obj: Any) -> dict | None:
    """Extract metadata for a single variable."""
    type_name = type(obj).__name__
    shape = _get_shape(obj)
    memory_bytes = _get_memory(obj)
    short_repr = _get_short_repr(obj)
    tabular_info = _classify_tabular(obj)

    return {
        'name': name,
        'typeName': type_name,
        'shape': shape,
        'memoryBytes': memory_bytes,
        'shortRepr': short_repr,
        'isTabular': tabular_info['isTabular'],
        'tabularKind': tabular_info['kind'],
        'childCount': tabular_info.get('childCount', 0),
    }


def _classify_tabular(obj: Any) -> dict:
    """Classify what kind of tabular display an object supports."""
    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return {'isTabular': True, 'kind': 'dataframe'}
        if isinstance(obj, pd.Series):
            return {'isTabular': True, 'kind': 'series'}
    except ImportError:
        pass

    try:
        import numpy as np
        if isinstance(obj, np.ndarray) and obj.ndim <= 2:
            return {'isTabular': True, 'kind': 'ndarray'}
    except ImportError:
        pass

    if isinstance(obj, dict):
        values = list(obj.values())
        if not values:
            return {'isTabular': False, 'kind': 'dict_empty'}

        # Dict of lists → tabular
        if all(isinstance(v, (list, tuple)) for v in values):
            return {'isTabular': True, 'kind': 'dict_of_lists'}

        # Dict of DataFrames → container
        try:
            import pandas as pd
            if all(isinstance(v, pd.DataFrame) for v in values):
                return {'isTabular': True, 'kind': 'dict_of_dataframes', 'childCount': len(values)}
        except ImportError:
            pass

        # Dict of dicts → try to convert to DataFrame
        if all(isinstance(v, dict) for v in values):
            return {'isTabular': True, 'kind': 'dict_of_dicts'}

        # Generic dict with scalar values → single-row tabular
        return {'isTabular': True, 'kind': 'dict_scalar'}

    if isinstance(obj, (list, tuple)):
        if not obj:
            return {'isTabular': False, 'kind': 'list_empty'}

        # List of DataFrames → container
        try:
            import pandas as pd
            if all(isinstance(v, pd.DataFrame) for v in obj):
                return {'isTabular': True, 'kind': 'list_of_dataframes', 'childCount': len(obj)}
        except ImportError:
            pass

        # List of dicts → tabular (common pattern from APIs/JSON)
        if all(isinstance(v, dict) for v in obj):
            return {'isTabular': True, 'kind': 'list_of_dicts'}

        # List of lists/tuples → tabular
        if all(isinstance(v, (list, tuple)) for v in obj):
            return {'isTabular': True, 'kind': 'list_of_lists'}

        # Simple list of scalars → single-column tabular
        return {'isTabular': True, 'kind': 'list_scalar'}

    return {'isTabular': False, 'kind': 'other'}


def _get_shape(obj: Any) -> list[int]:
    """Get the shape of an object."""
    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return list(obj.shape)
        if isinstance(obj, pd.Series):
            return [len(obj)]
    except ImportError:
        pass

    try:
        import numpy as np
        if isinstance(obj, np.ndarray):
            return list(obj.shape)
    except ImportError:
        pass

    if hasattr(obj, '__len__'):
        try:
            return [len(obj)]
        except Exception:
            pass

    return []


def _get_memory(obj: Any) -> int:
    """Get memory usage in bytes."""
    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return int(obj.memory_usage(deep=True).sum())
        if isinstance(obj, pd.Series):
            return int(obj.memory_usage(deep=True))
    except (ImportError, Exception):
        pass

    try:
        import numpy as np
        if isinstance(obj, np.ndarray):
            return int(obj.nbytes)
    except (ImportError, Exception):
        pass

    try:
        return sys.getsizeof(obj)
    except Exception:
        return 0


def _get_short_repr(obj: Any, max_len: int = 200) -> str:
    """Get a short string representation."""
    try:
        r = repr(obj)
        if len(r) > max_len:
            return r[:max_len] + '...'
        return r
    except Exception:
        return f'<{type(obj).__name__}>'
