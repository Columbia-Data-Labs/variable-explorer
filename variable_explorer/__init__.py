"""Variable Explorer - A Spyder/Stata-grade variable explorer for JupyterLab."""

from ._version import __version__


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "variable-explorer"}]
