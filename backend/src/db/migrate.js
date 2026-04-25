import { pool } from './pool.js';

const migrationStatements = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'candidate')),
      department TEXT,
      phone TEXT,
      avatar_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      candidate_code TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT,
      birth_place TEXT,
      photo_url TEXT,
      phone TEXT,
      connections JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS hr_profiles (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      middle_name TEXT NOT NULL,
      passport_number TEXT NOT NULL,
      passport_pinfl TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY,
      candidate_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
      candidate_code TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      candidate_email TEXT NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      candidate_stage TEXT NOT NULL CHECK (candidate_stage IN ('submitted', 'blind_review', 'merit_test', 'ranking', 'completed')),
      review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired')),
      score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
      merit_score INTEGER NOT NULL DEFAULT 0 CHECK (merit_score BETWEEN 0 AND 100),
      blind_mode BOOLEAN NOT NULL DEFAULT TRUE,
      conflict_detected BOOLEAN NOT NULL DEFAULT FALSE,
      conflict_details TEXT,
      recruiter_info TEXT,
      phone TEXT,
      telegram TEXT,
      masked_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      documents JSONB NOT NULL DEFAULT '[]'::jsonb,
      processing_time_ms INTEGER NOT NULL DEFAULT 0,
      match_percentage INTEGER NOT NULL DEFAULT 0 CHECK (match_percentage BETWEEN 0 AND 100),
      proctoring_risk INTEGER NOT NULL DEFAULT 0 CHECK (proctoring_risk BETWEEN 0 AND 100),
      interview_time TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (candidate_code, position, submitted_at)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS anomalies (
      id UUID PRIMARY KEY,
      application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('DELAY', 'SPEED', 'CONTRARY_SELECTION')),
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
      source TEXT NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (application_id, type, message)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS cases (
      id UUID PRIMARY KEY,
      external_ref TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      organization TEXT NOT NULL,
      case_type TEXT NOT NULL CHECK (case_type IN ('Tender', 'Document')),
      risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
      description TEXT NOT NULL,
      anomaly_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      source_platform TEXT,
      estimated_savings NUMERIC(14, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'resolved')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS external_projects (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      published_date DATE,
      document_type TEXT,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS news_items (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      published_date DATE,
      summary TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS regional_tax_stats (
      id UUID PRIMARY KEY,
      region_name TEXT NOT NULL UNIQUE,
      entities INTEGER NOT NULL DEFAULT 0,
      individuals INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS vacancies (
      id UUID PRIMARY KEY,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (department, position)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS merit_questions (
      id UUID PRIMARY KEY,
      question TEXT NOT NULL UNIQUE,
      options JSONB NOT NULL,
      correct_answer INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS integrity_reports (
      id UUID PRIMARY KEY,
      report_type TEXT NOT NULL CHECK (report_type IN ('case', 'candidate', 'application', 'system')),
      reference_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved')),
      created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT
  `,
  `
    ALTER TABLE integrity_reports
    ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `CREATE INDEX IF NOT EXISTS idx_applications_review_status ON applications(review_status)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_candidate_user_id ON applications(candidate_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_risk_score ON cases(risk_score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomalies(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_integrity_reports_created_at ON integrity_reports(created_at DESC)`,
];

export async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const statement of migrationStatements) {
      await client.query(statement);
    }

    await client.query('COMMIT');
    console.log('Database migrations completed');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
