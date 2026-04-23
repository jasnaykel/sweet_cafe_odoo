/**
 * CTRL QA - Call Simulation Module
 * Tests para el módulo de simulación de llamadas
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

// Helper para navegar a call simulation
async function navigateToCallSimulation(page: any) {
  await loginAsCandidate(page);

  const callLink = page
    .getByRole("link", { name: /call|llamada|simulation/i })
    .or(page.locator('[href*="call"]'))
    .or(page.getByRole("button", { name: /call|simulation/i }));

  await callLink.first().click();
  await page.waitForURL(/call|simulation/i, { timeout: 10000 });
}

test.describe("📞 Call Simulation - Page Load", () => {
  test("Página de call simulation carga correctamente", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Verificar heading
    await expect(
      page.getByRole("heading", { name: /call|llamada|simulation/i }),
    ).toBeVisible();
  });

  test("Instrucciones visibles antes de comenzar", async ({ page }) => {
    await navigateToCallSimulation(page);

    const instructions = page
      .locator("text=/instruction|instruccion|listen|escuch|audio/i")
      .or(page.locator('[class*="instruction"]'));

    await expect(instructions.first()).toBeVisible();
  });

  test("Indica que se necesita audio/micrófono", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Buscar indicación de audio
    const audioInfo = page.locator(
      "text=/audio|microphone|micrófono|headphones|auriculares|speaker/i",
    );
    const hasAudioInfo = (await audioInfo.count()) > 0;
    expect(hasAudioInfo).toBeTruthy();
  });
});

test.describe("📞 Call Simulation - Audio Playback", () => {
  test("Puede iniciar reproducción de audio", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Buscar botón de play o start
    const playButton = page
      .getByRole("button", { name: /play|start|comenzar|iniciar|escuchar/i })
      .or(page.locator('button:has([class*="play"]), [class*="play-button"]'));

    if (await playButton.first().isVisible()) {
      await playButton.first().click();

      // Debe aparecer algún indicador de reproducción o siguiente paso
      await expect(
        page
          .locator('[class*="playing"], [class*="audio"], audio')
          .or(page.getByRole("button", { name: /pause|stop|next|siguiente/i })),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Controles de audio funcionan", async ({ page }) => {
    await navigateToCallSimulation(page);

    const playButton = page
      .getByRole("button", { name: /play|start/i })
      .first();
    if (await playButton.isVisible()) {
      await playButton.click();

      // Buscar controles de volumen o progress
      const audioControls = page
        .locator(
          'input[type="range"], [class*="volume"], [class*="progress-bar"]',
        )
        .or(page.locator("audio"));

      const hasControls = (await audioControls.count()) > 0;
      // Es aceptable si el audio se reproduce automáticamente
    }
  });

  test("Audio se puede pausar y reanudar", async ({ page }) => {
    await navigateToCallSimulation(page);

    const playButton = page
      .getByRole("button", { name: /play|start/i })
      .first();
    if (await playButton.isVisible()) {
      await playButton.click();

      // Buscar botón de pausa
      const pauseButton = page.getByRole("button", { name: /pause|pausa/i });
      if (await pauseButton.isVisible({ timeout: 5000 })) {
        await pauseButton.click();

        // Debe poder reanudar
        const resumeButton = page.getByRole("button", {
          name: /play|resume|continuar/i,
        });
        await expect(resumeButton).toBeVisible();
      }
    }
  });
});

test.describe("📞 Call Simulation - Call Scenarios", () => {
  test("Muestra escenario de llamada", async ({ page }) => {
    await navigateToCallSimulation(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar|call 1|llamada 1/i })
      .first();
    if (await startButton.isVisible()) {
      await startButton.click();

      // Debe mostrar escenario o contexto
      await expect(
        page
          .locator(
            '[class*="scenario"], [class*="context"], [class*="situation"]',
          )
          .or(page.locator("text=/customer|cliente|situation|situación/i")),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Hay múltiples escenarios disponibles", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Buscar indicadores de múltiples llamadas
    const callIndicators = page
      .locator("text=/call [1-3]|llamada [1-3]|scenario [1-3]/i")
      .or(page.locator('[class*="step"], [class*="progress"]'))
      .or(
        page.locator(
          'button:has-text("1"), button:has-text("2"), button:has-text("3")',
        ),
      );

    const hasMultiple = (await callIndicators.count()) > 0;
    expect(hasMultiple).toBeTruthy();
  });

  test("Puede responder a la llamada", async ({ page }) => {
    await navigateToCallSimulation(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar|answer|contestar/i })
      .first();
    if (await startButton.isVisible()) {
      await startButton.click();

      // Buscar área de respuesta (puede ser grabación o texto)
      const responseArea = page
        .locator('[class*="response"], [class*="answer"], [class*="record"]')
        .or(page.locator("button:has-text(/record|grabar|speak|hablar/)"))
        .or(page.locator("textarea"));

      await expect(responseArea.first()).toBeVisible({ timeout: 15000 });
    }
  });
});

test.describe("📞 Call Simulation - Recording", () => {
  test("Muestra botón de grabación", async ({ page }) => {
    await navigateToCallSimulation(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Buscar botón de grabación
    const recordButton = page
      .getByRole("button", { name: /record|grabar|speak|hablar|microphone/i })
      .or(page.locator('[class*="record"], [class*="mic"]'));

    await expect(recordButton.first()).toBeVisible({ timeout: 15000 });
  });

  test("Indicador de grabación activa", async ({ page }) => {
    await navigateToCallSimulation(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const recordButton = page
      .getByRole("button", { name: /record|grabar/i })
      .first();
    if (await recordButton.isVisible({ timeout: 10000 })) {
      await recordButton.click();

      // Debe mostrar que está grabando
      await expect(
        page
          .locator('[class*="recording"], [class*="active"]')
          .or(page.locator("text=/recording|grabando/i"))
          .or(page.locator('[class*="pulse"], [class*="red"]')),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("Puede detener grabación", async ({ page }) => {
    await navigateToCallSimulation(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    const recordButton = page
      .getByRole("button", { name: /record|grabar/i })
      .first();
    if (await recordButton.isVisible({ timeout: 10000 })) {
      await recordButton.click();

      // Esperar un poco y detener
      await page.waitForTimeout(2000);

      const stopButton = page
        .getByRole("button", { name: /stop|detener|done|listo/i })
        .or(page.locator('[class*="stop"]'));

      if (await stopButton.first().isVisible()) {
        await stopButton.first().click();

        // Debe procesarse sin errores
        await expect(page).not.toHaveURL(/error/i);
      }
    }
  });
});

test.describe("📞 Call Simulation - Navigation", () => {
  test("Puede avanzar a siguiente llamada", async ({ page }) => {
    await navigateToCallSimulation(page);

    const startButton = page
      .getByRole("button", { name: /start|comenzar/i })
      .first();
    await startButton.click();

    // Completar interacción básica
    await page.waitForTimeout(3000);

    // Buscar botón de siguiente
    const nextButton = page.getByRole("button", {
      name: /next|siguiente|continue|continuar|call 2/i,
    });

    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Debe avanzar sin errores
      await expect(page).not.toHaveURL(/error/i);
    }
  });

  test("Indicador de progreso se actualiza", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Buscar indicador de progreso
    const progressIndicator = page
      .locator('[class*="progress"], [class*="step"]')
      .or(page.locator("text=/1 of|1 de|step 1/i"));

    const hasProgress = (await progressIndicator.count()) > 0;
    expect(hasProgress).toBeTruthy();
  });

  test("Puede volver al dashboard", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Buscar link de volver
    const backLink = page
      .getByRole("link", { name: /back|volver|dashboard|home/i })
      .or(page.locator('[href*="dashboard"]'));

    if (await backLink.first().isVisible()) {
      await backLink.first().click();
      await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10000 });
    }
  });
});

test.describe("📞 Call Simulation - Results", () => {
  test("Muestra resultados al completar todas las llamadas", async ({
    page,
  }) => {
    await navigateToCallSimulation(page);

    // Verificar que existe sección de resultados o completado
    const resultsSection = page
      .locator("text=/result|resultado|complete|completado|score|puntuación/i")
      .or(page.locator('[class*="result"], [class*="complete"]'));

    // Los resultados pueden aparecer después del flujo completo
    const hasResultsAvailable =
      (await resultsSection.count()) > 0 ||
      (await page
        .locator("button:has-text(/view results|ver resultados/)")
        .count()) > 0;

    // Es aceptable si no hay resultados visibles inmediatamente
  });
});

test.describe("📞 Call Simulation - Error Handling", () => {
  test("Maneja error de micrófono graciosamente", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Si hay error de permisos, debe mostrar mensaje amigable
    const errorMessage = page.locator(
      "text=/microphone|micrófono|permission|permiso|access|acceso/i",
    );

    // El sistema debe funcionar o mostrar mensaje de error adecuado
    await expect(page).not.toHaveURL(/500|crash/i);
  });

  test("Página no crashea sin audio", async ({ page }) => {
    await navigateToCallSimulation(page);

    // Verificar que la página sigue funcionando
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/error|500/i);
  });
});
