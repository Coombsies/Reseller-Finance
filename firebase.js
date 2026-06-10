// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdJ10lS_BMEJt25laptFCCSIlkzOCxqI",
  authDomain: "resellerfinanceapp.firebaseapp.com",
  projectId: "resellerfinanceapp",
  storageBucket: "resellerfinanceapp.firebasestorage.app",
  messagingSenderId: "625217355771",
  appId: "1:625217355771:web:3c50262a6189462c1555e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
