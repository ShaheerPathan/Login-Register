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

// User Schema - define outside the handler
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

// Avoid re-compilation errors in serverless
let User;
try {
  User = mongoose.model("User");
} catch (error) {
  User = mongoose.model("User", userSchema);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connect to database
    await connectDB();
    
    if (req.method === "POST") {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Email and password are required" 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          message: "Please provide a valid email address" 
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          message: "Password must be at least 6 characters long" 
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (!existingUser) {
        // REGISTRATION - Create new user
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          
          const newUser = new User({
            email: email.toLowerCase(),
            password: hashedPassword
          });

          await newUser.save();

          return res.status(201).json({ 
            success: true,
            message: "User registered successfully" 
          });

        } catch (saveError) {
          console.error("Registration error:", saveError);
          
          // Handle duplicate key error
          if (saveError.code === 11000) {
            return res.status(400).json({ 
              success: false,
              message: "User with this email already exists" 
            });
          }
          
          throw saveError;
        }

      } else {
        // LOGIN - Verify existing user
        try {
          const isPasswordValid = await bcrypt.compare(password, existingUser.password);
          
          if (!isPasswordValid) {
            return res.status(401).json({ 
              success: false,
              message: "Invalid credentials" 
            });
          }

          // Check if JWT_SECRET exists
          if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not defined");
            return res.status(500).json({ 
              success: false,
              message: "Server configuration error" 
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
            success: true,
            message: "Login successful",
            token 
          });

        } catch (loginError) {
          console.error("Login error:", loginError);
          throw loginError;
        }
      }
    }

    // Handle GET requests
    if (req.method === "GET") {
      return res.status(200).json({ 
        success: true,
        message: "Authentication API is running...",
        timestamp: new Date().toISOString()
      });
    }

    // Method not allowed
    return res.status(405).json({ 
      success: false,
      message: `Method ${req.method} not allowed` 
    });

  } catch (error) {
    console.error("Handler error:", error);
    
    // Return generic error response
    return res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}