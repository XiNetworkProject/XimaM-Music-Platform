import React, { createContext, useCallback, useContext, useMemo } from 'react';

export type NativePushStatus = 'disabled' | 'requesting' | 'ready' | 'denied' | 'unsupported' | 'error';

type NativeNotificationsContextValue = {
  status: NativePushStatus;
  error: string | null;
  token: string | null;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
};

const STARTUP_SAFE_MESSAGE = 'Notifications natives mises en pause dans ce correctif de lancement.';

const NativeNotificationsContext = createContext<NativeNotificationsContextValue | null>(null);

export function NativeNotificationsProvider({ children }: { children: React.ReactNode }) {
  const enable = useCallback(async () => false, []);
  const disable = useCallback(async () => {}, []);
  const sendTest = useCallback(async () => {}, []);

  const value = useMemo<NativeNotificationsContextValue>(() => ({
    status: 'disabled',
    error: STARTUP_SAFE_MESSAGE,
    token: null,
    enable,
    disable,
    sendTest,
  }), [disable, enable, sendTest]);

  return (
    <NativeNotificationsContext.Provider value={value}>
      {children}
    </NativeNotificationsContext.Provider>
  );
}

export function useNativeNotifications() {
  const value = useContext(NativeNotificationsContext);
  if (!value) throw new Error('useNativeNotifications must be used inside NativeNotificationsProvider');
  return value;
}
