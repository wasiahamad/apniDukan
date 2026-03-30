/**
 * ROUTES INDEX - Central export and mounting
 * Import all route modules here
 */

import authRoutes from './authRoutes.js';
import businessRoutes from './businessRoutes.js';
import businessTypeRoutes from './businessTypeRoutes.js';
import listingRoutes from './listingRoutes.js';
import inquiryRoutes from './inquiryRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import planRoutes from './planRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import referralRoutes from './referralRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import socialRoutes from './socialRoutes.js';
import orderRoutes from './orderRoutes.js';
import supportRoutes from './supportRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import mapsRoutes from './mapsRoutes.js';

/**
 * Mount routes to Express app
 * @param {Express} app - Express application instance
 */
export const mountRoutes = (app) => {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/business', businessRoutes);
  app.use('/api/business-types', businessTypeRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/inquiries', inquiryRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/social', socialRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/maps', mapsRoutes);
};

export default mountRoutes;
