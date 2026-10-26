import { expect, test } from '@playwright/test';

test.describe('Recorrido estrella: RFQ → estimación → aprobación → borrador ERP', () => {
  test('completo en modo Trabajar, persistente tras recargar', async ({ page }) => {
    await page.goto('/fabricacion');
    await page.getByRole('link', { name: /Soporte SP-118 rev\. B — 50 uds/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Soporte SP-118 rev. B — 50 uds' })).toBeVisible();
    await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
    await expect(page.locator('[data-step="review"]')).toHaveAttribute('data-status', 'needs_input', { timeout: 20_000 });
    await expect(page.locator('[data-step="estimate"]')).toContainText('733,5 min');

    await page.getByRole('link', { name: 'Correo y adjuntos' }).click();
    await expect(page.locator('[data-field="finish"]')).toContainText('Fuentes contradictorias');

    await page.getByRole('link', { name: 'Estimación' }).click();
    await expect(page.getByTestId('estimated-lot')).toHaveText('733,5 min');

    await page.getByTestId('primary-action').click(); // Revisar y aprobar
    await page.getByRole('dialog').getByRole('button', { name: /Guardar v1 y aprobar/ }).click();
    await expect(page.getByText(/v1 aprobada/).first()).toBeVisible();

    await page.getByTestId('primary-action').click(); // Crear presupuesto en Odoo
    await expect(page.getByTestId('primary-action')).toHaveText(/Abrir S000\d\d/);
    const name = (await page.getByTestId('primary-action').innerText()).replace('Abrir ', '').trim();
    await page.getByTestId('primary-action').click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByText('SP-118 rev. B — Soporte mecanizado', { exact: false })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  });

  test('lote 100 → 1.397 min y anula la aprobación previa', async ({ page }) => {
    await page.goto('/fabricacion/rfq-2026-0042/flujo');
    await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
    await expect(page.locator('[data-step="review"]')).toHaveAttribute('data-status', 'needs_input', { timeout: 20_000 });
    await page.getByTestId('primary-action').click();
    await page.getByRole('dialog').getByRole('button', { name: /aprobar/ }).click();
    await page.getByRole('link', { name: 'Estimación' }).click();
    await page.getByTestId('edit-params').click();
    await page.getByLabel('Cantidad (uds)').fill('100');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByTestId('estimated-lot')).toHaveText('1.397 min');
    await expect(page.getByText(/Aprobación de v1 anulada/).first()).toBeVisible();
    await expect(page.getByText('Preparación 70 min una vez por lote')).toBeVisible();
  });

  test('material ausente bloquea, pregunta en borrador y continúa al completarlo', async ({ page }) => {
    await page.goto('/fabricacion/rfq-2026-0045/flujo');
    await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
    await expect(page.locator('[data-step="intake"]')).toHaveAttribute('data-status', 'needs_input');
    await expect(page.getByText('Requiere dato').first()).toBeVisible();
    await expect(page.locator('[data-step="estimate"]')).toHaveAttribute('data-status', 'idle');
    await page.getByRole('link', { name: 'Correo y adjuntos' }).click();
    await expect(page.getByText('Pregunta al cliente (borrador)')).toBeVisible();
    const row = page.locator('[data-field="material"]');
    await row.getByRole('button', { name: 'Completar' }).click();
    await row.getByLabel('Material').selectOption('ss-304');
    await row.getByRole('button', { name: 'Guardar' }).click();
    await expect(row).toContainText('Confirmado');
    await page.getByRole('link', { name: 'Flujo' }).click();
    await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
    await expect(page.locator('[data-step="estimate"]')).toHaveAttribute('data-status', 'completed', { timeout: 20_000 });
  });

  test('archivo desconocido no recibe resultados de ejemplo; DXF se lee de verdad', async ({ page }) => {
    await page.goto('/fabricacion/rfq-2026-0047/correo');
    await page.getByLabel('Añadir archivo').setInputFiles({ name: 'pieza.igs', mimeType: 'application/octet-stream', buffer: Buffer.from('IGES fake content') });
    await expect(page.getByText('Formato no soportado').first()).toBeVisible();
    await page.getByLabel('Añadir archivo').setInputFiles('public/demo-assets/SP-118_revC.dxf');
    await expect(page.getByText(/Entidades: 8 LINE, 8 ARC, 6 CIRCLE/)).toBeVisible();
  });

  test('solicitud manual completa sin el tour', async ({ page }) => {
    await page.goto('/fabricacion/nueva');
    await page.getByLabel('Cliente existente en el ERP').selectOption({ label: 'Marina Norte · compras@marinanorte.example' });
    await page.locator('#n-pn').fill('TP-900');
    await page.locator('#n-nm').fill('Tapa');
    await page.getByLabel('Material').selectOption('al-6082-t6');
    await page.getByRole('button', { name: 'Crear solicitud' }).click();
    await expect(page.getByRole('heading', { name: /Tapa TP-900/ })).toBeVisible();
    await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
    await expect(page.locator('[data-step="review"]')).toHaveAttribute('data-status', 'needs_input', { timeout: 20_000 });
    await page.getByTestId('primary-action').click();
    await page.getByRole('dialog').getByRole('button', { name: /aprobar/ }).click();
    await page.getByTestId('primary-action').click();
    await expect(page.getByTestId('primary-action')).toHaveText(/Abrir S000/);
    await page.goto('/fabricacion?q=TP-900');
    await expect(page.getByRole('link', { name: /RFQ-2026-0048 Tapa TP-900/ })).toContainText('Borrador en ERP');
  });
});
