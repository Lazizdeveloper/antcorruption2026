import { runSeed } from '../db/seed.js';
import { pool } from '../db/pool.js';

try {
  await runSeed();
} finally {
  await pool.end();
}
