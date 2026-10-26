import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  subscribeServerOffline,
  checkServerConnection,
  setServerOfflineState,
  getServerOfflineState
} from '../services/api';

const ServerOfflineContext = createContext({
  isServerOffline: false,
  isChecking: false,
  retryConnection: async () => false,
  setIsServerOffline: () => {}
});

export function ServerOfflineProvider({ children }) {
  const [isServerOffline, setIsServerOffline] = useState(() => getServerOfflineState());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeServerOffline((offline) => {
      setIsServerOffline(offline);
    });
    return unsubscribe;
  }, []);

  const retryConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const isOnline = await checkServerConnection();
      if (isOnline) {
        setIsServerOffline(false);
        return true;
      }
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return (
    <ServerOfflineContext.Provider
      value={{
        isServerOffline,
        isChecking,
        retryConnection,
        setIsServerOffline: setServerOfflineState
      }}
    >
      {children}
    </ServerOfflineContext.Provider>
  );
}

export function useServerOffline() {
  const ctx = useContext(ServerOfflineContext);
  if (!ctx) {
    throw new Error('useServerOffline debe ser utilizado dentro de un ServerOfflineProvider');
  }
  return ctx;
}
