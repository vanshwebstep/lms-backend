const authController = require("../controllers/auth.controller");
const { auth } = require("../middleware/auth");

const register = (route) => {
  route("POST", "/api/auth/login", authController.login);
  route("POST", "/api/auth/register", authController.register);
  route("GET", "/api/auth/me", [auth(), authController.me]);
  route("GET", "/api/auth/verify-token", [auth(), authController.verifyToken]);
  route("POST", "/api/auth/verify-token", [auth(), authController.verifyToken]);
  route("GET", "/api/auth/verify-email", authController.verifyEmail);
  route("POST", "/api/auth/verify-email", authController.verifyEmail);
  route("POST", "/api/auth/refresh-token", authController.refreshToken);
  route("POST", "/api/auth/logout", [auth(), authController.logout]);
  route("POST", "/api/auth/forgot-password", authController.forgotPassword);
  route(
    "POST",
    "/api/auth/request-password-otp",
    authController.requestPasswordOtp,
  );
  route("POST", "/api/auth/reset-password", authController.resetPassword);
  route("POST", "/api/auth/change-password", [
    auth(),
    authController.changePassword,
  ]);
  route(
    "POST",
    "/api/auth/change-password-with-otp",
    authController.changePasswordWithOtp,
  );
};

module.exports = { register };
