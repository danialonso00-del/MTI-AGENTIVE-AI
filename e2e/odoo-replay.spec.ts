import { expect, test } from '@playwright/test';

test('Odoo: solicitud de oferta → oportunidad y presupuesto, sin duplicar', async ({ page }) => {
  await page.goto('/odoo/bandeja/in-rfq');
  await page.getByRole('button', { name: 'Ejecutar todo' }).click();
  await expect(page.getByText('Acciones propuestas')).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-action="create_lead"]').getByRole('button', { name: 'Aprobar y aplicar' }).click();
  await page.locator('[data-action="create_quotation"]').getByRole('button', { name: 'Aprobar y aplicar' }).click();
  await expect(page.locator('[data-action="create_quotation"]').getByRole('link', { name: /S000/ })).toBeVisible();
  await page.getByRole('link', { name: 'Ventas' }).click();
  await expect(page.getByText('MTI · agente').first()).toBeVisible();
});

test('Odoo: pedido WhatsApp con referencia ambigua requiere elección humana', async ({ page }) => {
  await page.goto('/odoo/bandeja/in-order');
  await page.getByRole('button', { name: 'Ejecutar todo' }).click();
  await expect(page.getByText('Referencia ambigua: elige')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /JT-50 · Junta nitrilo/ }).click();
  await page.getByRole('button', { name: 'Ejecutar todo' }).click();
  await expect(page.getByText('Acciones propuestas')).toBeVisible({ timeout: 20_000 });
});

test('Replay reproduce la ejecución sin crear registros', async ({ page }) => {
  await page.goto('/odoo/ventas');
  const before = await page.locator('tbody tr').count();
  await page.goto('/ejecuciones');
  await page.getByRole('button', { name: 'Replay' }).first().click();
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(page.getByText(/evento \d+\/\d+/)).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(page.getByText(/evento (\d+)\/\1/)).toBeVisible();
  await page.goto('/odoo/ventas');
  await expect(page.locator('tbody tr')).toHaveCount(before);
});
