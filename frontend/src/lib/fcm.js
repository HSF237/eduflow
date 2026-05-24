import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const VAPID_KEY = 'BPav3GbWU4prY5D0L46ceKwYwWXNBUlqaajON-sMaDUwZU42RdwzMw9VjCnMssJubg5faisdvbvvN5u0k3wYfxM';

let _messaging = null;

const getMsg = async () => {
  if (_messaging) return _messaging;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
};

export const requestAndSaveToken = async (studentId) => {
  try {
    if (!('Notification' in window)) return null;
    const msg = await getMsg();
    if (!msg) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(msg, { vapidKey: VAPID_KEY });
    if (token && studentId) {
      await setDoc(doc(db, 'fcm_tokens', studentId), {
        token,
        updated_at: new Date().toISOString(),
      });
    }
    return token;
  } catch (err) {
    console.warn('FCM token:', err.message);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  getMsg().then(msg => {
    if (msg) onMessage(msg, callback);
  }).catch(() => {});
  return () => {};
};

export const sendPush = async (tokens, title, body) => {
  if (!tokens?.length) return;
  try {
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, title, body }),
    });
  } catch { /* non-critical */ }
};
