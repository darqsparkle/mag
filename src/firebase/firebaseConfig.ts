// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGWCKVHgIOLxofOPMblw7t1yH0B3w4RVM",
  authDomain: "magg-84ba4.firebaseapp.com",
  projectId: "magg-84ba4",
  storageBucket: "magg-84ba4.firebasestorage.app",
  messagingSenderId: "543232953031",
  appId: "1:543232953031:web:3ab5887f79449f1cc74ce2",
  measurementId: "G-2FFH6PJ5XK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };
export default app;