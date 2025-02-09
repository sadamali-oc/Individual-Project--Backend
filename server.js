const express = require("express");
const usersRoutes = require("./src/user/routes");


const app = express();
const port = 3000;

app.use(express.json());


app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1/users", usersRoutes);

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});
