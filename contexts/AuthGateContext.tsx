'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthRequiredModal from '@/components/AuthRequiredModal';

interface AuthGateContextType {
  requireAuth: (featureDescription: string) => boolean;
}

const AuthGateContext = createContext<AuthGateContextType | undefined>(undefined);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [featureDescription, setFeatureDescription] = useState('');

  const requireAuth = useCallback(
    (description: string): boolean => {
      if (user) return true;
      setFeatureDescription(description);
      setModalOpen(true);
      return false;
    },
    [user],
  );

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <AuthRequiredModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureDescription={featureDescription}
      />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (context === undefined) {
    throw new Error('useAuthGate must be used within an AuthGateProvider');
  }
  return context;
}
