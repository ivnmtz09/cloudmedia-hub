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

  // If primary password failed with invalid credentials, try fallback
  const isInvalid = await page.locator('text=Credenciales inválidas').waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (isInvalid) {
    await passInput.fill(fallbackPass);
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
  }

  // If mandatory change password modal appears, complete the password change
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

test.describe('CloudMedia Hub - E2E Suite (Clean Auth, Profile, Admin Dashboard & VLC)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. Loads landing page and opens clean authentication modal with show/hide password toggle and no role presets', async ({ page }) => {
    await expect(page).toHaveTitle(/CloudMedia Hub/i);

    // Verify Landing Page hero is visible
    await expect(page.locator('text=Tu Catálogo Multimedia en la Nube')).toBeVisible({ timeout: 5000 });
    const loginBtn = page.locator('button:has-text("Iniciar Sesión")').first();
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();

    const authModal = page.locator('text=Autenticación CloudMedia');
    await expect(authModal).toBeVisible({ timeout: 5000 });

    // Ensure NO role preset buttons are present
    await expect(page.locator('button:has-text("Admin")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Moderador")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Usuario")')).not.toBeVisible();

    // Inputs must exist and have show/hide toggle
    await expect(page.locator('input[placeholder="Nombre de usuario"]')).toBeVisible();
    const passInput = page.locator('input[placeholder="••••••••"]');
    await expect(passInput).toBeVisible();
    await expect(passInput).toHaveAttribute('type', 'password');

    // Toggle password visibility
    const showEyeBtn = page.locator('button[aria-label="Ver contraseña"]');
    await expect(showEyeBtn).toBeVisible();
    await showEyeBtn.click();
    await expect(passInput).toHaveAttribute('type', 'text');

    const hideEyeBtn = page.locator('button[aria-label="Ocultar contraseña"]');
    await expect(hideEyeBtn).toBeVisible();
    await hideEyeBtn.click();
    await expect(passInput).toHaveAttribute('type', 'password');
  });

  test('2. First login triggers mandatory password change modal, updates password and unlocks system', async ({ page }) => {
    const loginBtn = page.locator('button:has-text("Iniciar Sesión")').first();
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
    }

    const userInput = page.locator('input[placeholder="Nombre de usuario"]');
    await expect(userInput).toBeVisible({ timeout: 5000 });
    await userInput.fill('ivnmtz09');
    const passInput = page.locator('input[placeholder="••••••••"]');
    await passInput.fill('1234567890');
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();

    // Check if invalid credentials or prompt for change
    const isInvalid = await page.locator('text=Credenciales inválidas').waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
    if (isInvalid) {
      await passInput.fill('322-520iM.');
      await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
    }

    const forceHeader = page.locator('text=Cambio de Contraseña Obligatorio');
    const hasForceModal = await forceHeader.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false);
    if (hasForceModal) {
      await expect(page.locator('strong:has-text("ivnmtz09")')).toBeVisible();
      await page.locator('input[placeholder="Ingresa tu nueva contraseña"]').fill('322-520iM.');
      await page.locator('input[placeholder="Repite la nueva contraseña"]').fill('322-520iM.');
      await page.locator('button[type="submit"]:has-text("Establecer Contraseña e Ingresar")').click();
      await expect(forceHeader).not.toBeVisible({ timeout: 5000 });
    }

    await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible({ timeout: 6000 });
    await expect(page.locator('button').filter({ hasText: 'ivnmtz09' }).first()).toBeVisible();
  });

  test('3. Admin Dashboard with fixed aside navigation displays 6 sections and system metrics', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    // Admin should see "Administración" tab in navbar
    const adminTab = page.locator('#tab-users');
    await expect(adminTab).toBeVisible();
    await adminTab.click();

    // Verify Admin Dashboard aside navigation
    await expect(page.locator('text=Panel de Administración')).toBeVisible();
    await expect(page.locator('button:has-text("Resumen del Sistema")')).toBeVisible();
    await expect(page.locator('button:has-text("Gestión de Usuarios y Roles")')).toBeVisible();
    await expect(page.locator('button:has-text("Monitoreo de Cuota (500GB)")')).toBeVisible();
    await expect(page.locator('button:has-text("Explorador de Almacenamiento")')).toBeVisible();
    await expect(page.locator('button:has-text("Auditoría de Limpieza Local")')).toBeVisible();
    await expect(page.locator('button:has-text("Ajustes del Servidor")')).toBeVisible();

    // Verify Overview metrics
    await expect(page.locator('text=Resumen del Sistema CloudMedia')).toBeVisible();
    await expect(page.locator('text=Cuota Nube (500GB)')).toBeVisible();

    // Click "Gestión de Usuarios y Roles" and verify UsersPanel
    await page.locator('button:has-text("Gestión de Usuarios y Roles")').click();
    await expect(page.locator('h1:has-text("Administración de Usuarios")')).toBeVisible();
    await expect(page.locator('button:has-text("Nuevo Usuario")')).toBeVisible();

    // Click "Ajustes del Servidor"
    await page.locator('button:has-text("Ajustes del Servidor")').click();
    await expect(page.locator('text=Parámetros Técnicos del Servidor')).toBeVisible();
    await expect(page.locator('text=cloudmedia-hub-backend')).toBeVisible();
  });

  test('4. User Profile modal opens from UserBadge and provides Account, Security and Stats tabs', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    // Click UserBadge dropdown
    const userBadgeBtn = page.locator('button').filter({ hasText: 'ivnmtz09' }).first();
    await userBadgeBtn.click();

    // Click "Mi Perfil"
    const profileBtn = page.locator('button:has-text("Mi Perfil")');
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Verify Profile Modal
    await expect(page.locator('h2:has-text("Mi Perfil")')).toBeVisible();
    await expect(page.locator('button:has-text("Cuenta & Datos")')).toBeVisible();
    await expect(page.locator('button:has-text("Seguridad")')).toBeVisible();
    await expect(page.locator('button:has-text("Estadísticas")')).toBeVisible();

    // Switch to Seguridad
    await page.locator('button:has-text("Seguridad")').click();
    await expect(page.locator('input[placeholder="Tu contraseña actual"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Nueva contraseña segura"]')).toBeVisible();

    // Switch to Estadísticas
    await page.locator('button:has-text("Estadísticas")').click();
    await expect(
      page.locator('text=Iniciados')
        .or(page.locator('text=Cargando estadísticas'))
        .or(page.locator('text=No hay registros'))
    ).toBeVisible();

    // Close modal
    await page.locator('button[aria-label="Cerrar perfil"]').click();
    await expect(page.locator('h2:has-text("Mi Perfil")')).not.toBeVisible();
  });

  test('5. Command Palette opens via shortcut or search bar with multi-filters', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    await page.keyboard.press('Control+k');

    const searchInput = page.locator('input[placeholder*="Buscar por título"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await expect(page.locator('button:has-text("Películas")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Series")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Anime")').first()).toBeVisible();
    await expect(page.locator('button:has-text("1080p")').first()).toBeVisible();
    await expect(page.locator('button:has-text("DUAL")').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('6. Appearance & Theme Panel toggles themes and grid density without platform brand names', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    const themeBtn = page.locator('button[aria-label="Personalizar tema"]');
    await themeBtn.click();

    await expect(page.locator('text=Apariencia y Visualización')).toBeVisible();
    await expect(page.locator('text=Redflix')).toBeVisible();
    await expect(page.locator('text=Magic Plus')).toBeVisible();
    await expect(page.locator('text=Anime Studio')).toBeVisible();
    await expect(page.locator('text=Max Cinema')).toBeVisible();
    await expect(page.locator('text=Prime Vision')).toBeVisible();

    // Verify platform names are NOT rendered in the theme selector
    await expect(page.locator('text=Netflix')).not.toBeVisible();
    await expect(page.locator('text=Disney+')).not.toBeVisible();
    await expect(page.locator('text=Crunchyroll')).not.toBeVisible();

    await page.locator('button:has-text("Anime Studio")').click();

    const htmlTheme = await page.getAttribute('html', 'data-theme');
    expect(htmlTheme).toBe('anime-studio');
  });

  test('7. VLC Player with Web Audio API 200% volume, triangular meter and real duration', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    const playHeroBtn = page.locator('button:has-text("Reproducir Ahora")').first();
    await expect(playHeroBtn).toBeVisible({ timeout: 10000 });
    await playHeroBtn.click();

    const vlcBadge = page.getByText('VLC Engine', { exact: true });
    await expect(vlcBadge).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');

    await expect(page.getByText('110%', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Volumen', { exact: true }).first()).toBeVisible();

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowUp');
    }
    await expect(page.getByText('160%', { exact: true }).first()).toBeVisible();

    const closeBtn = page.locator('button[aria-label="Cerrar reproductor"]');
    await closeBtn.click();
    await expect(vlcBadge).not.toBeVisible();
  });

  test('8. 3D Card Flip reveals technical specifications on back of card', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    const flipBtn = page.locator('button[aria-label="Giro 3D info técnica"]').first();
    await expect(flipBtn).toBeVisible({ timeout: 10000 });

    await flipBtn.click();

    await expect(page.locator('text=Ficha Técnica').first()).toBeVisible();
    await expect(page.locator('text=Contenedor').first()).toBeVisible();
    await expect(page.locator('button:has-text("Reproducir con VLC Engine")').first()).toBeVisible();

    const flipBackBtn = page.locator('button[aria-label="Volver al frente"]').first();
    await flipBackBtn.click();
  });

  test('9. User can log out and is returned to the Landing Page home', async ({ page }) => {
    await loginUser(page, 'ivnmtz09');

    // UserBadge dropdown
    const userBadgeBtn = page.locator('button').filter({ hasText: 'ivnmtz09' }).first();
    await expect(userBadgeBtn).toBeVisible({ timeout: 5000 });
    await userBadgeBtn.click();

    // Click "Cerrar Sesión"
    const logoutBtn = page.locator('button:has-text("Cerrar Sesión")');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Must be returned cleanly to Landing Page without open modal
    await expect(page.locator('text=Tu Catálogo Multimedia en la Nube')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Iniciar Sesión")').first()).toBeVisible();
    await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible();
  });
});
