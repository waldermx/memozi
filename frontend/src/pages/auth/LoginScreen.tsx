import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiFetch from '../../services/api';
import { useUserStore } from '../../stores/userStore';

interface LoginResponse {
  data: {
    user: {
      id: string;
      displayName: string;
      email: string;
      avatarUrl?: string;
      preferredLocale: string;
      onboardingCompleted: boolean;
    };
    tokens: { accessToken: string; expiresIn: number };
  };
}

const LoginScreen: React.FC = () => {
  const history = useHistory();
  const { setUser, setToken } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      const { user, tokens } = res.data;
      setToken(tokens.accessToken);
      setUser({
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        preferredLocale: user.preferredLocale ?? 'es',
        onboardingCompleted: user.onboardingCompleted,
        guestReviews: 0,
      });
      if (!user.onboardingCompleted) {
        history.replace('/onboarding');
      } else {
        history.replace('/tabs/practice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          background: 'var(--c-bg)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🐼</div>
              <h1 style={{
                fontFamily: 'var(--font-family)',
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--c-text)',
                margin: 0,
              }}>MemoZi</h1>
              <p style={{
                fontFamily: 'var(--font-family)',
                fontSize: 15,
                color: 'var(--c-text-secondary)',
                margin: '8px 0 0',
              }}>Aprende chino mandarín</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />

              {error && (
                <p style={{ color: 'var(--c-red)', fontSize: 13, fontFamily: 'var(--font-family)', margin: 0, textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Entrando…' : 'Iniciar sesión'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <span style={{ fontFamily: 'var(--font-family)', fontSize: 14, color: 'var(--c-text-secondary)' }}>
                ¿No tienes cuenta?{' '}
              </span>
              <button
                onClick={() => history.push('/auth/register')}
                style={{ background: 'none', border: 'none', color: 'var(--c-blue)', fontFamily: 'var(--font-family)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Crear cuenta
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => history.replace('/tabs/practice')}
                style={{ background: 'none', border: 'none', color: 'var(--c-text-secondary)', fontFamily: 'var(--font-family)', fontSize: 13, cursor: 'pointer', padding: 0 }}
              >
                Continuar sin cuenta →
              </button>
            </div>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1.5px solid var(--c-separator)',
  background: 'var(--c-bg-secondary)',
  fontFamily: 'var(--font-family)',
  fontSize: 15,
  color: 'var(--c-text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '15px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--c-blue)',
  color: '#fff',
  fontFamily: 'var(--font-family)',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 4,
};

export default LoginScreen;
