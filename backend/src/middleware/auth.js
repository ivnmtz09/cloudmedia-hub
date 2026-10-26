import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudmedia-secret-2026';

export const ROLE_HIERARCHY = {
  viewer: 1,
  moderator: 2,
  admin: 3
};

export function authGuard(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function roleGuard(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const targetRole = Array.isArray(minRole) ? minRole[0] : minRole;
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[targetRole] || 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Acceso denegado: Se requiere rol '${targetRole}' o superior (rol actual: '${req.user.role}')`
      });
    }

    next();
  };
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, mustChangePassword: !!user.mustChangePassword },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
