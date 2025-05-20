// Helper function to escape CSV cell content
const escapeCsvCell = (cell) => {
  if (cell === null || cell === undefined) {
    return '';
  }
  const cellString = String(cell);
  // If the cell contains a comma, newline, or double quote, enclose it in double quotes
  // and escape any existing double quotes by doubling them.
  if (cellString.includes(',') || cellString.includes('\n') || cellString.includes('"')) {
    return `"${cellString.replace(/"/g, '""')}"`;
  }
  return cellString;
};

export const exportToCsv = (filename, headers, dataRows) => {
  // dataRows is an array of arrays, where each inner array represents a row
  // and its elements correspond to the headers.

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...dataRows.map(row => row.map(escapeCsvCell).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM to ensure Excel opens UTF-8 correctly
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};