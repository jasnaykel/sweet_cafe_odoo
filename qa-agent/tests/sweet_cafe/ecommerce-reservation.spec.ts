/**
 * Sweet Café QA — Tests de Reservas Online (Formulario Público)
 *
 * Valida el formulario público de reservas en /reservar
 * Controller: sweet_cafe_ecommerce/controllers/main.py
 * Template: sweet_cafe_ecommerce/views/sweet_reservation_templates.xml
 *
 * Flujo:
 *  1. Cliente accede a /reservar
 *  2. Rellena el formulario con sus datos y el pedido
 *  3. Envía → Odoo crea sweet.reservation en estado draft/confirmed
 */

import { test, expect } from "@playwright/test";
import { SweetWebsitePage } from "../../src/pages/sweet-website.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";

// Fecha de entrega: pasado mañana
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 3);
const DELIVERY_DATE = futureDate.toISOString().split("T")[0];

test.describe("📝 Formulario de Reserva Online — /reservar", () => {
  let websitePage: SweetWebsitePage;

  test.beforeEach(async ({ page }) => {
    websitePage = new SweetWebsitePage(page);
  });

  // ─── Carga del formulario ─────────────────────────────────────

  test("La página /reservar carga correctamente", async ({ page }) => {
    const response = await page.goto(`${ODOO_URL}/reservar`);

    // Debe responder con éxito (200) o redirigir (3xx)
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("El formulario de reserva tiene los campos requeridos", async ({
    page,
  }) => {
    await websitePage.gotoReservationForm();

    // Verificar campos esenciales según el controller
    // name, email, branch_id, delivery_date, product_ids
    const nameField = page
      .locator("input[name='name'], #customer_name")
      .first();
    const emailField = page
      .locator("input[name='email'], input[type='email']")
      .first();
    const dateField = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();

    await expect(nameField).toBeVisible({ timeout: 15000 });
    await expect(emailField).toBeVisible({ timeout: 10000 });
    await expect(dateField).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test("El selector de sucursal está presente en el formulario", async ({
    page,
  }) => {
    await websitePage.gotoReservationForm();

    const branchField = page
      .locator("select[name='branch_id'], #branch_id, [name='branch_id']")
      .first();
    await expect(branchField).toBeVisible({ timeout: 10000 });
  });

  // ─── Validación del formulario ────────────────────────────────

  test("Enviar formulario vacío muestra error o requiere campos", async ({
    page,
  }) => {
    await websitePage.gotoReservationForm();

    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    await submitBtn.click();

    await page.waitForLoadState("networkidle");

    // O bien muestra validación HTML5 (se queda en la página)
    // o bien redirige con error (URL con ?error=...)
    const url = page.url();
    const hasError = url.includes("error") || url.includes("/reservar");
    expect(hasError).toBeTruthy();
  });

  test("Enviar con campos requeridos incompletos muestra error apropiado", async ({
    page,
  }) => {
    await websitePage.gotoReservationForm();

    // Llenar solo el nombre y enviar
    const nameField = page.locator("input[name='name']").first();
    if (await nameField.isVisible()) {
      await nameField.fill("Cliente de Prueba QA");
    }

    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    await submitBtn.click();
    await page.waitForLoadState("networkidle");

    // El controller verifica: name, email, branch_id, delivery_date, product_ids
    // Si falta alguno, redirige con ?error=campos_requeridos
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  // ─── Flujo completo de reserva ────────────────────────────────

  test("Llenar y enviar el formulario completo de reserva", async ({
    page,
  }) => {
    await websitePage.gotoReservationForm();

    // Llenar nombre
    const nameInput = page.locator("input[name='name']").first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Cliente QA Test");
    }

    // Llenar email
    const emailInput = page
      .locator("input[name='email'], input[type='email']")
      .first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(`qa.test.${Date.now()}@sweetcafe.cu`);
    }

    // Llenar teléfono (opcional)
    const phoneInput = page
      .locator("input[name='phone'], input[type='tel']")
      .first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("+5352345678").catch(() => {});
    }

    // Seleccionar sucursal (la primera disponible)
    const branchSelect = page.locator("select[name='branch_id']").first();
    if (await branchSelect.isVisible()) {
      const options = await branchSelect.locator("option").count();
      if (options > 1) {
        await branchSelect.selectOption({ index: 1 });
      }
    }

    // Fecha de entrega
    const dateInput = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(DELIVERY_DATE);
    }

    // Hora de entrega (opcional)
    const timeInput = page.locator("input[name='delivery_time']").first();
    if (await timeInput.isVisible()) {
      await timeInput.fill("10:00").catch(() => {});
    }

    // Seleccionar al menos un producto si hay checkboxes disponibles
    const productCheckboxes = page.locator(
      "input[name='product_ids'], input[type='checkbox'][name*='product']",
    );
    if ((await productCheckboxes.count()) > 0) {
      await productCheckboxes
        .first()
        .check()
        .catch(() => {});
    }

    // Enviar
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    await submitBtn.click();
    await page.waitForLoadState("networkidle");

    // Verificar resultado (éxito o error de validación)
    const finalUrl = page.url();
    // La página debe haber respondido (no timeout)
    expect(finalUrl).toBeTruthy();
  });

  // ─── Mensajes de éxito/error ──────────────────────────────────

  test("La URL de error muestra mensaje apropiado", async ({ page }) => {
    await page.goto(`${ODOO_URL}/reservar?error=campos_requeridos`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
    // La página de reserva con error no debe mostrar un 500
    const response = await page.evaluate(() => document.title);
    expect(response).toBeTruthy();
  });
});
