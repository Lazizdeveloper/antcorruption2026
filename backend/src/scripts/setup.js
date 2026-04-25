import { runMigrations } from '../db/migrate.js';
import { runSeed } from '../db/seed.js';
import { pool } from '../db/pool.js';

try {
  await runMigrations();
  await runSeed();
  console.log('Backend setup completed');
} finally {
  await pool.end();
}
