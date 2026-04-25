import { Pool } from 'pg';
import { env } from '../config/env.js';

const requiresSsl = env.databaseUrl.includes('sslmode=require');

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  enableChannelBinding: true,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

export const query = (text, params = []) => pool.query(text, params);
