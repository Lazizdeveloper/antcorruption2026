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
const samplePdfBase64 = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
  'utf8',
).toString('base64');

let baseUrl = '';
let server;

const state = {
  adminToken: '',
  hrToken: '',
  candidateToken: '',
  registeredCandidateId: '',
  firstApplicationId: '',
  secondApplicationId: '',
  thirdApplicationId: '',
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
         OR (
           report_type = 'application'
           AND reference_id IN (
             SELECT id::text
             FROM applications
             WHERE candidate_email = $2
           )
         )
    `,
    [`${reportTitlePrefix}%`, testEmail],
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

async function uploadApplicationDocument(token, fileName) {
  const { response, payload } = await requestJson('/api/uploads/application-document', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      fileName,
      mimeType: 'application/pdf',
      contentBase64: samplePdfBase64,
    },
  });

  assert.equal(response.status, 201);
  assert.equal(payload.mimeType, 'application/pdf');
  assert.match(payload.url, /\/uploads\/application-documents\//);

  return {
    name: fileName,
    url: payload.url,
    mimeType: payload.mimeType,
    sizeKb: payload.sizeKb,
  };
}

async function buildRequiredDocuments(token, suffix = '') {
  const normalizedSuffix = suffix ? `-${suffix}` : '';
  const [diploma, passport, certificate, employment] = await Promise.all([
    uploadApplicationDocument(token, `diploma${normalizedSuffix}.pdf`),
    uploadApplicationDocument(token, `passport${normalizedSuffix}.pdf`),
    uploadApplicationDocument(token, `certificate${normalizedSuffix}.pdf`),
    uploadApplicationDocument(token, `employment${normalizedSuffix}.pdf`),
  ]);

  return [
    { ...diploma, type: 'diploma' },
    { ...passport, type: 'passport' },
    { ...certificate, type: 'certificate' },
    { ...employment, type: 'employment' },
  ];
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
    const originalGender = dashboard.payload.candidate.gender;

    state.registeredCandidateId = dashboard.payload.candidate.id;

    const profileUpdate = await requestJson('/api/candidate/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        phone: '+998909999999',
        gender: 'Ayol',
        connections: ['API TEST relationship update'],
      },
    });

    assert.equal(profileUpdate.response.status, 200);
    assert.equal(profileUpdate.payload.candidate.phone, '+998909999999');
    assert.equal(profileUpdate.payload.candidate.gender, originalGender);
  });

  await t.test('candidate application and merit-test scenarios work', async () => {
    const requiredDocuments = await buildRequiredDocuments(state.candidateToken);

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

    const missingDocuments = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Katta Iqtisodchi',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        phone: '+998909999999',
        telegram: '@apitest_candidate',
      },
    });

    assert.equal(missingDocuments.response.status, 400);
    assert.match(missingDocuments.payload.message, /hujjat/i);

    const invalidPhone = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Katta Iqtisodchi',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        phone: '+998 90 999 99 99',
        telegram: '@apitest_candidate',
        documents: requiredDocuments,
      },
    });

    assert.equal(invalidPhone.response.status, 400);
    assert.match(invalidPhone.payload.message, /telefon/i);

    const invalidTelegram = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Katta Iqtisodchi',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        phone: '+998909999999',
        telegram: '@bad-name',
        documents: requiredDocuments,
      },
    });

    assert.equal(invalidTelegram.response.status, 400);
    assert.match(invalidTelegram.payload.message, /telegram/i);

    const createdApplication = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Katta Iqtisodchi',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        phone: '+998909999999',
        telegram: '@apitest_candidate',
        maskedData: {
          skills: ['Excel', 'Budgeting', 'SQL'],
          experience: '2 yil iqtisodchi yordamchisi.',
          education: 'TDIU',
          summary: 'API test candidate profile',
        },
        documents: requiredDocuments,
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
        phone: '+998909999999',
        telegram: '@apitest_candidate_2',
        maskedData: {
          skills: ['Excel'],
          experience: 'API TEST low-score anomaly application',
          education: 'TDIU',
          summary: 'Conflict scenario',
        },
        documents: await buildRequiredDocuments(state.candidateToken, 'second'),
      },
    });

    assert.equal(secondApplication.response.status, 201);
    state.secondApplicationId = secondApplication.payload.application.id;

    const thirdApplication = await requestJson('/api/candidate/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.candidateToken}`,
      },
      body: {
        position: 'Bosh Mutaxassis',
        department: 'Iqtisodiyot va Moliya Vazirligi',
        phone: '+998909999999',
        telegram: '@apitest_candidate_3',
        maskedData: {
          skills: ['Excel'],
          experience: 'API TEST ai-only risk application',
          education: 'TDIU',
          summary: 'AI red without conflict',
        },
        documents: await buildRequiredDocuments(state.candidateToken, 'third'),
      },
    });

    assert.equal(thirdApplication.response.status, 201);
    state.thirdApplicationId = thirdApplication.payload.application.id;
  });

  await t.test('hr dashboard, filtering, status update, anomaly, and export work', async () => {
    const dashboard = await requestJson('/api/hr/dashboard', {
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
    });

    assert.equal(dashboard.response.status, 200);
    assert.ok(dashboard.payload.applications.length >= 1);
    assert.equal(dashboard.payload.profile.email, 'hr@ethicflow.uz');

    const profileUpdate = await requestJson('/api/hr/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
      body: {
        firstName: 'Abbos',
        lastName: 'Karimov',
        middleName: "Anvar o'g'li",
        phone: '+998902222222',
        passportNumber: 'AA1234567',
        passportPinfl: '30201011234567',
      },
    });

    assert.equal(profileUpdate.response.status, 200);
    assert.equal(profileUpdate.payload.profile.phone, '+998902222222');
    assert.equal(profileUpdate.payload.profile.passportNumber, 'AA1234567');

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
    assert.ok(
      filtered.payload.applications.every(
        (application) =>
          Array.isArray(application.documents) &&
          application.documents.every((document) => document.type !== 'passport'),
      ),
    );

    const applicationDetail = await requestJson(`/api/hr/applications/${state.firstApplicationId}`, {
      headers: {
        Authorization: `Bearer ${state.hrToken}`,
      },
    });

    assert.equal(applicationDetail.response.status, 200);
    assert.ok(
      applicationDetail.payload.application.documents.every(
        (document) => document.type !== 'passport',
      ),
    );

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

    await query(
      `
        UPDATE applications
        SET
          score = 33,
          merit_score = 33,
          conflict_detected = FALSE,
          conflict_details = NULL,
          review_status = 'shortlisted',
          candidate_stage = 'ranking',
          updated_at = NOW()
        WHERE id = $1
      `,
      [state.thirdApplicationId],
    );

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

    const autoReports = await requestJson('/api/admin/reports', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(autoReports.response.status, 200);
    const conflictHireReport = autoReports.payload.reports.find(
      (report) =>
        report.referenceId === state.secondApplicationId &&
        report.details?.kind === 'conflict_hire_alert',
    );

    assert.ok(conflictHireReport);
    assert.match(conflictHireReport.title, /Riskli qabul/i);
    assert.equal(conflictHireReport.details.organization, 'Iqtisodiyot va Moliya Vazirligi');
    assert.equal(conflictHireReport.details.hr.email, 'hr@ethicflow.uz');
    assert.equal(conflictHireReport.details.candidate.code, state.registeredCandidateId);
    assert.equal(conflictHireReport.details.candidate.telegram, '@apitest_candidate_2');
    assert.equal(conflictHireReport.details.reasonSummary, 'AI ball qizil va audit xulosasi qizil');
    assert.equal(conflictHireReport.details.riskFlags.lowAiScore, true);
    assert.equal(conflictHireReport.details.riskFlags.auditConflict, true);
    assert.equal(conflictHireReport.details.auditStatus, 'CONFLICT');

    const aiOnlyHired = await requestJson(
      `/api/hr/applications/${state.thirdApplicationId}/status`,
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

    assert.equal(aiOnlyHired.response.status, 200);
    assert.equal(aiOnlyHired.payload.application.status, 'hired');

    const refreshedReports = await requestJson('/api/admin/reports', {
      headers: {
        Authorization: `Bearer ${state.adminToken}`,
      },
    });

    assert.equal(refreshedReports.response.status, 200);
    const aiOnlyReport = refreshedReports.payload.reports.find(
      (report) =>
        report.referenceId === state.thirdApplicationId &&
        report.details?.kind === 'conflict_hire_alert',
    );

    assert.ok(aiOnlyReport);
    assert.equal(aiOnlyReport.details.reasonSummary, 'AI ball qizil');
    assert.equal(aiOnlyReport.details.riskFlags.lowAiScore, true);
    assert.equal(aiOnlyReport.details.riskFlags.auditConflict, false);
    assert.equal(aiOnlyReport.details.auditStatus, 'CLEAN');

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
          /qizil/i.test(anomaly.message),
      ),
    );
    assert.ok(
      anomalies.payload.anomalies.some(
        (anomaly) =>
          anomaly.applicationId === state.thirdApplicationId &&
          /ai ball qizil/i.test(anomaly.message),
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
    assert.ok(dashboard.payload.notifications.length >= 1);
    assert.ok(
      dashboard.payload.notifications.some((notification) =>
        /AI ball qizil/i.test(notification.text),
      ),
    );
    assert.ok(
      dashboard.payload.notifications.some((notification) =>
        typeof notification.text === 'string' && notification.createdAt,
      ),
    );

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
    const flaggedCandidate = candidates.payload.candidates.find(
      (candidate) => candidate.id === state.registeredCandidateId,
    );
    assert.ok(flaggedCandidate);
    assert.equal(flaggedCandidate.hiringAlert.organization, 'Iqtisodiyot va Moliya Vazirligi');
    assert.equal(flaggedCandidate.hiringAlert.hr.fullName, 'Abbos Karimov');
    assert.equal(flaggedCandidate.hiringAlert.candidate.phone, '+998909999999');

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
