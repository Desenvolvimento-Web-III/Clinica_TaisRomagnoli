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

test('mantém o catálogo utilizável em uma tela mobile de 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/servicos');

  await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
  await expect(page.getByTestId('mobile-navigation')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('aproveita o espaço disponível no desktop sem perder a navegação', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/servicos');

  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).first()).toBeVisible();
  await expect(page.getByTestId('mobile-navigation')).toBeHidden();

  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(4);
  const firstCard = await cards.first().boundingBox();
  const lastCard = await cards.last().boundingBox();
  expect(firstCard).not.toBeNull();
  expect(lastCard).not.toBeNull();
  expect(lastCard!.y).toBe(firstCard!.y);
});

test('mantém os formulários de acesso sem rolagem horizontal no mobile e no desktop', async ({
  page,
}) => {
  for (const route of [
    { path: '/login', heading: 'Entre na sua conta' },
    { path: '/cadastro', heading: 'Crie sua conta' },
  ]) {
    for (const viewport of [
      { width: 320, height: 720 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(route.path);

      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow).toBe(false);
    }
  }
});
