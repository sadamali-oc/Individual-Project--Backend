const { Router } = require("express");
const controller = require("./user.controller");

const router = Router();

// Route to get all users
router.get("/all/users", controller.getUsers);

// Route to create a new user
router.post("/user/register", controller.addUser);
router.post("/auth/forgot-password", controller.forgotPassword);
router.post("/auth/reset-password", controller.resetPassword);

// User login
router.post("/user/auth/login", controller.loginUser);

// Get user profile by ID
router.get("/user/profile/:userId", controller.getUserById);

// Update user profile by ID
router.put("/user/profile/:userId", controller.updateUserById);

// --- New route: Admin approves organizer ---
router.put("/organizer/approve/:userId", controller.approveOrganizer);

// Route to get pending organizers
router.get("/organizers/pending", controller.getPendingOrganizers);

// ✅ New route: Admin gets all pending users (any role)
router.get("/users/pending", controller.getPendingUsers);
// New: Admin updates user status (approve/reject/pending)

router.patch("/user/status/:userId", controller.updateUserStatus);
router.get("/all/organizers", controller.getAllOrganizers); 

module.exports = router;
