import { query, pool } from '../db/pool.js';

try {
  const [{ rows: healthRows }, { rows: userRows }, { rows: appRows }, { rows: caseRows }] = await Promise.all([
    query('SELECT NOW() AS now'),
    query('SELECT COUNT(*)::int AS count FROM users'),
    query('SELECT COUNT(*)::int AS count FROM applications'),
    query('SELECT COUNT(*)::int AS count FROM cases'),
  ]);

  console.log(`Database time: ${healthRows[0].now.toISOString()}`);
  console.log(`Users: ${userRows[0].count}`);
  console.log(`Applications: ${appRows[0].count}`);
  console.log(`Cases: ${caseRows[0].count}`);
} finally {
  await pool.end();
}
