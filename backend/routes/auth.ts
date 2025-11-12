import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { get, run } from "../db/database.js";
import { JWT_SECRET } from "../config/jwt.js";

const router = express.Router();

interface User {
  id: number;
  username: string;
  password: string;
  full_name: string;
  role: string;
}

// Register
router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("full_name").trim().notEmpty().withMessage("Full name is required"),
    body("role")
      .isIn(["user", "admin"])
      .withMessage("Role must be user or admin"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, full_name, role } = req.body;

      // Check if username exists
      const existingUser = await get<User>(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await run(
        "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?) RETURNING id",
        [username, hashedPassword, full_name, role]
      );

      const token = jwt.sign({ userId: result.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        token,
        user: {
          id: result.id!,
          username,
          full_name,
          role,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Login
router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Find user
      const user = await get<User>("SELECT * FROM users WHERE username = ?", [
        username,
      ]);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get current user
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await get<Omit<User, "password">>(
      "SELECT id, username, full_name, role FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;

