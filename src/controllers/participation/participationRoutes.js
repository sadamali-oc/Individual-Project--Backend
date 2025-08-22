// src/controllers/participation/participationRoutes.js
const express = require("express");
const router = express.Router();
const participationController = require("../participation/participation.controller");

router.post("/participate", participationController.participate);
router.post(
  "/cancel-participation",
  participationController.cancelParticipation
);

module.exports = router;
