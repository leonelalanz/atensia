import jsPDF from 'jspdf';

export function generateInvoicePDF(invoice: {
  invoiceNumber: string;
  companyName: string;
  companyEmail?: string;
  clientName: string;
  plan: string;
  amount: number;
  currency: string;
  issuedDate: string;
  dueDate: string;
}): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // Header
  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('FACTURA', margin, yPosition + 15);

  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, margin, yPosition + 25);

  // Reset colors
  doc.setTextColor(0, 0, 0);

  yPosition += 45;

  // Company info (left) - SOLO ATENSIA
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('De:', margin, yPosition);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  yPosition += 6;
  doc.text('Atensia', margin, yPosition);

  // Client info (right side)
  const clientStartY = yPosition - 6;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('Para:', pageWidth / 2 + 10, clientStartY);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(invoice.clientName, pageWidth / 2 + 10, clientStartY + 6);

  yPosition += 15;

  // Invoice details table
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);

  const detailsStartY = yPosition;
  doc.text('Fecha Emisión:', margin, yPosition);
  doc.setFont(undefined, 'normal');
  doc.text(new Date(invoice.issuedDate).toLocaleDateString('es-ES'), margin + 35, yPosition);

  yPosition += 6;
  doc.setFont(undefined, 'bold');
  doc.text('Fecha Vencimiento:', margin, yPosition);
  doc.setFont(undefined, 'normal');
  doc.text(new Date(invoice.dueDate).toLocaleDateString('es-ES'), margin + 35, yPosition);

  yPosition += 12;

  // Items table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 4, contentWidth, 8, 'F');

  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('Concepto', margin + 2, yPosition);
  doc.text('Cantidad', margin + 90, yPosition);
  doc.text('Precio Unit.', margin + 120, yPosition);
  doc.text('Total', margin + 160, yPosition);

  yPosition += 10;

  // Item row
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const itemDesc = `Plan ${invoice.plan} - ${new Date(invoice.issuedDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
  doc.text(itemDesc, margin + 2, yPosition);
  doc.text('1', margin + 90, yPosition);
  doc.text(`$${invoice.amount.toFixed(2)}`, margin + 120, yPosition);
  doc.text(`$${invoice.amount.toFixed(2)}`, margin + 160, yPosition);

  yPosition += 15;

  // Totals section
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 5;

  // Subtotal
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('SUBTOTAL:', margin + 130, yPosition);
  doc.text(`$${invoice.amount.toFixed(2)}`, pageWidth - margin - 15, yPosition, { align: 'right' });

  yPosition += 6;

  // IVA (21%)
  const iva = invoice.amount * 0.21;
  doc.text('IVA (21%):', margin + 130, yPosition);
  doc.text(`$${iva.toFixed(2)}`, pageWidth - margin - 15, yPosition, { align: 'right' });

  yPosition += 8;

  // Total
  const total = invoice.amount + iva;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setFillColor(37, 99, 235);
  doc.rect(margin + 120, yPosition - 5, 75, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', margin + 130, yPosition + 1);
  doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 15, yPosition + 1, { align: 'right' });

  // Reset color
  doc.setTextColor(0, 0, 0);

  yPosition += 20;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const footerText = 'Esta es una factura electrónica. Gracias por tu negocio.';
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });

  return doc;
}
