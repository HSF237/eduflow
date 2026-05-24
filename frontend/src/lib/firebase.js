import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD7PBXjJnGdyGNapHGydh3s6AmoN7CO2f0",
  authDomain: "edusphere-77677.firebaseapp.com",
  projectId: "edusphere-77677",
  storageBucket: "edusphere-77677.firebasestorage.app",
  messagingSenderId: "685195115801",
  appId: "1:685195115801:web:5aea47f7d5cefb51639988"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
