import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, Edit3, X, Check, AlertCircle, Lock } from 'lucide-react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function UsersPanel({ onToast }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [editRole, setEditRole] = useState('viewer');
  const [editPassword, setEditPassword] = useState('');
  const [formError, setFormError] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      if (onToast) onToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await createUser({ username: newUsername, password: newPassword, role: newRole });
      if (onToast) onToast({ type: 'success', title: 'Usuario creado', message: `Usuario ${newUsername} registrado exitosamente` });
      setIsAddModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload = { role: editRole };
      if (editPassword) payload.password = editPassword;
      await updateUser(editingUser.id, payload);
      if (onToast) onToast({ type: 'success', title: 'Usuario actualizado', message: 'Los datos del usuario han sido actualizados' });
      setEditingUser(null);
      setEditPassword('');
      loadUsers();
    } catch (err) {
      if (onToast) onToast({ type: 'error', title: 'Error al actualizar', message: err.message });
    }
  };

  const handleDelete = async (userToDelete) => {
    if (userToDelete.id === currentUser?.id) {
      if (onToast) onToast({ type: 'error', title: 'Acción denegada', message: 'No puedes eliminar tu propia cuenta' });
      return;
    }

    if (!window.confirm(`¿Confirmas eliminar al usuario ${userToDelete.username}?`)) {
      return;
    }

    try {
      await deleteUser(userToDelete.id);
      if (onToast) onToast({ type: 'success', title: 'Usuario eliminado', message: `Cuenta ${userToDelete.username} eliminada` });
      loadUsers();
    } catch (err) {
      if (onToast) onToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const roleBadge = (role) => {
    const map = {
      admin: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      moderator: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      viewer: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-mono border ${map[role] || map.viewer}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-theme-text max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-theme-surface border border-theme-border">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-theme-accent/15 text-theme-accent border border-theme-accent/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-theme-text">
              Administración de Usuarios y Roles
            </h1>
            <p className="text-xs text-theme-muted mt-0.5">
              Control de acceso jerárquico (admin &gt; moderator &gt; viewer)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-12 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold shadow-md transition-all focus-ring"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-theme-surface border border-theme-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-theme-border/60 text-theme-muted font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Rol en Sistema</th>
                <th className="py-3.5 px-4">Jerarquía de Permisos</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-theme-muted">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-theme-muted">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const permissionsDesc = {
                    admin: 'Control total (Borrado, Limpieza PC, Cuota, Usuarios)',
                    moderator: 'Viewer + Subida clasificada y Sincronización',
                    viewer: 'Exploración, Streaming, Búsqueda y Progreso'
                  }[u.role];

                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-theme-text flex items-center gap-2">
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-theme-accent">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{roleBadge(u.role)}</td>
                      <td className="py-3.5 px-4 text-theme-muted">{permissionsDesc}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditRole(u.role);
                              setEditPassword('');
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 text-theme-muted hover:text-theme-text transition-colors"
                            title="Editar rol o clave"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface p-6 border border-theme-border shadow-2xl animate-scale-in text-theme-text">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h2 className="text-base font-semibold">Crear Nuevo Usuario</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-theme-muted hover:text-theme-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-theme-border/60 text-sm text-theme-text focus-ring min-h-12"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-theme-border/60 text-sm text-theme-text focus-ring min-h-12"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme-border/60 text-sm text-theme-text focus-ring min-h-12"
                >
                  <option value="viewer">Viewer (Usuario regular)</option>
                  <option value="moderator">Moderator (Sube contenido)</option>
                  <option value="admin">Admin (Control total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-12 px-4 py-2 rounded-xl text-xs font-semibold text-theme-muted hover:text-theme-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-12 px-5 py-2 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold transition-all focus-ring shadow"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-theme-surface p-6 border border-theme-border shadow-2xl animate-scale-in text-theme-text">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h2 className="text-base font-semibold">Editar {editingUser.username}</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded hover:bg-white/10 text-theme-muted hover:text-theme-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme-border/60 text-sm text-theme-text focus-ring min-h-12"
                >
                  <option value="viewer">Viewer (Usuario regular)</option>
                  <option value="moderator">Moderator (Sube contenido)</option>
                  <option value="admin">Admin (Control total)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">
                  Nueva Contraseña (dejar en blanco para conservar actual)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-theme-border/60 text-sm text-theme-text focus-ring min-h-12"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="min-h-12 px-4 py-2 rounded-xl text-xs font-semibold text-theme-muted hover:text-theme-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-12 px-5 py-2 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold transition-all focus-ring shadow"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPanel;
