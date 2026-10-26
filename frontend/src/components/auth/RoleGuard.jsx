import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function RoleGuard({ minRole = 'viewer', children, fallback = null }) {
  const { hasMinRole, isLoading } = useAuth();

  if (isLoading) return null;
  if (!hasMinRole(minRole)) return fallback;

  return <>{children}</>;
}

export default RoleGuard;
