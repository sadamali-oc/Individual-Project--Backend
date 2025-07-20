const express = require("express");
const usersRoutes = require("./src/user/userRoutes");
const eventsRoutes = require('./src/event/event.routes');
const cors = require('cors');
require("dotenv").config();

const app = express();

// Use Render's port or fallback to 3000 locally
const port = process.env.PORT || 3000;

// Enable CORS with specific settings
const corsOptions = {
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(express.json());
app.use(cors(corsOptions)); // Apply CORS globally

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Base path for all user-related routes
app.use("/", usersRoutes);

// Base path for all event-related routes
app.use("/", eventsRoutes);

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});
