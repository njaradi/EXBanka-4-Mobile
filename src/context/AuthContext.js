import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as loginApi, logout as logoutApi, getMe } from '../services/authService';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from '../services/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start: restore session if token exists
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          const me = await getMe();
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    if (data.access_token) {
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      const me = await getMe();
      setUser(me);
      // Register FCM token after successful login (non-blocking)
      registerForPushNotifications().catch(() => {});
      return { status: 'SUCCESS' };
    }
    // PENDING — approval required
    return { status: 'PENDING', approvalRequestId: data.approvalRequestId };
  };

  // Called after approval-based login where backend returns tokens in the approval response
  const loginWithTokens = async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    const me = await getMe();
    setUser(me);
    registerForPushNotifications().catch(() => {});
  };

  const logout = async () => {
    // Unregister FCM token before clearing session
    await unregisterPushNotifications();
    await logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
