import { expect, test } from '@playwright/test';

test('abre a página técnica', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Ambiente configurado' })).toBeVisible();
  await expect(page.getByText(/somente um smoke test/i)).toBeVisible();
});
