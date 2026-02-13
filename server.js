const express = require("express");
const usersRoutes = require("./src/routes/user.routes");
const eventsRoutes = require("./src/routes/event.routes");
const clubRoutes = require("./src/routes/club.routes");
const participationRoutes = require("./src/routes/participation.routes");
const notificationRoutes = require("./src/routes/notifications.routes");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
require("dotenv").config();

const app = express();


// Use Render's port or fallback to 3000 locally
const port = process.env.PORT || 3000;

// 🔐 CORS Configuration
const corsOptions = {
  origin: "http://localhost:4200",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// 🔐 Security Middleware (R4)
app.use(helmet());               // Secure HTTP headers
app.use(xss());                  // Prevent XSS attacks
app.use(express.json({ limit: "10kb" })); // Prevent large payload attacks
app.use(cors(corsOptions));

// 🔐 Rate Limiting (Injection & brute-force protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
});
app.use(limiter);

// Test route
app.get("/", (req, res) => {
  res.send("Mora Fusion API is running securely");
});

// Routes
app.use("/", usersRoutes);
app.use("/", eventsRoutes);
app.use("/", clubRoutes);
app.use("/", notificationRoutes);
app.use("/", participationRoutes);

// Start server
app.listen(port, () => {
  console.log(`Secure app listening at http://localhost:${port}`);
});
