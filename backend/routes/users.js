import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { run, get } from "../db/database.js";

const router = express.Router();

// Update profile (full name)
router.put(
  "/profile",
  authenticate,
  [body("full_name").trim().notEmpty().withMessage("Full name is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { full_name } = req.body;

      await run("UPDATE users SET full_name = ? WHERE id = ?", [
        full_name,
        req.user.id,
      ]);

      const user = await get(
        "SELECT id, username, full_name, role FROM users WHERE id = ?",
        [req.user.id]
      );

      res.json({ user });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
