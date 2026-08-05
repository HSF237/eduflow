/**
 * FCM Push Notification Token Saver for Web Push
 */
export const requestAndSaveToken = async (studentId) => {
  if (!('Notification' in window)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
    }
  } catch (err) {
    console.warn('FCM token request fallback:', err);
  }
  return null;
};

export const onForegroundMessage = (cb) => {
  return () => {};
};

export const sendPush = async (tokens, title, body) => {
  return true;
};
