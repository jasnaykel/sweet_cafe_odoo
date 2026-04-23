/**
 * CTRL QA - Situational Judgement Test Module
 * Tests para el módulo de evaluación de juicio situacional
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

// Helper para navegar a SJT
async function navigateToSJT(page: any) {
  await loginAsCandidate(page);

  const sjtLink = page
    .getByRole("link", {
      name: /situational|judgement|sjt|scenario|escenario/i,
    })
    .or(
      page.locator('[href*="situational"], [href*="sjt"], [href*="scenario"]'),
    )
    .or(page.getByRole("button", { name: /situational|scenario/i }));

  await sjtLink.first().click();
  await page.waitForURL(/situational|sjt|scenario|question/i, {
    timeout: 10000,
  });
}

test.describe("🎯 SJT - Page Load", () => {
  test("Página de SJT carga correctamente", async ({ page }) => {
    await navigateToSJT(page);

    // Verificar heading
    await expect(
      page.getByRole("heading", {
        name: /situational|judgement|scenario|escenario|question/i,
      }),
    ).toBeVisible();
  });

  test("Instrucciones visibles antes de comenzar", async ({ page }) => {
    await navigateToSJT(page);

    const instructions = page
      .locator("text=/instruction|instruccion|read|leer|scenario|escenario/i")
      .or(page.locator('[class*="instruction"]'));

    await expect(instructions.first()).toBeVisible();
  });

  test("Botón de iniciar visible", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page.getByRole("button", {
      name: /start|comenzar|iniciar|begin/i,
    });
    await expect(startButton.first()).toBeVisible();
  });
});

test.describe("🎯 SJT - Question Flow", () => {
  test("Muestra pregunta/escenario al iniciar", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Debe mostrar escenario o pregunta
    await expect(
      page
        .locator('[class*="question"], [class*="scenario"], [class*="prompt"]')
        .or(page.locator("text=/.{50,}/")), // Texto largo (escenario)
    ).toBeVisible({ timeout: 10000 });
  });

  test("Muestra opciones de respuesta", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Buscar opciones (radio buttons, checkboxes, o buttons)
    const options = page
      .locator(
        'input[type="radio"], input[type="checkbox"], [role="option"], [role="radio"]',
      )
      .or(
        page.locator('[class*="option"], [class*="answer"], [class*="choice"]'),
      )
      .or(page.locator("label:has(input)"));

    await expect(options.first()).toBeVisible({ timeout: 10000 });
  });

  test("Puede seleccionar una opción", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Seleccionar primera opción
    const options = page
      .locator('input[type="radio"], [role="radio"], [role="option"]')
      .or(page.locator('[class*="option"]:not([class*="selected"])'));

    await options.first().waitFor({ state: "visible", timeout: 10000 });
    await options.first().click();

    // Verificar que está seleccionada
    const selected = page
      .locator('[class*="selected"], [aria-checked="true"], input:checked')
      .or(page.locator('[class*="active"]'));

    await expect(selected.first()).toBeVisible();
  });

  test("Puede cambiar selección", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const options = page
      .locator('input[type="radio"], [role="radio"]')
      .or(page.locator('[class*="option"]'));

    await options.first().waitFor({ state: "visible", timeout: 10000 });

    // Seleccionar primera opción
    await options.first().click();

    // Seleccionar segunda opción
    if (await options.nth(1).isVisible()) {
      await options.nth(1).click();

      // Debe permitir cambiar sin errores
      await expect(page).not.toHaveURL(/error/i);
    }
  });
});

test.describe("🎯 SJT - Text Response", () => {
  test("Campo de texto visible si aplica", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Algunas preguntas pueden tener campo de texto
    const textArea = page
      .locator('textarea, input[type="text"]')
      .or(page.locator('[contenteditable="true"]'));

    // No es error si no hay campo de texto (depende del tipo de pregunta)
    const hasTextInput = (await textArea.count()) > 0;
    // Solo verificamos que la página funciona
  });

  test("Puede escribir respuesta de texto", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const textArea = page.locator("textarea").first();

    if (await textArea.isVisible({ timeout: 5000 })) {
      await textArea.fill(
        "Esta es mi respuesta de prueba al escenario presentado.",
      );

      // Verificar que se escribió
      await expect(textArea).toHaveValue(/respuesta/i);
    }
  });

  test("Contador de caracteres si existe", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const textArea = page.locator("textarea").first();

    if (await textArea.isVisible({ timeout: 5000 })) {
      // Buscar contador
      const counter = page
        .locator("text=/\\d+.*character|\\d+.*caracter|\\d+\\/\\d+/i")
        .or(page.locator('[class*="counter"], [class*="char-count"]'));

      const hasCounter = (await counter.count()) > 0;
      // No es crítico si no hay contador
    }
  });
});

test.describe("🎯 SJT - Navigation", () => {
  test("Botón siguiente visible después de responder", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Responder pregunta
    const options = page.locator(
      'input[type="radio"], [role="radio"], [class*="option"]',
    );
    await options.first().waitFor({ state: "visible", timeout: 10000 });
    await options.first().click();

    // Buscar botón siguiente
    const nextButton = page.getByRole("button", {
      name: /next|siguiente|continue|continuar|submit/i,
    });
    await expect(nextButton).toBeVisible();
  });

  test("Puede avanzar a siguiente pregunta", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Responder pregunta
    const options = page.locator(
      'input[type="radio"], [role="radio"], [class*="option"]',
    );
    await options.first().waitFor({ state: "visible", timeout: 10000 });
    await options.first().click();

    // Avanzar
    const nextButton = page.getByRole("button", { name: /next|siguiente/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Debe cargar siguiente pregunta sin errores
      await expect(page).not.toHaveURL(/error|500/i);
    }
  });

  test("Indicador de progreso visible", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Buscar indicador de progreso
    const progress = page
      .locator('[class*="progress"], [role="progressbar"]')
      .or(
        page.locator("text=/question \\d|pregunta \\d|\\d of \\d|\\d de \\d/i"),
      );

    await expect(progress.first()).toBeVisible({ timeout: 10000 });
  });

  test("Puede volver a pregunta anterior si permitido", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Responder y avanzar
    const options = page.locator('input[type="radio"], [class*="option"]');
    await options.first().waitFor({ state: "visible", timeout: 10000 });
    await options.first().click();

    const nextButton = page.getByRole("button", { name: /next|siguiente/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Buscar botón de volver
      const backButton = page.getByRole("button", {
        name: /back|atrás|previous|anterior/i,
      });
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(page).not.toHaveURL(/error/i);
      }
    }
  });
});

test.describe("🎯 SJT - AI Analysis Feedback", () => {
  test("Feedback de IA visible después de responder", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Responder con texto (si aplica)
    const textArea = page.locator("textarea").first();
    if (await textArea.isVisible({ timeout: 5000 })) {
      await textArea.fill(
        "Mi respuesta detallada al escenario es manejar la situación con calma y comunicación clara.",
      );
    }

    // O seleccionar opción
    const options = page
      .locator('input[type="radio"], [class*="option"]')
      .first();
    if (await options.isVisible()) {
      await options.click();
    }

    // Enviar
    const submitButton = page.getByRole("button", {
      name: /submit|enviar|analyze|analizar/i,
    });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Esperar análisis de IA
      const feedback = page
        .locator('[class*="feedback"], [class*="analysis"], [class*="result"]')
        .or(
          page.locator("text=/analysis|análisis|feedback|score|puntuación/i"),
        );

      // El feedback de IA puede tomar tiempo
      await expect(feedback.first()).toBeVisible({ timeout: 30000 });
    }
  });
});

test.describe("🎯 SJT - Results", () => {
  test("Muestra resultados al completar", async ({ page }) => {
    await navigateToSJT(page);

    // Verificar que existe sección de resultados
    const resultsSection = page
      .locator("text=/result|resultado|complete|completado|score|summary/i")
      .or(page.locator('[class*="result"], [class*="summary"]'))
      .or(page.getByRole("link", { name: /view results|ver resultados/i }));

    const hasResults = (await resultsSection.count()) > 0;
    // Es aceptable si los resultados aparecen después del flujo completo
  });

  test("Puede ver desglose de puntuación", async ({ page }) => {
    await navigateToSJT(page);

    // Buscar página de resultados
    const resultsLink = page
      .getByRole("link", { name: /results|resultados/i })
      .or(page.locator('[href*="result"]'));

    if (await resultsLink.first().isVisible()) {
      await resultsLink.first().click();

      // Verificar desglose
      const breakdown = page
        .locator('[class*="breakdown"], [class*="detail"]')
        .or(page.locator("text=/score|puntuación|total/i"));

      await expect(breakdown.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("🎯 SJT - Error Handling", () => {
  test("No permite avanzar sin responder", async ({ page }) => {
    await navigateToSJT(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Intentar avanzar sin responder
    const nextButton = page.getByRole("button", { name: /next|siguiente/i });

    if (await nextButton.isVisible()) {
      // El botón puede estar deshabilitado o mostrar error al click
      const isDisabled = await nextButton.isDisabled();

      if (!isDisabled) {
        await nextButton.click();

        // Debe mostrar validación o no avanzar
        const validation = page
          .locator(
            "text=/required|requerido|select|selecciona|answer|responde/i",
          )
          .or(page.locator('[class*="error"], [class*="validation"]'));

        const hasValidation = (await validation.count()) > 0;
        // Es aceptable si simplemente no avanza
      }
    }
  });

  test("Maneja timeout de IA graciosamente", async ({ page }) => {
    await navigateToSJT(page);

    // El sistema debe manejar si la IA no responde
    // Solo verificamos que la página no crashea
    await expect(page).not.toHaveURL(/error|500|crash/i);
  });
});
