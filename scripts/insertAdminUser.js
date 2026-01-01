// Usage: node scripts/insertAdminUser.js
// This script inserts an admin user into the MongoDB database.
// Edit the values below as needed.

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGO_URL = 'mongodb+srv://it23143654_db_user:Company123@cluster1.td4rih9.mongodb.net/?appName=Cluster1';
const DB_NAME = 'test'; 
const USERS_COLLECTION = 'users';

const adminUser = {
  email: 'pransiluni@gmail.com', 
  password: 'Pinithi123', 
  role: 'admin', 
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function insertAdminUser() {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection(USERS_COLLECTION);
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    adminUser.password = hashedPassword;
    const result = await users.insertOne(adminUser);
    console.log('Admin user inserted:', result.insertedId);
  } catch (err) {
    console.error('Error inserting admin user:', err);
  } finally {
    await client.close();
  }
}

insertAdminUser();
 