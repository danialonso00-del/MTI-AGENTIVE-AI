import { expect, test } from '@playwright/test';

test('Asistente comercial: nota de ejemplo → cambios aprobados → CRM y agenda actualizados', async ({ page }) => {
  await page.goto('/comercial');
  await page.getByRole('button', { name: /Tras la visita a Conservas Océano/ }).click();
  await expect(page.getByLabel('Transcripción de la nota')).toHaveValue(/Conservas Océano/);
  await page.getByTestId('process-note').click();
  const result = page.getByTestId('note-result');
  await expect(result).toContainText('Conservas Océano S.A.');
  await expect(result).toContainText('Uxía Méndez');
  await expect(result.locator('[data-crm-action]')).toHaveCount(3);
  await result.getByRole('button', { name: 'Aprobar todo' }).click();
  await expect(result.getByText('Guardado en el CRM')).toHaveCount(3);
  await page.goto('/odoo/crm/l-115');
  await expect(page.getByText('nota de voz').first()).toBeVisible();
  await expect(page.getByText('Llamar para cerrar').first()).toBeVisible();
});

test('Asistente comercial: texto sin cliente no propone escrituras', async ({ page }) => {
  await page.goto('/comercial');
  await page.getByLabel('Transcripción de la nota').fill('Recordar revisar el coche el lunes');
  await page.getByTestId('process-note').click();
  await expect(page.getByTestId('note-result')).toContainText('no se propone ninguna escritura');
});

test('Licitaciones: leer portales, estudiar la obra y decidir GO', async ({ page }) => {
  await page.goto('/licitaciones');
  await page.getByTestId('screen-portal').click();
  await expect(page.locator('[data-tender]')).toHaveCount(3);
  await page.locator('[data-tender="lic-urb"]').click();
  await page.getByTestId('analyze-tender').click();
  await page.getByRole('link', { name: 'Oferta y decisión' }).click();
  await expect(page.getByText(/Recomendación:/).locator('..')).toContainText('Presentar');
  await page.getByTestId('tender-go').click();
  await expect(page.getByText(/Decisión GO/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Preparar' }).click();
  await expect(page.getByText(/firma del apoderado/).first()).toBeVisible();
});

test('Licitaciones: rehabilitación fuera de plazo hasta añadir equipo', async ({ page }) => {
  await page.goto('/licitaciones/lic-reh');
  await page.getByTestId('analyze-tender').click();
  await page.getByRole('link', { name: 'Planificación' }).click();
  await expect(page.getByText(/no cabe/)).toBeVisible();
  await page.getByRole('button', { name: 'Añadir equipo en Envolvente térmica (SATE)' }).click();
  await expect(page.getByText(/no cabe/)).toHaveCount(0);
});

test('Demos guiadas de CRM y licitaciones llegan al final', async ({ page }) => {
  await page.goto('/demo/crm-v-oceano');
  await expect(page.getByRole('heading', { name: 'El comercial sale de la visita' })).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'La agenda ya está hecha' })).toBeVisible();
  await page.goto('/demo/tender-lic-reh');
  await expect(page.getByRole('heading', { name: 'Cada mañana, los portales' })).toBeVisible();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'El comité decide' })).toBeVisible();
  await expect(page.getByText('GO', { exact: true })).toBeVisible({ timeout: 10_000 });
});
