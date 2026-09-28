import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { tokenStore } from '../api/axios';

const AuthContext = createContext(null);
const IDLE_MINUTES = 15;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on page refresh
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ user, token }) => {
    tokenStore.set(token);
    setUser(user);
  };

  // Returns { mfaRequired, mfaToken, method, emailHint, emailSent } when a second step is needed
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.mfaRequired) return res.data;
    saveSession(res.data);
    return { mfaRequired: false };
  };

  const verifyMfa = async (mfaToken, code) => {
    const res = await api.post('/auth/mfa/verify', { mfaToken, code });
    saveSession(res.data);
  };

  const register = async (name, email, password, consent) => {
    const res = await api.post('/auth/register', { name, email, password, consent });
    saveSession(res.data);
  };

  // Revokes the token on the server, then clears it locally
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* already invalid: nothing to revoke */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  // Used after a password change, which issues a new token
  const replaceToken = (token) => tokenStore.set(token);

  // Automatic logout after inactivity
  useEffect(() => {
    if (!user) return undefined;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        toast(`You were logged out after ${IDLE_MINUTES} minutes of inactivity.`, { icon: '🔒' });
      }, IDLE_MINUTES * 60 * 1000);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, verifyMfa, register, logout, replaceToken, clearSession: () => { tokenStore.clear(); setUser(null); } }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
