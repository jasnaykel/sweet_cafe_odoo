/**
 * CTRL QA - Authentication Tests
 * Tests para validar flujos de autenticación
 */

import { test, expect } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

test.describe("🔐 Authentication - Login", () => {
  test.beforeEach(async ({ page }) => {
    // Ir a la página de login antes de cada test
    await page.goto(`${FRONTEND_URL}/auth/login`);
  });

  test("Página de login carga correctamente", async ({ page }) => {
    // Verificar elementos esenciales
    await expect(page).toHaveTitle(/CTRL|Login/i);
    await expect(
      page.getByRole("heading", { name: /login|iniciar sesión/i }),
    ).toBeVisible();

    // Verificar campos del formulario
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|contraseña/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /login|iniciar|entrar/i }),
    ).toBeVisible();
  });

  test("Muestra error con credenciales inválidas", async ({ page }) => {
    // Intentar login con credenciales incorrectas
    await page.getByLabel(/email/i).fill("invalid@test.com");
    await page.getByLabel(/password|contraseña/i).fill("wrongpassword");
    await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();

    // Verificar mensaje de error
    await expect(
      page.getByText(/invalid|error|incorrect|inválido/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Muestra error cuando campos están vacíos", async ({ page }) => {
    // Click en login sin llenar campos
    await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();

    // Verificar validación
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBeTruthy();
  });

  test("Link a registro/signup visible", async ({ page }) => {
    // Verificar enlace a registro
    const signupLink = page.getByRole("link", {
      name: /register|sign up|registrar|crear cuenta/i,
    });
    await expect(signupLink).toBeVisible();
  });

  test("Link a recuperar contraseña visible", async ({ page }) => {
    // Verificar enlace de forgot password
    const forgotLink = page.getByRole("link", {
      name: /forgot|recover|olvidé|recuperar/i,
    });
    await expect(forgotLink).toBeVisible();
  });
});

test.describe("🔐 Authentication - Candidate Login", () => {
  test("Login exitoso como candidato", async ({ page }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    await page.goto(`${FRONTEND_URL}/auth/login`);

    // Llenar formulario
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password|contraseña/i).fill(password);
    await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();

    // Verificar redirección a dashboard
    await expect(page).toHaveURL(/dashboard|home|assessment/i, {
      timeout: 15000,
    });
  });

  test("Candidato ve dashboard después de login", async ({ page }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password|contraseña/i).fill(password);
    await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();

    // Verificar elementos del dashboard
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });
    await expect(page.getByRole("heading")).toBeVisible();
  });
});

test.describe("🔐 Authentication - Admin Login", () => {
  test("Login exitoso como admin", async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL || "admin@test.com";
    const password = process.env.TEST_ADMIN_PASSWORD || "admin123";

    await page.goto(`${FRONTEND_URL}/auth/login`);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password|contraseña/i).fill(password);
    await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();

    // Admin debe ir a panel de admin
    await expect(page).toHaveURL(/admin|dashboard/i, { timeout: 15000 });
  });
});

test.describe("🔐 Authentication - Logout", () => {
  test("Logout funciona correctamente", async ({ page }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    // Login primero
    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password|contraseña/i).fill(password);
    await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();
    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });

    // Buscar y hacer click en logout
    const logoutButton = page.getByRole("button", {
      name: /logout|salir|cerrar sesión/i,
    });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Buscar en menú de usuario
      await page.getByRole("button", { name: /user|menu|perfil/i }).click();
      await page.getByRole("menuitem", { name: /logout|salir/i }).click();
    }

    // Verificar redirección a login
    await expect(page).toHaveURL(/login|auth/i, { timeout: 10000 });
  });
});
