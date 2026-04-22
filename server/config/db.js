// server/config/db.js
// MongoDB connection helper for SummitScene
//  - Loads environment variables using dotenv
//  - Connects to MongoDB using Mongoose
//  - Throws errors upward so the server startup can gracefully fail
//
// USED BY:
//  - server/index.js → startServer()

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Ensures process.env.MONGODB_URI is available

// -------------------------------------------
// connectDB()
//   Establish a MongoDB connection using Mongoose.
//
//   1) Read MONGODB_URI from environment.
//   2) Throw an error if it’s missing.
//   3) Connect via mongoose.connect.
//   4) Log a clean success message with the database + host.
//   5) Throw errors upward so server/index.js can handle them.
//
// RETURNS:
//   A mongoose connection object (conn)
// -------------------------------------------
export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    // Attempt connection
    const conn = await mongoose.connect(uri);

    // Clean, readable success log
    console.log(
      ` Connected to MongoDB → DB: ${conn.connection.name} | Host: ${conn.connection.host}`
    );

    return conn;
  } catch (error) {
    console.error(" MongoDB connection error:", error.message);
    // Re-throw so server startup halts (prevent running without DB)
    throw error;
  }
}

