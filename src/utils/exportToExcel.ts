import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    return;
  }
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
