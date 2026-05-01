import { createEmailLayout, escapeHtml, formatCurrency, formatDateIn } from './emailLayout.js';

export const generateOrderConfirmationTemplate = (orderData) => {
  const { orderId, customerName, items, totalPrice, deliveryDate, deliveryAddress, orderDate } = orderData;
  const safeCustomer = escapeHtml(customerName || 'Customer');
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);

  const itemsList = safeItems
    .map(
      (item) => `
        <div class="kv">
          <div>
            <strong>${escapeHtml(item.name || 'Item')}</strong>
            <div class="muted">Qty ${Number(item.quantity || 0)}</div>
          </div>
          <div style="text-align:right;">
            <div class="muted">${formatCurrency(item.price)}</div>
            <strong>${formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
          </div>
        </div>
      `
    )
    .join('');

  const html = createEmailLayout({
    title: `Order Confirmation - ${orderId}`,
    preheader: 'Your order is confirmed',
    heroTitle: 'Order confirmed',
    heroSubtitle: 'We have received your order and it is now being processed.',
    badge: 'Order',
    bodyHtml: `
      <p class="lead">Hi ${safeCustomer}, thank you for shopping on PublicDukan. Your order has been confirmed.</p>
      <div class="section alt">
        <div class="section-title">Order summary</div>
        <div class="kv"><strong>Order ID</strong><span class="muted">${escapeHtml(orderId)}</span></div>
        <div class="kv"><strong>Total items</strong><span class="muted">${totalItems}</span></div>
        <div class="kv"><strong>Total amount</strong><span class="muted">${formatCurrency(totalPrice)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Items</div>
        ${itemsList || '<p class="lead" style="margin-bottom:0;">No item details available.</p>'}
      </div>
      <div class="section alt">
        <div class="section-title">Delivery details</div>
        <div class="kv"><strong>Order date</strong><span class="muted">${formatDateIn(orderDate)}</span></div>
        <div class="kv"><strong>Expected delivery</strong><span class="muted">${formatDateIn(deliveryDate)}</span></div>
        <div class="kv"><strong>Delivery address</strong><span class="muted">${escapeHtml(deliveryAddress || 'Will be confirmed by seller')}</span></div>
      </div>
      <div style="text-align:center; margin-top: 10px;">
        <span class="pill">Track updates will be shared soon</span>
      </div>
    `,
    footerNote: 'You will receive shipping or delivery updates as the order progresses.',
  });

  return { html };
};
