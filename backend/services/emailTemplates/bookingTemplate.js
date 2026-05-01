import { createEmailLayout, escapeHtml, formatCurrency, formatDateIn } from './emailLayout.js';

export const generateBookingConfirmationTemplate = (bookingData) => {
  const { bookingId, customerName, serviceName, bookingDate, bookingTime, location, amount } = bookingData;
  const html = createEmailLayout({
    title: `Booking Confirmation - ${bookingId}`,
    preheader: 'Booking confirmed',
    heroTitle: 'Your booking is confirmed',
    heroSubtitle: 'We have reserved your slot and saved the details below.',
    badge: 'Booking',
    heroGradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    bodyHtml: `
      <p class="lead">Hi ${escapeHtml(customerName || 'Customer')}, your appointment on PublicDukan is confirmed.</p>
      <div class="section alt">
        <div class="section-title">Booking details</div>
        <div class="kv"><strong>Booking ID</strong><span class="muted">${escapeHtml(bookingId)}</span></div>
        <div class="kv"><strong>Service</strong><span class="muted">${escapeHtml(serviceName || 'Service Booking')}</span></div>
        <div class="kv"><strong>Date</strong><span class="muted">${formatDateIn(bookingDate)}</span></div>
        <div class="kv"><strong>Time</strong><span class="muted">${escapeHtml(bookingTime || '')}</span></div>
        <div class="kv"><strong>Location</strong><span class="muted">${escapeHtml(location || 'At business location')}</span></div>
        <div class="kv"><strong>Amount</strong><span class="muted">${formatCurrency(amount)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Helpful reminder</div>
        <p class="lead" style="margin-bottom:0;">Please arrive 5-10 minutes early. If you need to reschedule, contact the business in advance.</p>
      </div>
    `,
    footerNote: 'If you need to cancel or reschedule, please contact the business at least 24 hours before your booking time.',
  });

  return { html };
};
