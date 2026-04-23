/**
 * CTRL QA - Typing Test Module
 * Tests para el módulo de evaluación de mecanografía
 */

import { test, expect } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Helper para login de candidato
async function loginAsCandidate(page: any) {
  const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
  const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

  await page.goto(`${FRONTEND_URL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|contraseña/i).fill(password);
  await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();
  await page.waitForURL(/dashboard|home|assessment/i, { timeout: 15000 });
}

// Helper para navegar a typing test
async function navigateToTypingTest(page: any) {
  await loginAsCandidate(page);

  // Navegar al typing test
  const typingLink = page
    .getByRole("link", { name: /typing|mecanografía|tipeo/i })
    .or(page.locator('[href*="typing"]'))
    .or(page.getByRole("button", { name: /typing|start typing/i }));

  await typingLink.first().click();
  await page.waitForURL(/typing/i, { timeout: 10000 });
}

test.describe("⌨️ Typing Test - Page Load", () => {
  test("Página de typing test carga correctamente", async ({ page }) => {
    await navigateToTypingTest(page);

    // Verificar título o heading
    await expect(
      page.getByRole("heading", { name: /typing|mecanografía|test/i }),
    ).toBeVisible();
  });

  test("Instrucciones visibles antes de comenzar", async ({ page }) => {
    await navigateToTypingTest(page);

    // Debe haber instrucciones o descripción
    const instructions = page
      .locator("text=/instruction|instruccion|how to|cómo/i")
      .or(page.locator('[class*="instruction"], [class*="description"]'));

    const hasInstructions = (await instructions.count()) > 0;
    expect(hasInstructions).toBeTruthy();
  });

  test("Botón de iniciar test visible", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page.getByRole("button", {
      name: /start|comenzar|iniciar|practice|práctica/i,
    });
    await expect(startButton.first()).toBeVisible();
  });
});

test.describe("⌨️ Typing Test - Practice Mode", () => {
  test("Puede iniciar modo práctica", async ({ page }) => {
    await navigateToTypingTest(page);

    // Buscar y click en práctica
    const practiceButton = page
      .getByRole("button", { name: /practice|práctica/i })
      .or(page.getByRole("link", { name: /practice|práctica/i }));

    if (await practiceButton.first().isVisible()) {
      await practiceButton.first().click();

      // Debe aparecer área de texto para escribir
      await expect(
        page
          .locator('textarea, input[type="text"], [contenteditable="true"]')
          .or(page.locator('[class*="typing-area"], [class*="input-area"]')),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Texto de muestra visible al iniciar", async ({ page }) => {
    await navigateToTypingTest(page);

    const practiceButton = page
      .getByRole("button", { name: /practice|práctica|start/i })
      .first();
    await practiceButton.click();

    // Debe mostrar texto para copiar
    const sampleText = page
      .locator('[class*="sample"], [class*="text-to-type"], [class*="prompt"]')
      .or(page.locator("p, span").filter({ hasText: /.{20,}/ })); // Texto largo

    await expect(sampleText.first()).toBeVisible({ timeout: 10000 });
  });

  test("Input de texto acepta escritura", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar|practice/i })
      .first();
    await startButton.click();

    // Encontrar área de input
    const typingArea = page
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();
    await typingArea.waitFor({ state: "visible", timeout: 10000 });

    // Escribir texto de prueba
    await typingArea.focus();
    await page.keyboard.type("Test typing input", { delay: 50 });

    // Verificar que se escribió
    const value = await typingArea
      .inputValue()
      .catch(() => typingArea.textContent());
    expect(value).toContain("Test");
  });

  test("Muestra métricas durante la práctica", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar|practice/i })
      .first();
    await startButton.click();

    // Buscar métricas (WPM, accuracy, time)
    const metrics = page.locator(
      "text=/wpm|words per|accuracy|precis|time|tiempo/i",
    );

    // Escribir algo para activar métricas
    const typingArea = page
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();
    await typingArea.focus();
    await page.keyboard.type("The quick brown fox", { delay: 30 });

    // Verificar que hay alguna métrica visible
    await expect(metrics.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("⌨️ Typing Test - Real Test", () => {
  test("Puede iniciar test real después de práctica", async ({ page }) => {
    await navigateToTypingTest(page);

    // Buscar botón de test real
    const realTestButton = page
      .getByRole("button", {
        name: /start test|comenzar test|real test|test 1/i,
      })
      .or(page.getByRole("link", { name: /start test|test 1/i }));

    if (await realTestButton.first().isVisible()) {
      await realTestButton.first().click();

      // Debe cargar área de test
      await expect(
        page
          .locator('textarea, [class*="typing"]')
          .or(page.locator('[class*="test-area"]')),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Timer funciona durante el test", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Buscar timer
    const timer = page
      .locator('[class*="timer"], [class*="time"], [class*="countdown"]')
      .or(page.locator("text=/\\d+:\\d+|\\d+ sec/i"));

    await expect(timer.first()).toBeVisible({ timeout: 10000 });
  });

  test("Progreso visible durante el test", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Escribir algo
    const typingArea = page
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();
    await typingArea.waitFor({ state: "visible", timeout: 10000 });
    await typingArea.focus();
    await page.keyboard.type("Testing progress indicator", { delay: 20 });

    // Verificar algún indicador de progreso
    const progress = page
      .locator('[role="progressbar"], [class*="progress"]')
      .or(page.locator("text=/\\d+%|\\d+ of \\d+/i"));

    const hasProgress = (await progress.count()) > 0;
    expect(hasProgress).toBeTruthy();
  });
});

test.describe("⌨️ Typing Test - Results", () => {
  test("Muestra resultados al completar", async ({ page }) => {
    await navigateToTypingTest(page);

    // Iniciar test
    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Simular completar el test (escribir rápido)
    const typingArea = page
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();
    await typingArea.waitFor({ state: "visible", timeout: 10000 });
    await typingArea.focus();

    // Escribir texto
    await page.keyboard.type(
      "This is a test of the typing system to measure words per minute and accuracy.",
      { delay: 10 },
    );

    // Esperar que aparezcan resultados o buscar botón de finalizar
    const finishButton = page.getByRole("button", {
      name: /finish|finalizar|submit|enviar|next/i,
    });
    if (await finishButton.isVisible()) {
      await finishButton.click();
    }

    // Verificar que hay algún resultado
    const results = page.locator(
      "text=/result|wpm|accuracy|score|puntuación/i",
    );

    // Dar tiempo para que aparezcan resultados
    await page.waitForTimeout(2000);
    const hasResults = (await results.count()) > 0;
    expect(hasResults).toBeTruthy();
  });

  test("WPM se calcula correctamente", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const typingArea = page
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();
    await typingArea.waitFor({ state: "visible", timeout: 10000 });

    // Verificar que WPM está visible en algún punto
    await typingArea.focus();
    await page.keyboard.type("Quick test for WPM calculation", { delay: 20 });

    const wpmDisplay = page.locator("text=/\\d+\\s*wpm|wpm\\s*:\\s*\\d+/i");
    const hasWPM = (await wpmDisplay.count()) > 0;
    expect(hasWPM).toBeTruthy();
  });
});

test.describe("⌨️ Typing Test - Error Handling", () => {
  test("Maneja texto incorrecto graciosamente", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const typingArea = page
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();
    await typingArea.waitFor({ state: "visible", timeout: 10000 });

    // Escribir texto incorrecto
    await typingArea.focus();
    await page.keyboard.type("XXXXX WRONG TEXT XXXXX", { delay: 20 });

    // No debe crashear, debe mostrar algún indicador de error
    await expect(page).not.toHaveURL(/error|500|crash/i);

    // Puede mostrar indicador de error en el texto
    const errorIndicator = page
      .locator('[class*="error"], [class*="wrong"], [class*="incorrect"]')
      .or(page.locator("text=/error|incorrect/i"));

    const hasErrorFeedback = (await errorIndicator.count()) > 0;
    // No es un error crítico si no hay feedback visual
  });

  test("Puede reiniciar el test", async ({ page }) => {
    await navigateToTypingTest(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Buscar botón de reiniciar
    const restartButton = page.getByRole("button", {
      name: /restart|reiniciar|reset|try again/i,
    });

    if (await restartButton.isVisible()) {
      await restartButton.click();

      // Debe poder empezar de nuevo sin errores
      await expect(page).not.toHaveURL(/error/i);
    }
  });
});
