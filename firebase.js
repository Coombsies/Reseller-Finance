// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdjlO1S_BMExJt25laptFFCSlIkzOcxqI",
  authDomain: "resellerfinanceapp.firebaseapp.com",
  projectId: "resellerfinanceapp",
  storageBucket: "resellerfinanceapp.firebasestorage.app",
  messagingSenderId: "625217355771",
  appId: "1:625217355771:web:3c50262a61894622c1555e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
