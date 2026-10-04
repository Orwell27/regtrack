import { test, expect, type Page } from '@playwright/test'
async function login(page: Page, email: string) {
  await page.goto('/login?next=/comunidad')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill('Community-test-123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/comunidad$/)
}
async function apply(page: Page, email: string, alias: string) {
  await page.goto('/comunidad')
  await page.getByLabel('Nombre o alias').fill(alias)
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Territorio').selectOption('Galicia')
  await page.getByLabel('Tu situación').selectOption('Vivienda habitual')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Solicitar invitación' }).click()
  await expect(page.getByRole('status')).toContainText('recibido')
}
test('public recruitment and mobile layout do not leak private information', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/comunidad')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'puede ayudarte hoy',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .getByRole('link', { name: 'Cómo participamos', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/comunidad/gestion')
  await expect(page).toHaveURL(/login/)
  const res = await page.request.get('/api/comunidad?action=admin')
  expect(res.status()).toBe(401)
  await page.goto('/comunidad')
  await page.getByRole('button', { name: 'Solicitar invitación' }).waitFor()
  await page.screenshot({
    path: 'test-results/community-mobile.png',
    fullPage: true,
  })
})
test('application → admission → question → peer help → reviewed case → withdrawal', async ({
  browser,
}) => {
  const owner = await browser.newPage(),
    helper = await browser.newPage(),
    mod = await browser.newPage()
  const failures: string[] = []
  for (const p of [owner, helper, mod])
    p.on('pageerror', (e) => failures.push(e.message))
  await apply(owner, 'owner@example.test', 'Ana')
  await apply(helper, 'helper@example.test', 'Luis')
  await login(owner, 'owner@example.test')
  await expect(
    owner.getByRole('heading', { name: 'Tu solicitud está pendiente' }),
  ).toBeVisible()
  await owner.goto('/comunidad/preguntas')
  await expect(owner).toHaveURL(/\/comunidad$/)
  await login(mod, 'moderator@example.test')
  await mod.getByRole('link', { name: 'Gestionar', exact: true }).click()
  for (const name of ['Ana', 'Luis']) {
    const card = mod
      .locator('article')
      .filter({ has: mod.getByRole('heading', { name, exact: true }) })
    await card
      .getByLabel('Motivo de la decisión')
      .fill('Entrevista previa y encaje para el piloto')
    await card.getByRole('button', { name: 'Admitir en el piloto' }).click()
    await expect(
      card.getByRole('button', { name: 'Retirar acceso' }),
    ).toBeVisible()
  }
  await owner.goto('/comunidad/preguntas/nueva')
  await owner
    .getByLabel('¿Qué necesitas decidir?')
    .fill('¿Cómo comparar presupuestos para reformar?')
  await owner
    .getByLabel('Situación y qué has intentado')
    .fill(
      'Tengo tres presupuestos diferentes para una reforma. ¿Qué partidas os ayudaron a compararlos?',
    )
  await owner.getByLabel('Tema').selectOption('cuidar')
  await owner.getByLabel('Territorio').selectOption('Galicia')
  await owner.getByRole('button', { name: 'Publicar pregunta' }).click()
  await expect(owner).toHaveURL(/\/preguntas\/[a-f0-9-]+$/)
  const topicUrl = owner.url()
  await login(helper, 'helper@example.test')
  await helper.goto(topicUrl)
  await helper
    .getByLabel('Tu aportación')
    .fill(
      'Pedí un desglose por partidas y los plazos de ejecución por escrito. Me permitió comparar mejor.',
    )
  await helper.getByRole('button', { name: 'Publicar respuesta' }).click()
  await expect(
    helper
      .locator('p.rc-body')
      .filter({
        hasText:
          'Pedí un desglose por partidas y los plazos de ejecución por escrito. Me permitió comparar mejor.',
      }),
  ).toBeVisible()
  await owner.reload()
  await owner.getByRole('button', { name: 'Esta respuesta me ayudó' }).click()
  await expect(owner.getByText('Ayudó al autor', { exact: true })).toBeVisible()
  await owner
    .getByLabel('¿Qué decidiste y qué ocurrió?')
    .fill(
      'Pedí el desglose y elegí el presupuesto con las partidas más claras.',
    )
  await owner.getByRole('button', { name: 'Compartir resultado' }).click()
  await expect(
    owner.getByRole('heading', { name: 'Cómo terminó' }),
  ).toBeVisible()
  await owner
    .getByRole('button', { name: 'Permitir una ficha de mi caso' })
    .click()
  await expect(
    owner.getByRole('button', { name: 'Retirar permiso de reutilización' }),
  ).toBeVisible()
  await mod.reload()
  const review = mod.locator('#aprendizajes details')
  await review.locator('summary').click()
  await review
    .getByLabel('Resumen revisado, sin datos personales')
    .fill(
      'Una propietaria solicitó presupuestos desglosados para comparar las mismas partidas antes de decidir.',
    )
  await review
    .getByLabel('Ámbito, fecha y límites de la experiencia')
    .fill(
      'Experiencia particular en Galicia durante el piloto. Los importes y condiciones dependen de cada obra.',
    )
  await review.getByRole('button', { name: 'Publicar ficha revisada' }).click()
  await expect(mod.getByText('Aún no hay casos con permiso para preparar una ficha.')).toBeVisible()
  await helper.goto('/comunidad/casos')
  await expect(
    helper.getByRole('heading', {
      name: '¿Cómo comparar presupuestos para reformar?',
    }),
  ).toBeVisible()
  await owner
    .getByRole('button', { name: 'Retirar permiso de reutilización' })
    .click()
  await expect(
    owner.getByRole('button', { name: 'Permitir una ficha de mi caso' }),
  ).toBeVisible()
  await helper.reload()
  await expect(
    helper.getByRole('heading', {
      name: '¿Cómo comparar presupuestos para reformar?',
    }),
  ).toHaveCount(0)
  await mod.reload()
  const member = mod
    .locator('article')
    .filter({ has: mod.getByRole('heading', { name: 'Luis', exact: true }) })
  await member
    .getByLabel('Motivo de la decisión')
    .fill('Baja solicitada por el participante')
  await member.getByRole('button', { name: 'Retirar acceso' }).click()
  await expect(
    member.getByRole('button', { name: 'Admitir en el piloto' }),
  ).toBeVisible()
  await helper.goto(topicUrl)
  await expect(
    helper.getByRole('heading', { name: 'Tu acceso está retirado' }),
  ).toBeVisible()
  await owner.screenshot({
    path: 'test-results/community-conversation.png',
    fullPage: true,
  })
  await mod.screenshot({
    path: 'test-results/community-management.png',
    fullPage: true,
  })
  expect(failures).toEqual([])
  await owner.close()
  await helper.close()
  await mod.close()
})
