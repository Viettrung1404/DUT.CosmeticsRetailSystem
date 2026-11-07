import { Workbook } from 'exceljs';
import { ReportDocument } from '../../../application/ports/report-file-renderer.port';
import { PDF_MAX_ROWS, ReportFileRenderer } from '../report-file.renderer';

const document = (rowCount = 2): ReportDocument => ({
  title: 'Báo cáo doanh thu',
  subtitle: 'Từ 2026-10-01 đến 2026-10-31',
  tables: [
    {
      title: 'Theo kỳ',
      headers: ['Kỳ', 'Doanh thu', 'Ngày'],
      rows: Array.from({ length: rowCount }, (_, i) => [
        `Kỳ ${i}`,
        1234567.5,
        new Date('2026-10-30T20:00:00Z'),
      ]),
    },
    { title: 'Theo kỳ', headers: ['Công thức'], rows: [['=1+1']] },
  ],
});

describe('ReportFileRenderer', () => {
  const renderer = new ReportFileRenderer();

  it('Excel: tiếng Việt đúng, số giữ dạng số, ngày theo giờ VN, không biến chuỗi thành công thức', async () => {
    const file = await renderer.render(document(), 'xlsx');
    const workbook = new Workbook();
    await workbook.xlsx.load(file as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(['Theo kỳ', 'Theo kỳ 2']);
    const sheet = workbook.worksheets[0];
    expect(sheet.getCell('A1').value).toBe('Báo cáo doanh thu');
    expect(sheet.getCell('B4').value).toBe('Doanh thu');
    expect(sheet.getCell('B5').value).toBe(1234567.5);
    expect(sheet.getCell('C5').value).toBe('2026-10-31');
    expect(workbook.worksheets[1].getCell('A5').value).toBe('=1+1');
  });

  it('PDF: sinh file hợp lệ', async () => {
    const file = await renderer.render(document(), 'pdf');
    expect(file.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('PDF: bảng quá dài bị cắt để không treo server', async () => {
    const file = await renderer.render(document(PDF_MAX_ROWS + 5), 'pdf');
    expect(file.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30000);
});
