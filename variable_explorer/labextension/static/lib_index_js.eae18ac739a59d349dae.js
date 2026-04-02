"use strict";
(self["webpackChunkvariable_explorer"] = self["webpackChunkvariable_explorer"] || []).push([["lib_index_js"],{

/***/ "./lib/comm/CommManager.js"
/*!*********************************!*\
  !*** ./lib/comm/CommManager.js ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CommManager: () => (/* binding */ CommManager)
/* harmony export */ });
/* harmony import */ var _lumino_signaling__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lumino/signaling */ "webpack/sharing/consume/default/@lumino/signaling");
/* harmony import */ var _lumino_signaling__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_lumino_signaling__WEBPACK_IMPORTED_MODULE_0__);

const COMM_TARGET = 'variable_explorer';
const INIT_CODE = `
try:
    from variable_explorer.kernel import init_comm as _ve_init
    _ve_init()
    del _ve_init
except ImportError as e:
    print(f"Variable Explorer: kernel package not found: {e}")
except Exception as e:
    print(f"Variable Explorer: init error: {e}")
`.trim();
class CommManager {
    constructor() {
        this._comm = null;
        this._kernel = null;
        this._messageReceived = new _lumino_signaling__WEBPACK_IMPORTED_MODULE_0__.Signal(this);
        this._connectionChanged = new _lumino_signaling__WEBPACK_IMPORTED_MODULE_0__.Signal(this);
        this._isConnected = false;
    }
    get messageReceived() {
        return this._messageReceived;
    }
    get connectionChanged() {
        return this._connectionChanged;
    }
    get isConnected() {
        return this._isConnected;
    }
    async connect(kernel) {
        // Disconnect existing
        this.disconnect();
        this._kernel = kernel;
        // Inject the Python init code
        const future = kernel.requestExecute({
            code: INIT_CODE,
            silent: true,
            store_history: false
        });
        await future.done;
        // Open a comm from the frontend
        this._comm = kernel.createComm(COMM_TARGET);
        // Handle incoming messages
        this._comm.onMsg = (msg) => {
            const data = msg.content.data;
            if (data && data.type) {
                this._messageReceived.emit(data);
            }
        };
        this._comm.onClose = () => {
            this._setConnected(false);
        };
        // Open the comm channel
        await this._comm.open({}).done;
        this._setConnected(true);
        // Listen for kernel shutdown/restart
        kernel.statusChanged.connect(this._onKernelStatus, this);
    }
    send(msg) {
        if (this._comm && this._isConnected) {
            this._comm.send(msg);
        }
    }
    refresh() {
        this.send({ type: 'refresh' });
    }
    disconnect() {
        if (this._kernel) {
            this._kernel.statusChanged.disconnect(this._onKernelStatus, this);
        }
        if (this._comm) {
            try {
                this._comm.close({});
            }
            catch (_a) {
                // Comm may already be closed
            }
            this._comm = null;
        }
        this._kernel = null;
        this._setConnected(false);
    }
    _setConnected(connected) {
        if (this._isConnected !== connected) {
            this._isConnected = connected;
            this._connectionChanged.emit(connected);
        }
    }
    _onKernelStatus(kernel, status) {
        if (status === 'restarting' || status === 'dead') {
            this._setConnected(false);
            this._comm = null;
        }
        if (status === 'idle' && !this._isConnected && this._kernel) {
            // Kernel restarted — try to reconnect
            this.connect(this._kernel).catch(e => {
                console.error('Variable Explorer: reconnect failed', e);
            });
        }
    }
}


/***/ },

/***/ "./lib/components/Breadcrumb.js"
/*!**************************************!*\
  !*** ./lib/components/Breadcrumb.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Breadcrumb: () => (/* binding */ Breadcrumb)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

const Breadcrumb = ({ path, onNavigate }) => {
    if (path.length <= 1)
        return null;
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-breadcrumb" }, path.map((item, i) => {
        const isLast = i === path.length - 1;
        return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, { key: i },
            i > 0 && react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-breadcrumb-sep" }, "\u203A"),
            isLast ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-breadcrumb-current" }, item.label)) : (react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-breadcrumb-link", onClick: () => onNavigate(i), title: `Go back to ${item.label}` }, item.label))));
    })));
};


/***/ },

/***/ "./lib/components/CellReferenceBar.js"
/*!********************************************!*\
  !*** ./lib/components/CellReferenceBar.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CellReferenceBar: () => (/* binding */ CellReferenceBar)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

const CellReferenceBar = ({ rowIndex, colName, value }) => {
    const displayValue = value == null ? 'null' : String(value);
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-cell-reference-bar" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-cell-location" },
            "Row ",
            rowIndex.toLocaleString(),
            " / Col: ",
            colName),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-cell-value", title: displayValue }, displayValue)));
};


/***/ },

/***/ "./lib/components/DataGrid.js"
/*!************************************!*\
  !*** ./lib/components/DataGrid.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DataGrid: () => (/* binding */ DataGrid)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var ag_grid_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ag-grid-react */ "webpack/sharing/consume/default/ag-grid-react/ag-grid-react");
/* harmony import */ var _HistogramHeader__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./HistogramHeader */ "./lib/components/HistogramHeader.js");
/* harmony import */ var _utils_colorScales__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/colorScales */ "./lib/utils/colorScales.js");




const IndexHeader = ({ onIndexSort, sortModel }) => {
    // Check if there's an active index sort
    const indexSort = sortModel.find(s => s.colId === '__index__');
    const currentDir = (indexSort === null || indexSort === void 0 ? void 0 : indexSort.sort) || null;
    // If other columns are sorted but not index, show no arrow
    const hasOtherSorts = sortModel.some(s => s.colId !== '__index__');
    const handleClick = () => {
        if (currentDir === null || hasOtherSorts) {
            // No index sort or other sorts active → go to ascending (original order, clear other sorts)
            onIndexSort('asc');
        }
        else if (currentDir === 'asc') {
            onIndexSort('desc');
        }
        else {
            onIndexSort('asc');
        }
    };
    const arrow = currentDir === 'asc' ? ' \u25b2' : currentDir === 'desc' ? ' \u25bc' : '';
    const tooltip = currentDir === 'desc'
        ? 'Click to sort index ascending (original order)'
        : currentDir === 'asc'
            ? 'Click to reverse index order'
            : 'Click to reset to original index order';
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { onClick: handleClick, title: tooltip, style: {
            cursor: 'pointer',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '12px',
        } },
        "Index",
        arrow));
};
const DataGrid = ({ rows, columns, columnStats, totalRows, sortModel, hiddenColumns, loading, isContainerView, onSortChanged, onLoadMore, onCellSelected, onCellEdit, onDrillDown }) => {
    const gridRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null);
    // Build a stats lookup map
    const statsMap = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        const map = {};
        for (const s of columnStats) {
            map[s.name] = s;
        }
        return map;
    }, [columnStats]);
    // Build AG Grid column definitions
    const colDefs = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        // Row index column
        const indexCol = {
            headerName: 'Index',
            colId: '__index__',
            field: '__pandas_index__',
            headerComponent: IndexHeader,
            headerComponentParams: {
                sortModel,
                onIndexSort: (direction) => {
                    var _a, _b;
                    // Clear AG Grid's visual sort state
                    (_b = (_a = gridRef.current) === null || _a === void 0 ? void 0 : _a.api) === null || _b === void 0 ? void 0 : _b.applyColumnState({ defaultState: { sort: null } });
                    if (direction) {
                        onSortChanged([{ colId: '__index__', sort: direction }]);
                    }
                    else {
                        onSortChanged([]);
                    }
                }
            },
            width: 80,
            pinned: 'left',
            sortable: false,
            resizable: true,
            cellStyle: {
                color: 'var(--jp-ui-font-color2)',
                fontWeight: '500',
                fontSize: '11px'
            }
        };
        const dataCols = columns
            .filter(c => !hiddenColumns.has(c.name))
            .map(col => {
            const stats = statsMap[col.name];
            const def = {
                headerName: col.name,
                field: col.name,
                sortable: true,
                resizable: true,
                editable: true,
                minWidth: 80,
                headerComponent: _HistogramHeader__WEBPACK_IMPORTED_MODULE_2__.HistogramHeader,
                headerComponentParams: {
                    displayName: col.name,
                    stats: stats
                }
            };
            // Conditional formatting
            if (col.isNumeric && (stats === null || stats === void 0 ? void 0 : stats.histogram) && stats.histogram.type === 'numeric') {
                const h = stats.histogram;
                def.cellStyle = (params) => {
                    if (params.value == null) {
                        return { backgroundColor: 'var(--jp-layout-color2)', opacity: 0.5 };
                    }
                    return {
                        backgroundColor: (0,_utils_colorScales__WEBPACK_IMPORTED_MODULE_3__.numericHeatmap)(params.value, h.min, h.max),
                        color: 'var(--jp-ui-font-color0)'
                    };
                };
            }
            else if (col.isBool) {
                def.cellStyle = (params) => {
                    if (params.value == null) {
                        return { backgroundColor: 'var(--jp-layout-color2)', opacity: 0.5 };
                    }
                    return {
                        backgroundColor: (0,_utils_colorScales__WEBPACK_IMPORTED_MODULE_3__.booleanColor)(params.value),
                        color: '#fff',
                        fontWeight: '600',
                        textAlign: 'center'
                    };
                };
            }
            // Format numbers
            if (col.isNumeric) {
                def.valueFormatter = (params) => {
                    if (params.value == null)
                        return '';
                    const val = Number(params.value);
                    if (Number.isInteger(val))
                        return val.toLocaleString();
                    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
                };
            }
            // Format dates
            if (col.isDatetime) {
                def.valueFormatter = (params) => {
                    if (params.value == null)
                        return '';
                    return new Date(params.value).toLocaleString();
                };
            }
            return def;
        });
        // Add a drill-down column for container views
        if (isContainerView && onDrillDown) {
            const drillCol = {
                headerName: '',
                colId: '__drill__',
                width: 50,
                sortable: false,
                resizable: false,
                cellRenderer: () => {
                    return '\u25b6';
                },
                cellStyle: {
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: 'var(--jp-brand-color1)',
                }
            };
            return [indexCol, ...dataCols, drillCol];
        }
        return [indexCol, ...dataCols];
    }, [columns, statsMap, hiddenColumns, isContainerView, onDrillDown, onSortChanged]);
    // Handle sort
    const handleSortChanged = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((event) => {
        const colState = event.api.getColumnState();
        const newSortModel = colState
            .filter((c) => c.sort && c.colId !== '__index__')
            .sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0))
            .map((c) => ({
            colId: c.colId,
            sort: c.sort
        }));
        onSortChanged(newSortModel);
    }, [onSortChanged]);
    // Handle cell click
    const handleCellClicked = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((event) => {
        var _a, _b;
        // Drill-down: clicking the ▶ column or double-clicking a row in container view
        if (isContainerView && onDrillDown && event.colDef.colId === '__drill__') {
            const data = event.data;
            // Use 'index' or 'key' field from the summary row
            const key = String((_b = (_a = data === null || data === void 0 ? void 0 : data.index) !== null && _a !== void 0 ? _a : data === null || data === void 0 ? void 0 : data.key) !== null && _b !== void 0 ? _b : event.rowIndex);
            const label = `[${key}]`;
            onDrillDown(key, label);
            return;
        }
        if (event.colDef.field && event.rowIndex != null) {
            onCellSelected(event.rowIndex, event.colDef.field, event.value);
        }
    }, [onCellSelected, isContainerView, onDrillDown]);
    // Handle cell edit
    const handleCellEditRequest = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((event) => {
        if (event.colDef.field && event.rowIndex != null) {
            onCellEdit(event.rowIndex, event.colDef.field, String(event.newValue));
            // Optimistic update
            const rowNode = event.api.getRowNode(String(event.rowIndex));
            if (rowNode) {
                rowNode.setDataValue(event.colDef.field, event.newValue);
            }
        }
    }, [onCellEdit]);
    // Infinite scroll: load more rows when scrolled near bottom
    const handleBodyScrollEnd = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((event) => {
        if (loading)
            return;
        const lastRow = event.api.getLastDisplayedRow();
        if (lastRow >= rows.length - 200 && rows.length < totalRows) {
            onLoadMore(rows.length);
        }
    }, [loading, rows.length, totalRows, onLoadMore]);
    // Detect JupyterLab dark theme
    const isDark = document.body.getAttribute('data-jp-theme-light') === 'false';
    const themeClass = isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-grid-wrapper" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: themeClass, style: { width: '100%', height: '100%' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(ag_grid_react__WEBPACK_IMPORTED_MODULE_1__.AgGridReact, { ref: gridRef, rowData: rows, columnDefs: colDefs, defaultColDef: {
                    sortable: true,
                    resizable: true,
                    minWidth: 60
                }, headerHeight: 64, rowHeight: 28, animateRows: false, suppressMovableColumns: false, readOnlyEdit: true, onSortChanged: handleSortChanged, onCellClicked: handleCellClicked, onCellEditRequest: handleCellEditRequest, onBodyScrollEnd: handleBodyScrollEnd, onRowDoubleClicked: isContainerView && onDrillDown ? (event) => {
                    var _a, _b;
                    const data = event.data;
                    const key = String((_b = (_a = data === null || data === void 0 ? void 0 : data.index) !== null && _a !== void 0 ? _a : data === null || data === void 0 ? void 0 : data.key) !== null && _b !== void 0 ? _b : event.rowIndex);
                    onDrillDown(key, `[${key}]`);
                } : undefined, getRowId: (params) => { var _a, _b, _c; return String((_c = (_a = params.data.__row_index__) !== null && _a !== void 0 ? _a : (_b = params.node) === null || _b === void 0 ? void 0 : _b.rowIndex) !== null && _c !== void 0 ? _c : 0); }, loading: loading }))));
};


/***/ },

/***/ "./lib/components/HistogramHeader.js"
/*!*******************************************!*\
  !*** ./lib/components/HistogramHeader.js ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HistogramHeader: () => (/* binding */ HistogramHeader)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_histogramRenderer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/histogramRenderer */ "./lib/utils/histogramRenderer.js");


function getTooltipText(histogram, mouseX, mouseY, canvasWidth, canvasHeight) {
    const fmt = (v) => {
        if (Number.isInteger(v) && Math.abs(v) < 1e6)
            return v.toLocaleString();
        return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };
    if (histogram.type === 'numeric') {
        const { counts, edges } = histogram;
        const binIndex = Math.floor((mouseX / canvasWidth) * counts.length);
        if (binIndex < 0 || binIndex >= counts.length)
            return null;
        return `${fmt(edges[binIndex])} \u2013 ${fmt(edges[binIndex + 1])}: ${counts[binIndex].toLocaleString()}`;
    }
    if (histogram.type === 'categorical') {
        const { labels, counts } = histogram;
        const barCount = Math.min(labels.length, 8);
        // Bars are drawn horizontally, stacked vertically
        const barHeight = canvasHeight / barCount;
        const barIndex = Math.floor(mouseY / barHeight);
        if (barIndex < 0 || barIndex >= barCount)
            return null;
        return `${labels[barIndex]}: ${counts[barIndex].toLocaleString()}`;
    }
    if (histogram.type === 'boolean') {
        const total = histogram.trueCount + histogram.falseCount + histogram.nullCount;
        if (total === 0)
            return null;
        const trueWidth = (histogram.trueCount / total) * canvasWidth;
        const falseWidth = (histogram.falseCount / total) * canvasWidth;
        if (mouseX < trueWidth) {
            return `True: ${histogram.trueCount.toLocaleString()} (${Math.round(100 * histogram.trueCount / total)}%)`;
        }
        else if (mouseX < trueWidth + falseWidth) {
            return `False: ${histogram.falseCount.toLocaleString()} (${Math.round(100 * histogram.falseCount / total)}%)`;
        }
        else {
            return `Null: ${histogram.nullCount.toLocaleString()} (${Math.round(100 * histogram.nullCount / total)}%)`;
        }
    }
    return null;
}
const HistogramHeader = ({ displayName, stats, column, setSort, api }) => {
    const canvasRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null);
    const tooltipRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null);
    const [sortState, setSortState] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [tooltip, setTooltip] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    // Draw histogram when stats change
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !(stats === null || stats === void 0 ? void 0 : stats.histogram))
            return;
        (0,_utils_histogramRenderer__WEBPACK_IMPORTED_MODULE_1__.drawHistogram)(canvas, stats.histogram);
    }, [stats]);
    // Track sort state
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        var _a;
        if (!column || !api)
            return;
        const onSortChanged = () => {
            var _a;
            const colState = (_a = api.getColumnState) === null || _a === void 0 ? void 0 : _a.call(api);
            if (colState) {
                const myState = colState.find((s) => s.colId === column.getColId());
                setSortState((myState === null || myState === void 0 ? void 0 : myState.sort) || null);
            }
        };
        (_a = api.addEventListener) === null || _a === void 0 ? void 0 : _a.call(api, 'sortChanged', onSortChanged);
        return () => {
            var _a;
            (_a = api.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(api, 'sortChanged', onSortChanged);
        };
    }, [column, api]);
    const handleClick = (e) => {
        if (!setSort)
            return;
        let nextSort;
        if (sortState === null) {
            nextSort = 'asc';
        }
        else if (sortState === 'asc') {
            nextSort = 'desc';
        }
        else {
            nextSort = '';
        }
        setSort(nextSort, e.shiftKey);
    };
    const handleCanvasMouseMove = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((e) => {
        if (!(stats === null || stats === void 0 ? void 0 : stats.histogram) || !canvasRef.current)
            return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const text = getTooltipText(stats.histogram, mouseX, mouseY, rect.width, rect.height);
        if (text) {
            setTooltip({ text, x: e.clientX, y: rect.top - 4 });
        }
        else {
            setTooltip(null);
        }
    }, [stats]);
    const handleCanvasMouseLeave = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
        setTooltip(null);
    }, []);
    const sortIcon = sortState === 'asc' ? ' \u25b2' : sortState === 'desc' ? ' \u25bc' : '';
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-histogram-header", style: { width: '100%' } },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-header-label", onClick: handleClick, title: `Click to sort by ${displayName}` },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, displayName),
            sortIcon && react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-sort-icon" }, sortIcon)),
        (stats === null || stats === void 0 ? void 0 : stats.histogram) && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { position: 'relative', width: '100%' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("canvas", { ref: canvasRef, width: 120, height: 30, style: { width: '100%', height: '30px', cursor: 'crosshair' }, onMouseMove: handleCanvasMouseMove, onMouseLeave: handleCanvasMouseLeave }),
            tooltip && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { ref: tooltipRef, className: "ve-histogram-tooltip", style: { left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' } }, tooltip.text.split('\n').map((line, i) => (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { key: i }, line)))))))));
};


/***/ },

/***/ "./lib/components/MetadataSidebar.js"
/*!*******************************************!*\
  !*** ./lib/components/MetadataSidebar.js ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MetadataSidebar: () => (/* binding */ MetadataSidebar)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
const MetadataSidebar = ({ columns, columnStats, hiddenColumns, onToggleColumn, selectedVarInfo }) => {
    var _a, _b, _c, _d;
    const [filter, setFilter] = react__WEBPACK_IMPORTED_MODULE_0__.useState('');
    const [selectedCol, setSelectedCol] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [propertiesHeight, setPropertiesHeight] = react__WEBPACK_IMPORTED_MODULE_0__.useState(220);
    const handleRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null);
    const statsMap = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        const map = {};
        for (const s of columnStats) {
            map[s.name] = s;
        }
        return map;
    }, [columnStats]);
    const filtered = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        if (!filter)
            return columns;
        const lower = filter.toLowerCase();
        return columns.filter(c => c.name.toLowerCase().includes(lower));
    }, [columns, filter]);
    const selectedStats = selectedCol ? statsMap[selectedCol] : null;
    const selectedColDef = selectedCol ? columns.find(c => c.name === selectedCol) : null;
    // Horizontal resize for properties panel
    const onHandleMouseDown = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((e) => {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const baseHeight = propertiesHeight;
        const doc = ((_a = handleRef.current) === null || _a === void 0 ? void 0 : _a.ownerDocument) || document;
        const onMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            const delta = startY - moveEvent.clientY; // dragging up = increase height
            setPropertiesHeight(Math.max(80, Math.min(500, baseHeight + delta)));
        };
        const onMouseUp = () => {
            doc.removeEventListener('mousemove', onMouseMove);
            doc.removeEventListener('mouseup', onMouseUp);
            doc.body.style.cursor = '';
            doc.body.style.userSelect = '';
        };
        doc.addEventListener('mousemove', onMouseMove);
        doc.addEventListener('mouseup', onMouseUp);
        doc.body.style.cursor = 'row-resize';
        doc.body.style.userSelect = 'none';
    }, [propertiesHeight]);
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-metadata-sidebar" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-metadata-header" },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", null, "Columns"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { style: { fontSize: '11px', fontWeight: 'normal', opacity: 0.6 } }, columns.length)),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("input", { className: "ve-metadata-search", type: "text", placeholder: "Filter columns...", value: filter, onChange: e => setFilter(e.target.value) }),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-metadata-columns" }, filtered.map(col => {
            return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { key: col.name, className: "ve-metadata-column-item", onClick: () => setSelectedCol(col.name), style: {
                    cursor: 'pointer',
                    background: col.name === selectedCol ? 'var(--jp-layout-color2)' : undefined
                } },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("input", { type: "checkbox", checked: !hiddenColumns.has(col.name), onChange: () => onToggleColumn(col.name), onClick: e => e.stopPropagation() }),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-col-name", title: col.name }, col.name),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-col-type" }, col.dtype)));
        })),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { ref: handleRef, className: "ve-resize-handle-horizontal", onMouseDown: onHandleMouseDown }),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-properties-panel", style: { height: propertiesHeight, minHeight: 80 } }, selectedStats && selectedColDef ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("h4", null,
                "Column: ",
                selectedCol),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("table", { className: "ve-properties-table" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("tbody", null,
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Name"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedColDef.name)),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Type"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedColDef.dtype)),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Nulls"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.nullCount.toLocaleString())),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Unique"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.uniqueCount.toLocaleString())),
                    ((_a = selectedStats.histogram) === null || _a === void 0 ? void 0 : _a.type) === 'numeric' && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Min"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.min.toLocaleString(undefined, { maximumFractionDigits: 4 }))),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Max"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.max.toLocaleString(undefined, { maximumFractionDigits: 4 }))),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Mean"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.mean.toLocaleString(undefined, { maximumFractionDigits: 4 }))),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Std"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.std.toLocaleString(undefined, { maximumFractionDigits: 4 }))))),
                    ((_b = selectedStats.histogram) === null || _b === void 0 ? void 0 : _b.type) === 'boolean' && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "True"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.trueCount.toLocaleString())),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "False"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.falseCount.toLocaleString())))),
                    ((_c = selectedStats.histogram) === null || _c === void 0 ? void 0 : _c.type) === 'categorical' && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Top values"),
                            react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedStats.histogram.labels.slice(0, 5).map((label, i) => {
                                var _a;
                                return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { key: i, style: { fontSize: '11px' } },
                                    label,
                                    ": ",
                                    selectedStats.histogram.type === 'categorical'
                                        ? (_a = selectedStats.histogram.counts[i]) === null || _a === void 0 ? void 0 : _a.toLocaleString()
                                        : ''));
                            }))))))))) : selectedVarInfo ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("h4", null, "Dataset"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("table", { className: "ve-properties-table" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("tbody", null,
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Name"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedVarInfo.name)),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Type"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedVarInfo.typeName)),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Shape"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, selectedVarInfo.shape.map(s => s.toLocaleString()).join(' \u00d7 '))),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Memory"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, formatBytes(selectedVarInfo.memoryBytes))),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Variables"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, columns.length)),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("tr", null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, "Observations"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("td", null, (_d = selectedVarInfo.shape[0]) === null || _d === void 0 ? void 0 : _d.toLocaleString())))))) : (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { fontSize: '12px', opacity: 0.5, textAlign: 'center', paddingTop: 12 } }, "Click a column for details")))));
};


/***/ },

/***/ "./lib/components/ResizeHandle.js"
/*!****************************************!*\
  !*** ./lib/components/ResizeHandle.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ResizeHandle: () => (/* binding */ ResizeHandle)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

const ResizeHandle = ({ onResizeStart, onResize, direction, invert }) => {
    const handleRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null);
    const onMouseDown = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((e) => {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const baseWidth = onResizeStart();
        // Use the ownerDocument so this works in detached popup windows
        const doc = ((_a = handleRef.current) === null || _a === void 0 ? void 0 : _a.ownerDocument) || document;
        const onMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            const delta = moveEvent.clientX - startX;
            const newWidth = invert ? baseWidth - delta : baseWidth + delta;
            onResize(newWidth);
        };
        const onMouseUp = () => {
            doc.removeEventListener('mousemove', onMouseMove);
            doc.removeEventListener('mouseup', onMouseUp);
            doc.body.style.cursor = '';
            doc.body.style.userSelect = '';
        };
        doc.addEventListener('mousemove', onMouseMove);
        doc.addEventListener('mouseup', onMouseUp);
        doc.body.style.cursor = 'col-resize';
        doc.body.style.userSelect = 'none';
    }, [onResizeStart, onResize, invert]);
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { ref: handleRef, className: "ve-resize-handle", onMouseDown: onMouseDown }));
};


/***/ },

/***/ "./lib/components/SqlPanel.js"
/*!************************************!*\
  !*** ./lib/components/SqlPanel.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SqlPanel: () => (/* binding */ SqlPanel)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var ag_grid_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ag-grid-react */ "webpack/sharing/consume/default/ag-grid-react/ag-grid-react");


const SqlPanel = ({ commManager, onPopOut, isDocked, onToggleDock }) => {
    const [query, setQuery] = react__WEBPACK_IMPORTED_MODULE_0__.useState('SELECT * FROM ');
    const [saveAs, setSaveAs] = react__WEBPACK_IMPORTED_MODULE_0__.useState('');
    const [running, setRunning] = react__WEBPACK_IMPORTED_MODULE_0__.useState(false);
    const [error, setError] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [resultColumns, setResultColumns] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [resultRows, setResultRows] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [totalRows, setTotalRows] = react__WEBPACK_IMPORTED_MODULE_0__.useState(0);
    const [savedAs, setSavedAs] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [tables, setTables] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [duckdbAvailable, setDuckdbAvailable] = react__WEBPACK_IMPORTED_MODULE_0__.useState(true);
    const textareaRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(null);
    // Request table list on mount
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        commManager.send({ type: 'sql_tables' });
    }, [commManager]);
    // Listen for SQL responses
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        const onMessage = (_, msg) => {
            if (msg.type === 'sql_result') {
                const r = msg;
                setResultColumns(r.columns);
                setResultRows(r.rows);
                setTotalRows(r.totalRows);
                setSavedAs(r.savedAs);
                setTables(r.tables.map(t => ({ name: t, rows: 0, columns: 0, columnNames: [] })));
                setError(null);
                setRunning(false);
            }
            else if (msg.type === 'sql_error') {
                const e = msg;
                setError(e.error);
                setResultColumns([]);
                setResultRows([]);
                setRunning(false);
            }
            else if (msg.type === 'sql_tables') {
                const t = msg;
                setTables(t.tables);
                setDuckdbAvailable(t.duckdbAvailable);
            }
        };
        commManager.messageReceived.connect(onMessage);
        return () => {
            commManager.messageReceived.disconnect(onMessage);
        };
    }, [commManager]);
    const executeQuery = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
        if (!query.trim())
            return;
        setRunning(true);
        setError(null);
        setSavedAs(null);
        commManager.send({
            type: 'sql_execute',
            query: query.trim(),
            saveAs: saveAs.trim() || undefined
        });
    }, [commManager, query, saveAs]);
    const handleKeyDown = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            executeQuery();
        }
    }, [executeQuery]);
    // Insert table name at cursor
    const insertTableName = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((name) => {
        const textarea = textareaRef.current;
        if (!textarea)
            return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newQuery = query.substring(0, start) + name + query.substring(end);
        setQuery(newQuery);
        // Refocus and set cursor after inserted name
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + name.length;
        }, 0);
    }, [query]);
    // Save SQL to file
    const saveScript = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
        var _a;
        const blob = new Blob([query], { type: 'text/sql' });
        const url = URL.createObjectURL(blob);
        const a = (((_a = textareaRef.current) === null || _a === void 0 ? void 0 : _a.ownerDocument) || document).createElement('a');
        a.href = url;
        a.download = 'query.sql';
        a.click();
        URL.revokeObjectURL(url);
    }, [query]);
    // Open SQL from file
    const openScript = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
        var _a;
        const doc = ((_a = textareaRef.current) === null || _a === void 0 ? void 0 : _a.ownerDocument) || document;
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = '.sql,.txt';
        input.onchange = (e) => {
            var _a, _b;
            const file = (_b = (_a = e.target) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                var _a;
                const text = (_a = ev.target) === null || _a === void 0 ? void 0 : _a.result;
                if (typeof text === 'string') {
                    setQuery(text);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);
    // Build AG Grid column defs for results
    const colDefs = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        const indexCol = {
            headerName: '#',
            valueGetter: (params) => { var _a, _b; return (_b = (_a = params.node) === null || _a === void 0 ? void 0 : _a.rowIndex) !== null && _b !== void 0 ? _b : ''; },
            width: 60,
            pinned: 'left',
            sortable: false,
            cellStyle: { color: 'var(--jp-ui-font-color2)', fontSize: '11px' }
        };
        const dataCols = resultColumns.map(col => ({
            headerName: col.name,
            field: col.name,
            sortable: true,
            resizable: true,
        }));
        return [indexCol, ...dataCols];
    }, [resultColumns]);
    const isDark = document.body.getAttribute('data-jp-theme-light') === 'false';
    const themeClass = isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';
    if (!duckdbAvailable) {
        return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-panel" },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-no-duckdb" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { fontSize: '16px', fontWeight: 600, marginBottom: 8 } }, "SQL Query Engine"),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { marginBottom: 12, opacity: 0.8 } }, "DuckDB is required to query your DataFrames with SQL."),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("code", { style: {
                        display: 'block',
                        padding: '8px 12px',
                        background: 'var(--jp-layout-color2)',
                        borderRadius: 4,
                        fontSize: '13px'
                    } }, "pip install duckdb"),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { marginTop: 12, fontSize: '12px', opacity: 0.6 } }, "Then restart your kernel and reopen the Variable Explorer."))));
    }
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-panel" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-top" },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-tables" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-tables-header" }, "Tables"),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-tables-list" },
                    tables.map(t => (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { key: t.name, className: "ve-sql-table-item", onClick: () => insertTableName(t.name), title: `${t.name} (${t.rows} rows, ${t.columns} cols)\nColumns: ${t.columnNames.join(', ')}\nClick to insert` },
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-sql-table-name" }, t.name),
                        t.rows > 0 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-sql-table-meta" },
                            t.rows,
                            " \u00D7 ",
                            t.columns))))),
                    tables.length === 0 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { padding: 8, fontSize: '11px', opacity: 0.5 } }, "No DataFrames in namespace")))),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-editor" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("textarea", { ref: textareaRef, className: "ve-sql-textarea", value: query, onChange: e => setQuery(e.target.value), onKeyDown: handleKeyDown, placeholder: "SELECT * FROM my_dataframe WHERE ...", spellCheck: false }),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-controls" },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-sql-run-btn", onClick: executeQuery, disabled: running || !query.trim() }, running ? 'Running...' : '\u25b6 Run (Ctrl+Enter)'),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-tab-action", onClick: openScript, title: "Open a .sql file" }, "Open"),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-tab-action", onClick: saveScript, title: "Save query to .sql file" }, "Save"),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-save-as" },
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("label", null, "Save result as:"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("input", { type: "text", className: "ve-sql-save-input", value: saveAs, onChange: e => setSaveAs(e.target.value), placeholder: "object_name" })),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { marginLeft: 'auto', display: 'flex', gap: 4 } },
                        onToggleDock && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-tab-action", onClick: onToggleDock, title: isDocked ? 'Show SQL as a separate tab' : 'Dock SQL below data' }, isDocked ? '\u2B71 Undock' : '\u2B73 Dock Below')),
                        onPopOut && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-tab-action", onClick: onPopOut, title: "Open SQL editor in a separate window" }, "\u2197 Pop Out")))))),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-results" },
            error && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-error" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("strong", null, "Error:"),
                " ",
                error)),
            savedAs && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-saved" },
                "Result saved as ",
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("strong", null, savedAs),
                " (",
                totalRows.toLocaleString(),
                " rows)")),
            resultRows.length > 0 ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: themeClass, style: { width: '100%', height: '100%' } },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(ag_grid_react__WEBPACK_IMPORTED_MODULE_1__.AgGridReact, { rowData: resultRows, columnDefs: colDefs, headerHeight: 32, rowHeight: 28, animateRows: false, defaultColDef: { sortable: true, resizable: true, minWidth: 60 } }))) : !error && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-placeholder" }, running ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-loading" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-spinner" }))) : (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { opacity: 0.5 } },
                "Write a SQL query and press Ctrl+Enter to run it.",
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("br", null),
                "All DataFrames in your namespace are available as tables.")))),
            resultRows.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-sql-result-status" },
                totalRows.toLocaleString(),
                " rows returned",
                totalRows > 10000 && ' (showing first 10,000)')))));
};


/***/ },

/***/ "./lib/components/StatusBar.js"
/*!*************************************!*\
  !*** ./lib/components/StatusBar.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StatusBar: () => (/* binding */ StatusBar)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

const StatusBar = ({ selectedVar, totalRows, totalCols, sortModel, connected }) => {
    const sortDisplay = sortModel.length > 0
        ? sortModel.map(s => `${s.colId} ${s.sort}`).join(', ')
        : 'none';
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-status-bar" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-item", style: { color: connected ? 'var(--jp-success-color1)' : 'var(--jp-error-color1)' } }, connected ? '\u25cf Connected' : '\u25cb Disconnected'),
        selectedVar && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-separator" }, "|"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-item" },
                "Vars: ",
                totalCols),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-separator" }, "|"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-item" },
                "Obs: ",
                totalRows.toLocaleString()),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-separator" }, "|"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-status-item" },
                "Sorted: ",
                sortDisplay)))));
};


/***/ },

/***/ "./lib/components/VariableExplorerApp.js"
/*!***********************************************!*\
  !*** ./lib/components/VariableExplorerApp.js ***!
  \***********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VariableExplorerApp: () => (/* binding */ VariableExplorerApp)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom */ "webpack/sharing/consume/default/react-dom");
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _VariableList__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./VariableList */ "./lib/components/VariableList.js");
/* harmony import */ var _DataGrid__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./DataGrid */ "./lib/components/DataGrid.js");
/* harmony import */ var _MetadataSidebar__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./MetadataSidebar */ "./lib/components/MetadataSidebar.js");
/* harmony import */ var _CellReferenceBar__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./CellReferenceBar */ "./lib/components/CellReferenceBar.js");
/* harmony import */ var _StatusBar__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./StatusBar */ "./lib/components/StatusBar.js");
/* harmony import */ var _ResizeHandle__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./ResizeHandle */ "./lib/components/ResizeHandle.js");
/* harmony import */ var _SqlPanel__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./SqlPanel */ "./lib/components/SqlPanel.js");
/* harmony import */ var _Breadcrumb__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./Breadcrumb */ "./lib/components/Breadcrumb.js");
/* harmony import */ var _utils_stylesheetCloner__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../utils/stylesheetCloner */ "./lib/utils/stylesheetCloner.js");











const VariableExplorerApp = ({ commManager }) => {
    const [connected, setConnected] = react__WEBPACK_IMPORTED_MODULE_0__.useState(commManager.isConnected);
    const [variables, setVariables] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [selectedVar, setSelectedVar] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [rows, setRows] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [totalRows, setTotalRows] = react__WEBPACK_IMPORTED_MODULE_0__.useState(0);
    const [columns, setColumns] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [columnStats, setColumnStats] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [sortModel, setSortModel] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [cellSelection, setCellSelection] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [showSidebar, setShowSidebar] = react__WEBPACK_IMPORTED_MODULE_0__.useState(true);
    const [loading, setLoading] = react__WEBPACK_IMPORTED_MODULE_0__.useState(false);
    const [hiddenColumns, setHiddenColumns] = react__WEBPACK_IMPORTED_MODULE_0__.useState(new Set());
    const [navPath, setNavPath] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const [activeTab, setActiveTab] = react__WEBPACK_IMPORTED_MODULE_0__.useState('data');
    const [sqlDocked, setSqlDocked] = react__WEBPACK_IMPORTED_MODULE_0__.useState(true);
    const [sqlDockHeight, setSqlDockHeight] = react__WEBPACK_IMPORTED_MODULE_0__.useState(300);
    const onSqlDockResizeStart = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => sqlDockHeight, [sqlDockHeight]);
    const onSqlDockResize = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((newHeight) => {
        setSqlDockHeight(Math.max(100, Math.min(800, newHeight)));
    }, []);
    // Panel sizing
    const [leftWidth, setLeftWidth] = react__WEBPACK_IMPORTED_MODULE_0__.useState(220);
    const [rightWidth, setRightWidth] = react__WEBPACK_IMPORTED_MODULE_0__.useState(280);
    const onLeftResizeStart = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => leftWidth, [leftWidth]);
    const onLeftResize = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((newWidth) => {
        setLeftWidth(Math.max(120, Math.min(500, newWidth)));
    }, []);
    // For the right panel, dragging right = panel shrinks, so invert
    const onRightResizeStart = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => rightWidth, [rightWidth]);
    const onRightResize = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((newWidth) => {
        // ResizeHandle sends base + delta. For the right side,
        // we want: base - delta = base - (newWidth - base) = 2*base - newWidth
        // But we don't have base here. Instead, let's just negate in the component.
        setRightWidth(Math.max(150, Math.min(500, newWidth)));
    }, []);
    // Listen for connection changes
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        const onConnectionChanged = (_, isConnected) => {
            setConnected(isConnected);
            if (!isConnected) {
                setVariables([]);
                setSelectedVar(null);
                setRows([]);
            }
        };
        commManager.connectionChanged.connect(onConnectionChanged);
        return () => {
            commManager.connectionChanged.disconnect(onConnectionChanged);
        };
    }, [commManager]);
    // Listen for kernel messages
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        const onMessage = (_, msg) => {
            switch (msg.type) {
                case 'variable_list':
                    setVariables(msg.variables);
                    break;
                case 'data_page': {
                    const dp = msg;
                    if (dp.startRow === 0) {
                        setRows(dp.rows);
                    }
                    else {
                        setRows(prev => [...prev, ...dp.rows]);
                    }
                    setTotalRows(dp.totalRows);
                    setColumns(dp.columns);
                    setLoading(false);
                    break;
                }
                case 'column_stats': {
                    const cs = msg;
                    setColumnStats(cs.stats);
                    break;
                }
                case 'error':
                    console.error('Variable Explorer kernel error:', msg.message);
                    setLoading(false);
                    break;
            }
        };
        commManager.messageReceived.connect(onMessage);
        return () => {
            commManager.messageReceived.disconnect(onMessage);
        };
    }, [commManager]);
    // Fetch data for a variable, optionally at a child path
    const fetchData = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((name, childKey) => {
        setRows([]);
        setSortModel([]);
        setCellSelection(null);
        setHiddenColumns(new Set());
        setLoading(true);
        commManager.send({
            type: 'get_data',
            variable: name,
            startRow: 0,
            endRow: 1000,
            childKey
        });
        commManager.send({
            type: 'get_stats',
            variable: name,
            childKey
        });
    }, [commManager]);
    const onSelectVariable = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((name) => {
        setSelectedVar(name);
        setNavPath([{ label: name }]);
        fetchData(name);
    }, [fetchData]);
    // Drill into a child (e.g., double-click row in container summary)
    const onDrillDown = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((childKey, childLabel) => {
        if (!selectedVar)
            return;
        const newPath = [...navPath, { label: childLabel, childKey }];
        setNavPath(newPath);
        // Build the full child key chain for nested access
        const fullChildKey = newPath.slice(1).map(p => p.childKey).filter(Boolean).join('.');
        fetchData(selectedVar, fullChildKey || undefined);
    }, [selectedVar, navPath, fetchData]);
    // Navigate back to a specific depth in the breadcrumb
    const onBreadcrumbNavigate = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((depth) => {
        if (!selectedVar)
            return;
        const newPath = navPath.slice(0, depth + 1);
        setNavPath(newPath);
        if (newPath.length <= 1) {
            // Back to root
            fetchData(selectedVar);
        }
        else {
            const fullChildKey = newPath.slice(1).map(p => p.childKey).filter(Boolean).join('.');
            fetchData(selectedVar, fullChildKey || undefined);
        }
    }, [selectedVar, navPath, fetchData]);
    // Check if current view is a container (showing summary, not actual data)
    const isContainerView = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        if (!selectedVar)
            return false;
        const varInfo = variables.find(v => v.name === selectedVar);
        if (!varInfo)
            return false;
        // Only the root level of containers shows the summary
        if (navPath.length > 1)
            return false;
        return varInfo.tabularKind === 'list_of_dataframes' || varInfo.tabularKind === 'dict_of_dataframes';
    }, [selectedVar, variables, navPath]);
    const onLoadMore = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((startRow) => {
        if (selectedVar) {
            commManager.send({
                type: 'get_data',
                variable: selectedVar,
                startRow,
                endRow: startRow + 1000,
                sortModel: sortModel.length > 0 ? sortModel : undefined
            });
        }
    }, [commManager, selectedVar, sortModel]);
    const onSortChanged = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((newSortModel) => {
        setSortModel(newSortModel);
        setRows([]);
        setLoading(true);
        if (selectedVar) {
            commManager.send({
                type: 'get_data',
                variable: selectedVar,
                startRow: 0,
                endRow: 1000,
                sortModel: newSortModel.length > 0 ? newSortModel : undefined
            });
        }
    }, [commManager, selectedVar]);
    const onCellSelected = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((rowIndex, colName, value) => {
        setCellSelection({ rowIndex, colName, value });
    }, []);
    const onCellEdit = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((rowIndex, column, newValue) => {
        if (selectedVar) {
            commManager.send({
                type: 'edit_cell',
                variable: selectedVar,
                rowIndex,
                column,
                newValue
            });
        }
    }, [commManager, selectedVar]);
    const onToggleColumn = react__WEBPACK_IMPORTED_MODULE_0__.useCallback((colName) => {
        setHiddenColumns(prev => {
            const next = new Set(prev);
            if (next.has(colName)) {
                next.delete(colName);
            }
            else {
                next.add(colName);
            }
            return next;
        });
    }, []);
    const onRefresh = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
        commManager.refresh();
        if (selectedVar) {
            onSelectVariable(selectedVar);
        }
    }, [commManager, selectedVar, onSelectVariable]);
    const selectedVarInfo = variables.find(v => v.name === selectedVar);
    // Pop out SQL panel into its own window
    const onSqlPopOut = react__WEBPACK_IMPORTED_MODULE_0__.useCallback(() => {
        // Switch main window back to Data tab
        setActiveTab('data');
        const width = Math.min(1200, screen.availWidth * 0.7);
        const height = Math.min(700, screen.availHeight * 0.6);
        const left = Math.round((screen.availWidth - width) / 2);
        const top = Math.round((screen.availHeight - height) / 2);
        const win = window.open('', 'variable-explorer-sql', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
        if (!win) {
            alert('Pop-up was blocked by your browser.\n\nAllow pop-ups for this site in your browser settings.');
            return;
        }
        const doc = win.document;
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SQL - Variable Explorer</title>
<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}#ve-sql-root{width:100%;height:100%}</style>
</head><body><div id="ve-sql-root"></div></body></html>`);
        doc.close();
        (0,_utils_stylesheetCloner__WEBPACK_IMPORTED_MODULE_10__.cloneStylesheets)(document, doc);
        const parentBody = document.body;
        for (let i = 0; i < parentBody.attributes.length; i++) {
            const attr = parentBody.attributes[i];
            if (attr.name.startsWith('data-jp-')) {
                doc.body.setAttribute(attr.name, attr.value);
            }
        }
        doc.body.className = parentBody.className;
        const container = doc.getElementById('ve-sql-root');
        react_dom__WEBPACK_IMPORTED_MODULE_1__.render(react__WEBPACK_IMPORTED_MODULE_0__.createElement(_SqlPanel__WEBPACK_IMPORTED_MODULE_8__.SqlPanel, { commManager, onPopOut: undefined }), container);
        // Clean up on close
        const poll = window.setInterval(() => {
            if (win.closed) {
                window.clearInterval(poll);
                try {
                    react_dom__WEBPACK_IMPORTED_MODULE_1__.unmountComponentAtNode(container);
                }
                catch (_a) { }
            }
        }, 500);
    }, [commManager]);
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-main-container" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-tab-bar" },
            !sqlDocked && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: `ve-tab ${activeTab === 'data' ? 've-tab-active' : ''}`, onClick: () => setActiveTab('data') }, "Data"),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: `ve-tab ${activeTab === 'sql' ? 've-tab-active' : ''}`, onClick: () => setActiveTab('sql') }, "SQL"))),
            sqlDocked && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { style: { fontWeight: 600, fontSize: 'var(--jp-ui-font-size1)', padding: '0 8px' } }, "Data")),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-tab-spacer" }),
            (activeTab === 'data' || sqlDocked) && selectedVar && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-tab-action", onClick: onRefresh, title: "Refresh data" }, "\u21BB Refresh"),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "ve-tab-action", onClick: () => setShowSidebar(!showSidebar), title: "Toggle metadata sidebar" },
                    showSidebar ? 'Hide' : 'Show',
                    " Metadata")))),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-tab-content", style: { display: activeTab === 'data' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' } },
            cellSelection && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_CellReferenceBar__WEBPACK_IMPORTED_MODULE_5__.CellReferenceBar, { rowIndex: cellSelection.rowIndex, colName: cellSelection.colName, value: cellSelection.value })),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-content-area" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { width: leftWidth, minWidth: 120, flexShrink: 0 } },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(_VariableList__WEBPACK_IMPORTED_MODULE_2__.VariableList, { variables: variables, selectedVar: selectedVar, onSelect: onSelectVariable })),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_ResizeHandle__WEBPACK_IMPORTED_MODULE_7__.ResizeHandle, { direction: "horizontal", onResizeStart: onLeftResizeStart, onResize: onLeftResize }),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-grid-container" },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-grid-toolbar" },
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-toolbar-title" },
                            selectedVar || 'Select a variable',
                            selectedVarInfo && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { style: { fontWeight: 'normal', opacity: 0.6, marginLeft: 8, fontSize: '12px' } },
                                selectedVarInfo.typeName,
                                " (",
                                selectedVarInfo.shape.map(s => s.toLocaleString()).join(' \u00d7 '),
                                ")")))),
                    navPath.length > 1 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_Breadcrumb__WEBPACK_IMPORTED_MODULE_9__.Breadcrumb, { path: navPath, onNavigate: onBreadcrumbNavigate })),
                    selectedVar && columns.length > 0 ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_DataGrid__WEBPACK_IMPORTED_MODULE_3__.DataGrid, { rows: rows, columns: columns, columnStats: columnStats, totalRows: totalRows, sortModel: sortModel, hiddenColumns: hiddenColumns, loading: loading, isContainerView: isContainerView, onSortChanged: onSortChanged, onLoadMore: onLoadMore, onCellSelected: onCellSelected, onCellEdit: onCellEdit, onDrillDown: onDrillDown })) : (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-empty-state" }, loading ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-loading" },
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-spinner" }))) : !connected ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-empty-icon" }, "\uD83D\uDD0C"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", null, "Not connected to a kernel"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { fontSize: '12px', marginTop: 8, opacity: 0.7 } }, "Open a notebook and run a cell to connect"))) : (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-empty-icon" }, "\uD83D\uDCCA"),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", null, variables.length === 0
                            ? 'No variables in kernel namespace'
                            : 'Select a DataFrame to view its contents')))))),
                showSidebar && selectedVar && columnStats.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(_ResizeHandle__WEBPACK_IMPORTED_MODULE_7__.ResizeHandle, { direction: "horizontal", onResizeStart: onRightResizeStart, onResize: onRightResize, invert: true }),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { width: rightWidth, minWidth: 150, flexShrink: 0 } },
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_MetadataSidebar__WEBPACK_IMPORTED_MODULE_4__.MetadataSidebar, { columns: columns, columnStats: columnStats, hiddenColumns: hiddenColumns, onToggleColumn: onToggleColumn, selectedVarInfo: selectedVarInfo || null }))))),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_StatusBar__WEBPACK_IMPORTED_MODULE_6__.StatusBar, { selectedVar: selectedVar, totalRows: totalRows, totalCols: columns.length, sortModel: sortModel, connected: connected })),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { display: !sqlDocked && activeTab === 'sql' ? 'flex' : 'none', flex: 1, overflow: 'hidden' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_SqlPanel__WEBPACK_IMPORTED_MODULE_8__.SqlPanel, { commManager: commManager, onPopOut: onSqlPopOut, isDocked: false, onToggleDock: () => { setSqlDocked(true); setActiveTab('data'); } })),
        sqlDocked && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-resize-handle-horizontal", onMouseDown: (e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const base = sqlDockHeight;
                    const doc = e.target.ownerDocument || document;
                    const onMove = (me) => {
                        me.preventDefault();
                        setSqlDockHeight(Math.max(100, Math.min(800, base - (me.clientY - startY))));
                    };
                    const onUp = () => {
                        doc.removeEventListener('mousemove', onMove);
                        doc.removeEventListener('mouseup', onUp);
                        doc.body.style.cursor = '';
                        doc.body.style.userSelect = '';
                    };
                    doc.addEventListener('mousemove', onMove);
                    doc.addEventListener('mouseup', onUp);
                    doc.body.style.cursor = 'row-resize';
                    doc.body.style.userSelect = 'none';
                } }),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { height: sqlDockHeight, flexShrink: 0, overflow: 'hidden', display: 'flex' } },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_SqlPanel__WEBPACK_IMPORTED_MODULE_8__.SqlPanel, { commManager: commManager, onPopOut: onSqlPopOut, isDocked: true, onToggleDock: () => setSqlDocked(false) }))))));
};


/***/ },

/***/ "./lib/components/VariableList.js"
/*!****************************************!*\
  !*** ./lib/components/VariableList.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VariableList: () => (/* binding */ VariableList)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
function formatShape(shape) {
    if (shape.length === 0)
        return 'scalar';
    if (shape.length === 1)
        return `${shape[0].toLocaleString()} items`;
    return shape.map(s => s.toLocaleString()).join(' \u00d7 ');
}
function getTypeBadgeClass(typeName) {
    const lower = typeName.toLowerCase();
    if (lower === 'dataframe')
        return 've-type-dataframe';
    if (lower === 'series')
        return 've-type-series';
    if (lower === 'ndarray')
        return 've-type-ndarray';
    if (lower === 'list' || lower === 'tuple')
        return 've-type-list';
    if (lower === 'dict')
        return 've-type-dict';
    return 've-type-other';
}
function getKindLabel(kind) {
    switch (kind) {
        case 'list_of_dicts': return 'records';
        case 'list_of_lists': return 'matrix';
        case 'list_of_dataframes': return 'container';
        case 'dict_of_dataframes': return 'container';
        case 'dict_of_lists': return 'table';
        case 'dict_of_dicts': return 'nested';
        case 'list_scalar': return 'values';
        case 'dict_scalar': return 'record';
        default: return '';
    }
}
const VariableList = ({ variables, selectedVar, onSelect }) => {
    const [filter, setFilter] = react__WEBPACK_IMPORTED_MODULE_0__.useState('');
    const filtered = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        if (!filter)
            return variables;
        const lower = filter.toLowerCase();
        return variables.filter(v => v.name.toLowerCase().includes(lower) || v.typeName.toLowerCase().includes(lower));
    }, [variables, filter]);
    const sorted = react__WEBPACK_IMPORTED_MODULE_0__.useMemo(() => {
        return [...filtered].sort((a, b) => {
            if (a.isTabular !== b.isTabular)
                return a.isTabular ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }, [filtered]);
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-variable-list" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-variable-list-header" },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("input", { className: "ve-variable-search", type: "text", placeholder: "Filter objects...", value: filter, onChange: e => setFilter(e.target.value) })),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-variable-items" }, sorted.length === 0 ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { padding: '12px 8px', textAlign: 'center', opacity: 0.5, fontSize: '12px' } }, variables.length === 0 ? 'No variables' : 'No matches')) : (sorted.map(v => {
            const kindLabel = getKindLabel(v.tabularKind);
            return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { key: v.name, className: `ve-variable-item ${v.name === selectedVar ? 've-selected' : ''}`, onClick: () => v.isTabular && onSelect(v.name), style: { opacity: v.isTabular ? 1 : 0.6, cursor: v.isTabular ? 'pointer' : 'default' }, title: v.isTabular ? `Click to view ${v.name}` : `${v.name} (${v.typeName})` },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-var-name" }, v.name),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: `ve-type-badge ${getTypeBadgeClass(v.typeName)}` }, v.typeName),
                    kindLabel && (react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "ve-kind-label" }, kindLabel))),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ve-var-meta" },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", null, formatShape(v.shape)),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", null, formatBytes(v.memoryBytes)))));
        })))));
};


/***/ },

/***/ "./lib/index.js"
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/notebook */ "webpack/sharing/consume/default/@jupyterlab/notebook");
/* harmony import */ var _jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_console__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/console */ "webpack/sharing/consume/default/@jupyterlab/console");
/* harmony import */ var _jupyterlab_console__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_console__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @jupyterlab/ui-components */ "webpack/sharing/consume/default/@jupyterlab/ui-components");
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _comm_CommManager__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./comm/CommManager */ "./lib/comm/CommManager.js");
/* harmony import */ var _components_VariableExplorerApp__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./components/VariableExplorerApp */ "./lib/components/VariableExplorerApp.js");
/* harmony import */ var _utils_stylesheetCloner__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/stylesheetCloner */ "./lib/utils/stylesheetCloner.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react-dom */ "webpack/sharing/consume/default/react-dom");
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_8__);









const PLUGIN_ID = 'variable-explorer:plugin';
const COMMAND_ID = 'variable-explorer:open';
/**
 * Manages the detached Variable Explorer window and its React tree.
 */
class VariableExplorerManager {
    constructor() {
        this._commManager = new _comm_CommManager__WEBPACK_IMPORTED_MODULE_4__.CommManager();
        this._externalWindow = null;
        this._root = null;
        this._pollTimer = null;
    }
    get commManager() {
        return this._commManager;
    }
    get isOpen() {
        return this._externalWindow !== null && !this._externalWindow.closed;
    }
    /**
     * Open the Variable Explorer in a detached window.
     */
    open() {
        if (this.isOpen) {
            this._externalWindow.focus();
            return;
        }
        const width = Math.min(1400, screen.availWidth * 0.8);
        const height = Math.min(900, screen.availHeight * 0.8);
        const left = Math.round((screen.availWidth - width) / 2);
        const top = Math.round((screen.availHeight - height) / 2);
        this._externalWindow = window.open('', 'variable-explorer', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`);
        if (!this._externalWindow) {
            alert('Variable Explorer: Pop-up was blocked by your browser.\n\nTo fix this, allow pop-ups for this site:\n1. Click the blocked pop-up icon in your address bar, or\n2. Go to Settings → Privacy → Pop-ups → Add this site to "Allowed"');
            return;
        }
        const doc = this._externalWindow.document;
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Variable Explorer</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #ve-root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="ve-root"></div>
</body>
</html>`);
        doc.close();
        (0,_utils_stylesheetCloner__WEBPACK_IMPORTED_MODULE_6__.cloneStylesheets)(document, doc);
        // Copy theme
        const parentBody = document.body;
        const childBody = doc.body;
        for (let i = 0; i < parentBody.attributes.length; i++) {
            const attr = parentBody.attributes[i];
            if (attr.name.startsWith('data-jp-')) {
                childBody.setAttribute(attr.name, attr.value);
            }
        }
        childBody.className = parentBody.className;
        const container = doc.getElementById('ve-root');
        react_dom__WEBPACK_IMPORTED_MODULE_8__.render(react__WEBPACK_IMPORTED_MODULE_7__.createElement(_components_VariableExplorerApp__WEBPACK_IMPORTED_MODULE_5__.VariableExplorerApp, {
            commManager: this._commManager,
            autoDetach: false
        }), container);
        this._root = container;
        this._pollTimer = window.setInterval(() => {
            if (this._externalWindow && this._externalWindow.closed) {
                this._cleanup();
            }
        }, 500);
        this._externalWindow.addEventListener('beforeunload', () => {
            this._cleanup();
        });
    }
    _cleanup() {
        if (this._pollTimer !== null) {
            window.clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
        if (this._root) {
            try {
                react_dom__WEBPACK_IMPORTED_MODULE_8__.unmountComponentAtNode(this._root);
            }
            catch ( /* */_a) { /* */ }
            this._root = null;
        }
        this._externalWindow = null;
    }
}
const plugin = {
    id: PLUGIN_ID,
    description: 'A Spyder/Stata-grade variable explorer for JupyterLab',
    autoStart: true,
    requires: [_jupyterlab_notebook__WEBPACK_IMPORTED_MODULE_0__.INotebookTracker],
    optional: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_2__.ICommandPalette, _jupyterlab_console__WEBPACK_IMPORTED_MODULE_1__.IConsoleTracker],
    activate: (app, notebookTracker, palette, consoleTracker) => {
        console.log('Variable Explorer extension activated');
        const manager = new VariableExplorerManager();
        const connectToKernel = async (kernel) => {
            if (!kernel)
                return;
            try {
                await manager.commManager.connect(kernel);
            }
            catch (e) {
                console.error('Variable Explorer: Failed to connect to kernel', e);
            }
        };
        notebookTracker.currentChanged.connect(async (_, notebook) => {
            if (!notebook)
                return;
            const session = notebook.sessionContext;
            session.ready.then(() => {
                var _a;
                connectToKernel((_a = session.session) === null || _a === void 0 ? void 0 : _a.kernel);
            });
            session.kernelChanged.connect((_, args) => {
                if (args.newValue) {
                    connectToKernel(args.newValue);
                }
            });
        });
        if (consoleTracker) {
            consoleTracker.currentChanged.connect(async (_, consolePanel) => {
                if (!consolePanel)
                    return;
                const session = consolePanel.sessionContext;
                session.ready.then(() => {
                    var _a;
                    connectToKernel((_a = session.session) === null || _a === void 0 ? void 0 : _a.kernel);
                });
                session.kernelChanged.connect((_, args) => {
                    if (args.newValue) {
                        connectToKernel(args.newValue);
                    }
                });
            });
        }
        // Register command — the schema declares this as a toolbar button + menu item
        app.commands.addCommand(COMMAND_ID, {
            label: 'Variable Explorer',
            caption: 'Open Variable Explorer in a separate window',
            icon: _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_3__.spreadsheetIcon,
            execute: () => {
                var _a;
                manager.open();
                const currentNotebook = notebookTracker.currentWidget;
                if (currentNotebook) {
                    const kernel = (_a = currentNotebook.sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel;
                    connectToKernel(kernel);
                }
            }
        });
        if (palette) {
            palette.addItem({
                command: COMMAND_ID,
                category: 'Variable Explorer'
            });
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ },

/***/ "./lib/utils/colorScales.js"
/*!**********************************!*\
  !*** ./lib/utils/colorScales.js ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   booleanColor: () => (/* binding */ booleanColor),
/* harmony export */   numericHeatmap: () => (/* binding */ numericHeatmap)
/* harmony export */ });
/** Color scale utilities for conditional formatting */
function numericHeatmap(value, min, max) {
    if (value == null || isNaN(value))
        return 'transparent';
    const range = max - min;
    if (range === 0)
        return 'rgba(100, 149, 237, 0.15)';
    const t = Math.max(0, Math.min(1, (value - min) / range));
    // Blue (cold) → transparent (mid) → Red (hot)
    if (t < 0.5) {
        const s = 1 - t * 2; // 1..0
        return `rgba(66, 133, 244, ${(s * 0.25).toFixed(3)})`;
    }
    const s = (t - 0.5) * 2; // 0..1
    return `rgba(234, 67, 53, ${(s * 0.25).toFixed(3)})`;
}
function booleanColor(value) {
    if (value === true || value === 1) {
        return 'rgba(52, 168, 83, 0.7)'; // Green
    }
    if (value === false || value === 0) {
        return 'rgba(66, 133, 244, 0.7)'; // Blue
    }
    return 'rgba(128, 128, 128, 0.3)'; // Gray for null
}


/***/ },

/***/ "./lib/utils/histogramRenderer.js"
/*!****************************************!*\
  !*** ./lib/utils/histogramRenderer.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   drawHistogram: () => (/* binding */ drawHistogram)
/* harmony export */ });
/** Canvas-based mini histogram rendering for column headers */
function drawHistogram(canvas, data) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    switch (data.type) {
        case 'numeric':
            drawNumericHistogram(ctx, w, h, data);
            break;
        case 'categorical':
            drawCategoricalHistogram(ctx, w, h, data);
            break;
        case 'boolean':
            drawBooleanBar(ctx, w, h, data);
            break;
    }
}
function drawNumericHistogram(ctx, w, h, data) {
    const { counts } = data;
    if (counts.length === 0)
        return;
    const maxCount = Math.max(...counts);
    if (maxCount === 0)
        return;
    const barWidth = w / counts.length;
    const padding = 1;
    // Get computed style for theming
    const style = getComputedStyle(document.documentElement);
    const barColor = style.getPropertyValue('--jp-brand-color1').trim() || '#1976d2';
    for (let i = 0; i < counts.length; i++) {
        const barHeight = (counts[i] / maxCount) * (h - 2);
        const x = i * barWidth + padding / 2;
        const y = h - barHeight - 1;
        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, barWidth - padding, barHeight);
    }
    ctx.globalAlpha = 1.0;
}
function drawCategoricalHistogram(ctx, w, h, data) {
    const { counts } = data;
    if (counts.length === 0)
        return;
    const maxCount = Math.max(...counts);
    if (maxCount === 0)
        return;
    const barHeight = h / Math.min(counts.length, 8);
    const padding = 1;
    const colors = [
        '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
        '#c62828', '#00838f', '#4e342e', '#546e7a'
    ];
    for (let i = 0; i < Math.min(counts.length, 8); i++) {
        const barWidth = (counts[i] / maxCount) * (w - 2);
        const y = i * barHeight + padding / 2;
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.6;
        ctx.fillRect(1, y, barWidth, barHeight - padding);
    }
    ctx.globalAlpha = 1.0;
}
function drawBooleanBar(ctx, w, h, data) {
    const total = data.trueCount + data.falseCount + data.nullCount;
    if (total === 0)
        return;
    const trueWidth = (data.trueCount / total) * w;
    const falseWidth = (data.falseCount / total) * w;
    const barY = h * 0.2;
    const barH = h * 0.6;
    // True (green)
    ctx.fillStyle = 'rgba(52, 168, 83, 0.7)';
    ctx.fillRect(0, barY, trueWidth, barH);
    // False (blue)
    ctx.fillStyle = 'rgba(66, 133, 244, 0.7)';
    ctx.fillRect(trueWidth, barY, falseWidth, barH);
    // Null (gray)
    if (data.nullCount > 0) {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.4)';
        ctx.fillRect(trueWidth + falseWidth, barY, w - trueWidth - falseWidth, barH);
    }
}


/***/ },

/***/ "./lib/utils/stylesheetCloner.js"
/*!***************************************!*\
  !*** ./lib/utils/stylesheetCloner.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cloneStylesheets: () => (/* binding */ cloneStylesheets)
/* harmony export */ });
/** Clone stylesheets from the main document to a detached window */
function cloneStylesheets(source, target) {
    var _a;
    // Copy <link> stylesheets
    const links = source.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
        const clone = target.createElement('link');
        clone.rel = 'stylesheet';
        clone.href = link.href;
        target.head.appendChild(clone);
    });
    // Copy <style> elements
    const styles = source.querySelectorAll('style');
    styles.forEach(style => {
        const clone = target.createElement('style');
        clone.textContent = style.textContent;
        target.head.appendChild(clone);
    });
    // Copy inline style sheets that might be injected by webpack
    for (let i = 0; i < source.styleSheets.length; i++) {
        const sheet = source.styleSheets[i];
        if (!sheet.href && ((_a = sheet.ownerNode) === null || _a === void 0 ? void 0 : _a.nodeName) === 'STYLE') {
            // Already copied above via querySelectorAll('style')
            continue;
        }
        try {
            // Try to access cssRules (may fail for cross-origin sheets)
            if (sheet.cssRules) {
                let cssText = '';
                for (let j = 0; j < sheet.cssRules.length; j++) {
                    cssText += sheet.cssRules[j].cssText + '\n';
                }
                if (cssText && !sheet.href) {
                    const styleEl = target.createElement('style');
                    styleEl.textContent = cssText;
                    target.head.appendChild(styleEl);
                }
            }
        }
        catch (_b) {
            // Cross-origin stylesheet — skip
        }
    }
    // Copy body data attributes for theme detection
    const bodyAttrs = source.body.attributes;
    for (let i = 0; i < bodyAttrs.length; i++) {
        const attr = bodyAttrs[i];
        if (attr.name.startsWith('data-jp-')) {
            target.body.setAttribute(attr.name, attr.value);
        }
    }
}


/***/ }

}]);
//# sourceMappingURL=lib_index_js.eae18ac739a59d349dae.js.map