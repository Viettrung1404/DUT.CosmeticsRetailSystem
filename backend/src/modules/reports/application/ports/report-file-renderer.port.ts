export const REPORT_FILE_RENDERER = Symbol('IReportFileRenderer');

export type BinaryReportFormat = 'xlsx' | 'pdf';

export interface ReportTable {
  title: string;
  headers: string[];
  rows: unknown[][];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  tables: ReportTable[];
}

export interface IReportFileRenderer {
  render(document: ReportDocument, format: BinaryReportFormat): Promise<Buffer>;
}
