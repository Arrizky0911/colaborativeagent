import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBex1lDbRQpycSakNmLertOVG13HS-WnRw",
  authDomain: "costorm-lite.firebaseapp.com",
  projectId: "costorm-lite",
  storageBucket: "costorm-lite.firebasestorage.app",
  messagingSenderId: "299198796065",
  appId: "1:299198796065:web:3bb7fc7e67c5c58f256e60",
  measurementId: "G-4BL8ZW34T5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Collection references
export const usersCollection = collection(db, "users");
export const articlesCollection = collection(db, "articles");
export const notificationsCollection = collection(db, "notifications");

export default app;
