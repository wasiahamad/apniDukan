import express from 'express';
import { body, oneOf, validationResult } from 'express-validator';
import { authController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const validate = (rules) => [
	...rules,
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
			});
		}
		return next();
	},
];

/**
 * AUTH ROUTES
 * Base: /api/auth
 */

// Public routes
router.post(
	'/register',
	validate([
		body('name').trim().notEmpty().withMessage('Name is required'),
		body('email').isEmail().withMessage('Valid email is required'),
		body('phone').isLength({ min: 10, max: 10 }).withMessage('Valid 10-digit phone number is required'),
		body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
	]),
	authController.register
);
router.post(
	'/verify-email-otp',
	validate([
		body('email').isEmail().withMessage('Valid email is required'),
		body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required'),
	]),
	authController.verifyEmailOtp
);
router.post(
	'/resend-email-otp',
	validate([body('email').isEmail().withMessage('Valid email is required')]),
	authController.resendEmailOtp
);
router.post(
	'/login',
	validate([
		body('email').isEmail().withMessage('Valid email is required'),
		body('password').notEmpty().withMessage('Password is required'),
	]),
	authController.login
);
router.post(
	'/login/customer',
	validate([
		body('email').isEmail().withMessage('Valid email is required'),
		body('password').notEmpty().withMessage('Password is required'),
	]),
	authController.loginCustomer
);
router.post(
	'/forgot-password',
	validate([body('email').isEmail().withMessage('Valid email is required')]),
	authController.forgotPassword
);
router.post(
	'/resend-reset-otp',
	validate([body('email').isEmail().withMessage('Valid email is required')]),
	authController.resendResetOtp
);
router.post(
	'/reset-password',
	validate([
		body('email').isEmail().withMessage('Valid email is required'),
		body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required'),
		body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
	]),
	authController.resetPassword
);
router.post(
	'/social/google',
	validate([
		oneOf(
			[
				body('idToken').notEmpty().withMessage('Google idToken is required'),
				body('accessToken').notEmpty().withMessage('Google accessToken is required'),
			],
			'Either Google idToken or accessToken is required'
		),
	]),
	authController.googleLogin
);
router.post(
	'/social/facebook',
	validate([body('accessToken').notEmpty().withMessage('Facebook accessToken is required')]),
	authController.facebookLogin
);
router.post(
	'/register/customer',
	validate([
		body('name').trim().notEmpty().withMessage('Name is required'),
		body('email').isEmail().withMessage('Valid email is required'),
		body('phone').isLength({ min: 10, max: 10 }).withMessage('Valid 10-digit phone number is required'),
		body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
	]),
	authController.registerCustomer
);
router.post(
	'/social/google/customer',
	validate([
		oneOf(
			[
				body('idToken').notEmpty().withMessage('Google idToken is required'),
				body('accessToken').notEmpty().withMessage('Google accessToken is required'),
			],
			'Either Google idToken or accessToken is required'
		),
	]),
	authController.googleCustomerLogin
);
router.post(
	'/social/facebook/customer',
	validate([body('accessToken').notEmpty().withMessage('Facebook accessToken is required')]),
	authController.facebookCustomerLogin
);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put(
	'/location',
	protect,
	validate([
		body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
		body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
		body('accuracy').optional().isFloat({ min: 0 }).withMessage('Accuracy must be a positive number'),
	]),
	authController.updateMyLocation
);
router.post(
	'/change-password',
	protect,
	validate([
		body('currentPassword').notEmpty().withMessage('Current password is required'),
		body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
	]),
	authController.changePassword
);
router.post('/logout', protect, authController.logout);

// Admin-only: issue impersonation token for dukandar
router.post('/admin/impersonate', protect, authorize('admin'), authController.adminImpersonate);
router.get('/admin/customers', protect, authorize('admin'), authController.adminListCustomers);

export default router;
