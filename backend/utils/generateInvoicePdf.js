const PDFDocument = require('pdfkit');

/**
 * Streams a simple, readable invoice PDF for one order directly to the
 * given writable stream (typically the HTTP response). `order` must have
 * `items.product` populated with at least name/price, and `user` populated
 * with name/email.
 */
function generateInvoicePdf(order, user, res) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('INVOICE', { align: 'right' });
  doc.fontSize(10).fillColor('#555').text(order.invoiceNumber, { align: 'right' });
  doc.moveDown(2);

  doc.fillColor('#000').fontSize(12).text('Billed to:');
  doc.fontSize(10).fillColor('#333').text(user.name).text(user.email);
  doc.moveDown();

  doc.fillColor('#000').fontSize(10);
  doc.text(`Order date: ${new Date(order.createdAt).toLocaleDateString()}`);
  doc.text(`Payment method: ${order.paymentMethod.toUpperCase()}`);
  doc.text(`Status: ${order.status.replace('_', ' ').toUpperCase()}`);
  doc.moveDown();

  // Table header
  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Item', 50, tableTop);
  doc.text('Qty', 300, tableTop);
  doc.text('Price', 370, tableTop);
  doc.text('Subtotal', 450, tableTop);
  doc.font('Helvetica');
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ccc').stroke();

  order.items.forEach((item) => {
    const y = doc.y + 8;
    const name = item.product?.name || 'Product no longer available';
    const variantLabel = item.variant?.size || item.variant?.color
      ? ` (${[item.variant.size, item.variant.color].filter(Boolean).join(' / ')})`
      : '';
    doc.text(`${name}${variantLabel}`, 50, y, { width: 240 });
    doc.text(String(item.quantity), 300, y);
    doc.text(`Rs.${item.priceAtPurchase}`, 370, y);
    doc.text(`Rs.${item.priceAtPurchase * item.quantity}`, 450, y);
    doc.moveDown(1.5);
  });

  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total: Rs.${order.totalAmount}`, { align: 'right' });

  doc.moveDown(3);
  doc.font('Helvetica').fontSize(8).fillColor('#999').text('This is a computer-generated invoice.', { align: 'center' });

  doc.end();
}

module.exports = { generateInvoicePdf };
