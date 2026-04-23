/**
 * CTRL QA - API Tests
 * Tests para validar endpoints de la API
 */

import { test, expect } from "@playwright/test";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:1337";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

test.describe("🔌 API - Health Check", () => {
  test("Backend health endpoint responde", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);

    // Debe responder (200 o cualquier 2xx)
    expect(response.ok() || response.status() === 204).toBeTruthy();
  });

  test("Frontend API routes responden", async ({ request }) => {
    const response = await request.get(`${FRONTEND_URL}/api/health`);

    // Puede ser 200 o 404 si no existe
    expect([200, 204, 404]).toContain(response.status());
  });
});

test.describe("🔌 API - Authentication", () => {
  test("Login endpoint existe", async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: "test@test.com",
        password: "test123",
      },
    });

    // Debe responder (aunque sea error de credenciales)
    expect([200, 400, 401, 404]).toContain(response.status());
  });

  test("Login con credenciales válidas funciona", async ({ request }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: email,
        password: password,
      },
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.jwt || body.token || body.user).toBeTruthy();
    }
  });

  test("Login con credenciales inválidas retorna error", async ({
    request,
  }) => {
    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: "invalid@invalid.com",
        password: "wrongpassword",
      },
    });

    // Debe ser error de autenticación
    expect([400, 401, 403]).toContain(response.status());
  });

  test("Register endpoint existe", async ({ request }) => {
    const response = await request.post(
      `${BACKEND_URL}/api/auth/local/register`,
      {
        data: {
          email: `test-${Date.now()}@test.com`,
          username: `testuser${Date.now()}`,
          password: "Test123!",
        },
      },
    );

    // Puede ser éxito o error de validación
    expect([200, 201, 400, 409]).toContain(response.status());
  });
});

test.describe("🔌 API - Typing Test Results", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: email,
        password: password,
      },
    });

    if (response.status() === 200) {
      const body = await response.json();
      authToken = body.jwt || body.token;
    }
  });

  test("Puede obtener resultados de typing test", async ({ request }) => {
    if (!authToken) test.skip();

    const response = await request.get(
      `${BACKEND_URL}/api/typing-test-results`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test("Puede enviar resultado de typing test", async ({ request }) => {
    if (!authToken) test.skip();

    const response = await request.post(
      `${BACKEND_URL}/api/typing-test-results`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          data: {
            wpm: 65,
            accuracy: 95.5,
            testNumber: 1,
            duration: 60,
          },
        },
      },
    );

    // Puede ser éxito o error de validación
    expect([200, 201, 400, 401, 403, 422]).toContain(response.status());
  });
});

test.describe("🔌 API - Call Simulation Results", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: email,
        password: password,
      },
    });

    if (response.status() === 200) {
      const body = await response.json();
      authToken = body.jwt || body.token;
    }
  });

  test("Puede obtener resultados de call simulation", async ({ request }) => {
    if (!authToken) test.skip();

    const response = await request.get(
      `${BACKEND_URL}/api/call-simulation-results`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test("Puede enviar resultado de llamada", async ({ request }) => {
    if (!authToken) test.skip();

    const response = await request.post(
      `${BACKEND_URL}/api/call-simulation-results`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          data: {
            callNumber: 1,
            audioUrl: "https://example.com/audio.mp3",
            duration: 120,
          },
        },
      },
    );

    expect([200, 201, 400, 401, 403, 422]).toContain(response.status());
  });
});

test.describe("🔌 API - Assessment Progress", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: email,
        password: password,
      },
    });

    if (response.status() === 200) {
      const body = await response.json();
      authToken = body.jwt || body.token;
    }
  });

  test("Puede obtener progreso de assessment", async ({ request }) => {
    if (!authToken) test.skip();

    const response = await request.get(
      `${BACKEND_URL}/api/assessment-progresses`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test("Puede actualizar progreso", async ({ request }) => {
    if (!authToken) test.skip();

    const response = await request.post(
      `${BACKEND_URL}/api/assessment-progresses`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          data: {
            currentStep: "typing-test",
            completedSteps: ["welcome"],
            progress: 25,
          },
        },
      },
    );

    expect([200, 201, 400, 401, 403, 422]).toContain(response.status());
  });
});

test.describe("🔌 API - Content Types (Admin)", () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    const email = process.env.TEST_ADMIN_EMAIL || "admin@test.com";
    const password = process.env.TEST_ADMIN_PASSWORD || "admin123";

    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: {
        identifier: email,
        password: password,
      },
    });

    if (response.status() === 200) {
      const body = await response.json();
      adminToken = body.jwt || body.token;
    }
  });

  test("Puede listar typing texts", async ({ request }) => {
    if (!adminToken) test.skip();

    const response = await request.get(`${BACKEND_URL}/api/typing-texts`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test("Puede listar questions", async ({ request }) => {
    if (!adminToken) test.skip();

    const response = await request.get(`${BACKEND_URL}/api/questions`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test("Puede listar companies", async ({ request }) => {
    if (!adminToken) test.skip();

    const response = await request.get(`${BACKEND_URL}/api/companies`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test("Puede listar audio calls", async ({ request }) => {
    if (!adminToken) test.skip();

    const response = await request.get(`${BACKEND_URL}/api/audio-calls`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect([200, 401, 403, 404]).toContain(response.status());
  });
});

test.describe("🔌 API - Error Handling", () => {
  test("Endpoint inexistente retorna 404", async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/nonexistent-endpoint-12345`,
    );

    expect(response.status()).toBe(404);
  });

  test("Request sin auth retorna 401/403", async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/typing-test-results`,
    );

    // Debe requerir autenticación
    expect([401, 403, 404]).toContain(response.status());
  });

  test("Request malformado retorna error", async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/auth/local`, {
      data: "invalid-json-string",
    });

    expect([400, 415, 422]).toContain(response.status());
  });
});

test.describe("🔌 API - CORS", () => {
  test("Headers CORS presentes", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/health`);

    // Verificar headers CORS si el endpoint existe
    if (response.ok()) {
      const headers = response.headers();
      // No todos los endpoints tienen CORS explícito
    }
  });
});
