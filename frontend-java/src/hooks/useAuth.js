import { useContext } from 'react';
import { AuthContext } from '../context/AuthContextJWT';

export function useAuth() {
  const ctx = useContext(AuthContext);
  // Default context value is null; a real provider always supplies an object.
  if (ctx == null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
