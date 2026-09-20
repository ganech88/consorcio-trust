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

// Líneas del encabezado de la administración (white-label + datos Ley 941).
function adminHeaderLines(consortium = {}) {
  return [
    consortium.admin_name,
    consortium.admin_rpa_license ? `Matrícula RPA N° ${consortium.admin_rpa_license}` : null,
    consortium.admin_cuit ? `CUIT ${consortium.admin_cuit}` : null,
    consortium.admin_phone,
    consortium.admin_email,
    consortium.admin_address,
  ].filter(Boolean);
}

async function qrDataUrl(text) {
  try {
    const QR = await import('qrcode');
    return await QR.toDataURL(text, { margin: 0, width: 220 });
  } catch { return null; }
}

function periodLabel(period) {
  if (!period) return '';
  const [y, m] = String(period).split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

/**
 * Liquidación de expensas con el contenido que exige la Ley 941 (CABA) y su
 * reglamentación: datos del consorcio y de la administración (matrícula RPA,
 * CUIT), período y vencimiento, detalle de egresos con proveedor/concepto/fecha/
 * importe y comprobante respaldatorio, totales por rubro, prorrateo por unidad
 * según coeficiente con estado de pago, cuenta bancaria del consorcio y un QR
 * que lleva a la documentación digital (comprobantes) en la app.
 */
export async function generateLiquidacionPdf({ period, items = [], egresos = [], consortium = {}, appUrl = window.location.origin }) {
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
  doc.setFontSize(9); doc.setTextColor(70);
  adminHeaderLines(consortium).forEach((t, i) => doc.text(String(t), 196, y + 4 + i * 4.5, { align: 'right' }));

  y += 30;
  doc.setDrawColor(210); doc.line(M, y, 196, y); y += 9;

  doc.setFontSize(15); doc.setTextColor(20); doc.setFont('helvetica', 'bold');
  doc.text(`Liquidación de expensas - ${periodLabel(period.period)}`, M, y);
  y += 8;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(70);
  const info = [
    consortium.name ? `Consorcio: ${consortium.name}${consortium.cuit ? ` - CUIT ${consortium.cuit}` : ''}` : null,
    consortium.address ? `Domicilio: ${consortium.address}${consortium.city ? `, ${consortium.city}` : ''}` : null,
    `Período: ${period.period}   Vencimiento: ${period.due_date ? new Date(period.due_date + 'T00:00:00').toLocaleDateString('es-AR') : '-'}   Emitida: ${new Date().toLocaleDateString('es-AR')}`,
    consortium.late_interest_monthly_pct > 0 ? `Interés por mora: ${consortium.late_interest_monthly_pct}% mensual${consortium.late_interest_grace_days > 0 ? ` (a partir de ${consortium.late_interest_grace_days} días del vencimiento)` : ''}` : null,
  ].filter(Boolean);
  info.forEach((t) => { doc.text(t, M, y); y += 5; });

  // QR a la documentación digital
  const qrUrl = `${appUrl}/expensas?periodo=${encodeURIComponent(period.period)}`;
  const qr = await qrDataUrl(qrUrl);
  if (qr) {
    try { doc.addImage(qr, 'PNG', 168, y - 2, 28, 28); } catch { /* ignore */ }
    doc.setFontSize(7); doc.text('Comprobantes digitales', 182, y + 30, { align: 'center' });
  }
  y += 6;

  // Egresos del período
  const total = egresos.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCat = {};
  for (const e of egresos) byCat[e.category || 'Otros'] = (byCat[e.category || 'Otros'] || 0) + (Number(e.amount) || 0);

  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
  doc.text('Detalle de egresos', M, y); y += 3;
  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Rubro', 'Proveedor / Concepto', 'Comp.', 'Importe']],
    body: egresos.map(e => [
      e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR') : '-',
      e.category || 'Otros',
      [e.provider, e.description].filter(Boolean).join(' - '),
      e.receipt_url ? 'Sí' : 'No',
      money(e.amount),
    ]),
    foot: [['', '', '', 'Total', money(total)]],
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 3: { cellWidth: 14, halign: 'center' }, 4: { cellWidth: 28, halign: 'right' } },
    margin: { left: M, right: M },
  });
  y = (doc.lastAutoTable?.finalY || y) + 8;

  // Totales por rubro
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (cats.length) {
    autoTable(doc, {
      startY: y,
      head: [['Rubro', '%', 'Importe']],
      body: cats.map(([c, v]) => [c, total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '-', money(v)]),
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 32 } },
      margin: { left: M, right: 100 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  // Prorrateo por unidad
  const liquidado = Number(period.total_amount) || 0;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
  doc.text(`Prorrateo por unidad (total liquidado ${money(liquidado)})`, M, y); y += 3;
  const STATUS = { paid: 'Pagada', reported: 'Informada', pending: 'Pendiente' };
  autoTable(doc, {
    startY: y,
    head: [['Unidad', 'Titular', 'Coef. %', 'Importe', 'Estado']],
    body: items.map(it => [
      it.unit_id ?? '',
      it.profiles?.full_name || '-',
      it.coefficient != null ? Number(it.coefficient).toFixed(2) : (liquidado > 0 ? ((Number(it.amount) / liquidado) * 100).toFixed(2) : '-'),
      money(it.amount),
      STATUS[it.status] || it.status,
    ]),
    foot: [['', 'Total', items.reduce((s, i) => s + (Number(i.coefficient) || 0), 0).toFixed(2), money(items.reduce((s, i) => s + (Number(i.amount) || 0), 0)), '']],
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: M, right: M },
  });
  y = (doc.lastAutoTable?.finalY || y) + 10;

  // Cuenta bancaria del consorcio (Ley 941: fondos en cuenta a nombre del consorcio)
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(70);
  const bank = [
    consortium.bank_account_label || (consortium.payment_holder ? `Cuenta a nombre de: ${consortium.payment_holder}` : null),
    consortium.payment_bank ? `Banco/Billetera: ${consortium.payment_bank}` : null,
    consortium.payment_cbu ? `CBU/CVU: ${consortium.payment_cbu}` : null,
    consortium.payment_alias ? `Alias: ${consortium.payment_alias}` : null,
  ].filter(Boolean);
  if (bank.length) {
    doc.setFont('helvetica', 'bold'); doc.text('Medios de pago', M, y); y += 5; doc.setFont('helvetica', 'normal');
    bank.forEach(t => { doc.text(t, M, y); y += 4.5; });
    y += 3;
  }
  const legal = 'La presente liquidación se emite conforme a la Ley 941 (CABA) y su reglamentación. La documentación respaldatoria de cada egreso está a disposición de los copropietarios en la administración y en formato digital a través del código QR.';
  doc.setFontSize(8); doc.setTextColor(110);
  doc.text(doc.splitTextToSize(legal, 182), M, y); y += 14;

  const sign = await loadImage(consortium.admin_signature_url);
  const sx = 130;
  if (sign) { try { doc.addImage(sign.data, 'PNG', sx, y - 16, 42, 16); } catch { /* ignore */ } }
  doc.setDrawColor(120); doc.line(sx, y, sx + 52, y); y += 5;
  doc.setFontSize(9); doc.setTextColor(70);
  doc.text(consortium.admin_name || 'Administración', sx, y);
  if (consortium.admin_rpa_license) doc.text(`Matrícula RPA N° ${consortium.admin_rpa_license}`, sx, y + 4.5);

  doc.save(`liquidacion-${period.period}.pdf`);
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
  adminHeaderLines(consortium)
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
