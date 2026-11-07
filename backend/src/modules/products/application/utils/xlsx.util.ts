import { Workbook } from 'exceljs';

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'object') return String(value);
  const cell = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
  if (cell.richText) return cell.richText.map((part) => part.text).join('');
  if (cell.text !== undefined) return cellText(cell.text);
  return cellText(cell.result);
};

// File .xlsx là gói zip nên 4 byte đầu luôn là PK\x03\x04
export const isXlsx = (buffer: Buffer): boolean =>
  buffer.length > 4 && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

// Cùng dạng kết quả với parseCsv: mỗi dòng là mảng ô, bỏ dòng trống; chỉ đọc trang tính đầu
export async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const width = sheet.columnCount;
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = Array.from({ length: width }, (_, i) => cellText(row.getCell(i + 1).value));
    if (cells.some((c) => c.trim() !== '')) rows.push(cells);
  });
  return rows;
}

export async function buildXlsx(rows: string[][]): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('San pham');
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  rows[0]?.forEach((header, i) => {
    sheet.getColumn(i + 1).width = Math.max(14, header.length + 2);
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
