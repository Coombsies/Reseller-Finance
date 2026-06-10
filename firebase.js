// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIyQ_hpczW5NefuV_XgfJgKM9M3e4t7x8",
  authDomain: "monthly-reseller-finance-app.firebaseapp.com",
  projectId: "monthly-reseller-finance-app",
  storageBucket: "monthly-reseller-finance-app.firebasestorage.app",
  messagingSenderId: "371369393795",
  appId: "1:371369393795:web:629f4ab51aa556cbb265b6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
