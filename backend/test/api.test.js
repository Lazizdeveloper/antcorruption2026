import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import app from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { pool, query } from '../src/db/pool.js';
import { runSeed } from '../src/db/seed.js';

const testRunId = `api-test-${Date.now()}`;
const testEmail = `${testRunId}@example.com`;
const reportTitlePrefix = `API TEST ${testRunId}`;

let baseUrl = '';
let server;

const state = {
  adminToken: '',
  hrToken: '',
  candidateToken: '',
  registeredCandidateId: '',
  firstApplicationId: '',
  secondApplicationId: '',
  reportId: '',
};

async function cleanupTestData() {
  await query(
    `
      DELETE FROM anomalies
      WHERE application_id IN (
        SELECT id
        FROM applications
        WHERE candidate_email = $1
      )
    `,
    [testEmail],
  );

  await query(
    `
      DELETE FROM integrity_reports
      WHERE title LIKE $1
    `,
    [`${reportTitlePrefix}%`],
  );

  await query(
    `
      DELETE FROM applications
      WHERE candidate_email = $1
    `,
    [testEmail],
  );

  await query(
    `
      DELETE FROM candidate_profiles
      WHERE user_id IN (
        SELECT id
        FROM users
        WHERE email = $1
      )
    `,
    [testEmail],
  );

  await query(
    `
      DELETE FROM users
      WHERE email = $1
    `,
    [testEmail],
  );
}

async function requestJson(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  let body = options.body;

  if (body && typeof body !== 'string') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, payload };
}

async function requestText(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.text();
  return { response, payload };
}

async function login(email, password) {
  const { response, payload } = await requestJson('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  assert.equal(response.status, 200);
  assert.ok(payload.token);

  return payload;
}

before(async () => {
  await runMigrations();
  await runSeed();
  await cleanupTestData();

  server = app.listen(0);
  await once(server, 'listening');

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await cleanupTestData();

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await pool.end();
});

test('EthicFlow backend API integration scenarios', async (t) => {
  await t.test('public endpoints and auth guard work', async () => {
    const health = await requestJson('/health');
    assert.equal(health.response.status, 200);
    assert.equal(health.payload.ok, true);

    const docs = await requestJson('/docs.json');
    assert.equal(docs.response.status, 200);
    assert.equal(docs.payload.info.title, 'EthicFlow Backend API');

    const unauthorized = await requestJson('/api/admin/dashboard');
    assert.equal(unauthorized.response.status, 401);
    assert.match(unauthorized.payload.message, /authorization token/i);
  });

  await t.test('seeded logins and role restrictions work', async () => {
    const admin = await login('admin@ethicflow.uz', 'Admin123!');
    const hr = await login('hr@ethicflow.uz', 'Hr123!');
    const candidate = await login('candidate@ethicflow.uz', 'Candidate123!');

    state.adminToken = admin.token;
    state.hrToken = hr.token;
    state.candidateToken = candidate.token;

    const me = await requestJson('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(me.response.status, 200);
    assert.equal(me.payload.user.role, 'admin');

    const forbidden = await requestJson('/api/admin/dashboard', {
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
    });

    assert.equal(forbidden.response.status, 403);
  });

  await t.test('candidate registration handles success and duplicate email', async () => {
    const registerBody = {
      fullName: `Api Test Candidate ${testRunId}`,
      email: testEmail,
      password: 'Candidate123!',
      phone: '+998901111111',
      gender: 'Erkak',
      birthPlace: 'Toshkent',
      connections: ['API TEST connection for conflict scenario'],
    };

    const created = await requestJson('/api/auth/register', {
      method: 'POST',
      body: registerBody,
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.payload.user.role, 'candidate');
    assert.ok(created.payload.token);

    state.candidateToken = created.payload.token;

    const duplicate = await requestJson('/api/auth/register', {
      method: 'POST',
      body: registerBody,
    });

    assert.equal(duplicate.response.status, 409);
  });

  await t.test('candidate dashboard and profile endpoints work', async () => {
    const dashboard = await requestJson('/api/candidate/dashboard', {
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
    });

    assert.equal(dashboard.response.status, 200);
    assert.ok(dashboard.payload.candidate.id);
    assert.ok(dashboard.payload.vacancies.length >= 1);
    assert.ok(dashboard.payload.meritQuestions.length >= 3);

    state.registeredCandidateId = dashboard.payload.candidate.id;

    const profileUpdate = await requestJson('/api/candidate/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        phone: '+998909999999',
        connections: ['API TEST relationship update'],
      },
    });

    assert.equal(profileUpdate.response.status, 200);
    assert.equal(profileUpdate.payload.candidate.phone, '+998909999999');
  });

  await t.test('candidate application and merit-test scenarios work', async () => {
    const invalidCreate = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        department: 'Iqtisodiyot va Moliya Vazirligi',
      },
    });

    assert.equal(invalidCreate.response.status, 400);

    const createdApplication = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Katta Iqtisodchi',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        telegram: '@apitest_candidate',
        maskedData: {
          skills: ['Excel', 'Budgeting', 'SQL'],
          experience: '2 yil iqtisodchi yordamchisi.',
          education: 'TDIU',
          summary: 'API test candidate profile',
        },
        documents: [
          {
            name: 'cv.pdf',
            type: 'resume',
            url: '/files/api-test-cv.pdf',
          },
        ],
      },
    });

    assert.equal(createdApplication.response.status, 201);
    assert.equal(createdApplication.payload.application.status, 'blind_review');
    state.firstApplicationId = createdApplication.payload.application.id;

    const invalidMerit = await requestJson(
      `/api/candidate/applications/${state.firstApplicationId}/merit-test/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.candidateToken}`,
        },
        body: {
          answers: 'not-an-array',
        },
      },
    );

    assert.equal(invalidMerit.response.status, 400);

    const meritSubmit = await requestJson(
      `/api/candidate/applications/${state.firstApplicationId}/merit-test/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.candidateToken}`,
        },
        body: {
          answers: [1, 1, 1],
        },
      },
    );

    assert.equal(meritSubmit.response.status, 200);
    assert.equal(meritSubmit.payload.score, 100);
    assert.equal(meritSubmit.payload.application.status, 'ranking');

    const secondApplication = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Bosh Mutaxassis',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        maskedData: {
          skills: ['Excel'],
          experience: 'API TEST low-score anomaly application',
          education: 'TDIU',
          summary: 'Conflict scenario',
        },
      },
    });

    assert.equal(secondApplication.response.status, 201);
    state.secondApplicationId = secondApplication.payload.application.id;
  });

  await t.test('hr dashboard, filtering, status update, anomaly, and export work', async () => {
    const dashboard = await requestJson('/api/hr/dashboard', {
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
    });

    assert.equal(dashboard.response.status, 200);
    assert.ok(dashboard.payload.applications.length >= 1);

    const filtered = await requestJson(
      `/api/hr/applications?search=${encodeURIComponent(testRunId)}`,
      {
        headers: {
          Authorization: `Bearer ${state.hrToken}`,
        },
      },
    );

    assert.equal(filtered.response.status, 200);
    assert.ok(filtered.payload.applications.length >= 2);

    const invalidStatus = await requestJson(
      `/api/hr/applications/${state.secondApplicationId}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${state.hrToken}`,
        },
        body: {
          status: 'done',
        },
      },
    );

    assert.equal(invalidStatus.response.status, 400);

    const hired = await requestJson(
      `/api/hr/applications/${state.secondApplicationId}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${state.hrToken}`,
        },
        body: {
          status: 'hired',
        },
      },
    );

    assert.equal(hired.response.status, 200);
    assert.equal(hired.payload.application.status, 'hired');

    const anomalies = await requestJson('/api/hr/anomalies', {
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
    });

    assert.equal(anomalies.response.status, 200);
    assert.ok(
      anomalies.payload.anomalies.some(
        (anomaly) =>
          anomaly.applicationId === state.secondApplicationId &&
          /past ball/i.test(anomaly.message),
      ),
    );

    const exportCsv = await requestText('/api/hr/export/applications.csv', {
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
    });

    assert.equal(exportCsv.response.status, 200);
    assert.match(exportCsv.payload, /candidate_code,candidate_name/i);
    assert.match(exportCsv.payload, /Api Test Candidate/i);
  });

  await t.test('admin analytics, reports, and exports work', async () => {
    const dashboard = await requestJson('/api/admin/dashboard', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(dashboard.response.status, 200);
    assert.ok(dashboard.payload.cases.length >= 1);
    assert.ok(dashboard.payload.candidates.length >= 1);

    const cases = await requestJson('/api/admin/cases', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(cases.response.status, 200);
    assert.ok(cases.payload.cases.length >= 1);

    const candidates = await requestJson('/api/admin/candidates', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(candidates.response.status, 200);
    assert.ok(candidates.payload.candidates.some((candidate) => candidate.id === state.registeredCandidateId));

    const invalidReport = await requestJson('/api/admin/reports', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
      body: {
        reportType: 'system',
        title: `${reportTitlePrefix} invalid`,
      },
    });

    assert.equal(invalidReport.response.status, 400);

    const createdReport = await requestJson('/api/admin/reports', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
      body: {
        reportType: 'application',
        referenceId: state.secondApplicationId,
        title: `${reportTitlePrefix} suspicious selection`,
        message: 'API TEST admin report body',
        severity: 'high',
      },
    });

    assert.equal(createdReport.response.status, 201);
    state.reportId = createdReport.payload.report.id;

    const reports = await requestJson('/api/admin/reports', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(reports.response.status, 200);
    assert.ok(reports.payload.reports.some((report) => report.id === state.reportId));

    const reportsCsv = await requestText('/api/admin/reports/export.csv', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(reportsCsv.response.status, 200);
    assert.match(reportsCsv.payload, /report_type,reference_id,title/i);
    assert.match(reportsCsv.payload, new RegExp(reportTitlePrefix));

    const dashboardCsv = await requestText('/api/admin/export/dashboard.csv', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(dashboardCsv.response.status, 200);
    assert.match(dashboardCsv.payload, /section,id,name/i);
    assert.match(dashboardCsv.payload, /candidate/i);
  });
});
