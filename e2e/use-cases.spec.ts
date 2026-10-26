import { expect, test } from '@playwright/test';

test('Casos de uso: filtrar por departamento, tecnología y búsqueda', async ({ page }) => {
  await page.goto('/casos');
  const total = Number((await page.getByTestId('uc-count').textContent())!.match(/\d+/)![0]);
  expect(total).toBeGreaterThanOrEqual(25);
  await page.locator('[data-dept="calidad"]').click();
  await expect(page.getByTestId('dept-panel')).toContainText('Del reporte del operario al cierre');
  await expect(page.locator('[data-case="uc-nc-voz"]')).toBeVisible();
  await page.getByLabel('Tecnología').selectOption('Voz');
  await expect(page.locator('[data-case="uc-regulacion"]')).toHaveCount(0);
  await expect(page.locator('[data-case="uc-emision"]')).toBeVisible();
  await page.getByRole('button', { name: /Limpiar/ }).click();
  await page.getByLabel('Buscar casos').fill('albarán');
  await expect(page.locator('[data-case="uc-conciliacion"]')).toBeVisible();
  await expect(page.locator('[data-case="tender-lic-urb"]')).toHaveCount(0);
});

test('Ficha de caso → recorrido guiado hasta el final', async ({ page }) => {
  await page.goto('/casos/uc-aspol');
  await expect(page.getByRole('heading', { name: 'Carga 3D, rutas y CMR pre-validados' })).toBeVisible();
  await page.getByTestId('play-case').click();
  await expect(page).toHaveURL(/\/demo\/uc-aspol/);
  await expect(page.getByRole('heading', { name: 'Los pedidos de mañana' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Se corrige antes de salir' })).toBeVisible();
  await expect(page.getByText('Emitido', { exact: true })).toBeVisible({ timeout: 10_000 });
});

test('El selector de demos enlaza la biblioteca y lista los recorridos por departamento', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Atención al Cliente' })).toBeVisible();
  await page.getByTestId('library-link').click();
  await expect(page).toHaveURL(/\/casos$/);
});
