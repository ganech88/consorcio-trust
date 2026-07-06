/**
 * Utilidades de exportación a Excel y PDF.
 * xlsx se importa dinámicamente para no impactar el bundle inicial.
 */

/**
 * Anti formula-injection: Excel/Sheets interpretan como fórmula las celdas
 * que empiezan con =, +, - o @. Prefijamos con apóstrofe para neutralizarlas
 * (el apóstrofe fuerza texto plano en planillas y no altera el valor visible).
 * @param {*} value - Valor de la celda
 * @returns {*} Valor saneado
 */
function sanitizeCellValue(value) {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

/**
 * Exporta un array de objetos a un archivo .xlsx y lo descarga.
 * @param {object[]} data - Array de filas
 * @param {{ header: string, key: string }[]} columns - Definición de columnas
 * @param {string} fileName - Nombre del archivo sin extensión
 * @param {string} [sheetName='Datos'] - Nombre de la hoja
 */
export async function exportToExcel(data, columns, fileName, sheetName = 'Datos') {
  const XLSX = await import('xlsx');

  const rows = data.map(row =>
    columns.reduce((acc, col) => {
      acc[col.header] = sanitizeCellValue(row[col.key] ?? '');
      return acc;
    }, {})
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Exporta a PDF usando jsPDF + autoTable y descarga el archivo.
 * @param {object[]} data - Array de filas
 * @param {{ header: string, key: string }[]} columns - Definición de columnas
 * @param {string} title - Título del documento
 * @param {string} fileName - Nombre del archivo sin extensión
 */
export async function exportToPdf(data, columns, title, fileName) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 34,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => row[c.key] ?? '')),
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  doc.save(`${fileName}.pdf`);
}
