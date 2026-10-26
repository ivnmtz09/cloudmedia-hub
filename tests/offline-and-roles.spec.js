import { test, expect } from '@playwright/test';

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
});
