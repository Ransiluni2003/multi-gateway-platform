import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from 'helmet';
import paymentsRouter from './routes/payments';
import { connectDB } from './services/db';

connectDB();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/payments', paymentsRouter);

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
