
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const recipeRoutes = require("./routes/recipeRoutes");
const pantryRoutes = require("./routes/pantryRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home API
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to NourishIQ API!",
  });
});

// Pantry API
app.use("/api/pantry", pantryRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/auth", authRoutes);


const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`NourishIQ server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

startServer();
