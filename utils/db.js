import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URL);
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB Connection failed:", err.message);
  }
};
