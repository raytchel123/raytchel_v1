import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { AlertError } from '../ui/AlertError';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initAuth, loading, error } = useAuthStore();

  useEffect(() => {
    const cleanup = initAuth();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <AlertError message={error} />;
  }

  return <>{children}</>;
}