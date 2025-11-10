import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { query, run, get } from "../db/database.js";

const router = express.Router();

// Get all posts (timeline) - sorted by date desc, exclude deleted for non-admins
router.get("/", authenticate, async (req, res) => {
  try {
    const isAdminUser = req.user.role === "admin";

    let sql = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        COUNT(DISTINCT c.id) as comment_count
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN comments c ON p.id = c.post_id
    `;

    // For non-admins, filter out deleted comments in the JOIN
    if (!isAdminUser) {
      sql = sql.replace(
        "LEFT JOIN comments c ON p.id = c.post_id",
        "LEFT JOIN comments c ON p.id = c.post_id AND c.deleted = FALSE"
      );
      sql += " WHERE p.deleted = FALSE";
    }

    sql += ` GROUP BY p.id, p.user_id, p.content, p.deleted, p.edited, p.edited_by_admin, p.created_at, p.updated_at, u.username, u.full_name ORDER BY p.created_at DESC`;

    const posts = await query(sql);

    res.json({ posts });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Search posts
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const isAdminUser = req.user.role === "admin";
    const searchTerm = `%${q}%`;

    let sql = `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        COUNT(DISTINCT c.id) as comment_count
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE (p.content LIKE ? OR u.username LIKE ?)
    `;

    // For non-admins, filter out deleted comments in the JOIN
    if (!isAdminUser) {
      sql = sql.replace(
        "LEFT JOIN comments c ON p.id = c.post_id",
        "LEFT JOIN comments c ON p.id = c.post_id AND c.deleted = FALSE"
      );
      sql += " AND p.deleted = FALSE";
    }

    sql += ` GROUP BY p.id, p.user_id, p.content, p.deleted, p.edited, p.edited_by_admin, p.created_at, p.updated_at, u.username, u.full_name ORDER BY p.created_at DESC`;

    const posts = await query(sql, [searchTerm, searchTerm]);

    res.json({ posts });
  } catch (error) {
    console.error("Search posts error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create post
router.post(
  "/",
  authenticate,
  [body("content").trim().notEmpty().withMessage("Content is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content } = req.body;
      const result = await run(
        "INSERT INTO posts (user_id, content) VALUES (?, ?) RETURNING id",
        [req.user.id, content]
      );

      const post = await get(
        `
      SELECT p.*, u.username, u.full_name 
      FROM posts p 
      INNER JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `,
        [result.id]
      );

      res.status(201).json({ post });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Update post
router.put(
  "/:id",
  authenticate,
  [body("content").trim().notEmpty().withMessage("Content is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content } = req.body;

      // Check if post exists
      const post = await get("SELECT * FROM posts WHERE id = ?", [id]);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check permissions
      const isOwner = post.user_id === req.user.id;
      const isAdminUser = req.user.role === "admin";

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ error: "Permission denied" });
      }

      // Update post
      const editedByAdmin = isAdminUser && !isOwner ? 1 : 0;
      await run(
        "UPDATE posts SET content = ?, edited = 1, edited_by_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [content, editedByAdmin, id]
      );

      const updatedPost = await get(
        `
      SELECT p.*, u.username, u.full_name 
      FROM posts p 
      INNER JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `,
        [id]
      );

      res.json({ post: updatedPost });
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Delete post
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const post = await get("SELECT * FROM posts WHERE id = ?", [id]);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check permissions
    const isOwner = post.user_id === req.user.id;
    const isAdminUser = req.user.role === "admin";

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Soft delete
    await run("UPDATE posts SET deleted = 1 WHERE id = ?", [id]);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single post
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdminUser = req.user.role === "admin";

    let sql = `
      SELECT p.*, u.username, u.full_name 
      FROM posts p 
      INNER JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `;

    if (!isAdminUser) {
      sql += " AND p.deleted = 0";
    }

    const post = await get(sql, [id]);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ post });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
