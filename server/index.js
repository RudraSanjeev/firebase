const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const authRoute = require("./routes/auth.route.js");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;
const HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("mongodb connected successfully..."))
  .catch((err) => console.log("mongodb connection failed: " + err));

// middleware
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoute);

app.listen(PORT, HOSTNAME, () => {
  console.log(`Backend is running on http://${HOSTNAME}:${PORT}/`);
});
