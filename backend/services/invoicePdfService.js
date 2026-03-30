import PDFDocument from 'pdfkit';

const formatDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d || '-');
  }
};

const featureLines = (features) => {
  const f = features || {};
  const lines = [];
  if (typeof f.maxListings === 'number') lines.push(`Max listings: ${f.maxListings}`);
  lines.push(f.bookingEnabled ? 'Bookings enabled' : 'Bookings not included');
  if (f.featuredEnabled) lines.push(`Featured listings: up to ${f.maxFeaturedListings || 0}`);
  else lines.push('Featured listings not included');
  lines.push(f.whatsappIntegration ? 'WhatsApp integration' : 'No WhatsApp integration');
  lines.push(f.customDomain ? 'Custom domain' : 'No custom domain');
  lines.push(f.analyticsEnabled ? 'Analytics' : 'No analytics');
  lines.push(f.prioritySupport ? 'Priority support' : 'Standard support');
  if (typeof f.removeWatermark === 'boolean') lines.push(f.removeWatermark ? 'Remove watermark' : 'Watermark included');
  if (typeof f.seoTools === 'boolean') lines.push(f.seoTools ? 'SEO tools' : 'No SEO tools');
  if (typeof f.apiAccess === 'boolean') lines.push(f.apiAccess ? 'API access' : 'No API access');
  return lines;
};

export const streamInvoicePdf = ({ invoice, business, owner }, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fontSize(18).text('ApniDukan', { align: 'left' });
  doc.fontSize(12).fillColor('#444').text('Invoice', { align: 'left' });
  doc.moveDown(0.5);
  doc.fillColor('#000');

  // Invoice meta
  doc.fontSize(11);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
  doc.text(`Invoice Date: ${formatDate(invoice.issuedAt || invoice.createdAt)}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown(0.5);

  // Business / Customer
  doc.fontSize(12).text('Billed To', { underline: true });
  doc.fontSize(11);
  doc.text(business?.name || '-');
  if (business?.email) doc.text(business.email);
  if (business?.phone) doc.text(`Phone: ${business.phone}`);
  if (owner?.email) doc.text(`Owner: ${owner.email}`);
  doc.moveDown(0.5);

  // Plan details
  doc.fontSize(12).text('Plan Details', { underline: true });
  doc.fontSize(11);
  doc.text(`Plan: ${invoice.planSnapshot?.name || '-'}`);
  doc.text(`Duration: ${invoice.planSnapshot?.durationInDays || '-'} days`);
  doc.text(`Period: ${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`);
  doc.moveDown(0.3);
  doc.text(`Amount: ₹${invoice.amount} ${invoice.currency || ''}`);
  doc.moveDown(0.5);

  // Payment details
  doc.fontSize(12).text('Payment Details', { underline: true });
  doc.fontSize(11);
  doc.text(`Provider: ${invoice.paymentProvider || '-'}`);
  if (invoice.payment?.method) doc.text(`Mode: ${invoice.payment.method}`);
  if (invoice.payment?.status) doc.text(`Gateway Status: ${invoice.payment.status}`);
  if (invoice.payment?.orderId) doc.text(`Order ID: ${invoice.payment.orderId}`);
  if (invoice.payment?.paymentId) doc.text(`Payment ID: ${invoice.payment.paymentId}`);
  doc.moveDown(0.5);

  // Features snapshot
  doc.fontSize(12).text('Plan Features (Snapshot)', { underline: true });
  doc.fontSize(10);
  const lines = featureLines(invoice.planSnapshot?.features);
  for (const line of lines) {
    doc.text(`• ${line}`);
  }

  doc.moveDown(1);
  doc.fontSize(9).fillColor('#666').text('This is a system generated invoice.', { align: 'left' });

  doc.end();
};
