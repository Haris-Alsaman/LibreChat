const express = require('express');
const emailWhitelistRoutes = require('./emailWhitelist');
const {
  refreshController,
  registrationController,
  resetPasswordController,
  resetPasswordRequestController,
} = require('~/server/controllers/AuthController');
const { loginController } = require('~/server/controllers/auth/LoginController');
const { logoutController } = require('~/server/controllers/auth/LogoutController');
const { verify2FAWithTempToken } = require('~/server/controllers/auth/TwoFactorAuthController');
const {
  enable2FA,
  verify2FA,
  disable2FA,
  regenerateBackupCodes,
  confirm2FA,
} = require('~/server/controllers/TwoFactorController');
const { setPasswordController } = require('~/server/controllers/SetPasswordController');
const {
  checkBan,
  logHeaders,
  loginLimiter,
  requireJwtAuth,
  checkInviteUser,
  checkActivationToken,
  registerLimiter,
  requireLdapAuth,
  setBalanceConfig,
  requireLocalAuth,
  resetPasswordLimiter,
  validateRegistration,
  validatePasswordReset,
  inviteLimiter,
} = require('~/server/middleware');

const router = express.Router();

const ldapAuth = !!process.env.LDAP_URL && !!process.env.LDAP_USER_SEARCH_BASE;
//Local
router.post('/logout', requireJwtAuth, logoutController);
router.post(
  '/login',
  logHeaders,
  loginLimiter,
  checkBan,
  ldapAuth ? requireLdapAuth : requireLocalAuth,
  setBalanceConfig,
  loginController,
);
router.post('/refresh', refreshController);
router.post(
  '/register',
  registerLimiter,
  checkBan,
  checkInviteUser,
  validateRegistration,
  registrationController,
);
router.post(
  '/requestPasswordReset',
  resetPasswordLimiter,
  checkBan,
  validatePasswordReset,
  resetPasswordRequestController,
);
router.post('/resetPassword', checkBan, validatePasswordReset, resetPasswordController);

// Private Beta - Set Password Route
router.post(
  '/set-password',
  inviteLimiter,
  checkBan,
  checkActivationToken,
  setPasswordController,
);

router.get('/2fa/enable', requireJwtAuth, enable2FA);
router.post('/2fa/verify', requireJwtAuth, verify2FA);
router.post('/2fa/verify-temp', checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', requireJwtAuth, confirm2FA);
router.post('/2fa/disable', requireJwtAuth, disable2FA);
router.post('/2fa/backup/regenerate', requireJwtAuth, regenerateBackupCodes);

// Email whitelist routes
router.use('/', emailWhitelistRoutes);

// Invitation token validation route
router.get('/invite/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { getInviteByToken } = require('~/models/inviteUser');
    const invite = await getInviteByToken(token);

    if (invite.error) {
      return res.status(404).json({ error: invite.message });
    }

    return res.json({ email: invite.email });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
