// core/db/mongo.ts
import mongoose from "mongoose";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/platform";

let isConnected = false;

export async function connectMongo() {
  if (isConnected) return mongoose.connection;
  await mongoose.connect(MONGO_URL, {
    // options
  });
  isConnected = true;
  console.log("[mongo] connected");
  return mongoose.connection;
}
