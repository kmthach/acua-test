import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { get } from "../db/database.js";
import { JWT_SECRET } from "../config/jwt.js";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    if (!decoded.userId) {
      res.status(401).json({ error: "Invalid token format" });
      return;
    }

    const user = await get<User>(
      "SELECT id, username, full_name, role FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    const err = error as jwt.JsonWebTokenError | jwt.TokenExpiredError;
    console.error("Authentication error:", err.message);
    if (err.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token expired" });
      return;
    }
    res.status(401).json({ error: "Invalid token" });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

