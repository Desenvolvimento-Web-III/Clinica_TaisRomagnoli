import { expect, test } from '@playwright/test';

test('abre o catálogo de serviços ativos', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Massagem relaxante' })).toBeVisible();
});

test('protege o perfil administrativo sem uma conta autorizada', async ({ page }) => {
  await page.goto('/admin/clientes/cliente-demonstracao');

  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  await expect(page.getByText('Mariana Oliveira')).not.toBeVisible();
});
