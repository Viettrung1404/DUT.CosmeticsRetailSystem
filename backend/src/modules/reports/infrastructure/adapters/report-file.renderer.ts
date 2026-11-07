import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  BinaryReportFormat,
  IReportFileRenderer,
  ReportDocument,
} from '../../application/ports/report-file-renderer.port';
import { toVnDay } from '../../application/utils/report-calculations';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfsFonts: Record<string, string> = require('pdfmake/build/vfs_fonts');

// Bảng quá dài làm PDF chậm và không đọc nổi; xem đủ dữ liệu thì xuất Excel
export const PDF_MAX_ROWS = 1000;
const SHEET_NAME_MAX = 31;

const font = (name: string) => Buffer.from(vfsFonts[name], 'base64');

const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

const toCell = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return toVnDay(value);
  return typeof value === 'number' ? value : String(value);
};

const toText = (value: unknown): string => {
  const cell = toCell(value);
  if (cell === null) return '';
  return typeof cell === 'number' ? cell.toLocaleString('vi-VN') : cell;
};

const sheetName = (title: string, index: number, used: Set<string>) => {
  const clean = title.replace(/[\\/*?:[\]]/g, ' ').slice(0, SHEET_NAME_MAX);
  const name = used.has(clean) ? `${clean.slice(0, SHEET_NAME_MAX - 3)} ${index + 1}` : clean;
  used.add(name);
  return name;
};

@Injectable()
export class ReportFileRenderer implements IReportFileRenderer {
  render(document: ReportDocument, format: BinaryReportFormat): Promise<Buffer> {
    return format === 'xlsx' ? this.xlsx(document) : this.pdf(document);
  }

  private async xlsx(document: ReportDocument): Promise<Buffer> {
    const workbook = new Workbook();
    const used = new Set<string>();
    document.tables.forEach((table, index) => {
      const sheet = workbook.addWorksheet(sheetName(table.title, index, used));
      sheet.addRow([document.title]).font = { bold: true, size: 14 };
      sheet.addRow([document.subtitle]);
      sheet.addRow([]);
      sheet.addRow(table.headers).font = { bold: true };
      table.rows.forEach((row) => sheet.addRow(row.map(toCell)));
      sheet.views = [{ state: 'frozen', ySplit: 4 }];
      table.headers.forEach((header, column) => {
        const longest = table.rows.reduce(
          (max, row) => Math.max(max, toText(row[column]).length),
          header.length,
        );
        sheet.getColumn(column + 1).width = Math.min(45, longest + 2);
      });
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private pdf(document: ReportDocument): Promise<Buffer> {
    const content: Content[] = [
      { text: document.title, fontSize: 15, bold: true },
      { text: document.subtitle, margin: [0, 2, 0, 10] },
    ];
    for (const table of document.tables) {
      const rows = table.rows.slice(0, PDF_MAX_ROWS);
      content.push({ text: table.title, bold: true, margin: [0, 8, 0, 4] });
      content.push({
        table: {
          headerRows: 1,
          widths: table.headers.map(() => '*'),
          body: [
            table.headers.map((text) => ({ text, bold: true })),
            ...rows.map((row) => table.headers.map((_, i) => toText(row[i]))),
          ],
        },
        layout: 'lightHorizontalLines',
      });
      if (table.rows.length > rows.length) {
        content.push({
          text: `Chỉ hiển thị ${rows.length}/${table.rows.length} dòng, xuất Excel để xem đầy đủ`,
          italics: true,
          margin: [0, 4, 0, 0],
        });
      }
    }
    const definition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      defaultStyle: { font: 'Roboto', fontSize: 8 },
      content,
    };
    return new Promise((resolve, reject) => {
      const pdf = printer.createPdfKitDocument(definition);
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
      pdf.end();
    });
  }
}
