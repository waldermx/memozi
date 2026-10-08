// src/pages/PracticeResultsScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { home, shareOutline } from 'ionicons/icons';
import { motion } from 'framer-motion';
import { useHistory, useLocation } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import './PracticeResultsScreen.css';

interface LocationState {
  results: boolean[];
  xpEarned?: number;
}

function getGrade(pct: number): { grade: string; color: string; message: string } {
  if (pct >= 95) return { grade: 'S', color: '#BF5AF2', message: '¡Perfecto! Eres increíble 🌟' };
  if (pct >= 80) return { grade: 'A', color: '#30D158', message: '¡Excelente trabajo! 🎉' };
  if (pct >= 65) return { grade: 'B', color: '#0071E3', message: 'Buen trabajo. Sigue así 👍' };
  if (pct >= 50) return { grade: 'C', color: '#FF9F0A', message: 'Puedes mejorar. ¡Practica más! 💪' };
  return { grade: 'D', color: '#FF375F', message: 'No te rindas. La práctica hace al maestro 🔥' };
}

const Confetti: React.FC = () => {
  const colors = ['#0071E3', '#30D158', '#FF375F', '#FF9F0A', '#BF5AF2'];
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', overflow: 'hidden', height: 300 }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: `${Math.random() * 100}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: 320, opacity: 0, rotate: Math.random() * 360 }}
          transition={{ duration: 1.5 + Math.random() * 1, delay: Math.random() * 0.8, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: Math.random() > 0.5 ? 4 : 0,
            background: colors[i % colors.length],
          }}
        />
      ))}
    </div>
  );
};

const PracticeResultsScreen: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const results = location.state?.results ?? [];
  const xpEarned = location.state?.xpEarned ?? 0;
  const { addXP, recordActivity } = useUserStore();

  const total = results.length;
  const correct = results.filter(Boolean).length;
  const incorrect = total - correct;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const { grade, color, message } = getGrade(percentage);
  const showConfetti = percentage >= 80;

  // Apply XP once
  const appliedRef = useRef(false);
  useEffect(() => {
    if (!appliedRef.current && xpEarned > 0) {
      addXP(xpEarned);
      recordActivity();
      appliedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = () => {
    const text = `Acabo de practicar ${total} caracteres chinos con una precisión del ${percentage}% en MemoZi! 🈶`;
    if (navigator.share) {
      navigator.share({ title: 'MemoZi — Resultados', text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/tabs/practice')}>
              <IonIcon icon={home} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={handleShare}>
              <IonIcon icon={shareOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ position: 'relative', minHeight: '100%', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {showConfetti && <Confetti />}

          {/* Grade card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 12px 40px ${color}55`,
            }}
          >
            <span style={{ fontFamily: 'var(--font-family)', fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {grade}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontFamily: 'var(--font-family)', fontSize: 22, fontWeight: 800, color: 'var(--c-text)', marginBottom: 6 }}>
              ¡Sesión completada!
            </div>
            <div style={{ fontFamily: 'var(--font-family)', fontSize: 15, color: 'var(--c-text-secondary)' }}>
              {message}
            </div>
          </motion.div>

          {/* Stats box */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              width: '100%',
              maxWidth: 340,
              background: 'var(--c-surface)',
              borderRadius: 20,
              padding: '24px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            }}
          >
            {[
              { emoji: '📋', value: total, label: 'Total' },
              { emoji: '✅', value: correct, label: 'Correctos', color: 'var(--c-green)' },
              { emoji: '❌', value: incorrect, label: 'Errores', color: 'var(--c-red)' },
              { emoji: '🎯', value: `${percentage}%`, label: 'Precisión', color },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 26,
                  fontWeight: 800,
                  color: s.color ?? 'var(--c-text)',
                }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: 'var(--font-family)', fontSize: 12, color: 'var(--c-text-secondary)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* XP gained */}
          {xpEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              style={{
                background: 'var(--c-green-bg)',
                borderRadius: 99,
                padding: '10px 24px',
                fontFamily: 'var(--font-family)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--c-green)',
              }}
            >
              +{xpEarned} XP ganados ✨
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => history.push('/quiz')}
              style={{
                padding: '16px',
                background: 'var(--c-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                fontFamily: 'var(--font-family)',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,113,227,0.3)',
              }}
            >
              Practicar de nuevo 🔁
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => history.push('/tabs/practice')}
              style={{
                padding: '16px',
                background: 'var(--c-bg-secondary)',
                color: 'var(--c-text)',
                border: 'none',
                borderRadius: 14,
                fontFamily: 'var(--font-family)',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Volver al inicio 🏠
            </motion.button>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PracticeResultsScreen;