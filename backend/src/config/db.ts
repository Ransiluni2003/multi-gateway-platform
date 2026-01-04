import mongoose from "mongoose";

export const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("MongoDB URI:", mongoUri ? "✓ Found" : "✗ Missing");
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectMongo;
