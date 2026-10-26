import { test, expect } from '@playwright/test';

test.describe('CloudMedia Hub - E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. Loads application and shows authentication modal with role presets', async ({ page }) => {
    await expect(page).toHaveTitle(/CloudMedia Hub/i);

    // Authentication modal should appear when no active session
    const authModal = page.locator('text=Autenticación CloudMedia');
    await expect(authModal).toBeVisible({ timeout: 5000 });

    // Role preset buttons should exist
    await expect(page.locator('button:has-text("Admin")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Moderador")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Usuario")').first()).toBeVisible();
  });

  test('2. Admin login reveals full permissions, user panel tab and management capabilities', async ({ page }) => {
    // Click Admin preset button
    const adminPresetBtn = page.locator('button:has-text("Admin")').first();
    await adminPresetBtn.click();

    // Click submit "Iniciar Sesión"
    const submitBtn = page.locator('button[type="submit"]:has-text("Iniciar Sesión")');
    await submitBtn.click();

    // Verify modal closes and user badge displays admin
    await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').filter({ hasText: 'admin' }).first()).toBeVisible();

    // Admin should see "Usuarios" tab in navbar
    const usersTab = page.locator('#tab-users');
    await expect(usersTab).toBeVisible();

    // Click "Usuarios" tab and verify UsersPanel is displayed
    await usersTab.click();
    await expect(page.locator('h1:has-text("Administración de Usuarios")')).toBeVisible();
    await expect(page.locator('button:has-text("Nuevo Usuario")')).toBeVisible();
  });

  test('3. Command Palette opens via shortcut or search bar with multi-filters', async ({ page }) => {
    // Login as viewer
    await page.locator('button:has-text("Usuario")').first().click();
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
    await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible();

    // Press Control+k to open Command Palette
    await page.keyboard.press('Control+k');

    // Palette should appear
    const searchInput = page.locator('input[placeholder*="Buscar por título"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Check filter tags
    await expect(page.locator('button:has-text("Películas")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Series")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Anime")').first()).toBeVisible();
    await expect(page.locator('button:has-text("1080p")').first()).toBeVisible();
    await expect(page.locator('button:has-text("DUAL")').first()).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('4. Appearance & Theme Panel toggles themes and grid density', async ({ page }) => {
    // Login first
    await page.locator('button:has-text("Usuario")').first().click();
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
    await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible();

    // Open Theme Panel
    const themeBtn = page.locator('button[aria-label="Personalizar tema"]');
    await themeBtn.click();

    // Verify modal appears
    await expect(page.locator('text=Apariencia y Visualización')).toBeVisible();

    // Check that themes exist
    await expect(page.locator('text=AlfaCode Obsidian')).toBeVisible();
    await expect(page.locator('text=Cinema Crimson')).toBeVisible();
    await expect(page.locator('text=Cyber Violet')).toBeVisible();
    await expect(page.locator('text=Emerald Terminal')).toBeVisible();
    await expect(page.locator('text=Daylight Studio')).toBeVisible();

    // Select Cinema Crimson
    await page.locator('button:has-text("Cinema Crimson")').click();

    // Verify theme attribute updated
    const htmlTheme = await page.getAttribute('html', 'data-theme');
    expect(htmlTheme).toBe('cinema-crimson');
  });

  test('5. Viewer role enforces strict RBAC restrictions in Cloud Explorer', async ({ page }) => {
    // Login as viewer
    await page.locator('button:has-text("Usuario")').first().click();
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
    await expect(page.locator('text=Autenticación CloudMedia')).not.toBeVisible();

    // Verify that "Usuarios" tab is NOT visible for viewer
    await expect(page.locator('button:has-text("Usuarios")')).not.toBeVisible();

    // Switch to "Explorador" tab
    const explorerTab = page.locator('button:has-text("Explorador")').first();
    await explorerTab.click();

    // Verify "Nueva Carpeta" and "Subir Archivo" buttons are NOT rendered for viewer
    await expect(page.locator('button:has-text("Nueva Carpeta")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Subir Archivo")')).not.toBeVisible();
  });
});
