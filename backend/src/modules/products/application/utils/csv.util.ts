// Trả về từng dòng là mảng ô; bỏ BOM, bỏ dòng trống, hỗ trợ ô trong nháy kép (có dấu phẩy, xuống dòng, "")
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let wasQuoted = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
    wasQuoted = false;
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '' && !wasQuoted) {
      quoted = true;
      wasQuoted = true;
    } else if (ch === ',') {
      endCell();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error('UNTERMINATED_QUOTE');
  if (cell !== '' || row.length) endRow();
  return rows;
}

const escapeCell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function buildCsv(rows: string[][]): string {
  return '﻿' + rows.map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}
