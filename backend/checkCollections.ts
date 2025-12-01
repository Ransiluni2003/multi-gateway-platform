// checkCollections.ts
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI!;
const dbName = "multiGatewayDB"; // you can use any name here

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db(dbName);

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("transactions")) {
      await db.createCollection("transactions");
      console.log("🆕 Created 'transactions' collection");
    } else {
      console.log("✅ 'transactions' collection already exists");
    }

    if (!collectionNames.includes("refunds")) {
      await db.createCollection("refunds");
      console.log("🆕 Created 'refunds' collection");
    } else {
      console.log("✅ 'refunds' collection already exists");
    }
  } catch (error) {
    console.error("❌ Error setting up collections:", error);
  } finally {
    await client.close();
    console.log("🔒 Connection closed");
  }
}

run();
