import { google } from 'googleapis';

let driveInstance = null;

/**
 * Obtiene una instancia autenticada del cliente de Google Drive API v3
 * Soporta Service Account (JSON o variables separadas), OAuth2 Refresh Token y API Key.
 */
export function getGoogleDriveClient() {
  if (driveInstance) return driveInstance;

  // 1. Service Account vía JSON completo (GOOGLE_SERVICE_ACCOUNT_KEY o GOOGLE_CREDENTIALS)
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_CREDENTIALS;
  if (jsonKey) {
    try {
      const credentials = typeof jsonKey === 'string' ? JSON.parse(jsonKey) : jsonKey;
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });
      driveInstance = google.drive({ version: 'v3', auth });
      return driveInstance;
    } catch (err) {
      console.warn('[GoogleDrive] Error al parsear JSON de Service Account:', err.message);
    }
  }

  // 2. Service Account vía variables individuales
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive.readonly']
    );
    driveInstance = google.drive({ version: 'v3', auth });
    return driveInstance;
  }

  // 3. OAuth2 vía Refresh Token (cuenta personal)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    driveInstance = google.drive({ version: 'v3', auth: oauth2Client });
    return driveInstance;
  }

  // 4. API Key (para carpetas públicas compartidas)
  if (process.env.GOOGLE_API_KEY) {
    driveInstance = google.drive({ version: 'v3', auth: process.env.GOOGLE_API_KEY });
    return driveInstance;
  }

  // Si no hay credenciales completas, inicializar cliente sin auth (permitirá llamadas públicas con key si aplica)
  driveInstance = google.drive({ version: 'v3' });
  return driveInstance;
}
