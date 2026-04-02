# Variable Explorer for JupyterLab

A Spyder/Stata-grade variable explorer for JupyterLab 4. Opens in its own window so you can put it on a second monitor.

## Install

```bash
pip install variable-explorer
```

That's it. Restart JupyterLab if it's running.

## Usage

1. Open a notebook in JupyterLab
2. Click the **Variables** button in the notebook toolbar (spreadsheet icon)
3. The Variable Explorer opens in a **separate browser window**
4. Run cells — the variable list updates automatically
5. Click any DataFrame, list, or dict to view its contents

## Features

- **Detached window** — lives outside JupyterLab, move it to another monitor
- **AG Grid** — fast virtual scrolling, handles large DataFrames
- **Column sorting** — click headers to sort (kernel-side, fast even on millions of rows)
- **Inline histograms** — distribution charts in every column header with hover tooltips
- **Conditional formatting** — numeric heatmaps, boolean color-coding
- **Metadata sidebar** — column types, null counts, stats (like Stata's Variable Manager)
- **Properties panel** — dataset shape, memory usage, dtypes
- **Cell editing** — double-click to edit values, synced back to the kernel
- **Resizable panels** — drag the dividers between panels
- **Auto-refresh** — variable list updates after every cell execution
- **Supports many types** — DataFrames, Series, numpy arrays, lists of dicts, dicts of lists, nested structures

## Requirements

- JupyterLab 4.x
- Python 3.10+
- pandas (for DataFrame viewing)

## Development

```bash
# Clone and install in development mode
git clone https://github.com/variable-explorer/variable-explorer.git
cd variable-explorer
pip install -e .

# Rebuild after making changes
jlpm install
jlpm build
pip install -e .
```

Requires Node.js 18+ for development builds.
