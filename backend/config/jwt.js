// Centralized JWT secret configuration
// This ensures the same secret is used everywhere
export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_SECRET not set in environment. Using default secret. This is insecure for production!");
}

