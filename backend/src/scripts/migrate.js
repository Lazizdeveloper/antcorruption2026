import { runMigrations } from '../db/migrate.js';
import { pool } from '../db/pool.js';

try {
  await runMigrations();
} finally {
  await pool.end();
}
