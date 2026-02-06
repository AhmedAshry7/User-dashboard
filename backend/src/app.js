const express = require("express");
const cors = require("cors");
require("dotenv").config();

const statsRoutes = require("./routes/statsRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/stats", statsRoutes);

module.exports = app;
