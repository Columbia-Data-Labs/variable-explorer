"""Comm target handler for variable exploration."""

from __future__ import annotations

import json
import traceback
from typing import Any

from .introspection import get_variable_list
from .data_provider import get_data_page
from .sql_handler import execute_sql, get_available_tables
from .statistics import compute_column_stats
from .editor import edit_cell
from .serialization import safe_serialize


_active_comm = None
_initialized = False


def init_comm():
    """Register the comm target and post_execute hook. Called from frontend."""
    global _initialized

    try:
        from ipykernel.comm import Comm
        ip = _get_ipython()
        if ip is None:
            return

        # Register comm target
        ip.kernel.comm_manager.register_target(
            'variable_explorer', _on_comm_open
        )

        # Register post_execute hook for auto-refresh
        if not _initialized:
            ip.events.register('post_execute', _on_post_execute)
            _initialized = True

    except Exception as e:
        print(f"Variable Explorer: init_comm error: {e}")


def _get_ipython():
    """Get the current IPython instance."""
    try:
        from IPython import get_ipython
        return get_ipython()
    except ImportError:
        return None


def _get_user_ns() -> dict:
    """Get the user namespace."""
    ip = _get_ipython()
    if ip is None:
        return {}
    return ip.user_ns


def _on_comm_open(comm, open_msg):
    """Handle comm open from frontend."""
    global _active_comm
    _active_comm = comm
    comm.on_msg(_on_comm_msg)
    comm.on_close(_on_comm_close)

    # Send initial variable list
    _send_variable_list(comm)


def _on_comm_close(msg):
    """Handle comm close."""
    global _active_comm
    _active_comm = None


def _on_comm_msg(msg):
    """Route incoming messages from frontend."""
    global _active_comm
    if _active_comm is None:
        return

    try:
        data = msg['content']['data']
        msg_type = data.get('type', '')

        handlers = {
            'refresh': _handle_refresh,
            'get_data': _handle_get_data,
            'get_stats': _handle_get_stats,
            'get_properties': _handle_get_properties,
            'edit_cell': _handle_edit_cell,
            'sql_execute': _handle_sql_execute,
            'sql_tables': _handle_sql_tables,
        }

        handler = handlers.get(msg_type)
        if handler:
            handler(data)
        else:
            _send_error(f"Unknown message type: {msg_type}", msg_type)

    except Exception as e:
        _send_error(f"Handler error: {e}\n{traceback.format_exc()}", 'handler')


def _handle_refresh(data: dict):
    """Refresh the variable list."""
    _send_variable_list(_active_comm)


def _handle_get_data(data: dict):
    """Get paginated data for a variable."""
    user_ns = _get_user_ns()
    var_name = data.get('variable', '')
    start_row = data.get('startRow', 0)
    end_row = data.get('endRow', 1000)
    sort_model = data.get('sortModel')

    if var_name not in user_ns:
        _send_error(f"Variable '{var_name}' not found", 'get_data')
        return

    child_key = data.get('childKey')
    result = get_data_page(var_name, user_ns[var_name], start_row, end_row, sort_model, child_key)
    _send(_active_comm, result)


def _handle_get_stats(data: dict):
    """Get column statistics for a variable."""
    user_ns = _get_user_ns()
    var_name = data.get('variable', '')

    if var_name not in user_ns:
        _send_error(f"Variable '{var_name}' not found", 'get_stats')
        return

    result = compute_column_stats(var_name, user_ns[var_name])
    _send(_active_comm, result)


def _handle_get_properties(data: dict):
    """Get dataset-level properties."""
    user_ns = _get_user_ns()
    var_name = data.get('variable', '')

    if var_name not in user_ns:
        _send_error(f"Variable '{var_name}' not found", 'get_properties')
        return

    obj = user_ns[var_name]
    result = _get_properties(var_name, obj)
    _send(_active_comm, result)


def _handle_edit_cell(data: dict):
    """Edit a cell value."""
    user_ns = _get_user_ns()
    var_name = data.get('variable', '')
    row_index = data.get('rowIndex', 0)
    column = data.get('column', '')
    new_value = data.get('newValue', '')

    if var_name not in user_ns:
        _send_error(f"Variable '{var_name}' not found", 'edit_cell')
        return

    result = edit_cell(user_ns[var_name], row_index, column, new_value)
    result['variable'] = var_name
    _send(_active_comm, result)


def _handle_sql_execute(data: dict):
    """Execute a SQL query against DataFrames."""
    user_ns = _get_user_ns()
    query = data.get('query', '')
    save_as = data.get('saveAs')
    result = execute_sql(query, user_ns, save_as)
    _send(_active_comm, result)
    # Refresh variable list in case a new variable was saved
    if save_as:
        _send_variable_list(_active_comm)


def _handle_sql_tables(data: dict):
    """Get list of DataFrames available as SQL tables."""
    user_ns = _get_user_ns()
    result = get_available_tables(user_ns)
    _send(_active_comm, result)


def _get_properties(var_name: str, obj: Any) -> dict:
    """Extract dataset-level properties."""
    import sys

    result: dict[str, Any] = {
        'type': 'properties',
        'variable': var_name,
        'shape': [],
        'memoryBytes': 0,
        'dtypes': {},
        'indexName': '',
        'indexDtype': '',
        'sourceFile': None,
    }

    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            result['shape'] = list(obj.shape)
            result['memoryBytes'] = int(obj.memory_usage(deep=True).sum())
            result['dtypes'] = {col: str(dtype) for col, dtype in obj.dtypes.items()}
            result['indexName'] = str(obj.index.name or 'RangeIndex')
            result['indexDtype'] = str(obj.index.dtype)
            result['sourceFile'] = obj.attrs.get('source_file')
            return result
    except ImportError:
        pass

    # Generic fallback
    if hasattr(obj, 'shape'):
        result['shape'] = list(obj.shape)
    if hasattr(obj, '__len__'):
        if not result['shape']:
            result['shape'] = [len(obj)]

    result['memoryBytes'] = sys.getsizeof(obj)
    return result


def _send_variable_list(comm):
    """Send the current variable list via comm."""
    if comm is None:
        return
    user_ns = _get_user_ns()
    variables = get_variable_list(user_ns)
    _send(comm, {
        'type': 'variable_list',
        'variables': variables
    })


def _send_error(message: str, request_type: str = ''):
    """Send an error message to frontend."""
    if _active_comm is None:
        return
    _send(_active_comm, {
        'type': 'error',
        'message': message,
        'requestType': request_type
    })


def _send(comm, data: dict):
    """Send data through comm with safe serialization."""
    try:
        serialized = safe_serialize(data)
        comm.send(serialized)
    except Exception as e:
        try:
            comm.send({
                'type': 'error',
                'message': f'Serialization error: {e}'
            })
        except Exception:
            pass


def _on_post_execute():
    """Called after every cell execution — send updated variable list."""
    if _active_comm is not None:
        try:
            _send_variable_list(_active_comm)
        except Exception:
            pass
