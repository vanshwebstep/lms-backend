const authRoutes = require("./auth.routes");
const profileRoutes = require("./profile.routes");
const courseRoutes = require("./course.routes");
const paymentRoutes = require("./payment.routes");
const adminRoutes = require("./admin.routes");
const coachRoutes = require("./coach.routes");
const studentRoutes = require("./student.routes");
const notificationRoutes = require("./notification.routes");
const searchRoutes = require("./search.routes");
const uploadRoutes = require("./upload.routes");
const masterDataRoutes = require("./masterData.routes");
const emailConfigRoutes = require("./emailConfig.routes");

const registerRoutes = (route) => {
  authRoutes.register(route);
  profileRoutes.register(route);
  courseRoutes.register(route);
  paymentRoutes.register(route);
  adminRoutes.register(route);
  coachRoutes.register(route);
  studentRoutes.register(route);
  notificationRoutes.register(route);
  searchRoutes.register(route);
  uploadRoutes.register(route);
  masterDataRoutes.register(route);
  emailConfigRoutes.register(route);
};

module.exports = { registerRoutes };
