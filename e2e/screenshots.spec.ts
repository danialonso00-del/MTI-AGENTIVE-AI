import { test } from '@playwright/test';

const sizes = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const s of sizes) {
  test(`capturas ${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.width, height: s.height });
    const shot = (n: string, full = false) => page.screenshot({ path: `docs/screenshots/${s.name}-${n}.png`, fullPage: full });
    await page.goto('/');
    await page.waitForTimeout(800);
    await shot('01-panel');
    await page.goto('/fabricacion');
    await shot('02-bandeja');
    await page.goto('/fabricacion/rfq-2026-0042/flujo');
    await page.getByRole('button', { name: 'Hasta revisión' }).first().click();
    await page.locator('[data-step="review"][data-status="needs_input"]').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(400);
    await shot('03-flujo-revision', s.name === 'mobile');
    await page.goto('/fabricacion/rfq-2026-0042/estimacion');
    await shot('04-estimacion', s.name === 'mobile');
    await page.goto('/fabricacion/rfq-2026-0042/pieza');
    await page.waitForTimeout(1500);
    await shot('05-pieza');
    await page.goto('/odoo/bandeja/in-pricing');
    await page.getByRole('button', { name: /Ejecutar todo|Reproducir/ }).click();
    await page.getByText('Acciones propuestas').waitFor({ timeout: 20_000 });
    await shot('06-odoo-pricing', s.name === 'mobile');
    await page.goto('/integraciones');
    await shot('07-integraciones');
  });
}
