importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD7PBXjJnGdyGNapHGydh3s6AmoN7CO2f0",
  authDomain: "edusphere-77677.firebaseapp.com",
  projectId: "edusphere-77677",
  storageBucket: "edusphere-77677.firebasestorage.app",
  messagingSenderId: "685195115801",
  appId: "1:685195115801:web:5aea47f7d5cefb51639988"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'EduSphere';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon: '/edusphere.svg',
    badge: '/edusphere.svg',
  });
});
