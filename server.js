const express = require("express");
const usersRoutes = require("./src/user/userRoutes");
const eventsRoutes = require('./src/event/eventRoutes');
const cors = require('cors');



const app = express();
const port = 3000; // Define the port

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

// // Placing this before usersRoutes to avoid conflicts
// app.get('/users/login', (req, res) => {
//   res.render('login');
// });

// app.use("/users", usersRoutes);  // User-related routes
// app.use("/events", eventsRoutes);  // Event-related routes


// Base path for all user-related routes
app.use("/", usersRoutes);

// Base path for all event-related routes
app.use("/", eventsRoutes);


app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});
