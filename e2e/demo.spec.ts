import { expect, test } from '@playwright/test';

test('Iniciar demo → elegir ofertas → recorrido completo hasta el presupuesto en Odoo', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-demo').click();
  await expect(page.getByRole('heading', { name: '¿Qué quieres enseñar?' })).toBeVisible();
  await page.getByRole('button', { name: /De un plano a una oferta/ }).click();
  await expect(page.getByRole('heading', { name: 'Ha llegado un nuevo requerimiento' })).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'El presupuesto llega a Odoo' })).toBeVisible();
  await expect(page.getByText(/Odoo › Ventas › Presupuestos › S000\d\d/)).toBeVisible({ timeout: 15_000 });
  await page.goto('/fabricacion/rfq-2026-0042/flujo');
  await expect(page.locator('[data-step="output"]')).toHaveAttribute('data-status', 'completed');
});

test('Demo Odoo: pedido WhatsApp con decisión humana termina en propuesta registrada', async ({ page }) => {
  await page.goto('/demo/odoo-order');
  await expect(page.getByRole('heading', { name: 'Llega un pedido por WhatsApp' })).toBeVisible();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Creado').first()).toBeVisible({ timeout: 15_000 });
});
