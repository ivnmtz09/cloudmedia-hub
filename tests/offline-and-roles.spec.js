import { test, expect } from '@playwright/test';

async function loginUser(page, username, primaryPass = '1234567890', fallbackPass = '322-520iM.') {
  const userInput = page.locator('input[placeholder="Nombre de usuario"]');
  const isInputVisible = await userInput.isVisible().catch(() => false);
  if (!isInputVisible) {
    const loginCta = page.locator('button:has-text("Iniciar Sesión")').first();
    const hasLoginCta = await loginCta.isVisible({ timeout: 2500 }).catch(() => false);
    if (hasLoginCta) {
      await loginCta.click();
    }
  }

  await expect(userInput).toBeVisible({ timeout: 5000 });
  await userInput.fill(username);
  const passInput = page.locator('input[placeholder="••••••••"]');
  await passInput.fill(primaryPass);
  await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();

  const isInvalid = await page.locator('text=Credenciales inválidas').waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (isInvalid) {
    await passInput.fill(fallbackPass);
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
  }

  const forceHeader = page.locator('text=Cambio de Contraseña Obligatorio');
  const needsPasswordChange = await forceHeader.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false);
  if (needsPasswordChange) {
    await page.locator('input[placeholder="Ingresa tu nueva contraseña"]').fill(fallbackPass);
    await page.locator('input[placeholder="Repite la nueva contraseña"]').fill(fallbackPass);
    await page.locator('button[type="submit"]:has-text("Establecer Contraseña e Ingresar")').click();
    await expect(forceHeader).not.toBeVisible({ timeout: 5000 });
  }

  await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible({ timeout: 6000 });
}

test.describe('CloudMedia Hub - Fallback Offline & Role-Based Storage Quotas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. Role-based protection: Viewer user cannot see Storage & Quotas Dashboard, tabs, or cleanup module', async ({ page }) => {
    // 1. Iniciar sesión como bozame (role: 'viewer')
    const loginCta = page.locator('button:has-text("Iniciar Sesión")').first();
    await expect(loginCta).toBeVisible({ timeout: 5000 });
    await loginCta.click();

    const userInput = page.locator('input[placeholder="Nombre de usuario"]');
    await userInput.fill('bozame');
    const passInput = page.locator('input[placeholder="••••••••"]');
    await passInput.fill('1234567890');
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();

    // Si la contraseña ya fue cambiada en una ejecución previa, usar la clave actualizada
    const isInvalid = await page.locator('text=Credenciales inválidas').waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
    if (isInvalid) {
      await passInput.fill('322-520iM.');
      await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
    }

    // Completar cambio de contraseña si lo solicita
    const forceHeader = page.locator('text=Cambio de Contraseña Obligatorio');
    const needsPasswordChange = await forceHeader.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false);
    if (needsPasswordChange) {
      await page.locator('input[placeholder="Ingresa tu nueva contraseña"]').fill('322-520iM.');
      await page.locator('input[placeholder="Repite la nueva contraseña"]').fill('322-520iM.');
      await page.locator('button[type="submit"]:has-text("Establecer Contraseña e Ingresar")').click();
      await expect(forceHeader).not.toBeVisible({ timeout: 5000 });
    }

    // 2. Verificar que no existe la pestaña de Cuota & Limpieza en la barra superior
    await expect(page.getByRole('button', { name: 'Cuota & Limpieza' })).not.toBeVisible();

    // 3. Verificar que no existe la píldora de almacenamiento en la barra superior
    await expect(page.locator('button[aria-label*="Cuota en la nube"]')).not.toBeVisible();

    // 4. Verificar que el texto del Dashboard de Almacenamiento & Cuotas no existe en el DOM
    await expect(page.getByText('Dashboard de Almacenamiento & Cuotas')).not.toBeVisible();
    await expect(page.getByText('Disco Local del Sistema')).not.toBeVisible();
    await expect(page.getByText('Módulo de Limpieza Local')).not.toBeVisible();
  });

  test('2. Global Offline Fallback UI: Network error triggers full-screen offline fallback', async ({ page }) => {
    // 1. Simular falla de red (ERR_CONNECTION_REFUSED / failed) en las peticiones a la API
    await page.route('**/api/**', (route) => route.abort('failed'));

    // 2. Intentar cargar o hacer una petición
    await page.goto('/');

    // 3. Debe renderizar la pantalla fallback a pantalla completa (100vh) con fondo bg-gray-900
    const offlineMessage = page.getByText('Servidor local apagado. Enciende la PC base para acceder a CloudMedia');
    await expect(offlineMessage).toBeVisible({ timeout: 7000 });

    const retryBtn = page.getByRole('button', { name: 'Reintentar conexión' });
    await expect(retryBtn).toBeVisible();

    // 4. Desbloquear la red y presionar "Reintentar conexión"
    await page.unroute('**/api/**');
    await retryBtn.click();

    // 5. Debe reintentar y al tener conexión, restaurar la interfaz
    await expect(offlineMessage).not.toBeVisible({ timeout: 10000 });
  });

  test('3. Video Player: Uses crossOrigin="anonymous" and renders WebVTT subtitle track when selected', async ({ page }) => {
    // 1. Iniciar sesión como ivnmtz09 (admin)
    await loginUser(page, 'ivnmtz09');

    // 2. Abrir reproductor desde Hero
    const playHeroBtn = page.locator('button:has-text("Reproducir Ahora")').first();
    await expect(playHeroBtn).toBeVisible({ timeout: 10000 });
    await playHeroBtn.click();

    // 3. Verificar que el elemento video tiene crossOrigin="anonymous"
    const videoEl = page.locator('video');
    await expect(videoEl).toBeVisible({ timeout: 10000 });
    await expect(videoEl).toHaveAttribute('crossorigin', 'anonymous');

    // 4. Abrir menú de subtítulos si el archivo tiene pistas
    const subBtn = page.locator('button[aria-label="Subtítulos"]');
    const hasSubs = await subBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    if (hasSubs) {
      await subBtn.click();
      const firstSubTrack = page.locator('button:has-text("LAT")').or(page.locator('button:has-text("Subtítulo")')).first();
      if (await firstSubTrack.isVisible()) {
        await firstSubTrack.click();
        // Verificar que se insertó el elemento track con kind="subtitles"
        const trackEl = page.locator('video track[kind="subtitles"]');
        await expect(trackEl).toBeAttached({ timeout: 5000 });
        const src = await trackEl.getAttribute('src');
        expect(src).toContain('/api/stream/subtitles');
      }
    }

    // 5. Cerrar reproductor
    const closeBtn = page.locator('button[aria-label="Cerrar reproductor"]');
    await closeBtn.click();
    await expect(videoEl).not.toBeVisible();
  });
});
