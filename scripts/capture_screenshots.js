import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve('docs/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2 // High-DPI crisp screenshots
  });
  const page = await context.newPage();

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:3001');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '01_landing_page.png') });

  console.log('2. Capturing Login Modal with Blurred Backdrop...');
  await page.locator('button:has-text("Iniciar Sesión")').first().click();
  await page.waitForSelector('text=Autenticación CloudMedia');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '02_login_modal.png') });

  console.log('Logging in as ivnmtz09...');
  await page.locator('input[placeholder="Nombre de usuario"]').fill('ivnmtz09');
  const passInput = page.locator('input[placeholder="••••••••"]');
  await passInput.fill('1234567890');
  await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();

  const isInvalid = await page.locator('text=Credenciales inválidas').waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (isInvalid) {
    await passInput.fill('322-520iM.');
    await page.locator('button[type="submit"]:has-text("Iniciar Sesión")').click();
  }

  const forceHeader = page.locator('text=Cambio de Contraseña Obligatorio');
  if (await forceHeader.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
    await page.locator('input[placeholder="Ingresa tu nueva contraseña"]').fill('322-520iM.');
    await page.locator('input[placeholder="Repite la nueva contraseña"]').fill('322-520iM.');
    await page.locator('button[type="submit"]:has-text("Establecer Contraseña e Ingresar")').click();
  }

  await page.waitForSelector('text=Autenticación CloudMedia', { state: 'detached', timeout: 10000 });
  await page.waitForTimeout(1500);

  console.log('3. Capturing Main Dashboard (Redflix Theme)...');
  await page.screenshot({ path: path.join(OUT_DIR, '03_dashboard_redflix.png') });

  console.log('Capturing All 5 Themes...');
  const themes = [
    { id: 'magic-plus', name: 'Magic Plus', file: '04_theme_magic_plus.png' },
    { id: 'anime-studio', name: 'Anime Studio', file: '05_theme_anime_studio.png' },
    { id: 'max-cinema', name: 'Max Cinema', file: '06_theme_max_cinema.png' },
    { id: 'prime-vision', name: 'Prime Vision', file: '07_theme_prime_vision.png' }
  ];

  for (const t of themes) {
    console.log(`Setting theme: ${t.name}...`);
    await page.locator('button[aria-label="Personalizar tema"]').click();
    await page.waitForSelector('text=Apariencia y Visualización');
    await page.locator(`button:has-text("${t.name}")`).click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, t.file) });
  }

  console.log('8. Capturing Theme Switcher Panel...');
  await page.locator('button[aria-label="Personalizar tema"]').click();
  await page.waitForSelector('text=Apariencia y Visualización');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, '08_theme_switcher_modal.png') });
  await page.keyboard.press('Escape');

  // Switch back to Redflix
  await page.locator('button[aria-label="Personalizar tema"]').click();
  await page.locator('button:has-text("Redflix")').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  console.log('9. Capturing VLC Player Playback...');
  const playBtn = page.locator('button:has-text("Reproducir Ahora")').first();
  if (await playBtn.isVisible()) {
    await playBtn.click();
    await page.waitForSelector('text=VLC Engine');
    await page.waitForTimeout(1500);
    // Increase volume to trigger OSD
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, '09_vlc_player_playback.png') });
    await page.locator('button[aria-label="Cerrar reproductor"]').click();
    await page.waitForTimeout(500);
  }

  console.log('10. Capturing Cloud Explorer...');
  await page.locator('#tab-explorer').click();
  await page.waitForSelector('text=Raíz (PC_Storage)');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '10_cloud_explorer.png') });

  console.log('11. Capturing Admin Dashboard...');
  await page.locator('#tab-users').click();
  await page.waitForSelector('text=Panel de Administración');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '11_admin_dashboard.png') });

  console.log('12. Capturing Mobile Viewport...');
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 / modern mobile
  await page.locator('#mobile-tab-streaming').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '12_mobile_view.png') });

  console.log('13. Capturing Mobile Drawer Menu...');
  const burgerBtn = page.locator('button[aria-label*="menú de navegación"]');
  await burgerBtn.click();
  await page.waitForSelector('aside[aria-label="Menú principal de navegación"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, '13_mobile_drawer.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
