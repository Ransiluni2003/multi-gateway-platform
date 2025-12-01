import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

console.log("ENV LOADED:", {
  SUPABASE_URL: process.env.SUPABASE_URL ? "OK" : "MISSING",
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ? "OK" : "MISSING",
});
