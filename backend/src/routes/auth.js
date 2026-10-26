import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { authGuard, generateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.resolve(__dirname, '../../data/users.json');
const PROGRESS_FILE = path.resolve(__dirname, '../../data/watch_progress.json');

const router = express.Router();

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const users = await readUsers();
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user);

    // Si debe cambiar contraseña obligatoriamente (primer inicio con 1234567890 o flag activo)
    if (user.mustChangePassword) {
      return res.status(200).json({
        requirePasswordChange: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          mustChangePassword: true
        }
      });
    }

    return res.json({
      requirePasswordChange: false,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: false
      }
    });
  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    return res.status(500).json({ error: 'Error interno en autenticación' });
  }
});

// POST /api/auth/change-password (Para cambio forzado o voluntario)
router.post('/change-password', authGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[userIndex];

    // Si NO es un cambio forzado de primer inicio, validar la contraseña actual
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Se requiere la contraseña actual' });
      }
      const isCurrentMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentMatch) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      }
    }

    // Hashear y actualizar
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;

    users[userIndex] = user;
    await writeUsers(users);

    const newToken = generateToken(user);
    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: false
      }
    });
  } catch (err) {
    console.error('Error en /api/auth/change-password:', err);
    return res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// PUT /api/auth/profile (Actualizar datos del perfil)
router.put('/profile', authGuard, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' });
    }

    const cleanUsername = username.trim();
    const users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Comprobar colisión de nombres
    const conflict = users.find((u) => u.id !== req.user.id && u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (conflict) {
      return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
    }

    users[userIndex].username = cleanUsername;
    await writeUsers(users);

    const newToken = generateToken(users[userIndex]);
    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        role: users[userIndex].role,
        mustChangePassword: !!users[userIndex].mustChangePassword
      },
      token: newToken
    });
  } catch (err) {
    console.error('Error en /api/auth/profile:', err);
    return res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// GET /api/auth/profile/stats (Estadísticas personales de reproducción)
router.get('/profile/stats', authGuard, async (req, res) => {
  try {
    let progressMap = {};
    try {
      const raw = await fs.readFile(PROGRESS_FILE, 'utf-8');
      progressMap = JSON.parse(raw);
    } catch {
      progressMap = {};
    }

    const userPrefix = `${req.user.id}:`;
    const userEntries = [];

    for (const [key, val] of Object.entries(progressMap)) {
      if (key.startsWith(userPrefix)) {
        userEntries.push(val);
      }
    }

    const totalVideos = userEntries.length;
    const completedVideos = userEntries.filter((v) => (v.percentage || 0) >= 90).length;
    const inProgressVideos = userEntries.filter((v) => (v.percentage || 0) > 2 && (v.percentage || 0) < 90).length;
    const totalWatchedSeconds = userEntries.reduce((acc, curr) => acc + (curr.currentTime || 0), 0);

    const hours = Math.floor(totalWatchedSeconds / 3600);
    const minutes = Math.floor((totalWatchedSeconds % 3600) / 60);

    return res.json({
      stats: {
        totalVideos,
        completedVideos,
        inProgressVideos,
        totalWatchedFormatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`,
        recentItems: userEntries.slice(-5).reverse()
      }
    });
  } catch (err) {
    console.error('Error en /api/auth/profile/stats:', err);
    return res.status(500).json({ error: 'Error al obtener estadísticas del perfil' });
  }
});

// GET /api/auth/me
router.get('/me', authGuard, async (req, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Sesión cerrada exitosamente' });
});

export default router;
