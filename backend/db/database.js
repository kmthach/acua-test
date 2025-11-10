import pkg from "pg";
const { Pool } = pkg;

let pool;

export function getDb() {
  if (!pool) {
    // Parse connection string or use individual env vars
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.DB_CONNECTION_STRING ||
      `postgresql://postgres:fV0LFPR7mKTroJ9m@db.rxwcfhspknhkiykojsme.supabase.co:5432/postgres`;

    pool = new Pool({
      connectionString,
      ssl:
        process.env.DB_SSL !== "false"
          ? {
              rejectUnauthorized: false, // Allow self-signed certificates for Supabase
            }
          : false,
    });

    pool.on("connect", () => {
      console.log("Connected to PostgreSQL database");
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }
  return pool;
}

export async function initDatabase() {
  const database = getDb();

  // Create users table
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create posts table
  await database.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      deleted BOOLEAN DEFAULT FALSE,
      edited BOOLEAN DEFAULT FALSE,
      edited_by_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create comments table
  await database.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      deleted BOOLEAN DEFAULT FALSE,
      edited BOOLEAN DEFAULT FALSE,
      edited_by_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create trigger function for updated_at
  await database.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers for posts
  await database.query(`
    DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
    CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create triggers for comments
  await database.query(`
    DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
    CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create indexes for better performance
  await database.query(
    "CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)"
  );
  await database.query(
    "CREATE INDEX IF NOT EXISTS idx_posts_deleted ON posts(deleted)"
  );
  await database.query(
    "CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)"
  );
  await database.query(
    "CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)"
  );
  await database.query(
    "CREATE INDEX IF NOT EXISTS idx_comments_deleted ON comments(deleted)"
  );
}

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
function convertQuery(sql, params = []) {
  let paramIndex = 1;
  const convertedParams = [];
  const paramPositions = [];
  let match;

  // Find all ? positions first
  const regex = /\?/g;
  while ((match = regex.exec(sql)) !== null) {
    paramPositions.push(match.index);
  }

  // Convert SQL with placeholders
  const convertedSql = sql.replace(/\?/g, () => {
    const param = params[paramIndex - 1];
    const pos = paramPositions[paramIndex - 1];

    // Check if this parameter is being used for a boolean column
    // Look at the SQL context around this placeholder
    const contextStart = Math.max(0, pos - 50);
    const contextEnd = Math.min(sql.length, pos + 50);
    const context = sql.substring(contextStart, contextEnd);

    // Check if it's in a SET clause for boolean columns
    const isBooleanSet =
      /SET\s+(deleted|edited|edited_by_admin)\s*=\s*\?/i.test(context);
    // Check if it's in a WHERE clause for boolean columns (less common but possible)
    const isBooleanWhere =
      /WHERE.*(deleted|edited|edited_by_admin)\s*=\s*\?/i.test(context);

    // Only convert 1/0 to boolean if it's explicitly for a boolean column
    if ((isBooleanSet || isBooleanWhere) && (param === 1 || param === 0)) {
      convertedParams.push(param === 1);
    } else {
      // Keep as-is (don't convert IDs or other integers)
      convertedParams.push(param);
    }
    return `$${paramIndex++}`;
  });

  // Also convert boolean comparisons in SQL strings (hardcoded values)
  const sqlWithBooleans = convertedSql
    .replace(/\bdeleted\s*=\s*0\b/gi, "deleted = FALSE")
    .replace(/\bdeleted\s*=\s*1\b/gi, "deleted = TRUE")
    .replace(/\bedited\s*=\s*1\b/gi, "edited = TRUE")
    .replace(/\bedited_by_admin\s*=\s*1\b/gi, "edited_by_admin = TRUE");

  return {
    sql: sqlWithBooleans,
    params: convertedParams,
  };
}

export async function query(sql, params = []) {
  const database = getDb();
  const { sql: convertedSql, params: convertedParams } = convertQuery(
    sql,
    params
  );
  const result = await database.query(convertedSql, convertedParams);
  return result.rows;
}

export async function run(sql, params = []) {
  const database = getDb();
  const { sql: convertedSql, params: convertedParams } = convertQuery(
    sql,
    params
  );
  const result = await database.query(convertedSql, convertedParams);

  // For INSERT queries, get the last inserted ID from RETURNING clause
  let insertId = null;
  if (sql.trim().toUpperCase().startsWith("INSERT")) {
    // If RETURNING clause is used, get ID from result
    if (result.rows && result.rows.length > 0) {
      insertId = result.rows[0].id || result.rows[0]?.id || null;
    } else {
      // Fallback to LASTVAL() if no RETURNING clause
      try {
        const idResult = await database.query("SELECT LASTVAL() as id");
        insertId = idResult.rows[0]?.id || null;
      } catch (err) {
        console.warn("Could not get last insert ID:", err.message);
      }
    }
  }

  return {
    id: insertId,
    changes: result.rowCount || 0,
    insertId: insertId,
  };
}

export async function get(sql, params = []) {
  const database = getDb();
  const { sql: convertedSql, params: convertedParams } = convertQuery(
    sql,
    params
  );
  const result = await database.query(convertedSql, convertedParams);
  return result.rows[0] || null;
}
