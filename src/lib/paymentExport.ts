import jsPDF from 'jspdf';
import { write, utils } from 'xlsx';
import { PaymentProof, PaymentStats } from './paymentStats';

export function exportToCSV(proofs: PaymentProof[], stats: PaymentStats) {
  const csvData = [
    ['REPORTE DE PAGOS'],
    ['Fecha de generación:', new Date().toLocaleDateString('es-ES')],
    [],
    ['RESUMEN DE ESTADÍSTICAS'],
    ['Ingresos Totales:', `$${stats.totalIncome.toFixed(2)}`],
    ['Pagos Aprobados:', `${stats.approvedCount} pagos - $${stats.approvedAmount.toFixed(2)}`],
    ['Pagos Pendientes:', `${stats.pendingCount} pagos - $${stats.pendingAmount.toFixed(2)}`],
    ['Pagos Rechazados:', stats.rejectedCount],
    ['Tasa de Aprobación:', `${stats.approvalRate.toFixed(2)}%`],
    ['Promedio por Pago:', `$${stats.averagePayment.toFixed(2)}`],
    [],
    ['DETALLES DE PAGOS'],
    ['Empresa', 'Plan', 'Monto', 'Método', 'Estado', 'Fecha'],
    ...proofs.map((proof) => [
      proof.company_name || 'Desconocida',
      proof.plan,
      `$${proof.plan_price}`,
      proof.payment_method,
      proof.status,
      new Date(proof.created_at).toLocaleDateString('es-ES'),
    ]),
  ];

  const ws = utils.aoa_to_sheet(csvData);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Pagos');
  write(wb, { bookType: 'xlsx', type: 'file', fileName: 'reporte-pagos.xlsx' });
}

export function exportToPDF(proofs: PaymentProof[], stats: PaymentStats) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('REPORTE DE PAGOS', margin, yPosition + 12);

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin - 40, yPosition + 12);

  doc.setTextColor(0, 0, 0);
  yPosition += 40;

  // Stats Cards
  const cardWidth = (pageWidth - 2 * margin - 9) / 3;
  const cardHeight = 22;

  const statCards = [
    { label: 'Ingresos Totales', value: `$${stats.totalIncome.toFixed(2)}`, color: [52, 211, 153] },
    { label: 'Pagos Aprobados', value: `${stats.approvedCount}`, color: [59, 130, 246] },
    { label: 'Tasa Aprobación', value: `${stats.approvalRate.toFixed(1)}%`, color: [251, 191, 36] },
  ];

  statCards.forEach((card, index) => {
    const xPos = margin + index * (cardWidth + 3);
    doc.setFillColor(...card.color);
    doc.rect(xPos, yPosition, cardWidth, cardHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(card.label, xPos + 3, yPosition + 7);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(card.value, xPos + 3, yPosition + 17);

    doc.setFont(undefined, 'normal');
  });

  yPosition += 30;

  // Detailed stats
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Estadísticas Detalladas', margin, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  const detailedStats = [
    `Pagos Pendientes: ${stats.pendingCount} pagos ($${stats.pendingAmount.toFixed(2)})`,
    `Pagos Rechazados: ${stats.rejectedCount}`,
    `Promedio por Pago: $${stats.averagePayment.toFixed(2)}`,
    `Total de Transacciones: ${proofs.length}`,
  ];

  detailedStats.forEach((stat) => {
    doc.text(stat, margin, yPosition);
    yPosition += 6;
  });

  yPosition += 10;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(240, 240, 240);

  const tableY = yPosition;
  const colWidths = [35, 20, 20, 30, 20, 25];
  const headers = ['Empresa', 'Plan', 'Monto', 'Método', 'Estado', 'Fecha'];

  let xPos = margin;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  doc.rect(margin, tableY - 4, totalWidth, 8, 'F');

  xPos = margin;
  headers.forEach((header, i) => {
    doc.text(header, xPos + 2, tableY + 5);
    xPos += colWidths[i];
  });

  yPosition += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  proofs.slice(0, 15).forEach((proof) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }

    // Limpiar método de pago de caracteres especiales
    let method = proof.payment_method || 'N/A';
    // Remover caracteres especiales que causan problemas
    method = method.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!method) method = proof.payment_method;

    const row = [
      (proof.company_name || 'Desconocida').substring(0, 18),
      proof.plan.substring(0, 10),
      `$${proof.plan_price}`,
      method.substring(0, 12),
      proof.status.substring(0, 8),
      new Date(proof.created_at).toLocaleDateString('es-ES'),
    ];

    xPos = margin;
    row.forEach((cell, i) => {
      doc.text(cell.toString(), xPos + 2, yPosition);
      xPos += colWidths[i];
    });

    yPosition += 7;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Atensia - Reporte de Pagos', pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save('reporte-pagos.pdf');
}
