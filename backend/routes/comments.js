import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { query, run, get } from "../db/database.js";

const router = express.Router();

// Get comments for a post
router.get("/post/:postId", authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const isAdminUser = req.user.role === "admin";

    let sql = `
      SELECT c.*, u.username, u.full_name
      FROM comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
    `;

    if (!isAdminUser) {
      sql += " AND c.deleted = 0";
    }

    sql += " ORDER BY c.created_at DESC";

    const comments = await query(sql, [postId]);

    res.json({ comments });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create comment
router.post(
  "/",
  authenticate,
  [
    body("post_id").isInt().withMessage("Post ID is required"),
    body("content").trim().notEmpty().withMessage("Content is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { post_id, content } = req.body;

      // Verify post exists
      const post = await get(
        "SELECT id FROM posts WHERE id = ? AND deleted = 0",
        [post_id]
      );
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const result = await run(
        "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?) RETURNING id",
        [post_id, req.user.id, content]
      );

      const comment = await get(
        `
      SELECT c.*, u.username, u.full_name 
      FROM comments c 
      INNER JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `,
        [result.id]
      );

      res.status(201).json({ comment });
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Update comment
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

      // Check if comment exists
      const comment = await get("SELECT * FROM comments WHERE id = ?", [id]);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Check permissions
      const isOwner = comment.user_id === req.user.id;
      const isAdminUser = req.user.role === "admin";

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ error: "Permission denied" });
      }

      // Update comment
      const editedByAdmin = isAdminUser && !isOwner ? 1 : 0;
      await run(
        "UPDATE comments SET content = ?, edited = 1, edited_by_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [content, editedByAdmin, id]
      );

      const updatedComment = await get(
        `
      SELECT c.*, u.username, u.full_name 
      FROM comments c 
      INNER JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `,
        [id]
      );

      res.json({ comment: updatedComment });
    } catch (error) {
      console.error("Update comment error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Delete comment
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists
    const comment = await get("SELECT * FROM comments WHERE id = ?", [id]);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check permissions
    const isOwner = comment.user_id === req.user.id;
    const isAdminUser = req.user.role === "admin";

    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Soft delete
    await run("UPDATE comments SET deleted = 1 WHERE id = ?", [id]);

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
