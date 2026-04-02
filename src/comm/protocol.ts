/** Comm protocol message types between frontend and kernel */

// ============ Shared Types ============

export interface ISortItem {
  colId: string;
  sort: 'asc' | 'desc';
}

// ============ Frontend → Kernel ============

export type FrontendMessage =
  | IRefreshMsg
  | IGetDataMsg
  | IGetStatsMsg
  | IGetPropertiesMsg
  | IEditCellMsg
  | ISqlExecuteMsg
  | ISqlTablesMsg;

export interface IRefreshMsg {
  type: 'refresh';
}

export interface IGetDataMsg {
  type: 'get_data';
  variable: string;
  startRow: number;
  endRow: number;
  sortModel?: ISortItem[];
  childKey?: string;
}

export interface IGetStatsMsg {
  type: 'get_stats';
  variable: string;
  childKey?: string;
}

export interface IGetPropertiesMsg {
  type: 'get_properties';
  variable: string;
}

export interface IEditCellMsg {
  type: 'edit_cell';
  variable: string;
  rowIndex: number;
  column: string;
  newValue: string;
}

export interface ISqlExecuteMsg {
  type: 'sql_execute';
  query: string;
  saveAs?: string;
}

export interface ISqlTablesMsg {
  type: 'sql_tables';
}

// ============ Kernel → Frontend ============

export type KernelMessage =
  | IVariableListMsg
  | IDataPageMsg
  | IColumnStatsMsg
  | IPropertiesMsg
  | IEditResultMsg
  | ISqlResultMsg
  | ISqlErrorMsg
  | ISqlTablesResultMsg
  | IErrorMsg;

export interface IVariableListMsg {
  type: 'variable_list';
  variables: IVariableSummary[];
}

export interface IVariableSummary {
  name: string;
  typeName: string;
  shape: number[];
  memoryBytes: number;
  shortRepr: string;
  isTabular: boolean;
  tabularKind: string;
  childCount: number;
}

export interface IDataPageMsg {
  type: 'data_page';
  variable: string;
  startRow: number;
  totalRows: number;
  columns: IColumnDef[];
  rows: Record<string, any>[];
}

export interface IColumnDef {
  name: string;
  dtype: string;
  isNumeric: boolean;
  isBool: boolean;
  isDatetime: boolean;
}

export interface IColumnStatsMsg {
  type: 'column_stats';
  variable: string;
  stats: IColumnStats[];
}

export interface IColumnStats {
  name: string;
  dtype: string;
  nullCount: number;
  uniqueCount: number;
  histogram?: INumericHistogram | ICategoricalHistogram | IBooleanHistogram;
}

export interface INumericHistogram {
  type: 'numeric';
  counts: number[];
  edges: number[];
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface ICategoricalHistogram {
  type: 'categorical';
  labels: string[];
  counts: number[];
}

export interface IBooleanHistogram {
  type: 'boolean';
  trueCount: number;
  falseCount: number;
  nullCount: number;
}

export interface IPropertiesMsg {
  type: 'properties';
  variable: string;
  shape: number[];
  memoryBytes: number;
  dtypes: Record<string, string>;
  indexName: string;
  indexDtype: string;
  sourceFile: string | null;
}

export interface IEditResultMsg {
  type: 'edit_result';
  success: boolean;
  variable: string;
  rowIndex: number;
  column: string;
  error?: string;
}

export interface IErrorMsg {
  type: 'error';
  message: string;
  requestType?: string;
}

export interface ISqlResultMsg {
  type: 'sql_result';
  columns: IColumnDef[];
  rows: Record<string, any>[];
  totalRows: number;
  displayedRows: number;
  tables: string[];
  savedAs: string | null;
}

export interface ISqlErrorMsg {
  type: 'sql_error';
  error: string;
}

export interface ISqlTablesResultMsg {
  type: 'sql_tables';
  tables: ISqlTableInfo[];
  duckdbAvailable: boolean;
}

export interface ISqlTableInfo {
  name: string;
  rows: number;
  columns: number;
  columnNames: string[];
}

// Union of all messages the frontend can receive
export type ICommMessage = KernelMessage;
