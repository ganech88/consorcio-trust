// Genera el PDF de certificado de deuda / intimación de pago de una unidad.
// Reusa jsPDF + autoTable (import dinámico) como en lib/export-utils, e incluye
// el logo, datos y firma de la administración (white-label) si están cargados.

function money(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n) || 0);
}

// Carga una imagen remota a dataURL (best-effort; si CORS falla devuelve null).
function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve({ data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateDebtPdf({ kind = 'certificado', unit, ownerName, movements = [], consortium = {} }) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const M = 14;
  let y = 16;

  const logo = await loadImage(consortium.admin_logo_url);
  if (logo) {
    const w = 28;
    const h = logo.w ? Math.min((logo.h / logo.w) * w, 20) : 14;
    try { doc.addImage(logo.data, 'PNG', M, y, w, h); } catch { /* ignore */ }
  }
  doc.setFontSize(10); doc.setTextColor(70);
  [consortium.admin_name, consortium.admin_phone, consortium.admin_address]
    .filter(Boolean)
    .forEach((t, i) => doc.text(String(t), 196, y + 4 + i * 5, { align: 'right' }));

  y += 26;
  doc.setDrawColor(210); doc.line(M, y, 196, y); y += 10;

  doc.setFontSize(15); doc.setTextColor(20); doc.setFont('helvetica', 'bold');
  doc.text(kind === 'intimacion' ? 'Intimación de pago' : 'Certificado de deuda', M, y);
  y += 9;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(70);
  if (consortium.name) { doc.text(`Consorcio: ${consortium.name}`, M, y); y += 5; }
  if (consortium.address) { doc.text(`Direccion: ${consortium.address}`, M, y); y += 5; }
  doc.text(`Unidad: ${unit?.name || ''}${ownerName ? '  -  ' + ownerName : ''}`, M, y); y += 5;
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, M, y); y += 8;

  const pend = movements.filter(m => m.status !== 'paid');
  const total = pend.reduce((s, m) => s + (Number(m.amount) || 0), 0);

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Fecha', 'Importe']],
    body: pend.map(m => [m.label, m.date ? new Date(m.date).toLocaleDateString('es-AR') : '-', money(m.amount)]),
    foot: [['', 'Total adeudado', money(total)]],
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 2: { halign: 'right' } },
  });

  let endY = (doc.lastAutoTable?.finalY || y) + 12;

  if (kind === 'intimacion') {
    doc.setFontSize(9); doc.setTextColor(70);
    const txt = `Se intima al pago de la suma adeudada de ${money(total)} dentro de los 10 (diez) dias corridos de recibida la presente. Vencido dicho plazo sin regularizar la deuda, se procedera conforme a derecho y al reglamento de copropiedad.`;
    doc.text(doc.splitTextToSize(txt, 182), M, endY);
    endY += 24;
  }

  const sign = await loadImage(consortium.admin_signature_url);
  const sx = 130;
  if (sign) { try { doc.addImage(sign.data, 'PNG', sx, endY - 16, 42, 16); } catch { /* ignore */ } }
  doc.setDrawColor(120); doc.line(sx, endY, sx + 52, endY); endY += 5;
  doc.setFontSize(9); doc.setTextColor(70);
  doc.text(consortium.admin_name || 'Administracion', sx, endY);

  doc.save(`${kind}-${unit?.name || 'unidad'}.pdf`);
}
