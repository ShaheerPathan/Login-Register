// import express from "express";
// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";
// import { connectDB } from "../utils/db.js";

// dotenv.config();
// const app = express();
// app.use(express.json());
// connectDB();

// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true },
//   password: String
// });
// const User = mongoose.model("User", userSchema);

// // Register
// app.post("/register", async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const exists = await User.findOne({ email });
//     if (exists) return res.status(400).json({ msg: "User already exists" });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = await User.create({ email, password: hashedPassword });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "1d"
//     });

//     res.status(201).json({ token });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Login
// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ msg: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "1d"
//     });

//     res.json({ token });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ THIS IS REQUIRED
// export default app;



// import { connectDB } from "../utils/db.js";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   await connectDB(); // connect to MongoDB for each request

//   if (req.method === "POST") {
//     const { username, password } = req.body;
//     // Dummy auth logic
//     if (username === "admin" && password === "admin") {
//       const token = jwt.sign({ user: username }, process.env.JWT_SECRET);
//       return res.status(200).json({ token });
//     }
//     return res.status(401).json({ message: "Invalid credentials" });
//   }

//   res.status(200).json({ message: "API running..." });
// }

import { connectDB } from "../utils/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// User Schema
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true
});

// Create User model (only if it doesn't exist)
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default async function handler(req, res) {
  await connectDB(); // Connect to MongoDB for each request

  if (req.method === "POST") {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }

    try {
      // Check if this is a registration (you can determine this by checking if user exists)
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (!existingUser) {
        // REGISTRATION - Create new user
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = new User({
          email: email.toLowerCase(),
          password: hashedPassword
        });

        await newUser.save();

        return res.status(201).json({ 
          message: "User registered successfully" 
        });

      } else {
        // LOGIN - Verify existing user
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        
        if (!isPasswordValid) {
          return res.status(401).json({ 
            message: "Invalid credentials" 
          });
        }

        // Generate JWT token for successful login
        const token = jwt.sign(
          { 
            userId: existingUser._id,
            email: existingUser.email 
          }, 
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.status(200).json({ 
          message: "Login successful",
          token 
        });
      }

    } catch (error) {
      console.error("Auth error:", error);
      
      // Handle duplicate email error
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: "User with this email already exists" 
        });
      }

      return res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  }

  // Handle other HTTP methods
  if (req.method === "GET") {
    return res.status(200).json({ 
      message: "Authentication API is running..." 
    });
  }

  // Method not allowed
  return res.status(405).json({ 
    message: "Method not allowed" 
  });
}