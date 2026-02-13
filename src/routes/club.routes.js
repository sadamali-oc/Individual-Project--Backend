// routes/club.routes.js
const express = require("express");
const clubController = require("../controllers/club/club.controller");

const router = express.Router(); // ✅ Correctly use express.Router()

// Route: GET /api/clubs
router.get("/clubs", clubController.getAllClubs);

// Optional: GET /api/clubs/:id
router.get("/clubs/:id", clubController.getClubById);

module.exports = router;
