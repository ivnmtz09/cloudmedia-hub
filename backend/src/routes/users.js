import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { authGuard, roleGuard } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.resolve(__dirname, '../../data/users.json');

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

// All users routes require admin role
router.use(authGuard);
router.use(roleGuard('admin'));

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await readUsers();
    const sanitized = users.map(({ id, username, role }) => ({ id, username, role }));
    return res.json({ users: sanitized });
  } catch (err) {
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (username, password, role)' });
    }

    const validRoles = ['viewer', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Debe ser viewer, moderator o admin' });
    }

    const users = await readUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: String(Date.now()),
      username: username.trim(),
      password: hashedPassword,
      role
    };

    users.push(newUser);
    await writeUsers(users);

    return res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id: newUser.id, username: newUser.username, role: newUser.role }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, role } = req.body;

    const users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (role) {
      const validRoles = ['viewer', 'moderator', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      users[userIndex].role = role;
    }

    if (password) {
      users[userIndex].password = await bcrypt.hash(password, 10);
    }

    await writeUsers(users);
    const updated = users[userIndex];

    return res.json({
      message: 'Usuario actualizado exitosamente',
      user: { id: updated.id, username: updated.username, role: updated.role }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador' });
    }

    let users = await readUsers();
    const initialLen = users.length;
    users = users.filter((u) => u.id !== id);

    if (users.length === initialLen) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await writeUsers(users);
    return res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
