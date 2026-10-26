import { expect, test } from '@playwright/test';

test('la barra lateral abre todos los módulos de la solución', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const modules: [string, RegExp][] = [
    ['Bandeja', /Bandeja unificada/], ['Ofertas', /De un plano a una oferta/], ['Aprobaciones', /Aprobaciones/], ['ERP Odoo', /Tu ERP, trabajando contigo/],
    ['Piezas y planos', /Piezas y planos/], ['Conocimiento', /El cerebro de la empresa/], ['Recursos y carga', /Recursos y carga de taller/],
    ['Agentes', /Agentes especializados/], ['Analítica', /Analítica/], ['Auditoría', /Cada operación, con su explicación/], ['Integraciones', /Conectores y su estado real/], ['Ajustes', /Ajustes/], ['Panel', /Buenos días|Buenas tardes/],
  ];
  for (const [label, heading] of modules) {
    await nav.getByRole('link', { name: new RegExp(`^${label}`) }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test('Aprobaciones: aprobar una oferta desde la cola la deja vigente', async ({ page }) => {
  await page.goto('/fabricacion/rfq-2026-0042/flujo');
  await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
  await expect(page.locator('[data-step="review"]')).toHaveAttribute('data-status', 'needs_input', { timeout: 20_000 });
  await page.goto('/aprobaciones');
  await page.locator('[data-approval="rfq-2026-0042"]').getByRole('button', { name: 'Revisar y aprobar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /aprobar/ }).click();
  await expect(page.locator('[data-approval="rfq-2026-0042"]')).toHaveCount(0);
  await expect(page.getByText('RFQ-2026-0042 · v1 (rev. B)')).toBeVisible();
});

test('Ajustes: el margen por defecto se aplica a las nuevas solicitudes', async ({ page }) => {
  await page.goto('/ajustes');
  await page.getByLabel('Margen s/ venta %').fill('30');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.goto('/fabricacion/nueva');
  await page.locator('#n-co').fill('Cliente Prueba');
  await page.locator('#n-em').fill('compras@prueba.example');
  await page.locator('#n-pn').fill('TX-1');
  await page.getByLabel('Material').selectOption('al-6082-t6');
  await page.getByRole('button', { name: 'Crear solicitud' }).click();
  await page.getByRole('link', { name: 'Estimación' }).click();
  await expect(page.getByLabel('Porcentaje')).toHaveValue('30');
});
