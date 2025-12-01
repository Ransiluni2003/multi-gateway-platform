import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { protect, AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();

// Generate JWT
const generateToken = (id: string, role: IUser['role']): string => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be defined');
  return (jwt as any).sign({ id, role }, process.env.JWT_SECRET!, { expiresIn: "7d" });
};

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = (await User.create({
      name,
      email,
      password: hashed,
      role: role || "user",
    })) as IUser;

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
  token: generateToken(String((user as any)._id), user.role),
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = (await User.findOne({ email })) as IUser | null;
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
  token: generateToken(String((user as any)._id), user.role),
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

export default router;
