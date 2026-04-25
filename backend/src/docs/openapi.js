export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'EthicFlow Backend API',
    version: '1.1.0',
    description:
      'Node.js + PostgreSQL backend for the admin, hr, and kadr panels. Includes authentication, candidate flows, HR review APIs, admin analytics, reporting, exports, and Swagger UI.',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@ethicflow.uz' },
          password: { type: 'string', example: 'Admin123!' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'Aziz Karimov' },
          email: { type: 'string', example: 'candidate2@ethicflow.uz' },
          password: { type: 'string', example: 'Candidate123!' },
          phone: { type: 'string', example: '+998901234567' },
          gender: { type: 'string', example: 'Erkak' },
          birthPlace: { type: 'string', example: 'Toshkent' },
          photoUrl: { type: 'string', example: 'https://example.com/photo.jpg' },
          connections: {
            type: 'array',
            items: { type: 'string' },
            example: ['Tanish: Vazirlik bo‘lim boshlig‘i'],
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'hr', 'candidate'] },
          department: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      CandidateApplicationCreate: {
        type: 'object',
        required: ['position', 'department'],
        properties: {
          position: { type: 'string', example: 'Katta Iqtisodchi' },
          department: { type: 'string', example: 'Iqtisodiyot va Moliya Vazirligi' },
          phone: { type: 'string', example: '+998901234567' },
          telegram: { type: 'string', example: '@aziz_candidate' },
          maskedData: {
            type: 'object',
            properties: {
              skills: { type: 'array', items: { type: 'string' } },
              experience: { type: 'string' },
              education: { type: 'string' },
              summary: { type: 'string' },
            },
          },
          documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                url: { type: 'string' },
              },
            },
          },
        },
      },
      MeritSubmitRequest: {
        type: 'object',
        required: ['answers'],
        properties: {
          answers: {
            type: 'array',
            items: { type: 'integer' },
            example: [1, 1, 1],
          },
        },
      },
      HrStatusUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'],
          },
        },
      },
      ReportCreateRequest: {
        type: 'object',
        required: ['reportType', 'title', 'message', 'severity'],
        properties: {
          reportType: {
            type: 'string',
            enum: ['case', 'candidate', 'application', 'system'],
          },
          referenceId: { type: 'string', nullable: true },
          title: { type: 'string', example: 'Shubhali tanlov harakati' },
          message: { type: 'string', example: 'Nomzod past ball bo‘lsa ham tanlashga urinish bo‘ldi.' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'API is healthy',
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a candidate account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Candidate registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Get current user',
        responses: {
          200: {
            description: 'Current authenticated user',
          },
        },
      },
    },
    '/api/candidate/dashboard': {
      get: {
        tags: ['Candidate'],
        security: [{ bearerAuth: [] }],
        summary: 'Get candidate dashboard data',
        responses: {
          200: { description: 'Candidate dashboard payload' },
        },
      },
    },
    '/api/candidate/profile': {
      put: {
        tags: ['Candidate'],
        security: [{ bearerAuth: [] }],
        summary: 'Update candidate profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
              },
            },
          },
        },
        responses: {
          200: { description: 'Candidate profile updated' },
        },
      },
    },
    '/api/candidate/applications': {
      get: {
        tags: ['Candidate'],
        security: [{ bearerAuth: [] }],
        summary: 'List candidate applications',
        responses: {
          200: { description: 'Candidate applications list' },
        },
      },
      post: {
        tags: ['Candidate'],
        security: [{ bearerAuth: [] }],
        summary: 'Create a candidate application',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CandidateApplicationCreate' },
            },
          },
        },
        responses: {
          201: { description: 'Application created' },
        },
      },
    },
    '/api/candidate/applications/{id}/merit-test/submit': {
      post: {
        tags: ['Candidate'],
        security: [{ bearerAuth: [] }],
        summary: 'Submit merit test answers',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MeritSubmitRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Merit score calculated' },
        },
      },
    },
    '/api/hr/dashboard': {
      get: {
        tags: ['HR'],
        security: [{ bearerAuth: [] }],
        summary: 'Get HR dashboard data',
        responses: {
          200: { description: 'HR dashboard payload' },
        },
      },
    },
    '/api/hr/applications': {
      get: {
        tags: ['HR'],
        security: [{ bearerAuth: [] }],
        summary: 'List HR applications',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'department', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Applications list' },
        },
      },
    },
    '/api/hr/applications/{id}': {
      get: {
        tags: ['HR'],
        security: [{ bearerAuth: [] }],
        summary: 'Get one application',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Application detail' },
        },
      },
    },
    '/api/hr/applications/{id}/status': {
      patch: {
        tags: ['HR'],
        security: [{ bearerAuth: [] }],
        summary: 'Update application status',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HrStatusUpdateRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
        },
      },
    },
    '/api/hr/anomalies': {
      get: {
        tags: ['HR'],
        security: [{ bearerAuth: [] }],
        summary: 'List anomalies',
        responses: {
          200: { description: 'Anomalies list' },
        },
      },
    },
    '/api/hr/export/applications.csv': {
      get: {
        tags: ['HR'],
        security: [{ bearerAuth: [] }],
        summary: 'Export HR applications as CSV',
        responses: {
          200: { description: 'CSV export' },
        },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Get admin dashboard data',
        responses: {
          200: { description: 'Admin dashboard payload' },
        },
      },
    },
    '/api/admin/cases': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'List integrity cases',
        responses: {
          200: { description: 'Case list' },
        },
      },
    },
    '/api/admin/candidates': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'List recruitment candidates for admin panel',
        responses: {
          200: { description: 'Candidate cards' },
        },
      },
    },
    '/api/admin/reports': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'List integrity reports',
        responses: {
          200: { description: 'Report list' },
        },
      },
      post: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Create integrity report',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportCreateRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Report created' },
        },
      },
    },
    '/api/admin/reports/export.csv': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Export reports as CSV',
        responses: {
          200: { description: 'CSV export' },
        },
      },
    },
    '/api/admin/export/dashboard.csv': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Export admin dashboard summary as CSV',
        responses: {
          200: { description: 'CSV export' },
        },
      },
    },
  },
};
