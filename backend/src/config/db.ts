import mongoose from "mongoose";

export const connectMongo = async () => {
  try {
    // Prefer MONGO_URL (used by some services), fallback to MONGO_URI
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    console.log("MongoDB URI:", mongoUri ? "✓ Found" : "✗ Missing");
    if (!mongoUri) {
      throw new Error("MONGO_URL/MONGO_URI is not defined in environment variables");
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectMongo;
