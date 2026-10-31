import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import studentRoutes from "./routes/studentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://student-hub-psi-liart.vercel.app"
  ]
}));
app.use(express.json());

// Add this line here
app.use("/api/auth", authRoutes);
app.use("/api/students", authMiddleware, studentRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to StudentHub API!",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`StudentHub API running on port ${PORT}`);
  });
};

startServer();