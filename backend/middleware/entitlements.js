import { Business } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

export const requireOwnerFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'admin') return next();

      const business = await Business.findOne({ owner: req.user._id, isActive: true });
      if (!business) {
        return res.status(400).json({
          success: false,
          message: 'No active business found for this account',
        });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      req.entitlements = entitlements;

      if (entitlements?.features?.[featureKey] !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled in your plan. Please upgrade.',
        });
      }

      return next();
    } catch (error) {
      console.error('Entitlements middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validating plan entitlements',
      });
    }
  };
};

export const requireBusinessFeatureByIdParam = (paramName, featureKey) => {
  return async (req, res, next) => {
    try {
      const businessId = req.params?.[paramName];
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business id is required',
        });
      }

      const business = await Business.findById(businessId);
      if (!business || !business.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Business not found',
        });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      req.entitlements = entitlements;

      if (entitlements?.features?.[featureKey] !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled for this business',
        });
      }

      return next();
    } catch (error) {
      console.error('Entitlements middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validating plan entitlements',
      });
    }
  };
};
