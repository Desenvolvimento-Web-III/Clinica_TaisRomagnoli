import { expect, test } from '@playwright/test';

test('abre o catálogo de serviços ativos', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Massagem relaxante' })).toBeVisible();
});

test('navega entre serviços e agendamentos pela barra inferior', async ({ page }) => {
  await page.goto('/servicos');

  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  await navigation.getByRole('link', { name: 'Agendamentos' }).click();

  await expect(page).toHaveURL(/\/agendamentos$/);
  await expect(page.getByRole('heading', { name: 'Meus Agendamentos' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Serviços' })
    .click();

  await expect(page).toHaveURL(/\/servicos$/);
  await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
});

test('protege o perfil administrativo sem uma conta autorizada', async ({ page }) => {
  await page.goto('/admin/clientes/cliente-demonstracao');

  await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  await expect(page.getByText('Mariana Oliveira')).not.toBeVisible();
});
